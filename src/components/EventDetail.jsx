import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

export default function EventDetail({ event, getCatColor, onClose }) {
  const [rsvps,         setRsvps]         = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput,     setNameInput]     = useState("");

  const savedName   = localStorage.getItem("squadcal_name") || "";
  const savedRsvpIds = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
  const myRsvpId    = savedRsvpIds[event.id];

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", event.id, "rsvps"),
      snap => setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [event.id]);

  async function rsvpIn(name) {
    const ref = await addDoc(collection(db, "events", event.id, "rsvps"), {
      name, timestamp: serverTimestamp()
    });
    localStorage.setItem("squadcal_name", name);
    const ids = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
    ids[event.id] = ref.id;
    localStorage.setItem("squadcal_rsvps", JSON.stringify(ids));
    setShowNameInput(false);
    setNameInput("");
  }

  async function rsvpOut() {
    if (!myRsvpId) return;
    await deleteDoc(doc(db, "events", event.id, "rsvps", myRsvpId));
    const ids = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
    delete ids[event.id];
    localStorage.setItem("squadcal_rsvps", JSON.stringify(ids));
  }

  const isGoing = !!myRsvpId && rsvps.some(r => r.id === myRsvpId);
  const c       = getCatColor(event.type);
  const dateStr = new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });
  const mapUrl = event.lat && event.lng
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+7F77DD(${event.lng},${event.lat})/${event.lng},${event.lat},14,0/400x160?access_token=${TOKEN}`
    : null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700 }}>{event.type}</span>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#222", marginTop:8, marginBottom:0 }}>{event.title}</h2>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb", lineHeight:1 }}>✕</button>
        </div>

        {/* Details */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:14, color:"#666", marginBottom:16 }}>
          <span>📅 {dateStr}{event.time ? ` at ${event.time}` : ""}</span>
          {event.location && <span>📍 {event.location}</span>}
          {event.who  && <span>👥 {event.who}</span>}
          {event.note && <span>📝 {event.note}</span>}
        </div>

        {/* Map */}
        {mapUrl && (
          <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid #eee", marginBottom:20 }}>
            <img src={mapUrl} alt="event location" style={{ width:"100%", display:"block" }} />
          </div>
        )}

        {/* RSVP */}
        <div style={{ borderTop:"1px solid #eee", paddingTop:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontWeight:700, fontSize:15, color:"#333" }}>
              {rsvps.length === 0 ? "Be the first!" : `${rsvps.length} going`}
            </span>
            {isGoing ? (
              <button onClick={rsvpOut} style={{ padding:"7px 16px", borderRadius:20, border:"1px solid #F09595", background:"none", color:"#A32D2D", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                I'm out
              </button>
            ) : (
              <button onClick={() => { if (savedName) rsvpIn(savedName); else setShowNameInput(true); }}
                style={{ padding:"7px 16px", borderRadius:20, background:"#7F77DD", color:"#fff", border:"none", fontSize:13, cursor:"pointer", fontWeight:700 }}>
                I'm in! 🙋
              </button>
            )}
          </div>

          {showNameInput && (
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="what's your name?" autoFocus
                onKeyDown={e => e.key === "Enter" && nameInput.trim() && rsvpIn(nameInput.trim())} style={{ flex:1 }} />
              <button onClick={() => nameInput.trim() && rsvpIn(nameInput.trim())}
                style={{ padding:"6px 14px", borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", cursor:"pointer", fontWeight:700 }}>go</button>
            </div>
          )}

          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
            {rsvps.map(r => (
              <span key={r.id} style={{ background: r.id === myRsvpId ? "#EEEDFE" : "#f5f5f5", color: r.id === myRsvpId ? "#3C3489" : "#555", padding:"4px 12px", borderRadius:20, fontSize:13, fontWeight: r.id === myRsvpId ? 700 : 400 }}>
                {r.id === myRsvpId ? "✓ " : ""}{r.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}