import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Calendar from "../components/Calendar";
import SubmitForm from "../components/SubmitForm";
import EventDetail from "../components/EventDetail";
import Notifications from "../components/Notifications";
import PushNotifications from "../components/PushNotifications";

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

export default function Home() {
  const [events,        setEvents]        = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [showForm,      setShowForm]      = useState(false);
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "events"), where("status", "==", "approved")),
      s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      collection(db, "categories"),
      s => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  function getCatColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#E8E8E8", color:"#666" });
  }

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"2rem 1rem" }}>
      <div className="page-card">

        {/* Header */}
        <div
          className="home-header"
          style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}
        >
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, color:"#3C3489" }}>Squad Calendar</h1>
            <p style={{ fontSize:13, color:"#aaa", marginTop:2 }}>Plan together, show up together</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Notifications />
            <button
              className="suggest-btn"
              onClick={() => {
                setSelectedEvent(null);
                setSelectedDate(null);
                setShowForm(true);
              }}
              style={{ padding:"9px 18px", borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:600, fontSize:14, cursor:"pointer" }}
            >
              + suggest a plan
            </button>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          events={events}
          categories={categories}
          getCatColor={getCatColor}
          onDayClick={date => {
            setSelectedEvent(null);
            setSelectedDate(date);
            setShowForm(true);
          }}
          onEventClick={ev => {
            setShowForm(false);
            setSelectedDate(null);
            setSelectedEvent(ev);
          }}
        />

        {/* Push notification banner */}
        <PushNotifications />

      </div>

      {/* Only one modal shows at a time */}
      {showForm && !selectedEvent && (
        <SubmitForm
          defaultDate={selectedDate}
          categories={categories}
          onClose={() => { setShowForm(false); setSelectedDate(null); }}
        />
      )}
      {selectedEvent && !showForm && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}