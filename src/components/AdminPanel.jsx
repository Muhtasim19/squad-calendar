import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const PALETTE = [
  { bg:"#CECBF6", color:"#3C3489", label:"purple" },
  { bg:"#9FE1CB", color:"#085041", label:"teal" },
  { bg:"#FAC775", color:"#633806", label:"amber" },
  { bg:"#F4C0D1", color:"#72243E", label:"pink" },
  { bg:"#B5D4F4", color:"#0C447C", label:"blue" },
  { bg:"#C0DD97", color:"#27500A", label:"green" },
  { bg:"#F5C4B3", color:"#712B13", label:"coral" },
];

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

function RsvpCount({ eventId }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events", eventId, "rsvps"), snap => setCount(snap.size));
    return () => unsub();
  }, [eventId]);
  return count > 0 ? (
    <span style={{ background:"#EEEDFE", color:"#3C3489", fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:600 }}>
      🙋 {count} going
    </span>
  ) : null;
}

export default function AdminPanel() {
  const [pending,    setPending]    = useState([]);
  const [approved,   setApproved]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab,        setTab]        = useState("pending");
  const [newName,    setNewName]    = useState("");
  const [newColor,   setNewColor]   = useState(PALETTE[0]);
  const [addingCat,  setAddingCat]  = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,"events"), where("status","==","pending")),  s => setPending(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(query(collection(db,"events"), where("status","==","approved")), s => setApproved(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,"categories"), s => setCategories(s.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { u1(); u2(); u3(); };
  }, []);

  // ← updated approve with notification
  async function approve(id) {
    const ev = pending.find(e => e.id === id);
    await updateDoc(doc(db, "events", id), { status: "approved" });
    if (ev) {
      await addDoc(collection(db, "notifications"), {
        message: `"${ev.title}" has been approved! 🎉`,
        type: "approved",
        eventTitle: ev.title,
        eventId: id,
        createdAt: serverTimestamp(),
      });
    }
  }

  const reject    = id => deleteDoc(doc(db,"events",id));
  const remove    = id => deleteDoc(doc(db,"events",id));
  const deleteCat = id => deleteDoc(doc(db,"categories",id));

  async function addCat() {
    if (!newName.trim()) return;
    await addDoc(collection(db,"categories"), { name: newName.trim().toLowerCase(), color: newColor });
    setNewName(""); setAddingCat(false);
  }

  function getCatColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#eee", color:"#555" });
  }

  const events = tab === "pending" ? pending : approved;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.5rem" }}>
        {[
          { key:"pending",    label: `pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { key:"approved",   label: "approved" },
          { key:"categories", label: "categories" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:"7px 18px", borderRadius:20, fontSize:13, cursor:"pointer",
            background: tab===t.key ? "#7F77DD" : "rgba(255,255,255,0.6)",
            color:      tab===t.key ? "#fff" : "#777",
            border:     tab===t.key ? "none" : "1px solid #ddd",
            fontWeight: tab===t.key ? 700 : 400,
            backdropFilter: "blur(8px)",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Events — pending + approved */}
      {tab !== "categories" && (
        <>
          {events.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem 0", color:"#bbb", fontSize:14 }}>
              {tab === "pending" ? "No plans waiting for approval 🎉" : "No approved plans yet"}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.map(ev => {
              const c = getCatColor(ev.type);
              return (
                <div key={ev.id} style={{ background:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.6)", borderRadius:12, padding:"1rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, backdropFilter:"blur(8px)", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
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

                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {tab === "pending" ? (
                      <>
                        <button onClick={() => approve(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"#1D9E75", color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>✓ approve</button>
                        <button onClick={() => reject(ev.id)}  style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>✕ reject</button>
                      </>
                    ) : (
                      <button onClick={() => remove(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #ddd", color:"#aaa", fontSize:13, cursor:"pointer" }}>remove</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Categories */}
      {tab === "categories" && (
        <div>
          <p style={{ fontSize:13, color:"#bbb", marginBottom:16 }}>Default categories (hangout, trip, sports) are built-in. Add custom ones below.</p>

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
    </div>
  );
}