import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { MedicalPromoVideo } from "./MedicalPromoVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1294}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="square"
      component={MainVideo}
      durationInFrames={1294}
      fps={30}
      width={1080}
      height={1080}
    />
    <Composition
      id="medical-promo-vertical"
      component={MedicalPromoVideo}
      durationInFrames={1440}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ topic: "", scenes: [], subtitles: [] }}
    />
    <Composition
      id="medical-promo-square"
      component={MedicalPromoVideo}
      durationInFrames={1440}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ topic: "", scenes: [], subtitles: [] }}
    />
    <Composition
      id="medical-promo-landscape"
      component={MedicalPromoVideo}
      durationInFrames={1440}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ topic: "", scenes: [], subtitles: [] }}
    />
  </>
);
