import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import AdminCalendar from "./AdminCalendar";

const PALETTE = [
  { bg:"#CECBF6", color:"#3C3489", label:"purple" },
  { bg:"#9FE1CB", color:"#085041", label:"teal"   },
  { bg:"#FAC775", color:"#633806", label:"amber"  },
  { bg:"#F4C0D1", color:"#72243E", label:"pink"   },
  { bg:"#B5D4F4", color:"#0C447C", label:"blue"   },
  { bg:"#C0DD97", color:"#27500A", label:"green"  },
  { bg:"#F5C4B3", color:"#712B13", label:"coral"  },
];

const DEFAULT_COLORS = {
  hangout: { bg:"#CECBF6", color:"#3C3489" },
  trip:    { bg:"#9FE1CB", color:"#085041" },
  sports:  { bg:"#FAC775", color:"#633806" },
};

// ── Helper: get display name from contact ──
function getContactName(contact) {
  const first = contact.firstName || contact.name || "";
  const last  = contact.lastName  || "";
  return `${first} ${last}`.trim() || "No name";
}

// ── Contact checklist component ──
function ContactChecklist({ contacts, selectedIds, onChange, dm, t }) {
  function toggle(id) {
    onChange(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }
  if (contacts.length === 0) return (
    <p style={{ fontSize:12, color:t.textMuted, margin:0 }}>No contacts saved yet — add them in the Contacts tab.</p>
  );
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        <button onClick={() => onChange(contacts.map(c => c.id))} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", color:t.textSec }}>select all</button>
        <button onClick={() => onChange([])} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", color:t.textSec }}>deselect all</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {contacts.map(c => {
          const selected = selectedIds.includes(c.id);
          return (
            <div key={c.id} onClick={() => toggle(c.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10, cursor:"pointer", background: selected ? "rgba(29,158,117,0.08)" : (dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"), border:`1px solid ${selected ? "rgba(29,158,117,0.3)" : t.border}`, transition:"all 0.15s" }}
            >
              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selected ? "#1D9E75" : t.border}`, background: selected ? "#1D9E75" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                {selected && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>{getContactName(c)}</p>
                <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>{c.phone}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RsvpCount ──
function RsvpCount({ eventId }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,"events",eventId,"rsvps"), snap => setCount(snap.size));
    return () => unsub();
  }, [eventId]);
  return count > 0 ? (
    <span style={{ background:"#EEEDFE", color:"#3C3489", fontSize:11, padding:"2px 8px", borderRadius:10, fontWeight:600 }}>🙋 {count} going</span>
  ) : null;
}

// ── RsvpList ──
function RsvpList({ eventId }) {
  const [rsvps, setRsvps] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,"events",eventId,"rsvps"), snap =>
      setRsvps(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    );
    return () => unsub();
  }, [eventId]);
  if (rsvps.length === 0) return <p style={{ fontSize:13, color:"#bbb", margin:0 }}>No RSVPs yet</p>;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {rsvps.map(r => (
        <div key={r.id} style={{ background:"#f5f5f5", borderRadius:20, padding:"4px 12px", fontSize:13, display:"flex", alignItems:"center", gap:4 }}>
          <span>{r.name}</span>
          {r.phone    && <span style={{ fontSize:10, color:"#bbb" }}>📱</span>}
          {r.fcmToken && <span style={{ fontSize:10, color:"#bbb" }}>🔔</span>}
        </div>
      ))}
    </div>
  );
}

// ── Edit event modal ──
function EditEventModal({ event, contacts, onClose, dm, t }) {
  const [title,         setTitle]         = useState(event.title       || "");
  const [date,          setDate]          = useState(event.date        || "");
  const [time,          setTime]          = useState(event.time        || "");
  const [location,      setLocation]      = useState(event.location    || "");
  const [who,           setWho]           = useState(event.who         || "");
  const [note,          setNote]          = useState(event.note        || "");
  const [smsReminder,   setSmsReminder]   = useState(event.smsReminder || false);
  const [smsContactIds, setSmsContactIds] = useState(event.smsContactIds || []);
  const [saving,        setSaving]        = useState(false);

  // Auto-turn off if no contacts selected
  function handleSmsToggle() {
    const next = !smsReminder;
    setSmsReminder(next);
    if (!next) setSmsContactIds([]);
  }

  async function handleSave() {
    if (!title || !date) return alert("Title and date are required!");

    // Auto-turn off SMS if no contacts selected
    const finalSms     = smsReminder && smsContactIds.length > 0;
    const finalIds     = finalSms ? smsContactIds : [];

    setSaving(true);
    try {
      await updateDoc(doc(db,"events",event.id), {
        title, date, time, location, who, note,
        smsReminder:   finalSms,
        smsContactIds: finalIds,
      });
      onClose();
    } catch (err) { alert("Save failed: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color: dm ? "#9B94FF" : "#3C3489" }}>edit event</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom:12 }} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>time</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
          </div>
        </div>

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>location</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>who's coming</label>
        <input value={who} onChange={e=>setWho(e.target.value)} style={{ marginBottom:12 }} />

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ resize:"vertical", height:64, marginBottom:14 }} />

        {/* SMS toggle */}
        <div onClick={handleSmsToggle}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background: smsReminder ? "rgba(29,158,117,0.1)" : (dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"), border:`1.5px solid ${smsReminder ? "rgba(29,158,117,0.4)" : t.border}`, cursor:"pointer", marginBottom: smsReminder ? 10 : 16, transition:"all 0.15s" }}
        >
          <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${smsReminder ? "#1D9E75" : t.border}`, background: smsReminder ? "#1D9E75" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
            {smsReminder && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color: smsReminder ? "#1D9E75" : t.text, margin:0 }}>📱 SMS reminder for this event</p>
            <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>
              {smsReminder
                ? smsContactIds.length === 0
                  ? "⚠️ select at least one contact — SMS will be turned off if none selected"
                  : `texting ${smsContactIds.length} contact${smsContactIds.length !== 1 ? "s" : ""} at 5PM the day before`
                : "texts selected contacts at 5PM the day before"
              }
            </p>
          </div>
        </div>

        {/* Contact checklist — shown when SMS is ON */}
        {smsReminder && (
          <div style={{ marginBottom:16, padding:"12px", borderRadius:10, background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border:`1px solid ${t.border}` }}>
            <p style={{ fontSize:12, fontWeight:700, color:t.textSec, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 10px" }}>send to</p>
            <ContactChecklist
              contacts={contacts}
              selectedIds={smsContactIds}
              onChange={setSmsContactIds}
              dm={dm}
              t={t}
            />
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
            {saving ? "saving…" : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan It modal ──
function PlanItModal({ item, categories, onClose, dm, t }) {
  const [noDate,   setNoDate]   = useState(false);
  const [title,    setTitle]    = useState(item.title       || "");
  const [date,     setDate]     = useState("");
  const [time,     setTime]     = useState("");
  const [location, setLocation] = useState(item.location    || "");
  const [category, setCategory] = useState("hangout");
  const [who,      setWho]      = useState(item.who         || "");
  const [note,     setNote]     = useState(item.description || "");
  const [saving,   setSaving]   = useState(false);

  const cats = [
    { name:"hangout", color:{ bg:"#EEEDFE", color:"#3C3489" } },
    { name:"trip",    color:{ bg:"#E1F5EE", color:"#085041" } },
    { name:"sports",  color:{ bg:"#FAEEDA", color:"#633806" } },
    ...(categories || []),
  ];

  async function handleSubmit() {
    if (!noDate && !date) return alert("Please add a date!");
    setSaving(true);
    try {
      if (noDate) {
        await updateDoc(doc(db,"board",item.id), {
          status: "being_planned", location: location.trim(),
          description: note.trim(), updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db,"events"), {
          title: title.trim(), date, time,
          location: location.trim(), type: category,
          who: who.trim(), note: note.trim(),
          status: "approved", createdAt: serverTimestamp(),
        });
        await addDoc(collection(db,"notifications"), {
          message: `"${title}" has been planned for ${date}! 🎉`,
          type: "approved", eventTitle: title, createdAt: serverTimestamp(),
        });
        await deleteDoc(doc(db,"board",item.id));
      }
      onClose();
    } catch (err) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-anim" style={{ borderRadius:20, padding:"1.75rem", width:420, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color: dm ? "#9B94FF" : "#3C3489" }}>📅 plan it</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#bbb" }}>✕</button>
        </div>

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom:14 }} />

        <div onClick={() => setNoDate(!noDate)} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 12px", borderRadius:12, background: noDate ? "rgba(127,119,221,0.1)" : (dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"), border:`1.5px solid ${noDate ? "rgba(127,119,221,0.3)" : t.border}`, cursor:"pointer" }}>
          <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${noDate ? "#7F77DD" : t.border}`, background: noDate ? "#7F77DD" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {noDate && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color: noDate ? "#7F77DD" : t.text, margin:0 }}>📋 date not fixed yet</p>
            <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>keeps it on the board as "being planned"</p>
          </div>
        </div>

        {!noDate && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>time (optional)</label>
                <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
              </div>
            </div>
            <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:6 }}>category</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {cats.map(c => (
                <button key={c.name} onClick={() => setCategory(c.name)} style={{
                  padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
                  background: category===c.name ? c.color.bg : "none",
                  color:      category===c.name ? c.color.color : t.textSec,
                  border:     `1.5px solid ${category===c.name ? c.color.color : t.border}`,
                  fontWeight: category===c.name ? 700 : 400,
                }}>{c.name}</button>
              ))}
            </div>
          </>
        )}

        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>location (optional)</label>
        <input value={location} onChange={e=>setLocation(e.target.value)} style={{ marginBottom:12 }} />
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>who's coming</label>
        <input value={who} onChange={e=>setWho(e.target.value)} style={{ marginBottom:12 }} />
        <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>notes</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{ height:60, resize:"vertical", marginBottom:16 }} />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex:2, padding:10, borderRadius:10, background: noDate ? "#7F77DD" : "#1D9E75", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:saving?0.7:1 }}>
            {saving ? "saving…" : noDate ? "🔄 mark as being planned" : "✅ plan it!"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ──
export default function AdminPanel({ darkMode = false }) {
  const dm = darkMode;

  const t = {
    text:      dm ? "#f0f0f0" : "#333",
    textSec:   dm ? "#888"    : "#888",
    textMuted: dm ? "#555"    : "#bbb",
    cardBg:    dm ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.8)",
    cardBorder:dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    tabBg:     dm ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    tabBorder: dm ? "rgba(255,255,255,0.12)" : "#ddd",
    formBg:    dm ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border:    dm ? "rgba(255,255,255,0.12)" : "#ddd",
    emptyColor:dm ? "#555" : "#bbb",
  };

  const [pending,              setPending]              = useState([]);
  const [approved,             setApproved]             = useState([]);
  const [categories,           setCategories]           = useState([]);
  const [boardItems,           setBoardItems]           = useState([]);
  const [subscribers,          setSubscribers]          = useState([]);
  const [contacts,             setContacts]             = useState([]);
  const [tab,                  setTab]                  = useState("calendar");
  const [newName,              setNewName]              = useState("");
  const [newColor,             setNewColor]             = useState(PALETTE[0]);
  const [addingCat,            setAddingCat]            = useState(false);
  const [editingEvent,         setEditingEvent]         = useState(null);
  const [expandedRsvps,        setExpandedRsvps]        = useState(null);
  const [addingBoard,          setAddingBoard]          = useState(false);
  const [boardType,            setBoardType]            = useState("announcement");
  const [boardTitle,           setBoardTitle]           = useState("");
  const [boardDesc,            setBoardDesc]            = useState("");
  const [boardWho,             setBoardWho]             = useState("");
  const [planningItem,         setPlanningItem]         = useState(null);

  // Contacts state
  const [addingContact,        setAddingContact]        = useState(false);
  const [contactFirstName,     setContactFirstName]     = useState("");
  const [contactLastName,      setContactLastName]      = useState("");
  const [contactPhone,         setContactPhone]         = useState("");
  const [editingContactId,     setEditingContactId]     = useState(null);
  const [editFirstName,        setEditFirstName]        = useState("");
  const [editLastName,         setEditLastName]         = useState("");
  const [editPhone,            setEditPhone]            = useState("");

  // Announcement state
  const [customMsg,            setCustomMsg]            = useState("");
  const [sendingMsg,           setSendingMsg]           = useState(false);
  const [announcementContacts, setAnnouncementContacts] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,"events"), where("status","==","pending")),  s => setPending(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(query(collection(db,"events"), where("status","==","approved")), s => setApproved(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,"categories"), s => setCategories(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u4 = onSnapshot(query(collection(db,"board"), orderBy("createdAt","desc")), s => setBoardItems(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u5 = onSnapshot(collection(db,"fcmTokens"), s => setSubscribers(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u6 = onSnapshot(collection(db,"contacts"),  s => setContacts(s.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  async function approve(id) {
    const ev = pending.find(e => e.id === id);
    await updateDoc(doc(db,"events",id), { status:"approved" });
    if (ev) {
      await addDoc(collection(db,"notifications"), {
        message:`"${ev.title}" has been approved! 🎉`, type:"approved",
        eventTitle:ev.title, eventId:id, createdAt:serverTimestamp(),
      });
    }
  }

  const reject           = id => deleteDoc(doc(db,"events",id));
  const remove           = id => deleteDoc(doc(db,"events",id));
  const deleteCat        = id => deleteDoc(doc(db,"categories",id));
  const deleteBoardItem  = id => deleteDoc(doc(db,"board",id));
  const deleteSubscriber = id => deleteDoc(doc(db,"fcmTokens",id));
  const deleteContact    = id => deleteDoc(doc(db,"contacts",id));

  async function addCat() {
    if (!newName.trim()) return;
    await addDoc(collection(db,"categories"), { name:newName.trim().toLowerCase(), color:newColor });
    setNewName(""); setAddingCat(false);
  }

  async function addBoardItem() {
    if (!boardTitle.trim()) return;
    await addDoc(collection(db,"board"), {
      type:boardType, title:boardTitle.trim(), description:boardDesc.trim(),
      who:boardWho.trim(), pinned:boardType==="announcement", createdAt:serverTimestamp(),
    });
    setBoardTitle(""); setBoardDesc(""); setBoardWho(""); setAddingBoard(false);
  }

  async function addContact() {
    if (!contactPhone.trim()) return alert("Phone number is required!");
    await addDoc(collection(db,"contacts"), {
      firstName:  contactFirstName.trim(),
      lastName:   contactLastName.trim(),
      phone:      contactPhone.trim(),
      createdAt:  serverTimestamp(),
    });
    setContactFirstName(""); setContactLastName(""); setContactPhone(""); setAddingContact(false);
  }

  function startEditContact(contact) {
    setEditingContactId(contact.id);
    setEditFirstName(contact.firstName || contact.name || "");
    setEditLastName(contact.lastName   || "");
    setEditPhone(contact.phone         || "");
  }

  async function saveEditContact() {
    if (!editPhone.trim()) return alert("Phone number is required!");
    await updateDoc(doc(db,"contacts",editingContactId), {
      firstName: editFirstName.trim(),
      lastName:  editLastName.trim(),
      phone:     editPhone.trim(),
    });
    setEditingContactId(null);
  }

  async function handleSendCustomMsg() {
    if (!customMsg.trim()) return alert("Please type a message first!");
    if (announcementContacts.length === 0) return alert("Please select at least one contact!");
    setSendingMsg(true);
    try {
      const sendFn = httpsCallable(functions, "sendCustomSms");
      const result = await sendFn({ message: customMsg.trim(), contactIds: announcementContacts });
      alert(`✅ Sent to ${result.data.sent} of ${result.data.total} contacts!`);
      setCustomMsg("");
      setAnnouncementContacts([]);
    } catch (err) {
      alert("Failed to send: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  }

  function getCatColor(type) {
    const cat = categories.find(c => c.name === type);
    return cat ? cat.color : (DEFAULT_COLORS[type] || { bg:"#eee", color:"#555" });
  }

  const events = tab === "pending" ? pending : approved;

  const TABS = [
    { key:"calendar",    label:"📅 calendar" },
    { key:"pending",     label:`pending${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key:"approved",    label:"approved" },
    { key:"board",       label:"board" },
    { key:"contacts",    label:`📱 contacts${contacts.length > 0 ? ` (${contacts.length})` : ""}` },
    { key:"subscribers", label:"subscribers" },
    { key:"categories",  label:"categories" },
  ];

  return (
    <div>

      {tab === "calendar" && <AdminCalendar darkMode={dm} />}

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:"1.5rem", overflowX:"auto", paddingBottom:4, scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {TABS.map(t_ => (
          <button key={t_.key} onClick={() => setTab(t_.key)} style={{
            padding:"7px 16px", borderRadius:20, fontSize:13, cursor:"pointer",
            whiteSpace:"nowrap", flexShrink:0,
            background: tab===t_.key ? "#7F77DD" : t.tabBg,
            color:      tab===t_.key ? "#fff" : t.textSec,
            border:     tab===t_.key ? "none" : `1px solid ${t.tabBorder}`,
            fontWeight: tab===t_.key ? 700 : 400,
          }}>{t_.label}</button>
        ))}
      </div>

      {/* ── Events ── */}
      {(tab === "pending" || tab === "approved") && (
        <>
          {events.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem 0", color:t.emptyColor, fontSize:14 }}>
              {tab === "pending" ? "No plans waiting for approval 🎉" : "No approved plans yet"}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {events.map(ev => {
              const c = getCatColor(ev.type), isExpanded = expandedRsvps === ev.id;
              return (
                <div key={ev.id} style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:12, padding:"1rem 1.25rem", backdropFilter:"blur(8px)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ background:c.bg, color:c.color, fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700 }}>{ev.type}</span>
                        <span style={{ fontWeight:700, fontSize:15, color:t.text }}>{ev.title}</span>
                        <RsvpCount eventId={ev.id} />
                        {ev.smsReminder && (
                          <span style={{ fontSize:11, background:"rgba(29,158,117,0.1)", color:"#1D9E75", padding:"2px 8px", borderRadius:10, fontWeight:600 }}>
                            📱 SMS to {ev.smsContactIds?.length || 0}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:13, color:t.textSec, display:"flex", flexDirection:"column", gap:3 }}>
                        <span>📅 {ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
                        {ev.location && <span>📍 {ev.location}</span>}
                        {ev.who      && <span>👥 {ev.who}</span>}
                        {ev.note     && <span>📝 {ev.note}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      {tab === "pending" ? (
                        <>
                          <button onClick={() => approve(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"#1D9E75", color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>✓ approve</button>
                          <button onClick={() => reject(ev.id)}  style={{ padding:"6px 14px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:13, cursor:"pointer" }}>✕ reject</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingEvent(ev)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${dm ? "rgba(127,119,221,0.5)" : "#7F77DD"}`, color:"#7F77DD", fontSize:13, cursor:"pointer" }}>✏️ edit</button>
                          <button onClick={() => setExpandedRsvps(isExpanded ? null : ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${t.tabBorder}`, color:t.textSec, fontSize:13, cursor:"pointer" }}>
                            {isExpanded ? "hide RSVPs" : "see RSVPs"}
                          </button>
                          <button onClick={() => remove(ev.id)} style={{ padding:"6px 14px", borderRadius:8, background:"none", border:`1px solid ${t.tabBorder}`, color:t.textMuted, fontSize:13, cursor:"pointer" }}>remove</button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop:`1px solid ${t.border}`, marginTop:12, paddingTop:12 }}>
                      <RsvpList eventId={ev.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Board ── */}
      {tab === "board" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>Manage what appears on the Squad Board.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {boardItems.length === 0 && <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>Nothing on the board yet</p>}
            {boardItems.map(item => (
              <div key={item.id} style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16 }}>{item.type==="announcement" ? "📌" : item.status==="being_planned" ? "🔄" : "💡"}</span>
                      <span style={{ fontWeight:600, fontSize:14, color:t.text }}>{item.title}</span>
                      <span style={{ fontSize:11, color:t.textMuted, background: dm ? "rgba(255,255,255,0.08)" : "#f5f5f5", borderRadius:10, padding:"1px 8px" }}>{item.type}</span>
                      {item.status === "being_planned" && <span style={{ fontSize:11, background:"rgba(127,119,221,0.12)", color:"#7F77DD", borderRadius:10, padding:"1px 8px", fontWeight:600 }}>🔄 being planned</span>}
                    </div>
                    {item.description && <p style={{ fontSize:12, color:t.textSec, margin:"0 0 2px" }}>{item.description}</p>}
                    {item.location    && <p style={{ fontSize:12, color:t.textSec, margin:"0 0 2px" }}>📍 {item.location}</p>}
                    {item.who         && <p style={{ fontSize:12, color:t.textMuted, margin:0 }}>by {item.who}</p>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    {item.type === "idea" && (
                      <button onClick={() => setPlanningItem(item)} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(29,158,117,0.1)", border:"1px solid rgba(29,158,117,0.3)", color:"#1D9E75", fontSize:12, cursor:"pointer", fontWeight:600 }}>📅 plan it</button>
                    )}
                    <button onClick={() => deleteBoardItem(item.id)} style={{ padding:"5px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer" }}>delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!addingBoard ? (
            <button onClick={() => setAddingBoard(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ add to board</button>
          ) : (
            <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {["announcement","idea"].map(tp => (
                  <button key={tp} onClick={() => setBoardType(tp)} style={{ flex:1, padding:"7px", borderRadius:10, fontSize:12, cursor:"pointer", background: boardType===tp ? "#7F77DD" : "none", color: boardType===tp ? "#fff" : t.textSec, border: boardType===tp ? "none" : `1px solid ${t.border}`, fontWeight: boardType===tp ? 700 : 400 }}>
                    {tp === "announcement" ? "📌 announcement" : "💡 idea"}
                  </button>
                ))}
              </div>
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>title</label>
              <input value={boardTitle} onChange={e=>setBoardTitle(e.target.value)} placeholder={boardType==="announcement" ? "e.g. Summer rules 🌞" : "e.g. Camping trip?"} style={{ marginBottom:12 }} />
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>description (optional)</label>
              <textarea value={boardDesc} onChange={e=>setBoardDesc(e.target.value)} placeholder="more details…" style={{ resize:"vertical", height:60, marginBottom:12 }} />
              {boardType === "idea" && (
                <>
                  <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>suggested by</label>
                  <input value={boardWho} onChange={e=>setBoardWho(e.target.value)} placeholder="Jake, the squad…" style={{ marginBottom:12 }} />
                </>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingBoard(false)} style={{ flex:1, padding:8, borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
                <button onClick={addBoardItem} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>post to board</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contacts ── */}
      {tab === "contacts" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>
            Squad members who receive SMS reminders and announcements.
          </p>

          {/* Announcement */}
          <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:"1px solid rgba(29,158,117,0.25)", marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:700, color:"#1D9E75", display:"block", marginBottom:8 }}>📢 send announcement</label>
            <textarea
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              placeholder={`Type your message…\n(squadcal.app link added automatically)`}
              style={{ height:80, resize:"vertical", marginBottom:12 }}
            />
            {/* Recipient checklist */}
            <p style={{ fontSize:12, fontWeight:700, color:t.textSec, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>send to</p>
            <ContactChecklist
              contacts={contacts}
              selectedIds={announcementContacts}
              onChange={setAnnouncementContacts}
              dm={dm}
              t={t}
            />
            <button
              onClick={handleSendCustomMsg}
              disabled={sendingMsg || !customMsg.trim() || announcementContacts.length === 0}
              style={{ width:"100%", padding:10, borderRadius:10, background:"#1D9E75", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:(sendingMsg || !customMsg.trim() || announcementContacts.length === 0) ? 0.6 : 1, marginTop:12 }}
            >
              {sendingMsg ? "sending…" : `📱 send to ${announcementContacts.length} contact${announcementContacts.length !== 1 ? "s" : ""}`}
            </button>
          </div>

          {/* Contacts list */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {contacts.length === 0 && <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>No contacts yet — add your squad members below</p>}
            {contacts.map(contact => (
              <div key={contact.id} style={{ background:t.cardBg, borderRadius:12, padding:"10px 14px", border:`1px solid ${t.cardBorder}` }}>
                {editingContactId === contact.id ? (
                  /* Edit form */
                  <div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                      <input value={editFirstName} onChange={e=>setEditFirstName(e.target.value)} placeholder="First name" />
                      <input value={editLastName}  onChange={e=>setEditLastName(e.target.value)}  placeholder="Last name" />
                    </div>
                    <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="+1 555 123 4567" style={{ marginBottom:10 }} />
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => setEditingContactId(null)} style={{ flex:1, padding:"6px", borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:12, color:t.text }}>cancel</button>
                      <button onClick={saveEditContact} style={{ flex:2, padding:"6px", borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:12 }}>save</button>
                    </div>
                  </div>
                ) : (
                  /* Contact display */
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>{getContactName(contact)}</p>
                      <p style={{ fontSize:12, color:t.textMuted, margin:0 }}>{contact.phone}</p>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <button onClick={() => startEditContact(contact)} style={{ padding:"4px 10px", borderRadius:8, background:"none", border:`1px solid ${dm ? "rgba(127,119,221,0.4)" : "#7F77DD"}`, color:"#7F77DD", fontSize:12, cursor:"pointer" }}>✏️</button>
                      <button onClick={() => deleteContact(contact.id)} style={{ padding:"4px 10px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer" }}>remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add contact */}
          {!addingContact ? (
            <button onClick={() => setAddingContact(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              + add contact
            </button>
          ) : (
            <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>first name (optional)</label>
                  <input value={contactFirstName} onChange={e=>setContactFirstName(e.target.value)} placeholder="Jake" />
                </div>
                <div>
                  <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>last name (optional)</label>
                  <input value={contactLastName} onChange={e=>setContactLastName(e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>phone number *</label>
              <input type="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+1 555 123 4567" style={{ marginBottom:16 }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingContact(false)} style={{ flex:1, padding:8, borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
                <button onClick={addContact} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>save contact</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Subscribers ── */}
      {tab === "subscribers" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>
            {subscribers.length} device{subscribers.length !== 1 ? "s" : ""} subscribed to push notifications
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {subscribers.length === 0 && <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>No push subscribers yet</p>}
            {subscribers.map((sub, i) => (
              <div key={sub.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:t.cardBg, borderRadius:10, padding:"10px 14px", border:`1px solid ${t.cardBorder}`, gap:10 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:t.text, margin:0 }}>Device {i + 1} 🔔</p>
                  <p style={{ fontSize:11, color:t.textMuted, margin:0, fontFamily:"monospace" }}>{sub.token ? sub.token.substring(0,30) + "…" : "unknown"}</p>
                  {sub.createdAt && <p style={{ fontSize:11, color:t.textMuted, margin:0 }}>added {sub.createdAt.toDate?.().toLocaleDateString() || ""}</p>}
                </div>
                <button onClick={() => deleteSubscriber(sub.id)} style={{ padding:"4px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer", flexShrink:0 }}>remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      {tab === "categories" && (
        <div>
          <p style={{ fontSize:13, color:t.textMuted, marginBottom:16 }}>Default categories (hangout, trip, sports) are built-in.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {categories.length === 0 && <p style={{ fontSize:13, color:t.emptyColor, textAlign:"center", padding:"1rem 0" }}>No custom categories yet</p>}
            {categories.map(cat => (
              <div key={cat.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:t.cardBg, borderRadius:10, padding:"10px 14px", border:`1px solid ${t.cardBorder}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:cat.color.bg, border:`2px solid ${cat.color.color}` }} />
                  <span style={{ fontWeight:600, fontSize:14, color:t.text }}>{cat.name}</span>
                </div>
                <button onClick={() => deleteCat(cat.id)} style={{ padding:"4px 12px", borderRadius:8, background:"none", border:"1px solid #F09595", color:"#A32D2D", fontSize:12, cursor:"pointer" }}>delete</button>
              </div>
            ))}
          </div>
          {!addingCat ? (
            <button onClick={() => setAddingCat(true)} style={{ width:"100%", padding:12, borderRadius:12, border:"2px dashed #7F77DD", background:"rgba(127,119,221,0.05)", color:"#7F77DD", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ add new category</button>
          ) : (
            <div style={{ background:t.formBg, borderRadius:12, padding:"1.25rem", border:"1px solid rgba(127,119,221,0.2)" }}>
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:4 }}>category name</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. movies, gym…" style={{ marginBottom:14 }} />
              <label style={{ fontSize:12, color:t.textSec, display:"block", marginBottom:8 }}>pick a color</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {PALETTE.map(p => (
                  <button key={p.label} onClick={() => setNewColor(p)} style={{ width:28, height:28, borderRadius:"50%", background:p.bg, border: newColor.label===p.label ? `3px solid ${p.color}` : "2px solid transparent", cursor:"pointer", transform: newColor.label===p.label ? "scale(1.2)" : "scale(1)", transition:"transform 0.15s" }} title={p.label} />
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddingCat(false)} style={{ flex:1, padding:8, borderRadius:8, border:`1px solid ${t.border}`, background:"none", cursor:"pointer", fontSize:13, color:t.text }}>cancel</button>
                <button onClick={addCat} style={{ flex:2, padding:8, borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13 }}>save category</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingEvent && (
        <EditEventModal event={editingEvent} contacts={contacts} onClose={() => setEditingEvent(null)} dm={dm} t={t} />
      )}
      {planningItem && (
        <PlanItModal item={planningItem} categories={categories} onClose={() => setPlanningItem(null)} dm={dm} t={t} />
      )}
    </div>
  );
}