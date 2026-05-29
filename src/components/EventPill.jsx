export default function EventPill({ event }) {
  const colors = {
    hangout: { bg: "#CECBF6", color: "#3C3489" },
    trip:    { bg: "#9FE1CB", color: "#085041" },
    sports:  { bg: "#FAC775", color: "#633806" },
  };
  const c = colors[event.type] || colors.hangout;
  return (
    <div style={{
      background: c.bg, color: c.color,
      fontSize: 10, padding: "2px 6px",
      borderRadius: 4, marginBottom: 2,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      {event.title}
    </div>
  );
}