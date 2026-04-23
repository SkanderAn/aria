"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

export default function Dashboard() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    agent_name: "Aria",
    welcome_message: "Hello! How can I help you today?",
    primary_color: "#1A56DB"
  });

  useEffect(() => { fetchWorkspaces(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${API}/workspaces`);
      const data = await res.json();
      setWorkspaces(data);
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
      showToast("Failed to fetch workspaces", "error");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.business_name) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setWorkspaces(prev => [...prev, data]);
      setShowForm(false);
      setForm({ name: "", business_name: "", agent_name: "Aria", welcome_message: "Hello! How can I help you today?", primary_color: "#1A56DB" });
      showToast(`Workspace "${data.name}" created successfully!`, "success");
    } catch (e) {
      showToast("Failed to create workspace", "error");
    }
    setCreating(false);
  };

  const handleDeleteClick = (workspace) => {
    setWorkspaceToDelete(workspace);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!workspaceToDelete) return;
    try {
      await fetch(`${API}/workspaces/${workspaceToDelete.workspace_id}`, { method: "DELETE" });
      setWorkspaces(prev => prev.filter(w => w.workspace_id !== workspaceToDelete.workspace_id));
      showToast(`Deleted "${workspaceToDelete.business_name}"`, "success");
    } catch (error) {
      showToast("Delete failed", "error");
    }
    setShowDeleteModal(false);
    setWorkspaceToDelete(null);
  };

  // Delete Confirmation Modal Component
  const DeleteModal = () => {
    if (!showDeleteModal) return null;
    
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
      }} onClick={() => setShowDeleteModal(false)}>
        <div style={{
          background: "#0a0a14",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
        }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "48px" }}>🗑️</span>
          </div>
          <h3 style={{ fontSize: "18px", color: "#f8fafc", marginBottom: "12px", textAlign: "center" }}>Delete Workspace?</h3>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px", textAlign: "center" }}>
            Are you sure you want to delete <strong style={{ color: "#f8fafc" }}>{workspaceToDelete?.business_name}</strong>?
          </p>
          <p style={{ fontSize: "12px", color: "#475569", marginBottom: "24px", textAlign: "center" }}>
            This will permanently delete all documents and conversations.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => setShowDeleteModal(false)}
              style={{
                background: "transparent",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "10px 24px",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500
              }}>
              Cancel
            </button>
            <button onClick={confirmDelete}
              style={{
                background: "#ef4444",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500
              }}>
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={{ minHeight: "100vh", background: "#060610", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input { outline: none; }
        .card:hover { border-color: #1A56DB55 !important; transform: translateY(-2px); }
        .btn-primary { transition: all 0.2s; }
        .btn-primary:hover { background: #1650c0 !important; }
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          z-index: 1001;
          animation: slideUp 0.3s ease;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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

      {/* Delete Confirmation Modal */}
      <DeleteModal />

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid #0f172a", padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(6,6,16,0.95)", backdropFilter: "blur(12px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#1A56DB,#0ea572)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 12L6 8L9 10L12 6L14 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="4" r="1.5" fill="white"/></svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "17px", color: "#f8fafc" }}>Aria</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#1A56DB", background: "#1A56DB12", border: "1px solid #1A56DB25", padding: "2px 6px", borderRadius: "4px" }}>DASHBOARD</span>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}
          style={{ background: "#1A56DB", color: "white", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          + New Workspace
        </button>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>

        {/* HERO */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px", marginBottom: "8px" }}>
            Your Workspaces
          </h1>
          <p style={{ color: "#475569", fontSize: "14px" }}>
            Each workspace is an isolated AI agent trained on your business documents.
          </p>
        </div>

        {/* CREATE FORM */}
        {showForm && (
          <div style={{ background: "#0a0a14", border: "1px solid #1A56DB44", borderRadius: "16px", padding: "28px", marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginBottom: "20px" }}>Create new workspace</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px", marginBottom: "20px" }}>
              {[
                { label: "Workspace name *", key: "name", placeholder: "e.g. My Store Support" },
                { label: "Business name *", key: "business_name", placeholder: "e.g. Skander Store" },
                { label: "Agent name", key: "agent_name", placeholder: "e.g. Sara" },
                { label: "Welcome message", key: "welcome_message", placeholder: "Hello! How can I help?" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", background: "#060610", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px", color: "#e2e8f0", fontSize: "13px", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn-primary" onClick={handleCreate} disabled={creating}
                style={{ background: "#1A56DB", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: creating ? 0.7 : 1 }}>
                {creating ? "Creating..." : "Create Workspace"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background: "transparent", color: "#64748b", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* WORKSPACES GRID */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#334155", fontFamily: "'DM Mono',monospace", fontSize: "13px" }}>Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", border: "1.5px dashed #1e293b", borderRadius: "16px" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>No workspaces yet</div>
            <p style={{ color: "#334155", fontSize: "14px", marginBottom: "24px" }}>Create your first workspace to start training your AI agent.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}
              style={{ background: "#1A56DB", color: "white", border: "none", borderRadius: "8px", padding: "12px 28px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              + Create your first workspace
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "16px" }}>
            {workspaces.map(w => (
              <div key={w.workspace_id} className="card"
                style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "16px", padding: "24px", cursor: "pointer", transition: "all 0.2s", position: "relative" }}
                onClick={() => router.push(`/dashboard/${w.workspace_id}`)}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ width: "40px", height: "40px", background: w.primary_color + "22", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${w.primary_color}44` }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "16px", color: w.primary_color }}>
                      {w.agent_name[0]}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDeleteClick(w); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", fontSize: "20px", padding: "4px 8px", transition: "color 0.2s", borderRadius: "6px" }}
                    onMouseEnter={e => { e.target.style.color = "#ef4444"; e.target.style.background = "#ef444410"; }}
                    onMouseLeave={e => { e.target.style.color = "#334155"; e.target.style.background = "none"; }}>
                    ×
                  </button>
                </div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>{w.business_name}</h3>
                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>{w.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0ea572" }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569" }}>Agent: {w.agent_name}</span>
                </div>
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#334155" }}>{w.workspace_id}</span>
                  <span style={{ fontSize: "12px", color: "#1A56DB", fontWeight: 500 }}>Open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}