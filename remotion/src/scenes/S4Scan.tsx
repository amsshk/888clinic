import React from "react";
import { AbsoluteFill } from "remotion";
import { Backdrop, Eyebrow, Headline, PhonePan, Paragraph } from "../components/Atoms";
import { palette } from "../theme";

export const S4Scan: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <div style={{ position: "absolute", left: 92, top: 130, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow text="ขั้นตอนง่าย ๆ" delay={4} />
      <Headline text="สแกน. รายงาน. วางแผน." delay={12} size={92} accentFrom={2} />
      <Paragraph text="สมัครหนึ่งบัญชี รับสแกนฟรี 1 ครั้ง — หลังจากนั้นเป็นแพ็ก 3 ครั้ง" delay={54} width={780} size={32} />
    </div>

    <div style={{ position: "absolute", left: 60, top: 560 }}>
      <PhonePan src="images/hero.png" from={-40} to={-330} duration={130} delay={20} rotate={-3} zoom={420} />
    </div>
    <div
      style={{
        position: "absolute",
        right: -70,
        top: 760,
        transform: "scale(0.82)",
        transformOrigin: "top right",
      }}
    >
      <PhonePan src="images/products.png" from={-30} to={-380} duration={130} delay={44} rotate={4} zoom={340} />
    </div>

    <div
      style={{
        position: "absolute",
        left: 92,
        bottom: 84,
        fontFamily: palette ? undefined : undefined,
      }}
    >
      <Paragraph text="888clinic.co" delay={80} color={palette.gold} size={38} />
    </div>
  </AbsoluteFill>
);
