import os
import fitz
import uuid
import requests
import urllib3
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.models import DocumentInfo, DocumentListItem
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CHROMA_PATH = "./chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"



# Initialize embeddings once — runs locally, no API key needed
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

def get_vectorstore(workspace_id: str) -> Chroma:
    """
    Returns the ChromaDB vector store for a specific workspace.
    Each workspace gets its own collection — full data isolation.
    This is the core of multi-tenancy in Aria.
    """
    return Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
        collection_name=f"aria_{workspace_id}"
    )

def chunk_and_store(
    texts: list,
    metadatas: list,
    workspace_id: str,
    doc_id: str
) -> int:
    """
    Split texts into chunks and store in ChromaDB.
    Returns the number of chunks created.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_chunks = []
    all_metas = []

    for text, meta in zip(texts, metadatas):
        chunks = splitter.split_text(text)
        for chunk in chunks:
            all_chunks.append(chunk)
            all_metas.append(meta)

    if not all_chunks:
        raise ValueError("No text could be extracted from the document.")

    vectorstore = get_vectorstore(workspace_id)
    vectorstore.add_texts(
        texts=all_chunks,
        metadatas=all_metas,
        ids=[f"{doc_id}_{i}" for i in range(len(all_chunks))]
    )

    return len(all_chunks)

def ingest_pdf(
    file_bytes: bytes,
    filename: str,
    workspace_id: str
) -> DocumentInfo:
    """
    Ingest a PDF document:
    1. Extract text page by page with PyMuPDF
    2. Chunk and embed with HuggingFace
    3. Store in workspace-specific ChromaDB collection
    """
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
                "page": i + 1
            })
    doc.close()

    if not texts:
        raise ValueError(
            "Could not extract text from this PDF. "
            "The file may be scanned or image-based."
        )

    chunk_count = chunk_and_store(texts, metadatas, workspace_id, doc_id)

    return DocumentInfo(
        doc_id=doc_id,
        workspace_id=workspace_id,
        filename=filename,
        chunk_count=chunk_count,
        source_type="pdf",
        message=f"Successfully ingested {chunk_count} chunks from {len(texts)} pages"
    )

def ingest_url(url: str, workspace_id: str) -> DocumentInfo:
    """
    Ingest content from a website URL:
    1. Crawl the URL with requests + BeautifulSoup
    2. Extract clean text (remove nav, footer, scripts)
    3. Chunk and embed
    4. Store in workspace ChromaDB collection
    """
    doc_id = str(uuid.uuid4())[:8]

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; AriaBot/1.0)"
    }

    try:
        response = requests.get(url, headers=headers, timeout=20, allow_redirects=True, verify=False)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Could not fetch URL: {str(e)}")

    soup = BeautifulSoup(response.content, "html.parser")

    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer",
                     "header", "aside", "form", "iframe"]):
        tag.decompose()

    # Extract clean text
    text = soup.get_text(separator="\n", strip=True)

    # Clean up excessive whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    clean_text = "\n".join(lines)

    if len(clean_text) < 100:
        raise ValueError(
            "Could not extract meaningful content from this URL. "
            "The page may require JavaScript to load."
        )

    # Use the page title as filename
    title = soup.find("title")
    filename = title.get_text(strip=True) if title else url

    texts = [clean_text]
    metadatas = [{
        "doc_id": doc_id,
        "workspace_id": workspace_id,
        "filename": filename,
        "source_type": "url",
        "url": url,
        "page": 1
    }]

    chunk_count = chunk_and_store(texts, metadatas, workspace_id, doc_id)

    return DocumentInfo(
        doc_id=doc_id,
        workspace_id=workspace_id,
        filename=filename,
        chunk_count=chunk_count,
        source_type="url",
        message=f"Successfully ingested {chunk_count} chunks from {url}"
    )

def get_documents(workspace_id: str) -> list:
    """List all documents for a specific workspace."""
    vectorstore = get_vectorstore(workspace_id)
    collection = vectorstore._collection
    results = collection.get(include=["metadatas"])

    seen = {}
    for meta in results["metadatas"]:
        doc_id = meta.get("doc_id")
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
    """Delete a specific document from a workspace."""
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