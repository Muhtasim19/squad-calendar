import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home  from "./pages/Home";
import Admin from "./pages/Admin";

const isAdminDomain = window.location.hostname === "admin.squadcal.app";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={isAdminDomain ? <Admin /> : <Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}