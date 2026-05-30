import { useState, useRef } from "react";

const TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

export default function LocationPicker({ value, onChange }) {
  const [query,       setQuery]       = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const timer = useRef(null);

  async function search(q) {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${TOKEN}&types=place,address,poi&limit=5`);
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSugg(true);
    } catch (e) { console.error("Geocoding error:", e); }
  }

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange({ name: q, lat: null, lng: null });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 400);
  }

  function selectPlace(place) {
    const [lng, lat] = place.center;
    setQuery(place.place_name);
    setSuggestions([]);
    setShowSugg(false);
    onChange({ name: place.place_name, lat, lng });
  }

  const mapUrl = value?.lat && value?.lng
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+7F77DD(${value.lng},${value.lat})/${value.lng},${value.lat},14,0/380x140?access_token=${TOKEN}`
    : null;

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={handleInput}
        placeholder="search for a place…"
        onFocus={() => suggestions.length > 0 && setShowSugg(true)}
        onBlur={() => setTimeout(() => setShowSugg(false), 150)}
        autoComplete="off"
      />
      {showSugg && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"rgba(255,255,255,0.98)", backdropFilter:"blur(12px)", border:"1px solid #eee", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.1)", zIndex:300, overflow:"hidden" }}>
          {suggestions.map(s => (
            <div key={s.id} onMouseDown={() => selectPlace(s)}
              style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #f5f5f5" }}
              onMouseEnter={e => e.currentTarget.style.background="#f5f5f5"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{s.text}</div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{s.place_name}</div>
            </div>
          ))}
        </div>
      )}
      {mapUrl && (
        <div style={{ marginTop:8, borderRadius:12, overflow:"hidden", border:"1px solid #eee" }}>
          <img src={mapUrl} alt="location preview" style={{ width:"100%", display:"block" }} />
        </div>
      )}
    </div>
  );
}