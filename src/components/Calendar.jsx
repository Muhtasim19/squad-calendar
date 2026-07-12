import { useState } from "react";
import EventPill from "./EventPill";

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_MINI    = ['S','M','T','W','T','F','S'];

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

const HOUR_HEIGHT = 56;
const DAY_START   = 6;
const DAY_END     = 23;

function formatHour(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "Noon";
  if (h < 12)   return `${h} AM`;
  return `${h - 12} PM`;
}

function parseTimeHours(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

// ── Mini month for Year view ──
function MiniMonth({ year, month, events, darkMode, today, onClick }) {
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
    <div
      onClick={() => onClick(year, month)}
      style={{ cursor:"pointer", padding:"10px 6px", borderRadius:12, background: isCurMonth ? "rgba(127,119,221,0.1)" : "transparent", border: isCurMonth ? "1px solid rgba(127,119,221,0.25)" : "1px solid transparent", transition:"background 0.15s" }}
    >
      <div style={{ fontSize:13, fontWeight:700, color: isCurMonth ? "#7F77DD" : (darkMode ? "#ccc" : "#333"), marginBottom:6 }}>
        {MONTHS_SHORT[month]}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:0 }}>
        {DAYS_MINI.map((d, i) => (
          <div key={i} style={{ fontSize:7, color: darkMode ? "#555" : "#bbb", textAlign:"center", fontWeight:700, paddingBottom:2 }}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          const key  = cell.current ? `${year}-${String(month+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}` : null;
          const hasE = key && events.some(e => key >= e.date && key <= (e.endDate || e.date));
          const isTod = cell.current && isCurMonth && cell.day === today.getDate();
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", height:18 }}>
              <div style={{ fontSize:8, textAlign:"center", color: isTod ? "#fff" : cell.current ? (darkMode ? "#ccc" : "#444") : (darkMode ? "#333" : "#ddd"), background: isTod ? "#7F77DD" : "transparent", borderRadius:"50%", width:13, height:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {cell.current ? cell.day : ""}
              </div>
              {hasE && !isTod && (
                <div style={{ width:3, height:3, borderRadius:"50%", background:"#7F77DD", marginTop:1 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar ──
export default function Calendar({ events, categories, getCatColor, onDayClick, onEventClick, darkMode }) {
  const today = new Date();
  const [view,      setView]      = useState("month");
  const [focusDate, setFocusDate] = useState(new Date());

  // ── Theme ──
  const t = darkMode ? {
    text:        "#f0f0f0",
    textSec:     "#888",
    textMuted:   "#555",
    cellBg:      "rgba(255,255,255,0.07)",
    cellBgOther: "rgba(255,255,255,0.02)",
    cellBorder:  "rgba(255,255,255,0.08)",
    timeLine:    "rgba(255,255,255,0.07)",
    timeText:    "#555",
    cardBg:      "rgba(255,255,255,0.08)",
    header:      "#9B94FF",
    navBg:       "rgba(255,255,255,0.1)",
    switchBg:    "rgba(255,255,255,0.08)",
    switchActive:"rgba(255,255,255,0.15)",
  } : {
    text:        "#333",
    textSec:     "#888",
    textMuted:   "#bbb",
    cellBg:      "rgba(255,255,255,0.65)",
    cellBgOther: "rgba(255,255,255,0.2)",
    cellBorder:  "rgba(0,0,0,0.06)",
    timeLine:    "rgba(0,0,0,0.06)",
    timeText:    "#bbb",
    cardBg:      "rgba(255,255,255,0.85)",
    header:      "#3C3489",
    navBg:       "rgba(255,255,255,0.6)",
    switchBg:    "rgba(0,0,0,0.05)",
    switchActive:"#fff",
  };

  // ── Helpers ──
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function isToday(date) {
    return date.getDate()     === today.getDate()
        && date.getMonth()    === today.getMonth()
        && date.getFullYear() === today.getFullYear();
  }

  // Multi-day aware: event shows on every day of its span
  function eventsForDate(date) {
    const key = dateKey(date);
    return events.filter(e => {
      const end = e.endDate || e.date;
      return key >= e.date && key <= end;
    });
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
      if (s.getMonth() === e.getMonth())
        return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`;
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
    }
    return focusDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  }

  // ── Month view cells ──
  const yr          = focusDate.getFullYear();
  const mo          = focusDate.getMonth();
  const firstDay    = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const prevDays    = new Date(yr, mo, 0).getDate();
  const cells       = [];
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
        <div style={{ display:"flex", background:t.switchBg, borderRadius:10, padding:3, gap:2 }}>
          {["year","month","week","day"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer", border:"none",
              background:  view===v ? t.switchActive : "transparent",
              color:       view===v ? (darkMode ? "#9B94FF" : "#3C3489") : t.textSec,
              fontWeight:  view===v ? 700 : 400,
              boxShadow:   view===v ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              transition:  "all 0.15s",
              touchAction: "manipulation",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      {view !== "day" && (
        <div className="cal-nav" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={() => navigate(-1)} style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${t.cellBorder}`, background:t.navBg, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation", color:t.text }}>‹</button>
          <span style={{ fontWeight:700, fontSize: view==="year" ? 24 : 18, color:t.header }}>{getHeaderLabel()}</span>
          <button onClick={() => navigate(1)}  style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${t.cellBorder}`, background:t.navBg, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation", color:t.text }}>›</button>
        </div>
      )}

      {/* ══════════════════ YEAR VIEW ══════════════════ */}
      {view === "year" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth
              key={m}
              year={yr}
              month={m}
              events={events}
              darkMode={darkMode}
              today={today}
              onClick={(y, month) => {
                setFocusDate(new Date(y, month, 1));
                setView("month");
              }}
            />
          ))}
        </div>
      )}

      {/* ══════════════════ MONTH VIEW ══════════════════ */}
      {view === "month" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:t.textMuted, padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.06em" }}>{d}</div>
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
                  style={{ background: cell.current ? t.cellBg : t.cellBgOther, minHeight:82, padding:"6px 5px", cursor: cell.current ? "pointer" : "default", borderRadius:10, border: tod ? "2px solid #7F77DD" : `1px solid ${t.cellBorder}` }}
                >
                  <div className="cal-day-num" style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : cell.current ? t.text : t.textMuted, fontSize:12, fontWeight: tod ? 700 : 500, marginBottom:3 }}>
                    {cell.day}
                  </div>
                  {dayEvents.slice(0,2).map(ev => (
                    <EventPill key={ev.id} event={ev} color={getCatColor(ev.type)} onClick={() => onEventClick && onEventClick(ev)} />
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize:10, color:t.textMuted }}>+{dayEvents.length-2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════ WEEK VIEW ══════════════════ */}
      {view === "week" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {getWeekDays(focusDate).map((day, i) => {
            const dayEvents = eventsForDate(day);
            const tod       = isToday(day);
            return (
              <div key={i}
                onClick={() => { setFocusDate(day); onDayClick(dateKey(day)); }}
                style={{ cursor:"pointer", borderRadius:12, padding:"8px 4px", background: tod ? "rgba(127,119,221,0.1)" : t.cellBg, border: tod ? "2px solid #7F77DD" : `1px solid ${t.cellBorder}`, minHeight:110, touchAction:"manipulation" }}
              >
                <div style={{ textAlign:"center", fontSize:9, fontWeight:700, color:t.textMuted, textTransform:"uppercase", marginBottom:4 }}>
                  {DAYS_SHORT[day.getDay()]}
                </div>
                <div style={{ width:26, height:26, borderRadius:"50%", background: tod ? "#7F77DD" : "transparent", color: tod ? "#fff" : t.text, fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px" }}>
                  {day.getDate()}
                </div>
                {dayEvents.slice(0,3).map(ev => (
                  <EventPill key={ev.id} event={ev} color={getCatColor(ev.type)} onClick={() => onEventClick && onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize:9, color:t.textMuted, textAlign:"center" }}>+{dayEvents.length-3}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════ DAY VIEW (Apple Calendar style) ══════════════════ */}
      {view === "day" && (() => {
        const weekDays  = getWeekDays(focusDate);
        const dayEvents = eventsForDate(focusDate);
        const focusKey  = dateKey(focusDate);

        // Decide how each event appears on THIS day
        function dayInfo(e) {
          const end   = e.endDate || e.date;
          const multi = end > e.date;
          if (e.allDay || !e.time) return { section:"allday" };
          if (!multi) return { section:"timed", startH: parseTimeHours(e.time), endH: e.endTime ? parseTimeHours(e.endTime) : null };
          if (focusKey === e.date)           return { section:"timed", startH: parseTimeHours(e.time), endH: DAY_END };
          if (focusKey === end && e.endTime) return { section:"timed", startH: DAY_START, endH: parseTimeHours(e.endTime) };
          return { section:"allday" }; // middle days of a multi-day span
        }

        const timedEvs  = dayEvents.filter(e => dayInfo(e).section === "timed");
        const allDayEvs = dayEvents.filter(e => dayInfo(e).section === "allday");
        const hours     = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);

        return (
          <div>

            {/* Week strip + nav */}
            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:12 }}>
              <button onClick={() => navigate(-1)} style={{ width:28, height:28, borderRadius:"50%", border:`1px solid ${t.cellBorder}`, background:"transparent", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:t.text, flexShrink:0 }}>‹</button>
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {weekDays.map((day, i) => {
                  const tod      = isToday(day);
                  const selected = dateKey(day) === dateKey(focusDate);
                  return (
                    <div key={i}
                      onClick={() => setFocusDate(new Date(day))}
                      style={{ textAlign:"center", cursor:"pointer", padding:"4px 2px", borderRadius:10, touchAction:"manipulation" }}
                    >
                      <div style={{ fontSize:9, fontWeight:700, color:t.textMuted, textTransform:"uppercase", marginBottom:3 }}>
                        {DAYS_SHORT[day.getDay()].charAt(0)}
                      </div>
                      <div style={{ width:28, height:28, borderRadius:"50%", background: tod ? "#7F77DD" : selected ? "rgba(127,119,221,0.15)" : "transparent", color: tod ? "#fff" : selected ? "#7F77DD" : t.text, fontSize:14, fontWeight: tod || selected ? 700 : 500, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate(1)} style={{ width:28, height:28, borderRadius:"50%", border:`1px solid ${t.cellBorder}`, background:"transparent", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:t.text, flexShrink:0 }}>›</button>
            </div>

            {/* Day header */}
            <div style={{ fontSize:14, fontWeight:700, color:t.text, paddingBottom:8, borderBottom:`1px solid ${t.timeLine}` }}>
              {focusDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
            </div>

            {/* All-day events */}
            {allDayEvs.length > 0 && (
              <div style={{ marginTop:8, paddingBottom:8, borderBottom:`1px solid ${t.timeLine}` }}>
                <div style={{ fontSize:10, color:t.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>all day</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {allDayEvs.map(ev => {
                    const c     = getCatColor(ev.type);
                    const multi = (ev.endDate || ev.date) > ev.date;
                    return (
                      <div key={ev.id}
                        onClick={() => onEventClick && onEventClick(ev)}
                        style={{ background:c.bg, color:c.color, borderRadius:8, padding:"6px 10px", fontSize:13, fontWeight:600, cursor:"pointer" }}
                      >
                        {ev.title}
                        {multi && <span style={{ fontSize:11, opacity:0.7 }}> · multi-day</span>}
                        {ev.location && <span style={{ fontSize:11, opacity:0.7 }}> · {ev.location}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Time grid — ALWAYS SHOWN ── */}
            <div style={{ position:"relative", height:`${(DAY_END - DAY_START) * HOUR_HEIGHT}px`, marginTop:8 }}>

              {/* Hour lines */}
              {hours.map(h => (
                <div key={h} style={{ position:"absolute", top:`${(h - DAY_START) * HOUR_HEIGHT}px`, left:0, right:0, display:"flex", alignItems:"flex-start" }}>
                  <span style={{ fontSize:10, color:t.timeText, fontWeight:600, width:46, flexShrink:0, paddingTop:2, textAlign:"right", paddingRight:8 }}>
                    {formatHour(h)}
                  </span>
                  <div style={{ flex:1, borderTop:`1px solid ${t.timeLine}`, height:`${HOUR_HEIGHT}px` }} />
                </div>
              ))}

              {/* Timed events — duration blocks */}
              {timedEvs.map(ev => {
                const info = dayInfo(ev);
                if (info.startH === null || info.startH > DAY_END) return null;
                const startH = Math.max(info.startH, DAY_START);
                const top    = (startH - DAY_START) * HOUR_HEIGHT;
                const height = info.endH ? Math.max((Math.min(info.endH, DAY_END) - startH) * HOUR_HEIGHT, 44) : 44;
                const c      = getCatColor(ev.type);
                return (
                  <div key={ev.id}
                    onClick={() => onEventClick && onEventClick(ev)}
                    style={{ position:"absolute", top:`${top}px`, height:`${height}px`, left:52, right:0, background:c.bg, color:c.color, borderRadius:10, padding:"8px 10px", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.12)", zIndex:1, borderLeft:`3px solid ${c.color}`, overflow:"hidden" }}
                  >
                    <div style={{ fontWeight:700, fontSize:13 }}>{ev.title}</div>
                    <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>
                      {ev.time}{ev.endTime ? `–${ev.endTime}` : ""}{ev.location ? ` · ${ev.location}` : ""}
                    </div>
                  </div>
                );
              })}

              {/* Red current time line — today only */}
              {isToday(focusDate) && (() => {
                const now  = new Date();
                const nowH = now.getHours() + now.getMinutes() / 60;
                if (nowH < DAY_START || nowH > DAY_END) return null;
                const top  = (nowH - DAY_START) * HOUR_HEIGHT;
                return (
                  <div style={{ position:"absolute", top:`${top}px`, left:46, right:0, height:2, background:"#E53E3E", zIndex:2, display:"flex", alignItems:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#E53E3E", marginLeft:-4, flexShrink:0 }} />
                  </div>
                );
              })()}
            </div>

            {/* Suggest a plan button */}
            <button
              onClick={() => onDayClick(dateKey(focusDate))}
              style={{ width:"100%", padding:"10px", borderRadius:12, border:`1.5px dashed ${t.cellBorder}`, background:"none", color:t.textMuted, fontSize:13, cursor:"pointer", marginTop:12 }}
            >
              + suggest a plan for this day
            </button>

          </div>
        );
      })()}

      {/* ── Legend ── */}
      {view !== "year" && (
        <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
          {allCats.map(cat => (
            <span key={cat.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:t.textSec }}>
              <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:cat.color.bg, border:`1.5px solid ${cat.color.color}` }} />
              {cat.name}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}