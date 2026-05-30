export default function EventPill({ event, color, onClick }) {
  const c = color || { bg:"#CECBF6", color:"#3C3489" };
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}
      style={{
        background:    c.bg,
        color:         c.color,
        fontSize:      10,
        padding:       "2px 6px",
        borderRadius:  5,
        marginBottom:  2,
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        fontWeight:    600,
        cursor:        "pointer",
      }}
    >
      {event.title}
    </div>
  );
}