import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "5-minute setup",
    desc: "Upload your docs or paste your website URL. Your AI agent is ready instantly — no technical knowledge required."
  },
  {
    icon: "🧠",
    title: "Trained on your content",
    desc: "Aria learns from your specific documents, FAQs, and website. It answers like it knows your business inside out."
  },
  {
    icon: "💬",
    title: "Natural conversations",
    desc: "Customers chat naturally. Aria understands context, remembers the conversation, and gives precise answers."
  },
  {
    icon: "📊",
    title: "Analytics dashboard",
    desc: "See what customers ask most, track answer rates, and discover gaps in your knowledge base."
  },
  {
    icon: "🔌",
    title: "One line of code",
    desc: "Copy one script tag and paste it on your website. The chat widget appears instantly, no developer needed."
  },
  {
    icon: "🔒",
    title: "Fully isolated",
    desc: "Each business gets its own private knowledge base. Your data never mixes with anyone else's."
  }
];

const steps = [
  { num: "01", title: "Create a workspace", desc: "Sign up and create a workspace for your business in seconds." },
  { num: "02", title: "Upload your content", desc: "Add PDFs, product docs, FAQs, or paste your website URL. Aria ingests everything automatically." },
  { num: "03", title: "Deploy the widget", desc: "Copy one line of code, paste it on your website. Your AI agent goes live immediately." },
];

export default function Landing() {
  return (
    <main style={{ background: "#060610", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #1A56DB25; color: #1A56DB; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; }
        .nav-link { color: #475569; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: #e2e8f0; }
        .cta-primary { background: #1A56DB; color: white; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; transition: all 0.2s; display: inline-block; font-family: 'DM Sans', sans-serif; }
        .cta-primary:hover { background: #1650c0; transform: translateY(-1px); }
        .cta-secondary { border: 1px solid #1e293b; color: #94a3b8; font-weight: 500; font-size: 14px; padding: 12px 28px; border-radius: 10px; transition: all 0.2s; display: inline-block; font-family: 'DM Sans', sans-serif; }
        .cta-secondary:hover { border-color: #1A56DB55; color: #1A56DB; }
        .feature-card { background: #0a0a14; border: 1px solid #0f172a; border-radius: 14px; padding: 24px; transition: border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: #1e293b; transform: translateY(-2px); }
        .step-card { background: #0a0a14; border: 1px solid #0f172a; border-radius: 14px; padding: 28px; }
        .grid-bg { background-image: linear-gradient(#1e293b08 1px, transparent 1px), linear-gradient(90deg, #1e293b08 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #0f172a", background: "rgba(6,6,16,0.92)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#1A56DB,#0ea572)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 12L6 8L9 10L12 6L14 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="4" r="1.5" fill="white"/></svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "17px", color: "#f8fafc" }}>Aria</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#1A56DB", background: "#1A56DB12", border: "1px solid #1A56DB25", padding: "2px 6px", borderRadius: "4px" }}>BETA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <Link href="/dashboard" className="cta-primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px", position: "relative" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: "500px", height: "250px", background: "#1A56DB06", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "760px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#0d1117", border: "1px solid #1e293b", borderRadius: "999px", padding: "6px 14px", marginBottom: "32px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0ea572" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#64748b" }}>Powered by LLaMA 3.3 70B via Groq</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(40px,8vw,76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", color: "#f8fafc", marginBottom: "24px" }}>
            Your AI support agent<br />
            <span style={{ WebkitTextStroke: "1.5px #1e293b", color: "transparent" }}>live in 5 minutes</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "#475569", maxWidth: "520px", margin: "0 auto 40px", lineHeight: 1.8 }}>
            Upload your business documents, train your AI agent, and deploy a chat widget on your website — no code, no setup, no data scientist needed.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="cta-primary">Start for free →</Link>
            <a href="#how-it-works" className="cta-secondary">See how it works</a>
          </div>
          <p style={{ marginTop: "20px", fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#1e293b" }}>
            No account required · No credit card · Free to use
          </p>
        </div>

        {/* Mock UI preview */}
        <div style={{ marginTop: "72px", width: "100%", maxWidth: "820px", background: "#0a0a14", border: "1px solid #1e293b", borderRadius: "16px", overflow: "hidden", position: "relative", zIndex: 1 }}>
          <div style={{ background: "#060610", borderBottom: "1px solid #0f172a", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
            {["#ef4444","#f59e0b","#0ea572"].map(c => (
              <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, opacity: 0.7 }} />
            ))}
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#334155", marginLeft: "8px" }}>aria.app/dashboard</span>
          </div>
          <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", minHeight: "260px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ border: "1.5px dashed #1A56DB40", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#1A56DB", fontWeight: 500, marginBottom: "2px" }}>product-manual.pdf</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#334155" }}>342 chunks</p>
              </div>
              {["product", "pricing", "returns", "support"].map(col => (
                <div key={col} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "6px", background: "#0d1117" }}>
                  <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#1A56DB" }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#475569" }}>{col}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#060610", border: "1px solid #0f172a", borderRadius: "10px", padding: "12px 14px" }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#1A56DB", marginBottom: "6px" }}>ARIA AGENT</p>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.7 }}>
                  Our <strong style={{ color: "#e2e8f0" }}>Pro plan</strong> includes unlimited storage and priority support at <strong style={{ color: "#e2e8f0" }}>$49/month</strong>. You can upgrade anytime from your dashboard.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "#1A56DB", borderRadius: "12px 12px 4px 12px", padding: "8px 14px", maxWidth: "70%" }}>
                  <p style={{ fontSize: "13px", color: "white", fontWeight: 500 }}>What does the Pro plan include?</p>
                </div>
              </div>
              <div style={{ background: "#0a0a14", border: "1px solid #0f172a", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#334155", flex: 1 }}>Ask anything about our products...</span>
                <div style={{ width: "28px", height: "28px", background: "#1A56DB", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: "14px", fontWeight: 700 }}>↑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ maxWidth: "1100px", margin: "0 auto", padding: "100px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#1A56DB", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>Features</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px", marginBottom: "16px" }}>Everything you need to support your customers</h2>
          <p style={{ color: "#475569", fontSize: "16px", maxWidth: "480px", margin: "0 auto" }}>No complex setup. No expensive subscriptions. Just results.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "16px" }}>
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: "24px", marginBottom: "14px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "15px", fontWeight: 500, color: "#f8fafc", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: "#0a0a14", borderTop: "1px solid #0f172a", borderBottom: "1px solid #0f172a", padding: "100px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#1A56DB", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>How it works</p>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px" }}>Three steps to your AI agent</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "20px" }}>
            {steps.map((s, i) => (
              <div key={s.num} className="step-card">
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "40px", fontWeight: 800, color: "#0f172a", lineHeight: 1, display: "block", marginBottom: "20px" }}>{s.num}</span>
                <h3 style={{ fontSize: "16px", fontWeight: 500, color: "#f8fafc", marginBottom: "10px" }}>{s.title}</h3>
                <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.8 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,5vw,52px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px", marginBottom: "20px" }}>
          Ready to deploy your AI agent?
        </h2>
        <p style={{ color: "#475569", fontSize: "16px", maxWidth: "400px", margin: "0 auto 36px", lineHeight: 1.7 }}>
          Free to start. No credit card. Your agent live in 5 minutes.
        </p>
        <Link href="/dashboard" className="cta-primary" style={{ fontSize: "16px", padding: "14px 36px" }}>
          Start for free →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #0f172a", padding: "32px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", background: "linear-gradient(135deg,#1A56DB,#0ea572)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 12L6 8L9 10L12 6L14 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "14px", color: "#f8fafc" }}>Aria</span>
          </div>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#1e293b" }}>
            Built by <a href="https://github.com/SkanderAn" style={{ color: "#334155" }}>Skander Andolsi</a> · Powered by LangChain + Groq
          </p>
        </div>
      </footer>
    </main>
  );
}