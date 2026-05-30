import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function SquadBoard() {
  const [pending, setPending] = useState([]);
  const [board,   setBoard]   = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "events"), where("status", "==", "pending")),
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "board"), orderBy("createdAt", "desc")),
      snap => setBoard(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  const announcements = board.filter(b => b.type === "announcement");
  const ideas         = board.filter(b => b.type === "idea");
  const total         = pending.length + board.length;

  if (total === 0) return null;

  return (
    <div style={{ marginTop:24, borderTop:"1px solid rgba(0,0,0,0.06)", paddingTop:20 }}>
      <h3 style={{ fontSize:16, fontWeight:700, color:"#3C3489", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
        Squad Board
        <span style={{ fontSize:12, color:"#aaa", fontWeight:400 }}>ideas · pending · announcements</span>
      </h3>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

        {/* Announcements */}
        {announcements.map(ann => (
          <div key={ann.id} style={{ background:"rgba(127,119,221,0.08)", border:"1.5px solid rgba(127,119,221,0.2)", borderRadius:12, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>📌</span>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:"#3C3489", margin:0 }}>{ann.title}</p>
              {ann.description && <p style={{ fontSize:13, color:"#888", margin:"4px 0 0" }}>{ann.description}</p>}
            </div>
          </div>
        ))}

        {/* Ideas */}
        {ideas.map(idea => (
          <div key={idea.id} style={{ background:"rgba(255,255,255,0.6)", border:"1px solid rgba(0,0,0,0.06)", borderRadius:12, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:"#333", margin:0 }}>{idea.title}</p>
              {idea.description && <p style={{ fontSize:13, color:"#888", margin:"4px 0 0" }}>{idea.description}</p>}
              {idea.who && <p style={{ fontSize:12, color:"#bbb", margin:"4px 0 0" }}>suggested by {idea.who}</p>}
            </div>
          </div>
        ))}

        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ background:"rgba(255,200,100,0.08)", border:"1px solid rgba(255,200,100,0.3)", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>⏳</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#633806", margin:"0 0 8px" }}>
                  {pending.length} plan{pending.length > 1 ? "s" : ""} being reviewed
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {pending.map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#888" }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"#EF9F27", flexShrink:0 }} />
                      <span>{p.title}</span>
                      {p.date && <span style={{ fontSize:11, color:"#bbb" }}>• {p.date}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}