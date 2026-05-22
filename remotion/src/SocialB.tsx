import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { Backdrop, DotGrid } from "../components/Backdrop";
import { Pin } from "../components/Pin";
import { COLORS, CATEGORIES } from "../brand";

const display = "'Bricolage Grotesque', system-ui, sans-serif";
const body = "'DM Sans', system-ui, sans-serif";

// 9:16 social teaser B — category grid pop
const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div
        style={{
          opacity: s,
          transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 170,
          color: COLORS.navy,
          letterSpacing: -7,
          textAlign: "center",
          lineHeight: 0.9,
        }}
      >
        What are<br />you in the<br /><span style={{ color: COLORS.coral }}>mood</span> for?
      </div>
    </AbsoluteFill>
  );
};

const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 32,
          width: 880,
        }}
      >
        {CATEGORIES.map((c, i) => {
          const s = spring({
            frame: frame - i * 5,
            fps,
            config: { damping: 9, stiffness: 130 },
          });
          const rot = interpolate(s, [0, 1], [i % 2 === 0 ? -25 : 25, 0]);
          return (
            <div
              key={c.label}
              style={{
                transform: `scale(${s}) rotate(${rot}deg)`,
                opacity: s,
                background: c.color,
                borderRadius: 36,
                padding: "50px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 20px 50px rgba(15,23,42,0.2)",
              }}
            >
              <div style={{ fontSize: 110 }}>{c.emoji}</div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 44,
                  color: COLORS.navy,
                  letterSpacing: -1,
                }}
              >
                {c.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pin = spring({ frame, fps, config: { damping: 9 } });
  const a = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const b = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${COLORS.indigo}, ${COLORS.indigoDeep})`,
      }}
    >
      <div style={{ transform: `scale(${pin})` }}>
        <Pin size={220} color={COLORS.white} />
      </div>
      <div
        style={{
          opacity: a,
          transform: `translateY(${interpolate(a, [0, 1], [40, 0])}px)`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 150,
          color: COLORS.white,
          letterSpacing: -6,
          marginTop: 20,
          lineHeight: 0.9,
          textAlign: "center",
        }}
      >
        Find it.<br />Spott it.
      </div>
      <div
        style={{
          marginTop: 50,
          opacity: b,
          transform: `translateY(${interpolate(b, [0, 1], [30, 0])}px)`,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 64,
          color: COLORS.indigo,
          padding: "22px 56px",
          background: COLORS.white,
          borderRadius: 100,
        }}
      >
        spott.ca
      </div>
    </AbsoluteFill>
  );
};

export const SocialB: React.FC = () => (
  <AbsoluteFill>
    <Backdrop tone="cream" />
    <DotGrid opacity={0.08} />
    <Sequence from={0} durationInFrames={75}>
      <Question />
    </Sequence>
    <Sequence from={75} durationInFrames={135}>
      <Grid />
    </Sequence>
    <Sequence from={210} durationInFrames={150}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
