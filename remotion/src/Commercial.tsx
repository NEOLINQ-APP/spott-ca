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
import { COLORS } from "../brand";

const display = "'Bricolage Grotesque', system-ui, sans-serif";
const body = "'DM Sans', system-ui, sans-serif";

// Scene 1: Pin drop + "Find it." (0-90)
const SceneOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const pinY = interpolate(drop, [0, 1], [-600, 0]);
  const pinScale = interpolate(drop, [0, 1], [0.6, 1]);
  const textIn = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const textY = interpolate(textIn, [0, 1], [60, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ transform: `translateY(${pinY}px) scale(${pinScale})` }}>
          <Pin size={260} color={COLORS.indigo} />
        </div>
        <div
          style={{
            opacity: textIn,
            transform: `translateY(${textY}px)`,
            fontFamily: display,
            fontWeight: 800,
            fontSize: 240,
            color: COLORS.navy,
            letterSpacing: -8,
            lineHeight: 0.9,
          }}
        >
          Find it.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Category explosion (0-90)
const SceneTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { e: "🍜", c: COLORS.coral, x: -500, y: -200 },
    { e: "☕", c: COLORS.yellow, x: 400, y: -250 },
    { e: "💅", c: COLORS.coral, x: -600, y: 150 },
    { e: "🏋️", c: COLORS.mint, x: 550, y: 100 },
    { e: "🔧", c: COLORS.indigo, x: -350, y: 350 },
    { e: "🍕", c: COLORS.yellow, x: 450, y: 350 },
  ];
  const textIn = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {items.map((it, i) => {
        const s = spring({
          frame: frame - i * 4,
          fps,
          config: { damping: 9, stiffness: 140 },
        });
        const rot = interpolate(s, [0, 1], [-180, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${it.x * s}px), calc(-50% + ${it.y * s}px)) scale(${s}) rotate(${rot}deg)`,
              width: 180,
              height: 180,
              borderRadius: 40,
              background: it.c,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 100,
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
            }}
          >
            {it.e}
          </div>
        );
      })}
      <div
        style={{
          opacity: textIn,
          transform: `scale(${interpolate(textIn, [0, 1], [0.7, 1])})`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 140,
          color: COLORS.navy,
          letterSpacing: -6,
          textAlign: "center",
          lineHeight: 0.9,
        }}
      >
        Anything.<br />Anywhere.
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Listing card review (0-120)
const SceneThree: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = spring({ frame, fps, config: { damping: 12 } });
  const stars = Array.from({ length: 5 });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `translateY(${interpolate(cardIn, [0, 1], [80, 0])}px) scale(${cardIn})`,
          opacity: cardIn,
          width: 1100,
          background: COLORS.white,
          borderRadius: 36,
          padding: 50,
          boxShadow: "0 40px 100px rgba(15,23,42,0.25)",
          fontFamily: body,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 28,
              background: `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.yellow})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
            }}
          >
            🍣
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 56,
                color: COLORS.navy,
                letterSpacing: -2,
              }}
            >
              Kinka Izakaya
            </div>
            <div style={{ fontSize: 28, color: "#64748B", marginTop: 4 }}>
              Sushi & Japanese · Toronto
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 32, alignItems: "center" }}>
          {stars.map((_, i) => {
            const s = spring({ frame: frame - 20 - i * 5, fps, config: { damping: 10 } });
            return (
              <div
                key={i}
                style={{
                  fontSize: 64,
                  transform: `scale(${s})`,
                  color: COLORS.yellow,
                }}
              >
                ★
              </div>
            );
          })}
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 56,
              marginLeft: 16,
              color: COLORS.navy,
            }}
          >
            4.9
          </div>
          <div style={{ fontSize: 28, color: "#64748B", marginLeft: 12 }}>
            · 1,284 verified reviews
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            padding: 28,
            background: COLORS.cream,
            borderRadius: 24,
            fontSize: 30,
            color: COLORS.navy,
            lineHeight: 1.4,
          }}
        >
          “Honestly the best omakase in the city. Owner replied to my review in
          minutes 🔥”
          <div style={{ marginTop: 12, fontSize: 24, color: "#64748B" }}>
            — Priya M. · ID verified
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Built by Canadians (0-90)
const SceneFour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leaf = spring({ frame, fps, config: { damping: 8 } });
  const text = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          fontSize: 280,
          transform: `scale(${leaf}) rotate(${interpolate(leaf, [0, 1], [-30, 0])}deg)`,
        }}
      >
        🍁
      </div>
      <div
        style={{
          opacity: text,
          transform: `translateY(${interpolate(text, [0, 1], [40, 0])}px)`,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 110,
          color: COLORS.navy,
          letterSpacing: -4,
          textAlign: "center",
          marginTop: 20,
          lineHeight: 0.95,
        }}
      >
        Built by Canadians.<br />
        <span style={{ color: COLORS.indigo }}>For Canadians.</span>
      </div>
    </AbsoluteFill>
  );
};

// Scene 5: Logo lockup + URL (0-90)
const SceneFive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pinIn = spring({ frame, fps, config: { damping: 10 } });
  const text = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const url = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ transform: `scale(${pinIn})` }}>
          <Pin size={180} color={COLORS.indigo} />
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 260,
            color: COLORS.navy,
            letterSpacing: -10,
            opacity: text,
            transform: `translateX(${interpolate(text, [0, 1], [-60, 0])}px)`,
            lineHeight: 0.9,
          }}
        >
          Spott it.
        </div>
      </div>
      <div
        style={{
          marginTop: 50,
          opacity: url,
          transform: `translateY(${interpolate(url, [0, 1], [30, 0])}px)`,
          fontFamily: body,
          fontWeight: 600,
          fontSize: 64,
          color: COLORS.indigo,
          padding: "20px 50px",
          background: COLORS.white,
          borderRadius: 100,
          boxShadow: "0 20px 60px rgba(79,70,229,0.3)",
        }}
      >
        spott.ca
      </div>
    </AbsoluteFill>
  );
};

export const Commercial: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop tone="cream" />
      <DotGrid opacity={0.08} />
      <Sequence from={0} durationInFrames={90}>
        <SceneOne />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <SceneTwo />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <SceneThree />
      </Sequence>
      <Sequence from={300} durationInFrames={75}>
        <SceneFour />
      </Sequence>
      <Sequence from={375} durationInFrames={75}>
        <SceneFive />
      </Sequence>
    </AbsoluteFill>
  );
};
