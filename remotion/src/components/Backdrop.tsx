import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../brand";

// Playful animated gradient + floating blobs backdrop
export const Backdrop: React.FC<{ tone?: "cream" | "indigo" | "white" }> = ({
  tone = "cream",
}) => {
  const frame = useCurrentFrame();
  const bg =
    tone === "indigo"
      ? `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.indigoDeep} 100%)`
      : tone === "white"
        ? COLORS.white
        : `linear-gradient(160deg, ${COLORS.cream} 0%, #FFE9D6 100%)`;

  const blob = (
    cx: number,
    cy: number,
    r: number,
    color: string,
    speed: number,
    phase: number,
  ) => {
    const x = cx + Math.sin((frame + phase) / speed) * 40;
    const y = cy + Math.cos((frame + phase) / speed) * 30;
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: r,
          height: r,
          borderRadius: "50%",
          background: color,
          filter: "blur(40px)",
          opacity: 0.55,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      {blob(-100, -100, 500, COLORS.coral, 60, 0)}
      {blob(1500, 200, 400, COLORS.yellow, 80, 30)}
      {blob(200, 1500, 600, COLORS.mint, 70, 60)}
      {blob(1400, 1600, 350, COLORS.indigo, 90, 90)}
    </AbsoluteFill>
  );
};

// Dot grid overlay
export const DotGrid: React.FC<{ opacity?: number; color?: string }> = ({
  opacity = 0.15,
  color = COLORS.navy,
}) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
      backgroundSize: "32px 32px",
      opacity,
      pointerEvents: "none",
    }}
  />
);
