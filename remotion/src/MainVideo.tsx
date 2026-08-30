import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { S1Open } from "./scenes/S1Open";
import { S0Host } from "./scenes/S0Host";
import { S2Map } from "./scenes/S2Map";
import { S2Zones } from "./scenes/S2Zones";
import { S2Pairs } from "./scenes/S2Pairs";
import { S3Mali } from "./scenes/S3Mali";
import { S4Scan } from "./scenes/S4Scan";
import { S5Predict } from "./scenes/S5Predict";
import { S7CTA } from "./scenes/S7CTA";
import { palette } from "./theme";

const t = (frames = 22) => springTiming({ config: { damping: 200 }, durationInFrames: frames });

export const MainVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: palette.cream }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={80}>
        <S1Open />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t(24)} />

      <TransitionSeries.Sequence durationInFrames={265}>
        <S0Host />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t(24)} />

      <TransitionSeries.Sequence durationInFrames={170}>
        <S2Zones />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t(26)} />

      <TransitionSeries.Sequence durationInFrames={200}>
        <S2Map />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t(26)} />

      <TransitionSeries.Sequence durationInFrames={160}>
        <S2Pairs />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(24)} />

      <TransitionSeries.Sequence durationInFrames={165}>
        <S3Mali />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(24)} />

      <TransitionSeries.Sequence durationInFrames={150}>
        <S4Scan />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={t(24)} />

      <TransitionSeries.Sequence durationInFrames={165}>
        <S5Predict />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={t(24)} />


      <TransitionSeries.Sequence durationInFrames={135}>
        <S7CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
