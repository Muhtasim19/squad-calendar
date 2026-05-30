import { useState, useEffect } from "react";
import {
  collection, onSnapshot, doc,
  updateDoc, deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_MINI    = ['S','M','T','W','T','F','S'];

const HOUR_HEIGHT = 56;
const DAY_START   = 6;
const DAY_END     = 23;

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};
const PENDING_COLOR = { bg:"#FEF3C7", color:"#92400E" };

function formatHour(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "Noon";
  if (h < 12)   return `${h} AM`;
  return `${h - 12} PM`;
}

function parseTimeHours(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

// ── Admin event pill ──
function AdminPill({ event, color, onClick }) {
  const c = color || DEFAULT_COLORS.hangout;
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}
      onTouchStart={e => e.stopPropagation()}
      style={{
        background: c.bg, color: c.color,
        fontSize: 10, padding: "2px 6px",
        borderRadius: 5, marginBottom: 2,
        whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis", fontWeight: 600,
        cursor: "pointer", touchAction: "manipulation",
        border: event.status === "pending" ? `1.5px dashed ${c.color}` : "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {event.status === "pending" ? "⏳ " : ""}{event.title}
    </div>
  );
}

// ── RSVP list inside modal ──
function RsvpList({ eventId }) {
  const [rsvps, setRsvps] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events", eventId, "rsvps"), snap =>
      setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [eventId]);

  if (rsvps.length === 0) return <p style={{ fontSize:13, color:"#bbb", margin:0 }}>No RSVPs yet</p>;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {rsvps.map(r => (
        <span key={r.id} style={{ background:"#f5f5f5", borderRadius:20, padding:"3px 10px", fontSize:12 }}>
          {r.name}{r.phone ? " 📱" : ""}{r.fcmToken ? " 🔔" : ""}
        </span>
      ))}
    </div>
  );
}

// ── Admin event modal ──
function AdminEventModal({ event, categories, onClose, onApprove, onReject, onRemove, onSave }) {
  const [editing, setEditing] = useState(false);
  const [title,    setTitle]    = useState(event.title    || "");
  const [date,     setDate]     = useState(event.date     || "");
  const [time,     setTime]     = useState(event.time     || "");
  const [location, setLocation] = useState(event.location || "");
  const [who,      setWho]      = useState(event.who      || "");
  const [note,     setNote]     = useState(event.note     || "");
  const [saving,   setSaving]   = useState(false);

  const isPending = event.status === "pending";
  const cat = categories.find(c => c.name === event.type);
  const c   = isPending ? PENDING_COLOR : (cat ? cat.color : (DEFAULT_COLORS[event.type] || { bg:"#eee", color:"#555" }));
  const dateStr = event.date
    ? new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })
    : "";

  async function handleSave() {
    setSaving(true);
    try { await onSave(event.id, { title, date, time, location, who, note }); setEditing(false); }
    finally { setSaving(false); }
  }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.97)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
              <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700 }}>
                {isPending ? "⏳ pending" : `✅ ${event.type}`}
              </span>
            </div>
            {!editing && <h2 style={{ fontSize:18, fontWeight:700, color:"#222", margin:0 }}>{event.title}</h2>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>

        {editing ? (
          /* ── Edit form ── */
          <>
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
            <input value={location} onChange={e=>setLocation(e.target.value)} style={{ marginBottom:12 }} />

            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>who's coming</label>
            <input value={who} onChange={e=>setWho(e.target.value)} style={{ marginBottom:12 }} />

            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>notes</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ height:60, resize:"vertical", marginBottom:16 }} />

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setEditing(false)} style={{ flex:1, padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
                {saving ? "saving…" : "save changes"}
              </button>
            </div>
          </>
        ) : (
          /* ── Event details ── */
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:14, color:"#666", marginBottom:16 }}>
              {dateStr && <span>📅 {dateStr}{event.time ? ` at ${event.time}` : ""}</span>}
              {event.location && <span>📍 {event.location}</span>}
              {event.who      && <span>👥 {event.who}</span>}
              {event.note     && <span>📝 {event.note}</span>}
            </div>

            {/* RSVPs */}
            <div style={{ borderTop:"1px solid #eee", paddingTop:12, marginBottom:16 }}>
              <p style={{ fontSize:11, color:"#bbb", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>RSVPs</p>
              <RsvpList eventId={event.id} />
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {isPending ? (
                <>
                  <button onClick={() => onApprove(event.id)} style={{ flex:2, padding:"10px", borderRadius:10, background:"#1D9E75", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>✓ approve</button>
                  <button onClick={() => onReject(event.id)}  style={{ flex:1, padding:"10px", borderRadius:10, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>✕ reject</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)}     style={{ flex:1, padding:"10px", borderRadius:10, background:"none", border:"1px solid #7F77DD", color:"#7F77DD", fontSize:13, cursor:"pointer" }}>✏️ edit</button>
                  <button onClick={() => onRemove(event.id)}   style={{ flex:1, padding:"10px", borderRadius:10, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>🗑 remove</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Mini month for year view ──
function MiniMonth({ year, month, events, today, onClick }) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });
  const isCurMonth = month === today.getMonth() && year === today.getFullYear();

  return (
    <div onClick={() => onClick(year, month)} style={{ cursor:"pointer", padding:"10px 6px", borderRadius:12, background: isCurMonth ? "rgba(127,119,221,0.1)" : "transparent", border: isCurMonth ? "1px solid rgba(127,119,221,0.25)" : "1px solid transparent" }}>
      <div style={{ fontSize:13, fontWeight:700, color: isCurMonth ? "#7F77DD" : "#333", marginBottom:6 }}>{MONTHS_SHORT[month]}</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
        {DAYS_MINI.map((d, i) => (
          <div key={i} style={{ fontSize:7, color:"#bbb", textAlign:"center", fontWeight:700 }}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          const key     = cell.current ? `${year}-${String(month+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}` : null;
          const hasE    = key && events.some(e => e.date === key);
          const hasPend = key && events.some(e => e.date === key && e.status === "pending");
          const isTod   = cell.current && isCurMonth && cell.day === today.getDate();
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", height:18 }}>
              <div style={{ fontSize:8, textAlign:"center", color: isTod ? "#fff" : cell.current ? "#444" : "#ddd", background: isTod ? "#7F77DD" : "transparent", borderRadius:"50%", width:13, height:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {cell.current ? cell.day : ""}
              </div>
              {hasE && !isTod && (
                <div style={{ width:3, height:3, borderRadius:"50%", background: hasPend ? "#92400E" : "#7F77DD", marginTop:1 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main AdminCalendar ──
export default function AdminCalendar() {
  const today = new Date();
  const [events,        setEvents]        = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [filter,        setFilter]        = useState("all");
  const [view,          setView]          = useState("month");
  const [focusDate,     setFocusDate]     = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "events"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(all.filter(e => e.status === "pending" || e.status === "approved"));
    });
    const u2 = onSnapshot(collection(db, "categories"), snap =>
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  const filteredEvents = events.filter(e =>
    filter === "all" ? true : e.status === filter
  );

  function getColor(event) {
    if (event.status === "pending") return PENDING_COLOR;
    const cat = categories.find(c => c.name === event.type);
    return cat ? cat.color : (DEFAULT_COLORS[event.type] || { bg:"#eee", color:"#555" });
  }

  async function handleApprove(id) {
    const ev = events.find(e => e.id === id);
    await updateDoc(doc(db, "events", id), { status: "approved" });
    if (ev) {
      await addDoc(collection(db, "notifications"), {
        message: `"${ev.title}" has been approved! 🎉`,
        type: "approved", eventTitle: ev.title, eventId: id,
        createdAt: serverTimestamp(),
      });
    }
    setSelectedEvent(null);
  }

  async function handleReject(id)  { await deleteDoc(doc(db, "events", id)); setSelectedEvent(null); }
  async function handleRemove(id)  { await deleteDoc(doc(db, "events", id)); setSelectedEvent(null); }
  async function handleSave(id, data) {
    await updateDoc(doc(db, "events", id), data);
    setSelectedEvent(prev => prev ? { ...prev, ...data } : null);
  }

  // ── Calendar helpers ──
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function isToday(date) {
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }
  function eventsForDate(date) {
    return filteredEvents.filter(e => e.date === dateKey(date));
  }
  function getWeekStart(date) {
    const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d;
  }
  function getWeekDays(date) {
    const start = getWeekStart(date);
    return Array.from({ length:7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
  }
  function navigate(dir) {
    const d = new Date(focusDate);
    if      (view === "year")  d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week")  d.setDate(d.getDate() + dir * 7);
    else                       d.setDate(d.getDate() + dir);
    setFocusDate(d);
  }
  function getHeaderLabel() {
    if (view === "year")  return focusDate.getFullYear().toString();
    if (view === "month") return `${MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
    if (view === "week") {
      const days = getWeekDays(focusDate);
      const s = days[0], e = days[6];
      if (s.getMonth() === e.getMonth()) return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`;
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
    }
    return focusDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  }

  const yr = focusDate.getFullYear(), mo = focusDate.getMonth();
  const firstDay    = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prevDays    = new Date(yr, mo, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });

  const pendingCount  = events.filter(e => e.status === "pending").length;
  const approvedCount = events.filter(e => e.status === "approved").length;

  return (
    <div>

      {/* ── Status filter ── */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { key:"all",      label:`🗓 all (${events.length})` },
          { key:"pending",  label:`⏳ pending (${pendingCount})` },
          { key:"approved", label:`✅ approved (${approvedCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
            background: filter===f.key ? "#7F77DD" : "rgba(255,255,255,0.6)",
            color:      filter===f.key ? "#fff" : "#777",
            border:     filter===f.key ? "none" : "1px solid #ddd",
            fontWeight: filter===f.key ? 700 : 400,
            backdropFilter: "blur(8px)",
          }}>{f.label}</button>
        ))}
      </div>

      {/* ── Legend ── */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#888" }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#FEF3C7", border:"1.5px dashed #92400E" }} />pending
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#888" }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#CECBF6", border:"1.5px solid #3C3489" }} />approved
        </span>
      </div>

      {/* ── View switcher ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <div style={{ display:"flex", background:"rgba(0,0,0,0.05)", borderRadius:10, padding:3, gap:2 }}>
          {["year","month","week","day"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer", border:"none",
              background:  view===v ? "#fff" : "transparent",
              color:       view===v ? "#3C3489" : "#888",
              fontWeight:  view===v ? 700 : 400,
              boxShadow:   view===v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition:  "all 0.15s", touchAction:"manipulation",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      {view !== "day" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={() => navigate(-1)} style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <span style={{ fontWeight:700, fontSize: view==="year" ? 22 : 18, color:"#3C3489" }}>{getHeaderLabel()}</span>
          <button onClick={() => navigate(1)}  style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>
      )}

      {/* ══════════ YEAR VIEW ══════════ */}
      {view === "year" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
          {Array.from({ length:12 }, (_, m) => (
            <MiniMonth key={m} year={yr} month={m} events={filteredEvents} today={today}
              onClick={(y, month) => { setFocusDate(new Date(y, month, 1)); setView("month"); }}
            />
          ))}
        </div>
      )}

      {/* ══════════ MONTH VIEW ══════════ */}
      {view === "month" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#bbb", padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{d}</div>
            ))}
          </div>
          <div className="cal-grid" style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {cells.map((cell, i) => {
              const cellDate  = cell.current ? new Date(yr, mo, cell.day) : null;
              const dayEvents = cellDate ? eventsForDate(cellDate) : [];
              const tod       = cellDate && isToday(cellDate);
              const hasPend   = dayEvents.some(e => e.status === "pending");
              return (
                <div key={i}
                  className={`cal-cell${cell.current ? " cal-cell-active" : ""}`}
                  onClick={() => { if (!cell.current) return; const d = new Date(yr, mo, cell.day); setFocusDate(d); }}
                  style={{ background: cell.current ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)", minHeight:82, padding:"6px 5px", cursor: cell.current ? "pointer" : "default", borderRadius:10, border: tod ? "2px solid #7F77DD" : hasPend ? "1.5px dashed #EF9F27" : "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="cal-day-num" style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : cell.current ? "#333" : "#ccc", fontSize:12, fontWeight: tod ? 700 : 500, marginBottom:3 }}>
                    {cell.day}
                  </div>
                  {dayEvents.slice(0,2).map(ev => (
                    <AdminPill key={ev.id} event={ev} color={getColor(ev)} onClick={() => setSelectedEvent(ev)} />
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize:10, color:"#999" }}>+{dayEvents.length-2} more</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════ WEEK VIEW ══════════ */}
      {view === "week" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {getWeekDays(focusDate).map((day, i) => {
            const dayEvents = eventsForDate(day);
            const tod       = isToday(day);
            const hasPend   = dayEvents.some(e => e.status === "pending");
            return (
              <div key={i}
                onClick={() => { setFocusDate(day); }}
                style={{ cursor:"pointer", borderRadius:12, padding:"8px 4px", background: tod ? "rgba(127,119,221,0.08)" : "rgba(255,255,255,0.5)", border: tod ? "2px solid #7F77DD" : hasPend ? "1.5px dashed #EF9F27" : "1px solid rgba(0,0,0,0.06)", minHeight:110 }}
              >
                <div style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"#bbb", textTransform:"uppercase", marginBottom:4 }}>
                  {DAYS_SHORT[day.getDay()]}
                </div>
                <div style={{ width:26, height:26, borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : "#333", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px" }}>
                  {day.getDate()}
                </div>
                {dayEvents.slice(0,3).map(ev => (
                  <AdminPill key={ev.id} event={ev} color={getColor(ev)} onClick={() => setSelectedEvent(ev)} />
                ))}
                {dayEvents.length > 3 && <div style={{ fontSize:9, color:"#999", textAlign:"center" }}>+{dayEvents.length-3}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ DAY VIEW ══════════ */}
      {view === "day" && (() => {
        const weekDays  = getWeekDays(focusDate);
        const dayEvents = eventsForDate(focusDate);
        const timedEvs  = dayEvents.filter(e => e.time);
        const allDayEvs = dayEvents.filter(e => !e.time);
        const hours     = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);

        return (
          <div>
            {/* Week strip */}
            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:12 }}>
              <button onClick={() => navigate(-1)} style={{ width:28, height:28, borderRadius:"50%", border:"1px solid #ddd", background:"transparent", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>‹</button>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {weekDays.map((day, i) => {
                  const tod = isToday(day), sel = dateKey(day) === dateKey(focusDate);
                  return (
                    <div key={i} onClick={() => setFocusDate(new Date(day))} style={{ textAlign:"center", cursor:"pointer", padding:"4px 2px", borderRadius:10, touchAction:"manipulation" }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#bbb", textTransform:"uppercase", marginBottom:3 }}>{DAYS_SHORT[day.getDay()].charAt(0)}</div>
                      <div style={{ width:28, height:28, borderRadius:"50%", background: tod ? "#7F77DD" : sel ? "rgba(127,119,221,0.15)" : "transparent", color: tod ? "#fff" : sel ? "#7F77DD" : "#333", fontSize:14, fontWeight: tod||sel ? 700 : 500, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate(1)} style={{ width:28, height:28, borderRadius:"50%", border:"1px solid #ddd", background:"transparent", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>›</button>
            </div>

            {/* Day header */}
            <div style={{ fontSize:14, fontWeight:700, color:"#333", paddingBottom:8, borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
              {focusDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
              {dayEvents.length > 0 && (
                <span style={{ fontSize:12, fontWeight:400, color:"#888", marginLeft:10 }}>
                  {dayEvents.filter(e=>e.status==="pending").length > 0 && `⏳ ${dayEvents.filter(e=>e.status==="pending").length} pending · `}
                  {dayEvents.filter(e=>e.status==="approved").length > 0 && `✅ ${dayEvents.filter(e=>e.status==="approved").length} approved`}
                </span>
              )}
            </div>

            {/* All-day events */}
            {allDayEvs.length > 0 && (
              <div style={{ marginTop:8, paddingBottom:8, borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:10, color:"#bbb", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>all day</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {allDayEvs.map(ev => {
                    const c = getColor(ev);
                    return (
                      <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                        style={{ background:c.bg, color:c.color, borderRadius:8, padding:"6px 10px", fontSize:13, fontWeight:600, cursor:"pointer", border: ev.status==="pending" ? `1.5px dashed ${c.color}` : "none" }}>
                        {ev.status === "pending" ? "⏳ " : ""}{ev.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time grid — always shown */}
            <div style={{ position:"relative", height:`${(DAY_END - DAY_START) * HOUR_HEIGHT}px`, marginTop:8 }}>
              {hours.map(h => (
                <div key={h} style={{ position:"absolute", top:`${(h - DAY_START) * HOUR_HEIGHT}px`, left:0, right:0, display:"flex", alignItems:"flex-start" }}>
                  <span style={{ fontSize:10, color:"#bbb", fontWeight:600, width:46, flexShrink:0, paddingTop:2, textAlign:"right", paddingRight:8 }}>{formatHour(h)}</span>
                  <div style={{ flex:1, borderTop:"1px solid rgba(0,0,0,0.06)", height:`${HOUR_HEIGHT}px` }} />
                </div>
              ))}

              {timedEvs.map(ev => {
                const hrs = parseTimeHours(ev.time);
                if (hrs === null || hrs < DAY_START || hrs > DAY_END) return null;
                const c = getColor(ev);
                return (
                  <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                    style={{ position:"absolute", top:`${(hrs - DAY_START) * HOUR_HEIGHT}px`, left:52, right:0, background:c.bg, color:c.color, borderRadius:10, padding:"8px 10px", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.1)", minHeight:44, zIndex:1, borderLeft:`3px solid ${c.color}`, border: ev.status==="pending" ? `1.5px dashed ${c.color}` : `none`, borderLeft:`3px solid ${c.color}` }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{ev.status === "pending" ? "⏳ " : ""}{ev.title}</div>
                    <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{ev.time}{ev.location ? ` · ${ev.location}` : ""}</div>
                  </div>
                );
              })}

              {isToday(focusDate) && (() => {
                const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
                if (nowH < DAY_START || nowH > DAY_END) return null;
                return (
                  <div style={{ position:"absolute", top:`${(nowH - DAY_START) * HOUR_HEIGHT}px`, left:46, right:0, height:2, background:"#E53E3E", zIndex:2, display:"flex", alignItems:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#E53E3E", marginLeft:-4 }} />
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Admin event modal */}
      {selectedEvent && (
        <AdminEventModal
          event={selectedEvent}
          categories={categories}
          onClose={() => setSelectedEvent(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRemove={handleRemove}
          onSave={handleSave}
        />
      )}
    </div>
  );
}