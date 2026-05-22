import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body, useFade } from "../theme";

export const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 130 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const o = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const pill = useFade(18);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 80 }}>
      <div style={{ opacity: o, transform: `scale(${scale})` }}>
        <div style={{ fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 220, letterSpacing: -8, lineHeight: 1 }}>
          spott<span style={{ color: C.blueGlow }}>.</span>ca
        </div>
        <div style={{ marginTop: 30, fontFamily: body, color: C.ice, fontSize: 52, fontWeight: 500 }}>
          List your business — free.
        </div>
      </div>
      <div style={{
        marginTop: 70, opacity: pill,
        padding: "26px 52px", borderRadius: 999,
        background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
        fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 52, letterSpacing: 1,
        boxShadow: `0 20px 60px ${C.blue}66`,
      }}>
        Visit spott.ca →
      </div>
    </AbsoluteFill>
  );
};
