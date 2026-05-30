export default function EventPill({ event, color, onClick }) {
  const c = color || { bg:"#CECBF6", color:"#3C3489" };

  function handleClick(e) {
    e.stopPropagation();
    e.preventDefault();
    onClick && onClick();
  }

  return (
    <div
      onClick={handleClick}
      onTouchStart={e => e.stopPropagation()}
      onTouchEnd={handleClick}
      style={{
        background:                c.bg,
        color:                     c.color,
        fontSize:                  10,
        padding:                   "2px 6px",
        borderRadius:              5,
        marginBottom:              2,
        whiteSpace:                "nowrap",
        overflow:                  "hidden",
        textOverflow:              "ellipsis",
        fontWeight:                600,
        cursor:                    "pointer",
        WebkitTapHighlightColor:   "transparent",
        touchAction:               "manipulation",
      }}
    >
      {event.title}
    </div>
  );
}