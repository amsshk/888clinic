import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Backdrop, Dust, Logo, Rule, Rise } from "../components/Atoms";
import { palette, body } from "../theme";

export const S1Open: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 90], [1.06, 1]);
  return (
    <AbsoluteFill>
      <Backdrop dark />
      <Dust dark count={30} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 46,
          transform: `scale(${zoom})`,
        }}
      >
        <Logo dark scale={1.05} delay={4} />
        <Rule delay={30} width={300} dark />
        <Rise delay={40} distance={22}>
          <div
            style={{
              fontFamily: body,
              fontWeight: 300,
              letterSpacing: 4,
              fontSize: 29,
              color: palette.grey,
            }}
          >
            เวชศาสตร์ผิวหนัง · ความงาม · ดูแลผิว
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
