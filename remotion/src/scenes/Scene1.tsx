import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C, display, body, useFade, useSlide } from "../theme";

// Hook: question that stops the scroll
export const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const o1 = useFade(2);
  const o2 = useFade(18);
  const y2 = useSlide(18, 30);
  const o3 = useFade(40);
  const cursor = Math.floor(f / 8) % 2;
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ opacity: o1, fontFamily: body, color: C.muted, fontSize: 38, letterSpacing: 2, textTransform: "uppercase" }}>
        For Canadian businesses
      </div>
      <div style={{ marginTop: 40, opacity: o2, transform: `translateY(${y2}px)`, fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 130, lineHeight: 1.02, letterSpacing: -3 }}>
        Still paying<br />
        <span style={{ color: C.red }}>$300/month</span><br />
        for a Yelp ad?
      </div>
      <div style={{ marginTop: 50, opacity: o3, fontFamily: body, color: C.ice, fontSize: 44, opacity: o3 * 0.8 }}>
        Locked in a 12-month contract<span style={{ opacity: cursor }}>_</span>
      </div>
    </AbsoluteFill>
  );
};
