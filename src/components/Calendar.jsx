import { useState } from "react";
import EventPill from "./EventPill";

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Calendar({ events, onDayClick }) {
  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());

  function changeMonth(dir) {
    let m = curMonth + dir, y = curYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCurMonth(m); setCurYear(y);
  }

  function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const firstDay = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevDays = new Date(curYear, curMonth, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++)
    cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, current: true });
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++)
    cells.push({ day: d, current: false });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={() => changeMonth(-1)}>‹</button>
        <span style={{ fontWeight:500, fontSize:18 }}>{MONTHS[curMonth]} {curYear}</span>
        <button onClick={() => changeMonth(1)}>›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:12, color:"var(--color-text-secondary)", padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:"var(--color-border-tertiary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, overflow:"hidden" }}>
        {cells.map((cell, i) => {
          const key = cell.current ? dateKey(curYear, curMonth, cell.day) : null;
          const dayEvents = key ? events.filter(e => e.date === key) : [];
          const isToday = cell.current && cell.day === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
          return (
            <div key={i}
              onClick={() => cell.current && onDayClick(dateKey(curYear, curMonth, cell.day))}
              style={{ background: cell.current ? "var(--color-background-primary)" : "var(--color-background-tertiary)", minHeight:80, padding:6, cursor: cell.current ? "pointer" : "default" }}
            >
              <div style={{ width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background: isToday ? "#7F77DD" : "transparent", color: isToday ? "#fff" : cell.current ? "var(--color-text-primary)" : "var(--color-text-tertiary)", fontSize:13, fontWeight:500, marginBottom:4 }}>
                {cell.day}
              </div>
              {dayEvents.slice(0, 2).map(ev => <EventPill key={ev.id} event={ev} />)}
              {dayEvents.length > 2 && <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>+{dayEvents.length - 2} more</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:16, marginTop:12, fontSize:12, color:"var(--color-text-secondary)" }}>
        {[["#7F77DD","hangout"],["#1D9E75","trip"],["#EF9F27","sports"]].map(([bg, label]) => (
          <span key={label}><span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:bg, marginRight:4 }}></span>{label}</span>
        ))}
      </div>
    </div>
  );
}