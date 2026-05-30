import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import AdminCalendar from "./AdminCalendar";

const PALETTE = [
  { bg:"#CECBF6", color:"#3C3489", label:"purple" },
  { bg:"#9FE1CB", color:"#085041", label:"teal"   },
  { bg:"#FAC775", color:"#633806", label:"amber"  },
  { bg:"#F4C0D1", color:"#72243E", label:"pink"   },
  { bg:"#B5D4F4", color:"#0C447C", label:"blue"   },
  { bg:"#C0DD97", color:"#27500A", label:"green"  },
  { bg:"#F5C4B3", color:"#712B13", label:"coral"  },
];

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

// ── RsvpCount ──
function RsvpCount({ eventId }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,"events",eventId,"rsvps"), snap => setCount(snap.size));
    return () => unsub();
  }, [eventId]);
  return count > 0 ? (
    <span style={{ background:"#EEEDFE", color:"#3C3489", fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:600 }}>🙋 {count} going</span>
  ) : null;
}

// ── RsvpList ──
function RsvpList({ eventId }) {
  const [rsvps, setRsvps] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,"events",eventId,"rsvps"), snap =>
      setRsvps(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    return () => unsub();
  }, [eventId]);
  if (rsvps.length === 0) return <p style={{ fontSize:13, color:"#bbb", margin:0 }}>No RSVPs yet</p>;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {rsvps.map(r => (
        <div key={r.id} style={{ background:"#f5f5f5", borderRadius:20, padding:"4px 12px", fontSize:13, display:"flex", alignItems:"center", gap:4 }}>
          <span>{r.name}</span>
          {r.phone    && <span style={{ fontSize:10, color:"#bbb" }}>📱</span>}
          {r.fcmToken && <span style={{ fontSize:10, color:"#bbb" }}>🔔</span>}
        </div>
      ))}
    </div>
  );
}

// ── Edit event modal ──
function EditEventModal({ event, onClose, dm, t }) {
  const [title,    setTitle]    = useState(event.title    || "");
  const [date,     setDate]     = useState(event.date     || "");
  const [time,     setTime]     = useState(event.time     || "");
  const [location, setLocation] = useState(event.location || "");
  const [who,      setWho]      = useState(event.who      || "");
  const [note,     setNote]     = useState(event.note     || "");
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    if (!title || !date) return alert("Title and date are required!");
    setSaving(true);
    try {
      await updateDoc(doc(db,"events",event.id), { title, date, time, location, who, note });
      onClose();
    } catch (err) { alert("Save failed: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ borderRadius:20, padding:"1.75rem", width:400, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color: dm ? "#9B94FF" : "#3C3489" }}>edit event</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom:12 }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>time</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
          </div>
        </div>
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>location</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{ marginBottom:12 }} />
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>who's coming</label>
        <input value={who} onChange={e=>setWho(e.target.value)} style={{ marginBottom:12 }} />
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ resize:"vertical", height:64, marginBottom:16 }} />
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
            {saving ? "saving…" : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan It modal ──
function PlanItModal({ item, categories, onClose, dm, t }) {
  const [noDate,   setNoDate]   = useState(false);
  const [title,    setTitle]    = useState(item.title       || "");
  const [date,     setDate]     = useState("");
  const [time,     setTime]     = useState("");
  const [location, setLocation] = useState(item.location    || "");
  const [category, setCategory] = useState("hangout");
  const [who,      setWho]      = useState(item.who         || "");
  const [note,     setNote]     = useState(item.description || "");
  const [saving,   setSaving]   = useState(false);

  const cats = [
    { name:"hangout", color:{ bg:"#EEEDFE", color:"#3C3489" } },
    { name:"trip",    color:{ bg:"#E1F5EE", color:"#085041" } },
    { name:"sports",  color:{ bg:"#FAEEDA", color:"#633806" } },
    ...(categories || []),
  ];

  async function handleSubmit() {
    if (!noDate && !date) return alert("Please add a date!");
    setSaving(true);
    try {
      if (noDate) {
        // Mark as being planned — stays on board
        await updateDoc(doc(db,"board",item.id), {
          status:      "being_planned",
          location:    location.trim(),
          description: note.trim(),
          updatedAt:   serverTimestamp(),
        });
      } else {
        // Create approved event + remove from board + notify
        await addDoc(collection(db,"events"), {
          title: title.trim(), date, time,
          location: location.trim(),
          type: category,
          who: who.trim(),
          note: note.trim(),
          status: "approved",
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db,"notifications"), {
          message:    `"${title}" has been planned for ${date}! 🎉`,
          type:       "approved",
          eventTitle: title,
          createdAt:  serverTimestamp(),
        });
        await deleteDoc(doc(db,"board",item.id));
      }
      onClose();
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color: dm ? "#9B94FF" : "#3C3489" }}>📅 plan it</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom:14 }} />

        {/* No date toggle */}
        <div
          onClick={() => setNoDate(!noDate)}
          style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 12px", borderRadius:12, background: noDate ? "rgba(127,119,221,0.1)" : (dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"), border:`1.5px solid ${noDate ? "rgba(127,119,221,0.3)" : t.border}`, cursor:"pointer", transition:"all 0.15s" }}
        >
          <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${noDate ? "#7F77DD" : t.border}`, background: noDate ? "#7F77DD" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
            {noDate && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color: noDate ? "#7F77DD" : t.text, margin:0 }}>📋 date not fixed yet</p>
            <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>keeps it on the board as "being planned"</p>
          </div>
        </div>

        {/* Date fixed fields */}
        {!noDate && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>time (optional)</label>
                <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
              </div>
            </div>

            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:6 }}>category</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {cats.map(c => (
                <button key={c.name} onClick={() => setCategory(c.name)} style={{
                  padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
                  background: category===c.name ? c.color.bg : "none",
                  color:      category===c.name ? c.color.color : t.textSec,
                  border:     `1.5px solid ${category===c.name ? c.color.color : t.border}`,
                  fontWeight: category===c.name ? 700 : 400, transition:"all 0.15s",
                }}>{c.name}</button>
              ))}
            </div>
          </>
        )}

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>location (optional)</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="park, venue…" style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>who's coming</label>
        <input value={who} onChange={e=>setWho(e.target.value)} placeholder="Jake, Sam…" style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ height:60, resize:"vertical", marginBottom:16 }} />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background: noDate ? "#7F77DD" : "#1D9E75", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
            {saving ? "saving…" : noDate ? "🔄 mark as being planned" : "✅ plan it!"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ──
export default function AdminPanel({ darkMode = false }) {
  const dm = darkMode;

  // ── Theme ──
  const t = {
    text:     dm ? "#f0f0f0" : "#333",
    textSec:  dm ? "#888"    : "#888",
    textMuted:dm ? "#555"    : "#bbb",
    cardBg:   dm ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)",
    cardBorder:dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    tabBg:    dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    tabBorder:dm ? "rgba(255,255,255,0.12)" : "#ddd",
    formBg:   dm ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border:   dm ? "rgba(255,255,255,0.12)" : "#ddd",
    emptyColor:dm ? "#555" : "#bbb",
  };

  const [pending,       setPending]       = useState([]);
  const [approved,      setApproved]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [boardItems,    setBoardItems]    = useState([]);
  const [subscribers,   setSubscribers]   = useState([]);
  const [tab,           setTab]           = useState("calendar");
  const [newName,       setNewName]       = useState("");
  const [newColor,      setNewColor]      = useState(PALETTE[0]);
  const [addingCat,     setAddingCat]     = useState(false);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [expandedRsvps, setExpandedRsvps] = useState(null);
  const [addingBoard,   setAddingBoard]   = useState(false);
  const [boardType,     setBoardType]     = useState("announcement");
  const [boardTitle,    setBoardTitle]    = useState("");
  const [boardDesc,     setBoardDesc]     = useState("");
  const [boardWho,      setBoardWho]      = useState("");
  const [planningItem,  setPlanningItem]  = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,"events"), where("status","==","pending")),  s => setPending(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(query(collection(db,"events"), where("status","==","approved")), s => setApproved(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,"categories"), s => setCategories(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u4 = onSnapshot(query(collection(db,"board"), orderBy("createdAt","desc")), s => setBoardItems(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u5 = onSnapshot(collection(db,"fcmTokens"), s => setSubscribers(s.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  async function approve(id) {
    const ev = pending.find(e => e.id === id);
    await updateDoc(doc(db,"events",id), { status:"approved" });
    if (ev) {
      await addDoc(collection(db,"notifications"), {
        message:`"${ev.title}" has been approved! 🎉`, type:"approved",
        eventTitle:ev.title, eventId:id, createdAt:serverTimestamp(),
      });
    }
  }

  const reject           = id => deleteDoc(doc(db,"events",id));
  const remove           = id => deleteDoc(doc(db,"events",id));
  const deleteCat        = id => deleteDoc(doc(db,"categories",id));
  const deleteBoardItem  = id => deleteDoc(doc(db,"board",id));
  const deleteSubscriber = id => deleteDoc(doc(db,"fcmTokens",id));

  async function addCat() {
    if (!newName.trim()) return;
    await addDoc(collection(db,"categories"), { name:newName.trim().toLowerCase(), color:newColor });
    setNewName(""); setAddingCat(false);
  }

  async function addBoardItem() {
    if (!boardTitle.trim()) return;
    await addDoc(collection(db,"board"), {
      type:boardType, title:boardTitle.trim(), description:boardDesc.trim(),
      who:boardWho.trim(), pinned:boardType==="announcement", createdAt:serverTimestamp(),
    });
    setBoardTitle(""); setBoardDesc(""); setBoardWho(""); setAddingBoard(false);
  }

  function getCatColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#eee", color:"#555" });
  }

  const events = tab === "pending" ? pending : approved;

  const TABS = [
    { key:"calendar",    label:"📅 calendar" },
    { key:"pending",     label:`pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key:"approved",    label:"approved" },
    { key:"board",       label:"board" },
    { key:"subscribers", label:"subscribers" },
    { key:"categories",  label:"categories" },
  ];

  return (
    <div>

      {/* ── Calendar ── */}
      {tab === "calendar" && <AdminCalendar darkMode={dm} />}

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:6, marginBottom:"1.5rem", overflowX:"auto", paddingBottom:4, scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {TABS.map(t_ => (
          <button key={t_.key} onClick={() => setTab(t_.key)} style={{
            padding:"7px 16px", borderRadius:20, fontSize:13, cursor:"pointer",
            whiteSpace:"nowrap", flexShrink:0,
            background: tab===t_.key ? "#7F77DD" : t.tabBg,
            color:      tab===t_.key ? "#fff" : t.textSec,
            border:     tab===t_.key ? "none" : `1px solid ${t.tabBorder}`,
            fontWeight: tab===t_.key ? 700 : 400,
            backdropFilter:"blur(8px)",
          }}>{t_.label}</button>
        ))}
      </div>

      {/* ── Events (pending + approved) ── */}
      {(tab === "pending" || tab === "approved") && (
        <>
          {events.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem 0", color:t.emptyColor, fontSize:14 }}>
              {tab === "pending" ? "No plans waiting for approval 🎉" : "No approved plans yet"}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.map(ev => {
              const c          = getCatColor(ev.type);
              const isExpanded = expandedRsvps === ev.id;
              return (
                <div key={ev.id} style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:12, padding:"1rem 1.25rem", backdropFilter:"blur(8px)", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700 }}>{ev.type}</span>
                        <span style={{ fontWeight:700, fontSize:15, color:t.text }}>{ev.title}</span>
                        <RsvpCount eventId={ev.id} />
                      </div>
                      <div style={{ fontSize:13, color:t.textSec, display:"flex", flexDirection:"column", gap:3 }}>
                        <span>📅 {ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
                        {ev.location && <span>📍 {ev.location}</span>}
                        {ev.who      && <span>👥 {ev.who}</span>}
                        {ev.note     && <span>📝 {ev.note}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      {tab === "pending" ? (
                        <>
                          <button onClick={() => approve(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"#1D9E75", color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>✓ approve</button>
                          <button onClick={() => reject(ev.id)}  style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>✕ reject</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingEvent(ev)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${dm ? "rgba(127,119,221,0.5)" : "#7F77DD"}`, color:"#7F77DD", fontSize:13, cursor:"pointer" }}>✏️ edit</button>
                          <button onClick={() => setExpandedRsvps(isExpanded ? null : ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${t.tabBorder}`, color:t.textSec, fontSize:13, cursor:"pointer" }}>
                            {isExpanded ? "hide RSVPs" : "see RSVPs"}
                          </button>
                          <button onClick={() => remove(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${t.tabBorder}`, color:t.textMuted, fontSize:13, cursor:"pointer" }}>remove</button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop:`1px solid ${t.border}`, marginTop:12, paddingTop:12 }}>
                      <RsvpList eventId={ev.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Board ── */}
      {tab === "board" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>Manage what appears on the Squad Board. Use "plan it" to turn ideas into events.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {boardItems.length === 0 && (
              <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>Nothing on the board yet</p>
            )}
            {boardItems.map(item => (
              <div key={item.id} style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:12, padding:"12px 14px", backdropFilter:"blur(8px)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16 }}>
                        {item.type === "announcement" ? "📌" : item.status === "being_planned" ? "🔄" : "💡"}
                      </span>
                      <span style={{ fontWeight:600, fontSize:14, color:t.text }}>{item.title}</span>
                      <span style={{ fontSize:11, color:t.textMuted, background: dm ? "rgba(255,255,255,0.08)" : "#f5f5f5", borderRadius:10, padding:"1px 8px" }}>{item.type}</span>
                      {item.status === "being_planned" && (
                        <span style={{ fontSize:11, background:"rgba(127,119,221,0.12)", color:"#7F77DD", borderRadius:10, padding:"1px 8px", fontWeight:600 }}>🔄 being planned</span>
                      )}
                    </div>
                    {item.description && <p style={{ fontSize:12, color:t.textSec, margin:"0 0 2px" }}>{item.description}</p>}
                    {item.location    && <p style={{ fontSize:12, color:t.textSec, margin:"0 0 2px" }}>📍 {item.location}</p>}
                    {item.who         && <p style={{ fontSize:12, color:t.textMuted, margin:0 }}>by {item.who}</p>}
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    {item.type === "idea" && (
                      <button
                        onClick={() => setPlanningItem(item)}
                        style={{ padding:"5px 12px", borderRadius:8, background:"rgba(29,158,117,0.1)", border:"1px solid rgba(29,158,117,0.3)", color:"#1D9E75", fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}
                      >
                        📅 plan it
                      </button>
                    )}
                    <button onClick={() => deleteBoardItem(item.id)} style={{ padding:"5px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer" }}>delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!addingBoard ? (
            <button onClick={() => setAddingBoard(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              + add to board
            </button>
          ) : (
            <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:`1px solid rgba(127,119,221,0.2)` }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {["announcement","idea"].map(tp => (
                  <button key={tp} onClick={() => setBoardType(tp)} style={{
                    flex:1, padding:"7px", borderRadius:10, fontSize:12, cursor:"pointer",
                    background: boardType===tp ? "#7F77DD" : "none",
                    color:      boardType===tp ? "#fff" : t.textSec,
                    border:     boardType===tp ? "none" : `1px solid ${t.border}`,
                    fontWeight: boardType===tp ? 700 : 400,
                  }}>
                    {tp === "announcement" ? "📌 announcement" : "💡 idea"}
                  </button>
                ))}
              </div>
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
              <input value={boardTitle} onChange={e=>setBoardTitle(e.target.value)} placeholder={boardType==="announcement" ? "e.g. Summer rules 🌞" : "e.g. Camping trip?"} style={{ marginBottom:12 }} />
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>description (optional)</label>
              <textarea value={boardDesc} onChange={e=>setBoardDesc(e.target.value)} placeholder="more details…" style={{ resize:"vertical", height:60, marginBottom:12 }} />
              {boardType === "idea" && (
                <>
                  <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>suggested by</label>
                  <input value={boardWho} onChange={e=>setBoardWho(e.target.value)} placeholder="Jake, the squad…" style={{ marginBottom:12 }} />
                </>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingBoard(false)} style={{ flex:1, padding:8, borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
                <button onClick={addBoardItem} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>post to board</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Subscribers ── */}
      {tab === "subscribers" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>
            {subscribers.length} device{subscribers.length !== 1 ? "s" : ""} subscribed to push notifications
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {subscribers.length === 0 && (
              <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>No push subscribers yet</p>
            )}
            {subscribers.map((sub, i) => (
              <div key={sub.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:t.cardBg, borderRadius:10, padding:"10px 14px", border:`1px solid ${t.cardBorder}`, gap:10 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>Device {i + 1} 🔔</p>
                  <p style={{ fontSize:11, color:t.textMuted, margin:0, fontFamily:"monospace" }}>
                    {sub.token ? sub.token.substring(0, 30) + "…" : "unknown"}
                  </p>
                  {sub.createdAt && (
                    <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>
                      added {sub.createdAt.toDate?.().toLocaleDateString() || ""}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteSubscriber(sub.id)} style={{ padding:"4px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer", flexShrink:0 }}>remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      {tab === "categories" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>Default categories (hangout, trip, sports) are built-in.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {categories.length === 0 && (
              <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>No custom categories yet</p>
            )}
            {categories.map(cat => (
              <div key={cat.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:t.cardBg, borderRadius:10, padding:"10px 14px", border:`1px solid ${t.cardBorder}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:cat.color.bg, border:`2px solid ${cat.color.color}` }} />
                  <span style={{ fontWeight:600, fontSize:14, color:t.text }}>{cat.name}</span>
                </div>
                <button onClick={() => deleteCat(cat.id)} style={{ padding:"4px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer" }}>delete</button>
              </div>
            ))}
          </div>
          {!addingCat ? (
            <button onClick={() => setAddingCat(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              + add new category
            </button>
          ) : (
            <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>category name</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. movies, gym…" style={{ marginBottom:14 }} />
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:8 }}>pick a color</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {PALETTE.map(p => (
                  <button key={p.label} onClick={() => setNewColor(p)} style={{ width:28, height:28, borderRadius:"50%", background:p.bg, border: newColor.label===p.label ? `3px solid ${p.color}` : "2px solid transparent", cursor:"pointer", transform: newColor.label===p.label ? "scale(1.2)" : "scale(1)", transition:"transform 0.15s" }} title={p.label} />
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingCat(false)} style={{ flex:1, padding:8, borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
                <button onClick={addCat} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>save category</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingEvent && (
        <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} dm={dm} t={t} />
      )}

      {/* Plan It modal */}
      {planningItem && (
        <PlanItModal
          item={planningItem}
          categories={categories}
          onClose={() => setPlanningItem(null)}
          dm={dm}
          t={t}
        />
      )}
    </div>
  );
}