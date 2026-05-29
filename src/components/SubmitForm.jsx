import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const TYPE_COLORS = {
  hangout: { active:"#EEEDFE", border:"#AFA9EC", text:"#3C3489" },
  trip:    { active:"#E1F5EE", border:"#5DCAA5", text:"#085041" },
  sports:  { active:"#FAEEDA", border:"#EF9F27", text:"#633806" },
};

export default function SubmitForm({ defaultDate, onClose }) {
  const [title, setTitle]       = useState("");
  const [date, setDate]         = useState(defaultDate || "");
  const [type, setType]         = useState("hangout");
  const [who, setWho]           = useState("");
  const [note, setNote]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);

  async function handleSubmit() {
    if (!title || !date) return alert("Please add a title and date!");
    setSubmitting(true);
    await addDoc(collection(db, "events"), {
      title, date, type, who, note,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"var(--color-background-primary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", padding:"1.5rem", width:320, maxWidth:"95vw" }}>
        {done ? (
          <div style={{ textAlign:"center", padding:"1rem 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
            <h2 style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>Plan submitted!</h2>
            <p style={{ fontSize:14, color:"var(--color-text-secondary)", marginBottom:16 }}>The admin will review and approve it soon.</p>
            <button onClick={onClose} style={{ width:"100%", padding:8, borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"none", cursor:"pointer" }}>close</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize:16, fontWeight:500, marginBottom:"1rem" }}>suggest a plan</h2>
            {[
              { label:"title", el: <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="what's the plan?" style={{ width:"100%" }} /> },
              { label:"date",  el: <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:"100%" }} /> },
            ].map(({ label, el }) => (
              <div key={label} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>type</label>
              <div style={{ display:"flex", gap:8 }}>
                {["hangout","trip","sports"].map(t => (
                  <button key={t} onClick={() => setType(t)} style={{ flex:1, padding:"7px 4px", border:`0.5px solid ${type===t ? TYPE_COLORS[t].border : "var(--color-border-secondary)"}`, borderRadius:8, fontSize:12, cursor:"pointer", background: type===t ? TYPE_COLORS[t].active : "none", color: type===t ? TYPE_COLORS[t].text : "var(--color-text-secondary)" }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>who's coming</label>
              <input value={who} onChange={e=>setWho(e.target.value)} placeholder="Jake, Sam, Mia…" style={{ width:"100%" }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>notes</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="any details…" style={{ width:"100%", resize:"vertical", height:64 }} />
            </div>
            <div style={{ display:"flex", gap:8, marginTop:"1rem" }}>
              <button onClick={onClose} style={{ flex:1, padding:8, borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"none", cursor:"pointer" }}>cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex:1, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:500, cursor:"pointer" }}>
                {submitting ? "submitting…" : "submit plan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}