import { AbsoluteFill } from "remotion";
import { C, display, body, useFade, useSlide } from "../theme";

const Row: React.FC<{ start: number; label: string; value: string }> = ({ start, label, value }) => {
  const o = useFade(start);
  const y = useSlide(start, 24);
  return (
    <div style={{
      opacity: o, transform: `translateY(${y}px)`,
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      borderBottom: `1px dashed ${C.muted}55`, padding: "26px 0",
      fontFamily: body, color: C.ice, fontSize: 50,
    }}>
      <span>{label}</span>
      <span style={{ color: C.blueGlow, fontFamily: display, fontWeight: 700, fontSize: 56 }}>{value}</span>
    </div>
  );
};

export const Scene2: React.FC = () => {
  const oTitle = useFade(0);
  const yTitle = useSlide(0, 30);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <div style={{ opacity: oTitle, transform: `translateY(${yTitle}px)`, fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 96, letterSpacing: -2, lineHeight: 1.05 }}>
        Everything you need,<br />in one place.
      </div>
      <div style={{ marginTop: 60 }}>
        <Row start={14} label="Beautiful business profile" value="✓" />
        <Row start={28} label="Reviews with photos" value="✓" />
        <Row start={42} label="Customer messages & bookings" value="✓" />
        <Row start={56} label="Specials, deals & promotions" value="✓" />
      </div>
    </AbsoluteFill>
  );
};
