import React from "react";
import { Composition } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadBody } from "@remotion/google-fonts/DMSans";
import { Commercial } from "./Commercial";
import { SocialA } from "./SocialA";
import { SocialB } from "./SocialB";

loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin"] });
loadBody("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="commercial"
      component={Commercial}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="social-a"
      component={SocialA}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="social-b"
      component={SocialB}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
