import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "../firebase";

const ICONS = { approved:"✅", rsvp:"🙋", new_plan:"📋" };

function timeAgo(ts) {
  if (!ts) return "";
  const diff = (Date.now() - ts.toDate().getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [readIds, setReadIds] = useState(() => JSON.parse(localStorage.getItem("squadcal_read") || "[]"));
  const ref = useRef(null);

  const dm = document.body.classList.contains("dark");

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  // Close when clicking/tapping outside
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, []);

  function markRead(ids) {
    const merged = [...new Set([...readIds, ...ids])];
    localStorage.setItem("squadcal_read", JSON.stringify(merged));
    setReadIds(merged);
  }

  function handleOpen() {
    setOpen(!open);
    if (!open) markRead(notifs.map(n => n.id));
  }

  const unread = notifs.filter(n => !readIds.includes(n.id)).length;

  // Theme
  const panelBg     = dm ? "rgba(28,26,44,0.98)"      : "rgba(255,255,255,0.97)";
  const panelBorder = dm ? "rgba(255,255,255,0.1)"    : "#eee";
  const headBorder  = dm ? "rgba(255,255,255,0.08)"   : "#f0f0f0";
  const rowBorder   = dm ? "rgba(255,255,255,0.05)"   : "#f9f9f9";
  const titleColor  = dm ? "#9B94FF"                  : "#3C3489";
  const textColor   = dm ? "#e8e8e8"                  : "#333";
  const mutedColor  = dm ? "#666"                     : "#bbb";

  return (
    <div ref={ref} style={{ position:"relative" }}>
      {/* Bell */}
      <button onClick={handleOpen} style={{ position:"relative", width:38, height:38, borderRadius:"50%", border:`1px solid ${dm ? "rgba(255,255,255,0.15)" : "#ddd"}`, background: dm ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, backdropFilter:"blur(8px)" }}>
        🔔
        {unread > 0 && (
          <span style={{ position:"absolute", top:1, right:1, background:"#E53E3E", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown — fixed & viewport-clamped so it never overflows on mobile */}
      {open && (
        <div className="modal-anim" style={{
          position:"fixed",
          top:110,
          left:"50%",
          transform:"translateX(-50%)",
          width:"min(340px, calc(100vw - 24px))",
          background:panelBg,
          backdropFilter:"blur(16px)",
          WebkitBackdropFilter:"blur(16px)",
          borderRadius:16,
          border:`1px solid ${panelBorder}`,
          boxShadow:"0 16px 48px rgba(0,0,0,0.3)",
          zIndex:300,
          overflow:"hidden",
        }}>

          {/* Header */}
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${headBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:14, color:titleColor }}>Notifications</span>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              {notifs.length > 0 && (
                <button onClick={() => markRead(notifs.map(n => n.id))} style={{ fontSize:11, color:"#7F77DD", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
                  mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:mutedColor, lineHeight:1, padding:0 }}>✕</button>
            </div>
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div style={{ padding:"2rem", textAlign:"center", color:mutedColor, fontSize:13 }}>No notifications yet</div>
          ) : (
            <div style={{ maxHeight:"min(340px, 55vh)", overflowY:"auto" }}>
              {notifs.map(n => {
                const isRead = readIds.includes(n.id);
                return (
                  <div key={n.id} onClick={() => markRead([n.id])} style={{ padding:"12px 16px", borderBottom:`1px solid ${rowBorder}`, background: isRead ? "transparent" : "rgba(127,119,221,0.08)", cursor:"pointer", display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{ICONS[n.type] || "📣"}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, color:textColor, margin:0, lineHeight:1.4, overflowWrap:"anywhere" }}>{n.message}</p>
                      <span style={{ fontSize:11, color:mutedColor, marginTop:3, display:"block" }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    {!isRead && <div style={{ width:8, height:8, borderRadius:"50%", background:"#7F77DD", flexShrink:0, marginTop:4 }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}