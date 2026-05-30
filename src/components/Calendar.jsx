import { useState } from "react";
import EventPill from "./EventPill";

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

export default function Calendar({ events, categories, getCatColor, onDayClick, onEventClick }) {
  const today = new Date();
  const [view,      setView]      = useState("month");
  const [focusDate, setFocusDate] = useState(new Date());

  // ── Helpers ──
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function isToday(date) {
    return date.getDate()     === today.getDate()
        && date.getMonth()    === today.getMonth()
        && date.getFullYear() === today.getFullYear();
  }

  function eventsForDate(date) {
    return events.filter(e => e.date === dateKey(date));
  }

  function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function getWeekDays(date) {
    const start = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  // ── Navigation ──
  function navigate(dir) {
    const d = new Date(focusDate);
    if      (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week")  d.setDate(d.getDate() + dir * 7);
    else                       d.setDate(d.getDate() + dir);
    setFocusDate(d);
  }

  function getHeaderLabel() {
    if (view === "month") {
      return `${MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}`;
    }
    if (view === "week") {
      const days = getWeekDays(focusDate);
      const s = days[0], e = days[6];
      if (s.getMonth() === e.getMonth())
        return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
      return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
    }
    return focusDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  }

  // ── Month cells ──
  const yr  = focusDate.getFullYear();
  const mo  = focusDate.getMonth();
  const firstDay    = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prevDays    = new Date(yr, mo, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });

  const allCats = [
    { name:"hangout", color: DEFAULT_COLORS.hangout },
    { name:"trip",    color: DEFAULT_COLORS.trip },
    { name:"sports",  color: DEFAULT_COLORS.sports },
    ...(categories || []),
  ];

  return (
    <div>
      {/* ── View switcher ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <div style={{ display:"flex", background:"rgba(0,0,0,0.05)", borderRadius:10, padding:3, gap:2 }}>
          {["month","week","day"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"5px 16px", borderRadius:8, fontSize:12, cursor:"pointer",
              background:  view===v ? "#fff" : "transparent",
              color:       view===v ? "#3C3489" : "#888",
              border:      "none",
              fontWeight:  view===v ? 700 : 400,
              boxShadow:   view===v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition:  "all 0.15s",
              touchAction: "manipulation",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <div className="cal-nav" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={() => navigate(-1)} style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>‹</button>
        <span style={{ fontWeight:700, fontSize: view==="day" ? 15 : 18, color:"#3C3489", textAlign:"center", flex:1, padding:"0 8px" }}>{getHeaderLabel()}</span>
        <button onClick={() => navigate(1)}  style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>›</button>
      </div>

      {/* ────────────── MONTH VIEW ────────────── */}
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
              return (
                <div key={i}
                  className={`cal-cell${cell.current ? " cal-cell-active" : ""}`}
                  onClick={() => {
                    if (!cell.current) return;
                    const d = new Date(yr, mo, cell.day);
                    setFocusDate(d);
                    onDayClick(dateKey(d));
                  }}
                  style={{ background: cell.current ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)", minHeight:82, padding:"6px 5px", cursor: cell.current ? "pointer" : "default", borderRadius:10, border: tod ? "2px solid #7F77DD" : "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="cal-day-num" style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : cell.current ? "#333" : "#ccc", fontSize:12, fontWeight: tod ? 700 : 500, marginBottom:3 }}>
                    {cell.day}
                  </div>
                  {dayEvents.slice(0,2).map(ev => (
                    <EventPill key={ev.id} event={ev} color={getCatColor(ev.type)} onClick={() => onEventClick && onEventClick(ev)} />
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize:10, color:"#999" }}>+{dayEvents.length-2} more</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ────────────── WEEK VIEW ────────────── */}
      {view === "week" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {getWeekDays(focusDate).map((day, i) => {
            const dayEvents = eventsForDate(day);
            const tod       = isToday(day);
            return (
              <div key={i}
                onClick={() => { setFocusDate(day); onDayClick(dateKey(day)); }}
                style={{ cursor:"pointer", borderRadius:12, padding:"8px 4px", background: tod ? "rgba(127,119,221,0.08)" : "rgba(255,255,255,0.5)", border: tod ? "2px solid #7F77DD" : "1px solid rgba(0,0,0,0.06)", minHeight:110, transition:"background 0.15s", touchAction:"manipulation" }}
              >
                {/* Day label */}
                <div style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4 }}>
                  {DAYS_SHORT[day.getDay()]}
                </div>
                {/* Date circle */}
                <div style={{ width:26, height:26, borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : "#333", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px" }}>
                  {day.getDate()}
                </div>
                {/* Events */}
                {dayEvents.slice(0,3).map(ev => (
                  <EventPill key={ev.id} event={ev} color={getCatColor(ev.type)} onClick={() => onEventClick && onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && <div style={{ fontSize:9, color:"#999", textAlign:"center" }}>+{dayEvents.length-3}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────── DAY VIEW ────────────── */}
      {view === "day" && (() => {
        const dayEvents = eventsForDate(focusDate);
        return dayEvents.length === 0 ? (
          <div style={{ textAlign:"center", padding:"3rem 0", color:"#bbb" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📅</div>
            <p style={{ fontSize:14, marginBottom:16 }}>Nothing planned for this day</p>
            <button
              onClick={() => onDayClick(dateKey(focusDate))}
              style={{ padding:"9px 20px", borderRadius:20, background:"#7F77DD", color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}
            >
              + suggest a plan
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {dayEvents.map(ev => {
              const c = getCatColor(ev.type);
              return (
                <div key={ev.id}
                  onClick={() => onEventClick && onEventClick(ev)}
                  style={{ background:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.6)", borderRadius:14, padding:"14px 16px", cursor:"pointer", backdropFilter:"blur(8px)", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", transition:"transform 0.1s", touchAction:"manipulation" }}
                  onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform="none"}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700 }}>{ev.type}</span>
                    <span style={{ fontWeight:700, fontSize:16, color:"#222" }}>{ev.title}</span>
                  </div>
                  <div style={{ fontSize:13, color:"#777", display:"flex", flexDirection:"column", gap:4 }}>
                    {ev.time     && <span>🕐 {ev.time}</span>}
                    {ev.location && <span>📍 {ev.location}</span>}
                    {ev.who      && <span>👥 {ev.who}</span>}
                    {ev.note     && <span>📝 {ev.note}</span>}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => onDayClick(dateKey(focusDate))}
              style={{ padding:"10px", borderRadius:12, border:"1.5px dashed #ddd", background:"none", color:"#bbb", fontSize:13, cursor:"pointer", marginTop:4 }}
            >
              + suggest a plan for this day
            </button>
          </div>
        );
      })()}

      {/* ── Legend ── */}
      <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
        {allCats.map(cat => (
          <span key={cat.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#888" }}>
            <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:cat.color.bg, border:`1.5px solid ${cat.color.color}` }} />
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  );
}