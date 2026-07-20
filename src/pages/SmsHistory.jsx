import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

export default function SmsHistory() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs,    setLogs]    = useState([]);
  const [fetching, setFetching] = useState(true);
  const dm = localStorage.getItem("squadcal_admin_dark") === "true";

  useEffect(() => {
    document.body.classList.toggle("dark", dm);
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return () => unsub();
  }, [dm]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "smsLog"), orderBy("sentAt", "desc"), limit(30)));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error("Failed to load SMS history:", err); }
      finally { setFetching(false); }
    })();
  }, [user]);

  const t = {
    text:      dm ? "#f0f0f0" : "#333",
    textSec:   dm ? "#888"    : "#888",
    textMuted: dm ? "#555"    : "#bbb",
    cardBg:    dm ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)",
    cardBorder:dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    header:    dm ? "#9B94FF" : "#3C3489",
  };

  if (loading) return <div style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>loading…</div>;

  if (!user) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div className="modal-anim" style={{ borderRadius:20, padding:"2rem", textAlign:"center" }}>
        <p style={{ fontSize:15, color:t.text, marginBottom:16 }}>🔐 Admin login required</p>
        <a href="/" style={{ color:"#7F77DD", fontSize:14, fontWeight:600 }}>← go to admin login</a>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"2rem 1rem" }}>
      <div className="page-card">

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:t.header, margin:0 }}>📜 SMS history</h1>
            <p style={{ fontSize:13, color:t.textMuted, marginTop:2 }}>last 30 messages · per-recipient delivery</p>
          </div>
          <a href="/" style={{ fontSize:13, padding:"7px 16px", borderRadius:10, border:`1px solid ${dm ? "rgba(255,255,255,0.15)" : "#ddd"}`, textDecoration:"none", color:t.text, background: dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)" }}>
            ← back
          </a>
        </div>

        {fetching && <p style={{ textAlign:"center", color:t.textMuted, padding:"2rem 0" }}>loading history…</p>}

        {!fetching && logs.length === 0 && (
          <p style={{ textAlign:"center", color:t.textMuted, padding:"2rem 0" }}>No messages sent yet</p>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {logs.map(log => (
            <div key={log.id} style={{ background:t.cardBg, borderRadius:14, padding:"14px 16px", border:`1px solid ${t.cardBorder}`, overflow:"hidden" }}>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                <p style={{ fontSize:14, color:t.text, margin:0, flex:1, lineHeight:1.4, minWidth:0, overflowWrap:"anywhere", wordBreak:"break-word" }}>"{log.message}"</p>
                <span style={{ fontSize:11, background: log.sent===log.total ? "rgba(29,158,117,0.1)" : "rgba(239,159,39,0.1)", color: log.sent===log.total ? "#1D9E75" : "#EF9F27", padding:"2px 8px", borderRadius:10, fontWeight:600, flexShrink:0, whiteSpace:"nowrap" }}>
                  {log.sent}/{log.total} sent
                </span>
              </div>

              {/* Per-recipient results (only for messages sent after this update) */}
              {log.recipients?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:6 }}>
                  {log.recipients.map((r, i) => (
                    <span key={i} style={{
                      fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:600,
                      background: r.success ? "rgba(29,158,117,0.1)"  : "rgba(163,45,45,0.1)",
                      color:      r.success ? "#1D9E75" : "#A32D2D",
                      border:     `1px solid ${r.success ? "rgba(29,158,117,0.3)" : "rgba(163,45,45,0.3)"}`,
                    }}>
                      {r.success ? "✓" : "✕"} {r.name}
                    </span>
                  ))}
                </div>
              )}

              {log.sentAt && (
                <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>
                  {log.sentAt.toDate?.().toLocaleString() || ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}