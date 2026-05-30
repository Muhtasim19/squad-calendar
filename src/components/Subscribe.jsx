import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
}

export default function Subscribe() {
  const [open,    setOpen]    = useState(false);
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function handleSubscribe() {
    if (!name.trim() || !phone.trim()) return alert("Please enter your name and phone number!");
    const formatted = formatPhone(phone);
    if (!formatted || formatted.replace(/\D/g, "").length < 11)
      return alert("Please enter a valid US phone number.");
    setLoading(true);
    try {
      await addDoc(collection(db, "subscribers"), {
        name: name.trim(),
        phone: formatted,
        active: true,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      alert("Something went wrong: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ width:"100%", marginTop:10, padding:"10px", borderRadius:12, border:"1.5px dashed #aaa", background:"none", color:"#aaa", fontSize:13, fontWeight:600, cursor:"pointer" }}
      >
        📱 get text alerts when plans are approved
      </button>

      {open && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="modal-anim" style={{ background:"rgba(255,255,255,0.96)", backdropFilter:"blur(20px)", borderRadius:20, padding:"1.75rem", width:360, maxWidth:"95vw", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
            {done ? (
              <div style={{ textAlign:"center", padding:"1rem 0" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>📱✅</div>
                <h2 style={{ fontSize:18, fontWeight:700, color:"#3C3489", marginBottom:8 }}>You're in!</h2>
                <p style={{ fontSize:14, color:"#aaa", marginBottom:20 }}>You'll get a text when new plans are approved.</p>
                <button
                  onClick={() => { setOpen(false); setDone(false); }}
                  style={{ width:"100%", padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer" }}
                >
                  close
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize:18, fontWeight:700, color:"#3C3489", marginBottom:4 }}>Get text alerts</h2>
                <p style={{ fontSize:13, color:"#aaa", marginBottom:"1.25rem" }}>We'll text you when a plan gets approved. No spam, squad plans only.</p>

                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>your name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jake"
                  style={{ marginBottom:12 }}
                />

                <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>phone number</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  style={{ marginBottom:6 }}
                />
                <p style={{ fontSize:11, color:"#ccc", marginBottom:16 }}>US numbers only. Standard SMS rates apply.</p>

                <div style={{ display:"flex", gap:8 }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{ flex:1, padding:10, borderRadius:10, border:"1px solid #ddd", background:"none", cursor:"pointer", fontSize:13 }}
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    style={{ flex:2, padding:10, borderRadius:10, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:13, opacity:loading ? 0.7 : 1 }}
                  >
                    {loading ? "subscribing…" : "subscribe 📱"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}