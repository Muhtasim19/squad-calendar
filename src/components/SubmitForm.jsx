import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import LocationPicker from "./LocationPicker";
import { tapLight, tapMedium, buzzSuccess } from "../haptics";

const DEFAULTS = [
  { name:"hangout", color:{ bg:"#EEEDFE", color:"#3C3489" } },
  { name:"trip",    color:{ bg:"#E1F5EE", color:"#085041" } },
  { name:"sports",  color:{ bg:"#FAEEDA", color:"#633806" } },
];

export default function SubmitForm({ defaultDate, categories, onClose }) {
  const [isIdea,     setIsIdea]     = useState(false);
  const [title,      setTitle]      = useState("");
  const [allDay,     setAllDay]     = useState(false);
  const [date,       setDate]       = useState(defaultDate || "");
  const [endDate,    setEndDate]    = useState("");
  const [time,       setTime]       = useState("");
  const [endTime,    setEndTime]    = useState("");
  const [location,   setLocation]   = useState({ name:"", lat:null, lng:null });
  const [type,       setType]       = useState("hangout");
  const [customType, setCustomType] = useState("");
  const [note,       setNote]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const cats      = categories?.length > 0 ? categories : DEFAULTS;
  const finalType = type === "custom" ? (customType.trim() || "other") : type;

  async function handleSubmit() {

    if (!title.trim()) return alert("Please add a title!");
    if (!isIdea && !date) return alert("Please add a start date or toggle 'no date yet'.");

    const finalEnd = endDate || date;
    if (!isIdea && finalEnd < date) return alert("End date can't be before start date!");
    if (!isIdea && !allDay && finalEnd === date && time && endTime && endTime <= time)
      return alert("End time must be after start time!");

    setSubmitting(true);
    try {
      if (isIdea) {
        await addDoc(collection(db, "board"), {
          type:"idea", title:title.trim(), description:note.trim(),
          pinned:false, createdAt:serverTimestamp(),
        });
      } else {
        buzzSuccess();
        await addDoc(collection(db, "events"), {
          title, date,
          endDate: finalEnd,
          allDay,
          time:    allDay ? "" : time,
          endTime: allDay ? "" : endTime,
          location: location.name,
          lat: location.lat, lng: location.lng,
          type: finalType, note,
          status:"pending", createdAt:serverTimestamp(),
        });
        await addDoc(collection(db, "notifications"), {
          message:`New plan suggested: "${title}" 📋`,
          type:"new_plan", eventTitle:title, createdAt:serverTimestamp(),
        });
      }
      setDone(true);
    } catch (err) { alert("Something went wrong: " + err.message); }
    finally { setSubmitting(false); }
  }

  return (
      <div
          className="sheet-overlay"
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={e => e.target === e.currentTarget && onClose()}
      >
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:400, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
        {done ? (
          <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{isIdea ? "💡" : "✅"}</div>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#3C3489" }}>
              {isIdea ? "Idea added to the board!" : "Plan submitted!"}
            </h2>
            <p style={{ fontSize:14, color:"#aaa", marginBottom:20 }}>
              {isIdea ? "Your idea is now on the Squad Board." : "The admin will review and approve it soon."}
            </p>
            <button onClick={onClose} style={{ width:"100%", padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer" }}>close</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:"1rem", color:"#3C3489" }}>suggest a plan</h2>

            {/* No date toggle */}
            <div onClick={() => setIsIdea(!isIdea)}
              style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 12px", borderRadius:10, background: isIdea ? "rgba(127,119,221,0.08)" : "rgba(0,0,0,0.03)", border:`1.5px solid ${isIdea ? "rgba(127,119,221,0.3)" : "rgba(0,0,0,0.06)"}`, cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${isIdea ? "#7F77DD" : "#ddd"}`, background: isIdea ? "#7F77DD" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                {isIdea && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color: isIdea ? "#3C3489" : "#666", margin:0 }}>💡 no date yet — add as idea</p>
                <p style={{ fontSize:11, color:"#bbb", margin:0 }}>goes to Squad Board, no approval needed</p>
              </div>
            </div>

            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="what's the plan?" style={{ marginBottom:12 }} />

            {!isIdea && (
              <>
                {/* All-day toggle */}
                <div onClick={() => setAllDay(!allDay)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, padding:"8px 12px", borderRadius:10, background:"rgba(0,0,0,0.03)", border:"1.5px solid rgba(0,0,0,0.06)", cursor:"pointer" }}>
                  <span style={{ fontSize:13, fontWeight:600, color: allDay ? "#3C3489" : "#666" }}>all-day</span>
                  <div style={{ width:40, height:24, borderRadius:12, background: allDay ? "#7F77DD" : "#ddd", position:"relative", transition:"background 0.2s" }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left: allDay ? 18 : 2, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>

                {/* Starts */}
                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>starts</label>
                <div className="date-time-row" style={{ display:"grid", gridTemplateColumns: allDay ? "1fr" : "1fr 1fr", gap:10, marginBottom:12 }}>
                  <input type="date" value={date} onChange={e => { setDate(e.target.value); if (endDate && endDate < e.target.value) setEndDate(e.target.value); }} />
                  {!allDay && <input type="time" value={time} onChange={e=>setTime(e.target.value)} />}
                </div>

                {/* Ends */}
                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>ends</label>
                <div className="date-time-row" style={{ display:"grid", gridTemplateColumns: allDay ? "1fr" : "1fr 1fr", gap:10, marginBottom:12 }}>
                  <input type="date" value={endDate} min={date} onChange={e=>setEndDate(e.target.value)} placeholder={date} />
                  {!allDay && <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />}
                </div>
                <p style={{ fontSize:11, color:"#ccc", margin:"-6px 0 12px" }}>leave end empty for a single-day plan</p>

                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>location (optional)</label>
                <div style={{ marginBottom:12 }}>
                  <LocationPicker value={location} onChange={setLocation} />
                </div>

                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:6 }}>category</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: type==="custom" ? 8 : 12 }}>
                  {cats.map(c => (
                    <button key={c.name} onClick={() => setType(c.name)} style={{ padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer", background: type===c.name ? c.color.bg : "none", color: type===c.name ? c.color.color : "#aaa", border:`1.5px solid ${type===c.name ? c.color.color : "#ddd"}`, fontWeight: type===c.name ? 700 : 400, transition:"all 0.15s" }}>{c.name}</button>
                  ))}
                  <button onClick={() => setType("custom")} style={{ padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer", background: type==="custom" ? "#f0f0f0" : "none", color: type==="custom" ? "#444" : "#aaa", border:`1.5px solid ${type==="custom" ? "#bbb" : "#ddd"}`, fontWeight: type==="custom" ? 700 : 400, transition:"all 0.15s" }}>+ custom</button>
                </div>
                {type === "custom" && (
                  <input value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g. movies, road trip…" style={{ marginBottom:12 }} autoFocus />
                )}
              </>
            )}

            <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>notes (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="any details…" style={{ resize:"vertical", height:64, marginBottom:16 }} />

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}>cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex:2, padding:10, borderRadius:10, background: isIdea ? "#1D9E75" : "#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:submitting?0.7:1 }}>
                {submitting ? "submitting…" : isIdea ? "add to board 💡" : "submit plan →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}