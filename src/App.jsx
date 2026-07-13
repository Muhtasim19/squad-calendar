import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home       from "./pages/Home";
import Admin      from "./pages/Admin";
import SmsHistory from "./pages/SmsHistory";

const isAdminDomain = window.location.hostname === "admin.squadcal.app";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={isAdminDomain ? <Admin /> : <Home />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="/sms-history" element={<SmsHistory />} />
      </Routes>
    </BrowserRouter>
  );
}