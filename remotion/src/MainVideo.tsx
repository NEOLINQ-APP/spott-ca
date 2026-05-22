import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "./Backdrop";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Sequence from={0} durationInFrames={90}><Scene1 /></Sequence>
      <Sequence from={90} durationInFrames={90}><Scene2 /></Sequence>
      <Sequence from={180} durationInFrames={90}><Scene3 /></Sequence>
      <Sequence from={270} durationInFrames={120}><Scene4 /></Sequence>
      <Sequence from={390} durationInFrames={60}><Scene5 /></Sequence>
    </AbsoluteFill>
  );
};
