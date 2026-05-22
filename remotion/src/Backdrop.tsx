import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "./theme";

export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(f, [0, durationInFrames], [0, 60]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, ${C.bg} 0%, ${C.bgDeep} 75%)` }}>
      {/* drifting blue orbs */}
      <div style={{
        position: "absolute", left: -180, top: 200 + drift, width: 600, height: 600, borderRadius: 600,
        background: `radial-gradient(circle, ${C.blue}66 0%, transparent 60%)`, filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", right: -220, bottom: -100 - drift, width: 700, height: 700, borderRadius: 700,
        background: `radial-gradient(circle, ${C.blueGlow}44 0%, transparent 60%)`, filter: "blur(50px)",
      }} />
      {/* fine grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07 }}>
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0H0V60" stroke={C.ice} strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};
