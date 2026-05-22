import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, display, body, useFade, useSlide } from "../theme";

const Card: React.FC<{ start: number; tier: string; price: string; sub: string; featured?: boolean }> = ({ start, tier, price, sub, featured }) => {
  const o = useFade(start);
  const y = useSlide(start, 36);
  return (
    <div style={{
      opacity: o, transform: `translateY(${y}px)`,
      borderRadius: 28, padding: "38px 42px",
      background: featured ? `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})` : `${C.ice}0F`,
      border: `2px solid ${featured ? C.blueGlow : C.ice + "22"}`,
      backdropFilter: "none",
    }}>
      <div style={{ fontFamily: body, color: featured ? C.cream : C.muted, fontSize: 36, textTransform: "uppercase", letterSpacing: 2 }}>{tier}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
        <div style={{ fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 130, lineHeight: 1, letterSpacing: -4 }}>{price}</div>
        <div style={{ fontFamily: body, color: featured ? C.ice : C.muted, fontSize: 40 }}>{sub}</div>
      </div>
    </div>
  );
};

const Bullet: React.FC<{ start: number; children: React.ReactNode }> = ({ start, children }) => {
  const o = useFade(start);
  return (
    <div style={{ opacity: o, display: "flex", alignItems: "center", gap: 18, fontFamily: body, color: C.ice, fontSize: 44 }}>
      <span style={{
        width: 36, height: 36, borderRadius: 36, background: C.blueGlow,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: C.bgDeep, fontWeight: 800, fontSize: 26,
      }}>✓</span>
      {children}
    </div>
  );
};

export const Scene4: React.FC = () => {
  const oTitle = useFade(0);
  const yTitle = useSlide(0, 24);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", gap: 36 }}>
      <div style={{ opacity: oTitle, transform: `translateY(${yTitle}px)`, fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 96, letterSpacing: -2, lineHeight: 1.05 }}>
        Honest pricing.<br />No sales calls.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card start={14} tier="Free" price="$0" sub="forever" />
        <Card start={26} tier="Pro" price="$19" sub="/ mo" featured />
      </div>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <Bullet start={44}>List your business in 60 seconds</Bullet>
        <Bullet start={56}>Cancel anytime — really</Bullet>
        <Bullet start={68}>Direct messages from customers</Bullet>
        <Bullet start={80}>Built for Canadian small business</Bullet>
      </div>
    </AbsoluteFill>
  );
};
