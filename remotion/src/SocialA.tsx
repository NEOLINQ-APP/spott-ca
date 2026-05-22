import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { Backdrop, DotGrid } from "./components/Backdrop";
import { Pin } from "./components/Pin";
import { COLORS } from "./brand";

const display = "'Bricolage Grotesque', system-ui, sans-serif";
const body = "'DM Sans', system-ui, sans-serif";

// 9:16 social teaser A — "Find it. Spott it." kinetic
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const q = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          opacity: q,
          transform: `scale(${interpolate(q, [0, 1], [0.7, 1])})`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 160,
          color: COLORS.navy,
          letterSpacing: -6,
          textAlign: "center",
          lineHeight: 0.95,
        }}
      >
        Best <span style={{ color: COLORS.coral }}>ramen</span><br />
        near you?
      </div>
    </AbsoluteFill>
  );
};

const FindIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 7, stiffness: 110 } });
  const pinY = interpolate(drop, [0, 1], [-800, 0]);
  const text = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `translateY(${pinY}px)` }}>
        <Pin size={320} color={COLORS.indigo} />
      </div>
      <div
        style={{
          opacity: text,
          transform: `scale(${text})`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 200,
          color: COLORS.navy,
          letterSpacing: -8,
          marginTop: 40,
          lineHeight: 0.9,
        }}
      >
        Find it.
      </div>
    </AbsoluteFill>
  );
};

const SpottIt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 10 } });
  const b = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${COLORS.indigo}, ${COLORS.indigoDeep})`,
      }}
    >
      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 240,
          color: COLORS.white,
          letterSpacing: -10,
          transform: `scale(${a}) rotate(${interpolate(a, [0, 1], [-8, 0])}deg)`,
          lineHeight: 0.9,
          textAlign: "center",
        }}
      >
        Spott it.
      </div>
      <div
        style={{
          marginTop: 50,
          opacity: b,
          transform: `translateY(${interpolate(b, [0, 1], [30, 0])}px)`,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 72,
          color: COLORS.indigo,
          padding: "24px 60px",
          background: COLORS.white,
          borderRadius: 100,
        }}
      >
        spott.ca
      </div>
    </AbsoluteFill>
  );
};

export const SocialA: React.FC = () => (
  <AbsoluteFill>
    <Backdrop tone="cream" />
    <DotGrid opacity={0.08} />
    <Sequence from={0} durationInFrames={75}>
      <Hook />
    </Sequence>
    <Sequence from={75} durationInFrames={120}>
      <FindIt />
    </Sequence>
    <Sequence from={195} durationInFrames={165}>
      <SpottIt />
    </Sequence>
  </AbsoluteFill>
);
