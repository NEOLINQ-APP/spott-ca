import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C, display, body, useFade, useSlide } from "../theme";

// Pain points — receipts ticking up
const Row: React.FC<{ start: number; label: string; price: string; strike?: boolean }> = ({ start, label, price, strike }) => {
  const o = useFade(start);
  const y = useSlide(start, 24);
  return (
    <div style={{
      opacity: o, transform: `translateY(${y}px)`,
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      borderBottom: `1px dashed ${C.muted}55`, padding: "26px 0",
      fontFamily: body, color: C.ice, fontSize: 50,
    }}>
      <span style={{ textDecoration: strike ? "line-through" : "none", opacity: strike ? 0.55 : 1 }}>{label}</span>
      <span style={{ color: C.red, fontFamily: display, fontWeight: 700, fontSize: 56 }}>{price}</span>
    </div>
  );
};

export const Scene2: React.FC = () => {
  const oTitle = useFade(0);
  const yTitle = useSlide(0, 30);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center" }}>
      <div style={{ opacity: oTitle, transform: `translateY(${yTitle}px)`, fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 96, letterSpacing: -2, lineHeight: 1.05 }}>
        The "old way"<br />of getting found.
      </div>
      <div style={{ marginTop: 60 }}>
        <Row start={14} label="Yearly Yelp ads" price="$3,600" />
        <Row start={28} label="YellowPages package" price="$1,800" />
        <Row start={42} label="Pushy sales calls" price="Endless" />
        <Row start={56} label="Cancel anytime?" price="Nope." />
      </div>
    </AbsoluteFill>
  );
};
