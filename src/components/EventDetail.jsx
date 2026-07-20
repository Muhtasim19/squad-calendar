import { useState, useEffect } from "react";
import { tapLight, tapMedium, buzzSuccess } from "../haptics";
import {
  collection, onSnapshot, addDoc,
  deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

const TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
}

export default function EventDetail({ event, onClose }) {
  const [rsvps,        setRsvps]        = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [nameInput,    setNameInput]    = useState("");
  const [phoneInput,   setPhoneInput]   = useState("");

  const savedName    = localStorage.getItem("squadcal_name")  || "";
  const savedPhone   = localStorage.getItem("squadcal_phone") || "";
  const savedRsvpIds = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
  const myRsvpId     = savedRsvpIds[event.id];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), snap =>
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", event.id, "rsvps"),
      snap => setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [event.id]);

  useEffect(() => {
    if (showRsvpForm) {
      setNameInput(savedName);
      setPhoneInput(savedPhone);
    }

  }, [showRsvpForm]);

  function getColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#E8E8E8", color:"#666" });
  }

  async function rsvpIn(name, phone) {
    buzzSuccess();
    const formattedPhone = phone ? formatPhone(phone) : null;
    const fcmToken       = localStorage.getItem("squadcal_push") || null;

    const rsvpRef = await addDoc(collection(db, "events", event.id, "rsvps"), {
      name,
      phone:     formattedPhone,
      fcmToken,
      timestamp: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      message:    `${name} is going to "${event.title}" 🙋`,
      type:       "rsvp",
      eventTitle: event.title,
      eventId:    event.id,
      createdAt:  serverTimestamp(),
    });

    localStorage.setItem("squadcal_name", name);
    if (formattedPhone) localStorage.setItem("squadcal_phone", formattedPhone);
    const ids = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
    ids[event.id] = rsvpRef.id;
    localStorage.setItem("squadcal_rsvps", JSON.stringify(ids));
    setShowRsvpForm(false);
  }

  async function rsvpOut() {
    tapMedium();
    if (!myRsvpId) return;
    await deleteDoc(doc(db, "events", event.id, "rsvps", myRsvpId));
    const ids = JSON.parse(localStorage.getItem("squadcal_rsvps") || "{}");
    delete ids[event.id];
    localStorage.setItem("squadcal_rsvps", JSON.stringify(ids));
  }

  const isGoing = !!myRsvpId && rsvps.some(r => r.id === myRsvpId);
  const c       = getColor(event.type);

  // ── Multi-day aware date display ──
  const fmt  = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  const endD = event.endDate && event.endDate !== event.date ? event.endDate : null;
  const dateStr = endD
    ? `${fmt(event.date)} – ${fmt(endD)}`
    : new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  const mapUrl = event.lat && event.lng
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+7F77DD(${event.lng},${event.lat})/${event.lng},${event.lat},14,0/400x160?access_token=${TOKEN}`
    : null;

  return (
      <div
          className="sheet-overlay"
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={e => e.target === e.currentTarget && onClose()}
      >
      
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700 }}>
              {event.type}
            </span>
            <h2 style={{ fontSize:20, fontWeight:700, color:"#222", marginTop:8, marginBottom:0 }}>
              {event.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb", lineHeight:1 }}>✕</button>
        </div>

        {/* Details */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:14, color:"#666", marginBottom:16 }}>
          <span>
            📅 {dateStr}
            {event.allDay
              ? " · all-day"
              : event.time ? ` at ${event.time}${event.endTime ? `–${event.endTime}` : ""}` : ""}
          </span>
          {event.location && <span>📍 {event.location}</span>}
          {event.note     && <span>📝 {event.note}</span>}
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
            ) : !showRsvpForm ? (
              <button onClick={() => setShowRsvpForm(true)} style={{ padding:"7px 16px", borderRadius:20, background:"#7F77DD", color:"#fff", border:"none", fontSize:13, cursor:"pointer", fontWeight:700 }}>
                I'm in! 🙋
              </button>
            ) : null}
          </div>

          {/* RSVP form */}
          {showRsvpForm && (
            <div style={{ background:"rgba(127,119,221,0.05)", borderRadius:12, padding:"1rem", marginBottom:12, border:"1px solid rgba(127,119,221,0.15)" }}>
              {savedName ? (
                <p style={{ fontSize:13, color:"#555", marginBottom:10 }}>
                  Going as <strong style={{ color:"#3C3489" }}>{savedName}</strong>
                </p>
              ) : (
                <>
                  <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>your name</label>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="what's your name?" autoFocus style={{ marginBottom:10 }} />
                </>
              )}

              <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>
                📱 phone for 24h reminder <span style={{ color:"#ccc" }}>(optional)</span>
              </label>
              <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="(555) 123-4567" type="tel" style={{ marginBottom:6 }} />
              <p style={{ fontSize:11, color:"#ccc", marginBottom:12 }}>US numbers only. We'll text you 24h before.</p>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setShowRsvpForm(false)} style={{ flex:1, padding:8, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
                <button
                  onClick={() => {
                    const name = savedName || nameInput.trim();
                    if (!name) return alert("Please enter your name!");
                    rsvpIn(name, phoneInput);
                  }}
                  style={{ flex:2, padding:8, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}
                >
                  I'm in! 🙋
                </button>
              </div>
            </div>
          )}

          {/* Attendee list */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
            {rsvps.map(r => (
              <span key={r.id} style={{
                background: r.id === myRsvpId ? "#EEEDFE" : "#f5f5f5",
                color:      r.id === myRsvpId ? "#3C3489" : "#555",
                padding:"4px 12px", borderRadius:20, fontSize:13,
                fontWeight: r.id === myRsvpId ? 700 : 400,
                display:"flex", alignItems:"center", gap:4,
              }}>
                {r.id === myRsvpId ? "✓ " : ""}{r.name}
                {r.phone    && <span style={{ fontSize:10, color:"#bbb" }}>📱</span>}
                {r.fcmToken && <span style={{ fontSize:10, color:"#bbb" }}>🔔</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}