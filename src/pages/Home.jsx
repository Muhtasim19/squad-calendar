import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Calendar from "../components/Calendar";
import SubmitForm from "../components/SubmitForm";

export default function Home() {
  const [events,     setEvents]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, "events"), where("status", "==", "approved")),
      snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubCats = onSnapshot(collection(db, "categories"),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubEvents(); unsubCats(); };
  }, []);

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"2rem 1rem" }}>
      <div className="page-card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, color:"#3C3489" }}>Squad Calendar</h1>
            <p style={{ fontSize:13, color:"#aaa", marginTop:2 }}>Plan together, show up together</p>
          </div>
          <button
            onClick={() => { setSelectedDate(null); setShowForm(true); }}
            style={{ padding:"9px 18px", borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:600, fontSize:14, cursor:"pointer" }}
          >
            + suggest a plan
          </button>
        </div>
        <Calendar events={events} categories={categories} onDayClick={date => { setSelectedDate(date); setShowForm(true); }} />
      </div>

      {showForm && (
        <SubmitForm
          defaultDate={selectedDate}
          categories={categories}
          onClose={() => { setShowForm(false); setSelectedDate(null); }}
        />
      )}
    </div>
  );
}