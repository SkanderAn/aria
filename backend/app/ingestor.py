import os
import fitz
import uuid
import requests
import urllib3
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from app.models import DocumentInfo, DocumentListItem
from app.core.config import config

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CHROMA_PATH = config.CHROMA_PATH
EMBEDDING_MODEL = config.EMBEDDING_MODEL

# Lazy initialization — only loads when first needed, not at startup
_embeddings = None

def get_embeddings():
    """
    Returns the embeddings model, initializing it only on first call.
    This prevents Railway healthcheck failures caused by slow model downloads at startup.
    """
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={
                "normalize_embeddings": True,
                "batch_size": 32
            }
        )
    return _embeddings

def get_vectorstore(workspace_id: str) -> Chroma:
    return Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=get_embeddings(),
        collection_name=f"aria_{workspace_id}"
    )

def chunk_and_store_enhanced(texts, metadatas, workspace_id, doc_id) -> int:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
        length_function=len,
    )

    all_chunks = []
    all_metas = []

    for text, meta in zip(texts, metadatas):
        chunks = splitter.split_text(text)
        for idx, chunk in enumerate(chunks):
            meta_copy = meta.copy()
            meta_copy["chunk_index"] = idx
            meta_copy["total_chunks"] = len(chunks)
            meta_copy["chunk_position_ratio"] = idx / len(chunks) if len(chunks) > 1 else 0.5
            meta_copy["text_length"] = len(chunk)
            all_chunks.append(chunk)
            all_metas.append(meta_copy)

    if len(all_chunks) > 1 and config.CHUNK_OVERLAP > 100:
        for i in range(len(all_chunks) - 1):
            overlap = all_chunks[i][-150:] + " " + all_chunks[i+1][:150]
            if len(overlap) > 100:
                overlap_meta = all_metas[i].copy()
                overlap_meta["chunk_index"] = f"{i}_overlap"
                overlap_meta["is_overlap"] = True
                overlap_meta["connected_chunks"] = [i, i+1]
                all_chunks.append(overlap)
                all_metas.append(overlap_meta)

    if not all_chunks:
        raise ValueError("No text could be extracted from the document.")

    vectorstore = get_vectorstore(workspace_id)
    vectorstore.add_texts(
        texts=all_chunks,
        metadatas=all_metas,
        ids=[f"{doc_id}_{i}" for i in range(len(all_chunks))]
    )

    return len(all_chunks)

def ingest_pdf(file_bytes: bytes, filename: str, workspace_id: str) -> DocumentInfo:
    doc_id = str(uuid.uuid4())[:8]
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    texts = []
    metadatas = []

    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            texts.append(text)
            metadatas.append({
                "doc_id": doc_id,
                "workspace_id": workspace_id,
                "filename": filename,
                "source_type": "pdf",
                "page": i + 1,
                "total_pages": len(doc)
            })
    doc.close()

    if not texts:
        raise ValueError("Could not extract text from this PDF. The file may be scanned or image-based.")

    chunk_count = chunk_and_store_enhanced(texts, metadatas, workspace_id, doc_id)

    return DocumentInfo(
        doc_id=doc_id,
        workspace_id=workspace_id,
        filename=filename,
        chunk_count=chunk_count,
        source_type="pdf",
        message=f"Successfully ingested {chunk_count} chunks from {len(texts)} pages"
    )

def ingest_url(url: str, workspace_id: str) -> DocumentInfo:
    doc_id = str(uuid.uuid4())[:8]

    headers_chrome = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8,ar;q=0.7",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    headers_googlebot = {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    session = requests.Session()
    html_content = None

    for headers in [headers_chrome, headers_googlebot]:
        try:
            response = session.get(url, headers=headers, timeout=20, allow_redirects=True, verify=False)
            if response.status_code == 200 and len(response.content) > 500:
                html_content = response.content
                break
        except Exception:
            continue

    if not html_content:
        raise ValueError("Could not access this URL. The website may be blocking requests or be temporarily unavailable.")

    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "iframe", "noscript", "svg",
                     "button", "input", "select", "textarea",
                     "meta", "link", "figure", "figcaption"]):
        tag.decompose()

    noise_keywords = ["cookie", "popup", "modal", "banner", "advertisement",
                      "sidebar", "menu", "breadcrumb", "pagination", "share",
                      "social", "newsletter", "subscribe", "related", "comment"]
    for tag in soup.find_all(True):
        tag_class = " ".join(tag.get("class", [])).lower()
        tag_id = tag.get("id", "").lower()
        if any(k in tag_class or k in tag_id for k in noise_keywords):
            tag.decompose()

    main_element = (
        soup.find(id="main-content") or
        soup.find(id="content") or
        soup.find(id="bodyContent") or
        soup.find("main") or
        soup.find("article") or
        soup.find(class_="content") or
        soup.find(class_="entry-content") or
        soup.find("body") or
        soup
    )

    raw_text = main_element.get_text(separator="\n", strip=True)
    lines = [l.strip() for l in raw_text.splitlines() if len(l.strip()) > 20]
    clean_lines = []
    prev = None
    for line in lines:
        if line != prev:
            clean_lines.append(line)
            prev = line

    clean_text = "\n".join(clean_lines)

    if len(clean_text) < 100:
        raise ValueError(
            "Could not extract enough meaningful content from this URL. "
            "The page may require JavaScript or be behind a login."
        )

    title_tag = soup.find("title")
    filename = title_tag.get_text(strip=True) if title_tag else url
    for sep in [" - ", " | ", " — ", " :: ", " » "]:
        if sep in filename:
            filename = filename.split(sep)[0].strip()
            break

    texts = [clean_text]
    metadatas = [{
        "doc_id": doc_id,
        "workspace_id": workspace_id,
        "filename": filename,
        "source_type": "url",
        "url": url,
        "page": 1
    }]

    chunk_count = chunk_and_store_enhanced(texts, metadatas, workspace_id, doc_id)

    return DocumentInfo(
        doc_id=doc_id,
        workspace_id=workspace_id,
        filename=filename,
        chunk_count=chunk_count,
        source_type="url",
        message=f"Successfully ingested {chunk_count} chunks from {url}"
    )

def get_documents(workspace_id: str) -> list:
    vectorstore = get_vectorstore(workspace_id)
    collection = vectorstore._collection
    results = collection.get(include=["metadatas"])

    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta.get("doc_id")
        if meta.get("is_overlap"):
            continue
        if doc_id and doc_id not in seen:
            seen[doc_id] = {
                "doc_id": doc_id,
                "filename": meta.get("filename", "unknown"),
                "chunk_count": 0,
                "source_type": meta.get("source_type", "pdf")
            }
        if doc_id:
            seen[doc_id]["chunk_count"] += 1

    return [DocumentListItem(**d) for d in seen.values()]

def delete_document(doc_id: str, workspace_id: str) -> bool:
    vectorstore = get_vectorstore(workspace_id)
    collection = vectorstore._collection
    results = collection.get(
        where={"doc_id": doc_id},
        include=["metadatas"]
    )
    ids_to_delete = results.get("ids", [])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
        return True
    return False