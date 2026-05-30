import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../firebase";

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

// ── RsvpCount badge ──
function RsvpCount({ eventId }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "rsvps"),
      snap => setCount(snap.size)
    );
    return () => unsub();
  }, [eventId]);
  return count > 0 ? (
    <span style={{ background:"#EEEDFE", color:"#3C3489", fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:600 }}>
      🙋 {count} going
    </span>
  ) : null;
}

// ── RSVP expanded list ──
function RsvpList({ eventId }) {
  const [rsvps, setRsvps] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", eventId, "rsvps"),
      snap => setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [eventId]);

  if (rsvps.length === 0) return (
    <p style={{ fontSize:13, color:"#bbb", margin:0 }}>No RSVPs yet</p>
  );

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
function EditEventModal({ event, onClose }) {
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
      await updateDoc(doc(db, "events", event.id), { title, date, time, location, who, note });
      onClose();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:400, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:"#3C3489" }}>edit event</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>

        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom:12 }} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>time</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
          </div>
        </div>

        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>location</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="location" style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>who's coming</label>
        <input value={who} onChange={e=>setWho(e.target.value)} placeholder="Jake, Sam…" style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ resize:"vertical", height:64, marginBottom:16 }} />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
            {saving ? "saving…" : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ──
export default function AdminPanel() {
  const [pending,       setPending]       = useState([]);
  const [approved,      setApproved]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [boardItems,    setBoardItems]    = useState([]);
  const [subscribers,   setSubscribers]   = useState([]);
  const [tab,           setTab]           = useState("pending");
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
        message: `"${ev.title}" has been approved! 🎉`,
        type: "approved", eventTitle: ev.title, eventId: id,
        createdAt: serverTimestamp(),
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
    await addDoc(collection(db,"categories"), { name: newName.trim().toLowerCase(), color: newColor });
    setNewName(""); setAddingCat(false);
  }

  async function addBoardItem() {
    if (!boardTitle.trim()) return;
    await addDoc(collection(db,"board"), {
      type:        boardType,
      title:       boardTitle.trim(),
      description: boardDesc.trim(),
      who:         boardWho.trim(),
      pinned:      boardType === "announcement",
      createdAt:   serverTimestamp(),
    });
    setBoardTitle(""); setBoardDesc(""); setBoardWho(""); setAddingBoard(false);
  }

  function getCatColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#eee", color:"#555" });
  }

  const events = tab === "pending" ? pending : approved;

  const TABS = [
    { key:"pending",     label:`pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key:"approved",    label:"approved" },
    { key:"board",       label:"board" },
    { key:"subscribers", label:"subscribers" },
    { key:"categories",  label:"categories" },
  ];

  return (
    <div>
      {/* Tabs — scrollable on mobile */}
      <div style={{ display:"flex", gap:6, marginBottom:"1.5rem", overflowX:"auto", paddingBottom:4, scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:"7px 16px", borderRadius:20, fontSize:13, cursor:"pointer",
            whiteSpace:"nowrap", flexShrink:0,
            background: tab===t.key ? "#7F77DD" : "rgba(255,255,255,0.6)",
            color:      tab===t.key ? "#fff" : "#777",
            border:     tab===t.key ? "none" : "1px solid #ddd",
            fontWeight: tab===t.key ? 700 : 400,
            backdropFilter: "blur(8px)",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Events (pending + approved) ── */}
      {(tab === "pending" || tab === "approved") && (
        <>
          {events.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem 0", color:"#bbb", fontSize:14 }}>
              {tab === "pending" ? "No plans waiting for approval 🎉" : "No approved plans yet"}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.map(ev => {
              const c          = getCatColor(ev.type);
              const isExpanded = expandedRsvps === ev.id;
              return (
                <div key={ev.id} style={{ background:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.6)", borderRadius:12, padding:"1rem 1.25rem", backdropFilter:"blur(8px)", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700 }}>{ev.type}</span>
                        <span style={{ fontWeight:700, fontSize:15 }}>{ev.title}</span>
                        <RsvpCount eventId={ev.id} />
                      </div>
                      <div style={{ fontSize:13, color:"#888", display:"flex", flexDirection:"column", gap:3 }}>
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
                          <button onClick={() => setEditingEvent(ev)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #7F77DD", color:"#7F77DD", fontSize:13, cursor:"pointer" }}>✏️ edit</button>
                          <button
                            onClick={() => setExpandedRsvps(isExpanded ? null : ev.id)}
                            style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #ddd", color:"#666", fontSize:13, cursor:"pointer" }}
                          >
                            {isExpanded ? "hide RSVPs" : "see RSVPs"}
                          </button>
                          <button onClick={() => remove(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #ddd", color:"#aaa", fontSize:13, cursor:"pointer" }}>remove</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RSVP list */}
                  {isExpanded && (
                    <div style={{ borderTop:"1px solid #f0f0f0", marginTop:12, paddingTop:12 }}>
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
          <p style={{ fontSize:13, color:"#bbb", marginBottom:16 }}>Manage what appears on the Squad Board below the calendar.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {boardItems.length === 0 && (
              <p style={{ fontSize:13, color:"#ccc", textAlign:"center", padding:"1rem 0" }}>Nothing on the board yet</p>
            )}
            {boardItems.map(item => (
              <div key={item.id} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", background:"rgba(255,255,255,0.8)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.6)", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span>{item.type === "announcement" ? "📌" : "💡"}</span>
                    <span style={{ fontWeight:600, fontSize:14 }}>{item.title}</span>
                    <span style={{ fontSize:11, color:"#bbb", background:"#f5f5f5", borderRadius:10, padding:"1px 8px" }}>{item.type}</span>
                  </div>
                  {item.description && <p style={{ fontSize:12, color:"#999", margin:0 }}>{item.description}</p>}
                  {item.who         && <p style={{ fontSize:12, color:"#bbb", margin:0 }}>by {item.who}</p>}
                </div>
                <button onClick={() => deleteBoardItem(item.id)} style={{ padding:"4px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer", flexShrink:0 }}>delete</button>
              </div>
            ))}
          </div>

          {!addingBoard ? (
            <button onClick={() => setAddingBoard(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              + add to board
            </button>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.9)", borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {["announcement","idea"].map(t => (
                  <button key={t} onClick={() => setBoardType(t)} style={{
                    flex:1, padding:"7px", borderRadius:10, fontSize:12, cursor:"pointer",
                    background: boardType===t ? "#7F77DD" : "none",
                    color:      boardType===t ? "#fff" : "#aaa",
                    border:     boardType===t ? "none" : "1px solid #ddd",
                    fontWeight: boardType===t ? 700 : 400,
                  }}>
                    {t === "announcement" ? "📌 announcement" : "💡 idea"}
                  </button>
                ))}
              </div>

              <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>title</label>
              <input value={boardTitle} onChange={e=>setBoardTitle(e.target.value)} placeholder={boardType==="announcement" ? "e.g. Summer rules 🌞" : "e.g. Camping trip?"} style={{ marginBottom:12 }} />

              <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>description (optional)</label>
              <textarea value={boardDesc} onChange={e=>setBoardDesc(e.target.value)} placeholder="more details…" style={{ resize:"vertical", height:60, marginBottom:12 }} />

              {boardType === "idea" && (
                <>
                  <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>suggested by</label>
                  <input value={boardWho} onChange={e=>setBoardWho(e.target.value)} placeholder="Jake, the squad…" style={{ marginBottom:12 }} />
                </>
              )}

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingBoard(false)} style={{ flex:1, padding:8, borderRadius:8, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
                <button onClick={addBoardItem} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>post to board</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Subscribers ── */}
      {tab === "subscribers" && (
        <div>
          <p style={{ fontSize:13, color:"#bbb", marginBottom:16 }}>
            {subscribers.length} device{subscribers.length !== 1 ? "s" : ""} subscribed to push notifications
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {subscribers.length === 0 && (
              <p style={{ fontSize:13, color:"#ccc", textAlign:"center", padding:"1rem 0" }}>No push subscribers yet</p>
            )}
            {subscribers.map((sub, i) => (
              <div key={sub.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.8)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.6)", gap:10 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:"#333", margin:0 }}>Device {i + 1} 🔔</p>
                  <p style={{ fontSize:11, color:"#bbb", margin:0, fontFamily:"monospace" }}>
                    {sub.token ? sub.token.substring(0, 30) + "…" : "unknown"}
                  </p>
                  {sub.createdAt && (
                    <p style={{ fontSize:11, color:"#ccc", margin:0 }}>
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
          <p style={{ fontSize:13, color:"#bbb", marginBottom:16 }}>Default categories (hangout, trip, sports) are built-in.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {categories.length === 0 && (
              <p style={{ fontSize:13, color:"#ccc", textAlign:"center", padding:"1rem 0" }}>No custom categories yet</p>
            )}
            {categories.map(cat => (
              <div key={cat.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.8)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.6)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:cat.color.bg, border:`2px solid ${cat.color.color}` }} />
                  <span style={{ fontWeight:600, fontSize:14 }}>{cat.name}</span>
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
            <div style={{ background:"rgba(255,255,255,0.9)", borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>category name</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. movies, gym…" style={{ marginBottom:14 }} />
              <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:8 }}>pick a color</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {PALETTE.map(p => (
                  <button key={p.label} onClick={() => setNewColor(p)} style={{ width:28, height:28, borderRadius:"50%", background:p.bg, border: newColor.label===p.label ? `3px solid ${p.color}` : "2px solid transparent", cursor:"pointer", transform: newColor.label===p.label ? "scale(1.2)" : "scale(1)", transition:"transform 0.15s" }} title={p.label} />
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingCat(false)} style={{ flex:1, padding:8, borderRadius:8, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
                <button onClick={addCat} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>save category</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingEvent && (
        <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </div>
  );
}