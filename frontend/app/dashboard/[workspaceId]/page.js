"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const API = "http://localhost:8000";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState(null);
  const [tab, setTab] = useState("documents");
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [ingestingUrl, setIngestingUrl] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [widgetCode, setWidgetCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  // Confirmation Modal Component
  const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)"
      }} onClick={onClose}>
        <div style={{
          background: "#0a0a14",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
        }} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: "18px", color: "#f8fafc", marginBottom: "12px" }}>{title}</h3>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>{message}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "8px 20px",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "13px"
              }}>
              Cancel
            </button>
            <button onClick={() => { onConfirm(); onClose(); }}
              style={{
                background: "#ef4444",
                border: "none",
                borderRadius: "8px",
                padding: "8px 20px",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500
              }}>
              Clear All
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchWorkspace();
    fetchDocuments();
    fetchAnalytics();
  }, [workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setWorkspace(data);
      const wRes = await fetch(`${API}/workspaces/${workspaceId}/widget`);
      const wData = await wRes.json();
      setWidgetCode(wData.embed_script);
    } catch (error) {
      showToast("Failed to load workspace", "error");
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}/documents`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) { 
      showToast("PDF files only", "error");
      return; 
    }
    
    setUploading(true);
    setUploadProgress(0);
    const form = new FormData();
    form.append("file", file);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}/documents/upload`, { 
        method: "POST", 
        body: form 
      });
      const data = await res.json();
      setDocuments(prev => [...prev, data]);
      showToast(`Successfully uploaded "${file.name}"`, "success");
      fetchAnalytics();
    } catch { 
      showToast("Upload failed", "error");
    } finally {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    setIngestingUrl(true);
    try {
      const res = await fetch(`${API}/workspaces/${workspaceId}/documents/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput })
      });
      const data = await res.json();
      setDocuments(prev => [...prev, data]);
      setUrlInput("");
      showToast(`Successfully ingested URL`, "success");
      fetchAnalytics();
    } catch { 
      showToast("URL ingestion failed", "error");
    }
    setIngestingUrl(false);
  };

  const handleDeleteDoc = async (docId, filename) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
      await fetch(`${API}/workspaces/${workspaceId}/documents/${docId}`, { method: "DELETE" });
      setDocuments(prev => prev.filter(d => d.doc_id !== docId));
      showToast(`Deleted "${filename}"`, "success");
      fetchAnalytics();
    } catch (error) {
      showToast("Delete failed", "error");
    }
  };

  const handleChat = async () => {
    if (!question.trim() || chatLoading) return;
    const q = question.trim();
    setQuestion("");
    setMessages(prev => [...prev, { 
      role: "user", 
      text: q, 
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString()
    }]);
    setChatLoading(true);
    setIsTyping(true);
    
    setTimeout(async () => {
      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, session_id: sessionId, workspace_id: workspaceId })
        });
        const data = await res.json();
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          text: data.answer, 
          id: Date.now() + 1,
          timestamp: new Date().toLocaleTimeString()
        }]);
        fetchAnalytics();
      } catch {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          role: "assistant", 
          text: "Error connecting to backend.", 
          id: Date.now() + 1,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
      setChatLoading(false);
    }, 500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    showToast("Widget code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const clearChat = () => {
    if (messages.length > 0) {
      setShowClearModal(true);
    }
  };

  const confirmClearChat = () => {
    setMessages([]);
    showToast("Chat cleared", "success");
  };

  if (!workspace) return (
    <div style={{ minHeight: "100vh", background: "#060610", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontFamily: "'DM Mono',monospace" }}>
      Loading workspace...
    </div>
  );

  const tabs = ["documents", "test", "analytics", "widget"];

  return (
    <main style={{ minHeight: "100vh", background: "#060610", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input, textarea { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .doc-row:hover { background: #0d1117 !important; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .msg-in { animation: msgIn 0.3s ease forwards; }
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          z-index: 1000;
          animation: slideUp 0.3s ease;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .progress-bar {
          height: 2px;
          background: ${workspace.primary_color};
          transition: width 0.3s ease;
          position: absolute;
          bottom: 0;
          left: 0;
        }
      `}</style>

      {/* Toast Notifications */}
      {toast && (
        <div className="toast" style={{
          background: toast.type === "success" ? "#0ea572" : "#ef4444",
          color: "white"
        }}>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={confirmClearChat}
        title="Clear Chat History"
        message="Are you sure you want to clear all messages? This action cannot be undone."
      />

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid #0f172a", padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(6,6,16,0.95)", backdropFilter: "blur(12px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/dashboard")}
            style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans',sans-serif" }}>
            ← Back
          </button>
          <span style={{ color: "#1e293b" }}>|</span>
          <div style={{ width: "28px", height: "28px", background: workspace.primary_color + "22", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${workspace.primary_color}44` }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "13px", color: workspace.primary_color }}>{workspace.agent_name[0]}</span>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "15px", color: "#f8fafc" }}>{workspace.business_name}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#334155" }}>{workspace.workspace_id}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0ea572" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#475569" }}>Agent: {workspace.agent_name}</span>
          {messages.length > 0 && tab === "test" && (
            <button onClick={clearChat}
              style={{ background: "none", border: "1px solid #1e293b", borderRadius: "6px", padding: "4px 12px", color: "#64748b", fontSize: "11px", cursor: "pointer" }}>
              Clear chat
            </button>
          )}
        </div>
      </header>

      {/* TABS */}
      <div style={{ borderBottom: "1px solid #0f172a", padding: "0 32px", display: "flex", gap: "4px" }}>
        {tabs.map(t => (
          <button key={t} className="tab-btn" onClick={() => setTab(t)}
            style={{ padding: "14px 20px", background: "none", color: tab === t ? "#f8fafc" : "#475569", fontFamily: "'DM Sans',sans-serif", fontSize: "13px", fontWeight: tab === t ? 600 : 400, borderBottom: tab === t ? `2px solid ${workspace.primary_color}` : "2px solid transparent", textTransform: "capitalize" }}>
            {t === "test" ? "Test Chat" : t}
            {t === "documents" && documents.length > 0 && (
              <span style={{ marginLeft: "6px", fontSize: "10px", background: "#1e293b", padding: "2px 6px", borderRadius: "10px" }}>
                {documents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── DOCUMENTS TAB ── */}
        {tab === "documents" && (
          <div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
              <div onClick={() => fileRef.current.click()}
                style={{ flex: 1, minWidth: "240px", border: "1.5px dashed #1e293b", borderRadius: "12px", padding: "20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = workspace.primary_color + "66"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleUploadPdf(e.target.files[0])} />
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                <p style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{uploading ? "Uploading..." : "Upload PDF"}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#334155", marginTop: "4px" }}>Click to browse</p>
                {uploading && (
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                )}
              </div>
              <div style={{ flex: 2, minWidth: "300px", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Ingest from URL</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleIngestUrl()}
                    placeholder="https://yourwebsite.com/faq"
                    style={{ flex: 1, background: "#060610", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px", color: "#e2e8f0", fontSize: "13px", fontFamily: "'DM Sans',sans-serif" }} />
                  <button onClick={handleIngestUrl} disabled={ingestingUrl}
                    style={{ background: workspace.primary_color, color: "white", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: ingestingUrl ? 0.7 : 1 }}>
                    {ingestingUrl ? "..." : "Ingest"}
                  </button>
                </div>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", border: "1.5px dashed #1e293b", borderRadius: "16px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
                <p style={{ color: "#334155", fontSize: "14px", marginBottom: "8px" }}>No documents yet.</p>
                <p style={{ color: "#1e293b", fontSize: "12px" }}>Upload a PDF or ingest a URL to train your agent</p>
              </div>
            ) : (
              <div style={{ border: "1px solid #0f172a", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "12px 20px", background: "#0a0a14", borderBottom: "1px solid #0f172a", display: "grid", gridTemplateColumns: "1fr 100px 80px 40px", gap: "12px" }}>
                  {["Document", "Type", "Chunks", ""].map(h => (
                    <span key={h} style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</span>
                  ))}
                </div>
                {documents.map((doc, docIndex) => (
                  <div key={`doc-${doc.doc_id}-${docIndex}`} className="doc-row"
                    style={{ padding: "14px 20px", borderBottom: "1px solid #0a0a14", display: "grid", gridTemplateColumns: "1fr 100px 80px 40px", gap: "12px", alignItems: "center", transition: "background 0.2s" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.filename}>{doc.filename}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: doc.source_type === "pdf" ? workspace.primary_color + "15" : "#0ea57215", color: doc.source_type === "pdf" ? workspace.primary_color : "#0ea572", width: "fit-content" }}>{doc.source_type}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#475569" }}>{doc.chunk_count} chunks</span>
                    <button onClick={() => handleDeleteDoc(doc.doc_id, doc.filename)}
                      style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: "18px", padding: "2px", transition: "color 0.2s" }}
                      onMouseEnter={e => e.target.style.color = "#ef4444"}
                      onMouseLeave={e => e.target.style.color = "#334155"}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEST CHAT TAB ── */}
        {tab === "test" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "16px" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 24px" }}>
                  <div style={{ width: "52px", height: "52px", background: workspace.primary_color + "22", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${workspace.primary_color}44` }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "22px", color: workspace.primary_color }}>{workspace.agent_name[0]}</span>
                  </div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>Chat with {workspace.agent_name}</p>
                  <p style={{ color: "#475569", fontSize: "13px", maxWidth: "320px", margin: "0 auto" }}>{workspace.welcome_message}</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="msg-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: "8px" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: "30px", height: "30px", background: workspace.primary_color + "22", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", border: `1px solid ${workspace.primary_color}44` }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "13px", color: workspace.primary_color }}>{workspace.agent_name[0]}</span>
                    </div>
                  )}
                  <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{
                      background: msg.role === "user" ? workspace.primary_color : "#0d1117",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                      padding: "12px 16px",
                      border: msg.role === "user" ? "none" : "1px solid #1e293b"
                    }}>
                      <p style={{ fontSize: "14px", color: msg.role === "user" ? "white" : "#d1dce8", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0, fontWeight: 400 }}>
                        {msg.text}
                      </p>
                    </div>
                    {msg.timestamp && (
                      <span style={{ fontSize: "10px", color: "#334155", marginLeft: "8px" }}>
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "30px", height: "30px", background: workspace.primary_color + "22", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${workspace.primary_color}44` }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "13px", color: workspace.primary_color }}>{workspace.agent_name[0]}</span>
                  </div>
                  <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: "4px 16px 16px 16px", padding: "14px 18px", display: "flex", gap: "5px", alignItems: "center" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: workspace.primary_color, animation: "pulse 1.2s ease-in-out infinite", animationDelay: "0s" }} />
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: workspace.primary_color, animation: "pulse 1.2s ease-in-out infinite", animationDelay: "0.2s" }} />
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: workspace.primary_color, animation: "pulse 1.2s ease-in-out infinite", animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ borderTop: "1px solid #0f172a", paddingTop: "16px", display: "flex", gap: "10px" }}>
              <input value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChat()}
                placeholder={`Ask ${workspace.agent_name} anything...`}
                style={{ flex: 1, background: "#0d1117", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px 16px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'DM Sans',sans-serif" }} />
              <button onClick={handleChat} disabled={chatLoading || !question.trim()}
                style={{ background: question.trim() && !chatLoading ? workspace.primary_color : "#0d1117", color: question.trim() && !chatLoading ? "white" : "#334155", border: "1px solid", borderColor: question.trim() && !chatLoading ? "transparent" : "#1e293b", borderRadius: "10px", width: "44px", height: "44px", cursor: question.trim() && !chatLoading ? "pointer" : "not-allowed", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>↑</button>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && analytics && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Total Conversations", value: analytics.total_conversations, icon: "💬" },
                { label: "Answer Rate", value: `${analytics.answered_rate}%`, icon: "📊" },
                { label: "Knowledge Gaps", value: analytics.unanswered_questions.length, icon: "⚠️" },
                { label: "Documents", value: documents.length, icon: "📄" }
              ].map(stat => (
                <div key={stat.label} style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "12px", padding: "20px", transition: "transform 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>{stat.icon}</span>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>{stat.label}</p>
                  </div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: "32px", fontWeight: 800, color: "#f8fafc" }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {analytics.top_questions.length > 0 && (
              <div style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Top Questions 🔥</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {analytics.top_questions.map((q, i) => (
                    <div key={`tq-${i}`} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 14px", background: "#060610", borderRadius: "8px" }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: workspace.primary_color, minWidth: "28px" }}>#{i + 1}</span>
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.unanswered_questions.length > 0 && (
              <div style={{ background: "#0a0a14", border: "1px solid #ef444430", borderRadius: "12px", padding: "24px" }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Knowledge Gaps 🎯</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {analytics.unanswered_questions.map((q, i) => (
                    <div key={`uq-${i}`} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 14px", background: "#060610", borderRadius: "8px" }}>
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "1px", flexShrink: 0 }}>⚠</span>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{q}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "16px", padding: "12px", background: "#060610", borderRadius: "8px", border: "1px solid #1e293b" }}>
                  <p style={{ fontSize: "12px", color: "#475569" }}>
                    💡 <strong>Tip:</strong> Add documents or update your knowledge base to answer these questions.
                  </p>
                </div>
              </div>
            )}

            {analytics.total_conversations === 0 && (
              <div style={{ textAlign: "center", padding: "60px", border: "1.5px dashed #1e293b", borderRadius: "16px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📈</div>
                <p style={{ color: "#334155", fontSize: "14px" }}>No conversations yet.</p>
                <p style={{ color: "#1e293b", fontSize: "12px" }}>Test your agent in the Chat tab to see analytics here</p>
              </div>
            )}
          </div>
        )}

        {/* ── WIDGET TAB ── */}
        {tab === "widget" && (
          <div>
            <div style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "16px", padding: "28px", marginBottom: "20px" }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Embed Script</p>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px", lineHeight: 1.7 }}>
                Copy this script and paste it before the closing
                <code style={{ background: "#060610", padding: "2px 6px", borderRadius: "4px", color: "#0ea572", fontFamily: "'DM Mono',monospace", margin: "0 4px" }}>&lt;/body&gt;</code>
                tag on your website.
              </p>
              <div style={{ background: "#060610", borderRadius: "10px", padding: "16px", border: "1px solid #1e293b", marginBottom: "16px", position: "relative" }}>
                <code style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "#0ea572", wordBreak: "break-all", lineHeight: 1.8 }}>
                  {widgetCode}
                </code>
              </div>
              <button onClick={handleCopy}
                style={{ background: copied ? "#0ea572" : workspace.primary_color, color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "background 0.2s" }}>
                {copied ? "✓ Copied!" : "Copy Script"}
              </button>
            </div>
            
            {/* Interactive Widget Demo */}
            <div style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "16px", padding: "28px" }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Widget Preview (Interactive Demo)</p>
              <p style={{ fontSize: "12px", color: "#475569", marginBottom: "20px" }}>
                This is a live demo of how the widget will appear on your website. Click the button below to test it!
              </p>
              
              {/* Demo Widget */}
              <div style={{ 
                position: "relative", 
                background: "#060610", 
                borderRadius: "12px", 
                padding: "40px 20px", 
                border: "1px solid #1e293b",
                minHeight: "250px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{ textAlign: "center", opacity: 0.5 }}>
                  <p style={{ fontSize: "13px", color: "#475569" }}>⬆️ Your website content appears here ⬆️</p>
                </div>
                
                {/* Demo Widget Button */}
                <div 
                  id="demo-widget-button"
                  onClick={() => {
                    const demoChat = document.getElementById('demo-chat-window');
                    if (demoChat) {
                      demoChat.classList.toggle('open');
                    }
                  }}
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "20px",
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: workspace.primary_color,
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  💬
                </div>
                
                {/* Demo Chat Window */}
                <div 
                  id="demo-chat-window"
                  style={{
                    position: "absolute",
                    bottom: "80px",
                    right: "20px",
                    width: "300px",
                    height: "400px",
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 5px 25px rgba(0,0,0,0.2)",
                    display: "none",
                    flexDirection: "column",
                    overflow: "hidden",
                    zIndex: 100
                  }}
                  className="demo-chat">
                  <div style={{ 
                    background: workspace.primary_color, 
                    color: "white", 
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <strong style={{ fontSize: "14px" }}>{workspace.agent_name}</strong>
                      <p style={{ fontSize: "10px", margin: "2px 0 0", opacity: 0.9 }}>AI Assistant</p>
                    </div>
                    <button 
                      onClick={() => {
                        const demoChat = document.getElementById('demo-chat-window');
                        if (demoChat) demoChat.classList.remove('open');
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        fontSize: "20px",
                        cursor: "pointer",
                        padding: "0",
                        width: "24px",
                        height: "24px"
                      }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px", background: "#f9fafb", fontSize: "12px" }}>
                    <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ background: "#e5e7eb", padding: "8px 12px", borderRadius: "12px", maxWidth: "80%", color: "#1f2937" }}>
                        {workspace.welcome_message}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", background: "white" }}>
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      disabled
                      style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", background: "#f9fafb" }}
                    />
                    <button 
                      disabled
                      style={{ background: workspace.primary_color + "50", color: "white", border: "none", borderRadius: "6px", padding: "8px 12px", cursor: "not-allowed", fontSize: "12px" }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
              
              <p style={{ fontSize: "11px", color: "#334155", textAlign: "center", marginTop: "20px" }}>
                💡 Click the chat button above to see an interactive preview. The actual widget will work the same way on your website!
              </p>
              
              <div style={{ marginTop: "20px", padding: "16px", background: "#060610", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <p style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
                  <strong>📋 Widget Configuration Summary:</strong>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px" }}>
                  <div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#334155" }}>Workspace ID:</span>
                    <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono',monospace" }}>{workspace.workspace_id}</p>
                  </div>
                  <div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#334155" }}>Agent Name:</span>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>{workspace.agent_name}</p>
                  </div>
                  <div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#334155" }}>Primary Color:</span>
                    <p style={{ fontSize: "12px", color: workspace.primary_color }}>{workspace.primary_color}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}