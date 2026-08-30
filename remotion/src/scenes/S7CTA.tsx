import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, Dust, Logo, Rise, Rule, goldBtn } from "../components/Atoms";
import { palette, body } from "../theme";

export const S7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 95], [1.03, 1]);
  return (
    <AbsoluteFill>
      <Backdrop dark />
      <Dust dark count={34} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", gap: 40, transform: `scale(${zoom})` }}
      >
        <Logo dark delay={2} scale={0.95} />
        <Rule delay={26} width={280} dark />
        <Rise delay={36} distance={26}>
          <div
            style={{
              fontFamily: body,
              fontWeight: 300,
              fontSize: 40,
              letterSpacing: 2,
              color: palette.greyLight,
              textAlign: "center",
              maxWidth: 820,
              lineHeight: 1.5,
            }}
          >
            นัดปรึกษาแพทย์ หรือเริ่มสแกนผิวด้วย AI ฟรีคืนนี้เลย
          </div>
        </Rise>
        <Rise delay={56} distance={22} style={{ marginTop: 18 }}>
          {goldBtn("888clinic.co")}
        </Rise>
        <Rise delay={70} distance={16}>
          <div style={{ fontFamily: body, fontSize: 27, letterSpacing: 3, color: palette.gold }}>
            กรุงเทพฯ · Walk-in ได้ทุกวัน
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
