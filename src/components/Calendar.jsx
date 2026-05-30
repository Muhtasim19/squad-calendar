import { useState } from "react";
import EventPill from "./EventPill";

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Calendar({ events, categories, getCatColor, onDayClick, onEventClick }) {
  const today = new Date();
  const [curYear,  setCurYear]  = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());

  function changeMonth(dir) {
    let m = curMonth + dir, y = curYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCurMonth(m); setCurYear(y);
  }

  function dateKey(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const firstDay    = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevDays    = new Date(curYear, curMonth, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });

  const DEFAULT_COLORS = {
    hangout: { bg:"#CECBF6", color:"#3C3489" },
    trip:    { bg:"#9FE1CB", color:"#085041" },
    sports:  { bg:"#FAC775", color:"#633806" },
  };

  const allCats = [
    { name:"hangout", color: DEFAULT_COLORS.hangout },
    { name:"trip",    color: DEFAULT_COLORS.trip },
    { name:"sports",  color: DEFAULT_COLORS.sports },
    ...(categories || []),
  ];

  return (
    <div>
      {/* Nav */}
      <div className="cal-nav" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button
          onClick={() => changeMonth(-1)}
          style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}
        >‹</button>
        <span style={{ fontWeight:700, fontSize:20, color:"#3C3489" }}>{MONTHS[curMonth]} {curYear}</span>
        <button
          onClick={() => changeMonth(1)}
          style={{ width:36, height:36, borderRadius:"50%", border:"1px solid #ddd", background:"rgba(255,255,255,0.6)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}
        >›</button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#bbb", padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="cal-grid" style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {cells.map((cell, i) => {
          const key       = cell.current ? dateKey(curYear, curMonth, cell.day) : null;
          const dayEvents = key ? events.filter(e => e.date === key) : [];
          const isToday   = cell.current
            && cell.day   === today.getDate()
            && curMonth   === today.getMonth()
            && curYear    === today.getFullYear();

          return (
            <div
              key={i}
              className={`cal-cell${cell.current ? " cal-cell-active" : ""}`}
              onClick={() => cell.current && onDayClick(dateKey(curYear, curMonth, cell.day))}
              style={{
                background:   cell.current ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)",
                minHeight:    82,
                padding:      "6px 5px",
                cursor:       cell.current ? "pointer" : "default",
                borderRadius: 10,
                border:       isToday ? "2px solid #7F77DD" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="cal-day-num"
                style={{
                  width:        24,
                  height:       24,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background:   isToday ? "#7F77DD" : "transparent",
                  color:        isToday ? "#fff" : cell.current ? "#333" : "#ccc",
                  fontSize:     12,
                  fontWeight:   isToday ? 700 : 500,
                  marginBottom: 3,
                }}
              >
                {cell.day}
              </div>
              {dayEvents.slice(0,2).map(ev => (
                <EventPill
                  key={ev.id}
                  event={ev}
                  color={getCatColor(ev.type)}
                  onClick={() => onEventClick && onEventClick(ev)}
                />
              ))}
              {dayEvents.length > 2 && (
                <div style={{ fontSize:10, color:"#999" }}>+{dayEvents.length-2} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
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