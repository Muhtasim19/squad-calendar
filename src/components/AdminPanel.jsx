import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const TYPE_COLORS = {
  hangout: { bg:"#EEEDFE", color:"#3C3489" },
  trip:    { bg:"#E1F5EE", color:"#085041" },
  sports:  { bg:"#FAEEDA", color:"#633806" },
};

export default function AdminPanel() {
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [tab, setTab]           = useState("pending");

  useEffect(() => {
    const unsubPending = onSnapshot(
      query(collection(db, "events"), where("status", "==", "pending")),
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubApproved = onSnapshot(
      query(collection(db, "events"), where("status", "==", "approved")),
      snap => setApproved(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubPending(); unsubApproved(); };
  }, []);

  async function approve(id) {
    await updateDoc(doc(db, "events", id), { status: "approved" });
  }

  async function reject(id) {
    await deleteDoc(doc(db, "events", id));
  }

  async function remove(id) {
    await deleteDoc(doc(db, "events", id));
  }

  const events = tab === "pending" ? pending : approved;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.5rem" }}>
        {["pending","approved"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"7px 18px", borderRadius:8, fontSize:13, cursor:"pointer",
            background: tab===t ? "#7F77DD" : "none",
            color: tab===t ? "#fff" : "var(--color-text-secondary)",
            border: tab===t ? "none" : "0.5px solid var(--color-border-secondary)",
            fontWeight: tab===t ? 500 : 400,
          }}>
            {t} {t==="pending" && pending.length > 0 && `(${pending.length})`}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem 0", color:"var(--color-text-secondary)", fontSize:14 }}>
          {tab === "pending" ? "No plans waiting for approval 🎉" : "No approved plans yet"}
        </div>
      )}

      {/* Event cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {events.map(ev => {
          const c = TYPE_COLORS[ev.type] || TYPE_COLORS.hangout;
          return (
            <div key={ev.id} style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 8px", borderRadius:4, fontWeight:500 }}>{ev.type}</span>
                  <span style={{ fontWeight:500, fontSize:15 }}>{ev.title}</span>
                </div>
                <div style={{ fontSize:13, color:"var(--color-text-secondary)", display:"flex", flexDirection:"column", gap:2 }}>
                  <span>📅 {ev.date}</span>
                  {ev.who  && <span>👥 {ev.who}</span>}
                  {ev.note && <span>📝 {ev.note}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                {tab === "pending" ? (
                  <>
                    <button onClick={() => approve(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"#1D9E75", color:"#fff", border:"none", fontSize:13, fontWeight:500, cursor:"pointer" }}>
                      ✓ approve
                    </button>
                    <button onClick={() => reject(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"0.5px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>
                      ✕ reject
                    </button>
                  </>
                ) : (
                  <button onClick={() => remove(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-secondary)", fontSize:13, cursor:"pointer" }}>
                    remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}