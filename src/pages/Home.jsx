import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Calendar from "../components/Calendar";
import SubmitForm from "../components/SubmitForm";

export default function Home() {
  const [events, setEvents]       = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "events"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"2rem 1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <h1 style={{ fontSize:22, fontWeight:500 }}>Squad Calendar</h1>
        <button onClick={() => { setSelectedDate(null); setShowForm(true); }}>+ suggest a plan</button>
      </div>
      <Calendar
        events={events}
        onDayClick={date => { setSelectedDate(date); setShowForm(true); }}
      />
      {showForm && (
        <SubmitForm
          defaultDate={selectedDate}
          onClose={() => { setShowForm(false); setSelectedDate(null); }}
        />
      )}
    </div>
  );
}