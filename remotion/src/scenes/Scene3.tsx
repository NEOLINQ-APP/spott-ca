import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C, display, body, useFade } from "../theme";

// Pivot — Spott logo reveal
export const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const oPre = useFade(0);
  const yPre = interpolate(spring({ frame: f, fps, config: { damping: 18 } }), [0, 1], [30, 0]);

  const logoS = spring({ frame: f - 18, fps, config: { damping: 12, stiffness: 140 } });
  const logoScale = interpolate(logoS, [0, 1], [0.6, 1]);
  const logoOp = interpolate(f, [18, 32], [0, 1], { extrapolateRight: "clamp" });

  const pinDrop = spring({ frame: f - 30, fps, config: { damping: 8, stiffness: 200 } });
  const pinY = interpolate(pinDrop, [0, 1], [-40, 0]);

  const tagOp = useFade(48);
  return (
    <AbsoluteFill style={{ padding: 80, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: oPre, transform: `translateY(${yPre}px)`, fontFamily: body, color: C.muted, fontSize: 42, letterSpacing: 3, textTransform: "uppercase" }}>
        There's a Canadian way →
      </div>

      <div style={{
        marginTop: 70, opacity: logoOp, transform: `scale(${logoScale})`,
        display: "flex", alignItems: "center", gap: 28,
      }}>
        {/* pin icon */}
        <div style={{ transform: `translateY(${pinY}px)`, fontSize: 0 }}>
          <svg width="160" height="160" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="p" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={C.blueGlow} />
                <stop offset="1" stopColor={C.blue} />
              </linearGradient>
            </defs>
            <path d="M32 4C20 4 12 13 12 24c0 14 20 36 20 36s20-22 20-36C52 13 44 4 32 4z"
              fill="url(#p)" stroke={C.cream} strokeWidth="2" />
            <circle cx="32" cy="24" r="7" fill={C.cream} />
          </svg>
        </div>
        <div style={{ fontFamily: display, fontWeight: 700, color: C.cream, fontSize: 220, letterSpacing: -8, lineHeight: 1 }}>
          spott<span style={{ color: C.blueGlow }}>.</span>
        </div>
      </div>

      <div style={{ marginTop: 50, opacity: tagOp, fontFamily: body, color: C.ice, fontSize: 48, fontWeight: 500 }}>
        Local. Honest. Built here.
      </div>
    </AbsoluteFill>
  );
};
