import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import AdminPanel from "../components/AdminPanel";

export default function Admin() {
  const [user,     setUser]     = useState(null);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("squadcal_admin_dark") === "true"
  );

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("squadcal_admin_dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const link     = document.querySelector('link[rel="manifest"]');
    const original = link?.getAttribute("href");
    if (link) link.setAttribute("href", "/admin-manifest.json");
    return () => {
      if (link && original) link.setAttribute("href", original);
    };
  }, []);


  async function handleLogin() {
    setError("");
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { setError("Wrong email or password."); }
  }

  if (loading) return <div style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>loading…</div>;

  if (!user) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div className="modal-anim" style={{ background:"rgba(255,255,255,0.88)", backdropFilter:"blur(20px)", borderRadius:24, padding:"2.5rem", width:380, maxWidth:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.12)" }}>
        <h1 style={{ fontSize:24, fontWeight:700, color:"#3C3489", marginBottom:4 }}>Admin login</h1>
        <p style={{ fontSize:13, color:"#bbb", marginBottom:"1.75rem" }}>Squad Calendar — admin only</p>
        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={{ marginBottom:12 }} />
        <label style={{ fontSize:12, color:"#999", display:"block", marginBottom:4 }}>password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ marginBottom:16 }} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        {error && <p style={{ color:"#A32D2D", fontSize:13, marginBottom:12 }}>{error}</p>}
        <button onClick={handleLogin} style={{ width:"100%", padding:13, borderRadius:12, background:"#7F77DD", color:"#fff", border:"none", fontWeight:700, fontSize:15, cursor:"pointer" }}>log in</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"2rem 1rem" }}>
      <div className="page-card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color: darkMode ? "#9B94FF" : "#3C3489" }}>Admin panel</h1>
            <p style={{ fontSize:13, color:"#bbb", marginTop:2 }}>Approve plans & manage everything</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ width:38, height:38, borderRadius:"50%", border:`1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "#ddd"}`, background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => signOut(auth)}
              style={{ fontSize:13, padding:"7px 16px", borderRadius:10, border:`1px solid ${darkMode ? "rgba(255,255,255,0.15)" : "#ddd"}`, background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)", cursor:"pointer", color: darkMode ? "#f0f0f0" : "#333" }}
            >
              log out
            </button>
          </div>
        </div>
        <AdminPanel darkMode={darkMode} />
      </div>
    </div>
  );
}