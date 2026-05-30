import { useState, useEffect } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { app, db } from "../firebase";

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

export default function PushNotifications() {
  const [status,    setStatus]    = useState("idle");
  const [dismissed, setDismissed] = useState(
    localStorage.getItem("squadcal_push_dismissed") === "true"
  );

  useEffect(() => {
    if (localStorage.getItem("squadcal_push"))        setStatus("granted");
    else if (Notification.permission === "denied")    setStatus("denied");
  }, []);

  async function requestPermission() {
    setStatus("requesting");
    try {
      const supported = await isSupported();
      if (!supported) { setStatus("unsupported"); return; }

      const msg   = getMessaging(app);
      const token = await getToken(msg, { vapidKey: VAPID_KEY });

      if (token) {
        // Save token if not already stored
        const existing = await getDocs(
          query(collection(db, "fcmTokens"), where("token", "==", token))
        );
        if (existing.empty) {
          await addDoc(collection(db, "fcmTokens"), { token, createdAt: serverTimestamp() });
        }
        localStorage.setItem("squadcal_push", token);
        setStatus("granted");
      }
    } catch (err) {
      console.error("Push setup error:", err);
      setStatus("denied");
    }
  }

  function dismiss() {
    localStorage.setItem("squadcal_push_dismissed", "true");
    setDismissed(true);
  }

  if (status === "granted" || dismissed || status === "denied" || status === "unsupported") return null;

  return (
    <div style={{ marginTop:16, padding:"14px 16px", borderRadius:14, background:"rgba(127,119,221,0.08)", border:"1.5px solid rgba(127,119,221,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <div>
        <p style={{ fontSize:13, fontWeight:700, color:"#3C3489", marginBottom:2 }}>🔔 Stay in the loop</p>
        <p style={{ fontSize:12, color:"#aaa", margin:0 }}>Get notified when plans drop or you have a reminder</p>
      </div>
      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        <button onClick={dismiss} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #ddd", background:"none", color:"#aaa", fontSize:12, cursor:"pointer" }}>
          later
        </button>
        <button onClick={requestPermission} disabled={status === "requesting"}
          style={{ padding:"6px 16px", borderRadius:8, background:"#7F77DD", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", opacity: status === "requesting" ? 0.7 : 1 }}>
          {status === "requesting" ? "setting up…" : "enable 🔔"}
        </button>
      </div>
    </div>
  );
}