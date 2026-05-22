import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadSG } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadDM } from "@remotion/google-fonts/DMSans";

const sg = loadSG("normal", { weights: ["500", "700"] });
const dm = loadDM("normal", { weights: ["400", "500"] });

export const display = sg.fontFamily;
export const body = dm.fontFamily;

// Spott blue palette
export const C = {
  bg: "#0A1530",
  bgDeep: "#050B1F",
  blue: "#2E6BFF",
  blueGlow: "#5B8CFF",
  ice: "#E8F0FF",
  cream: "#FFFFFF",
  muted: "#7A8AA8",
  red: "#FF5247",
};

export const useFade = (start: number, dur = 12) => {
  const f = useCurrentFrame();
  return interpolate(f, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const useSlide = (start: number, from = 40) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - start, fps, config: { damping: 18, stiffness: 140 } });
  return interpolate(s, [0, 1], [from, 0]);
};
