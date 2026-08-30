import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Backdrop, Dust, Eyebrow, Headline, Paragraph, Rule } from "../components/Atoms";
import { palette, body } from "../theme";

export const S3Mali: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 1.2 } });
  const float = Math.sin(frame / 44) * 16;
  const sweep = interpolate(frame % 90, [0, 90], [0, 900]);
  return (
    <AbsoluteFill>
      <Backdrop dark />
      <Dust dark count={22} />

      {/* Frameless floating Dr Mali */}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 250 + float,
          width: 900,
          height: 900,
          opacity: s,
          transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          filter: `blur(${interpolate(s, [0, 1], [16, 0])}px)`,
        }}
      >
        <AbsoluteFill
          style={{
            background: "radial-gradient(closest-side, rgba(184,147,90,0.34), transparent 72%)",
            transform: "scale(1.15)",
          }}
        />
        <Img
          src={staticFile("images/mali-robot.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 450,
            maskImage: "radial-gradient(closest-side, #000 62%, transparent 88%)",
            WebkitMaskImage: "radial-gradient(closest-side, #000 62%, transparent 88%)",
          }}
        />
        {/* scanning hairline */}
        <div
          style={{
            position: "absolute",
            top: sweep,
            left: 90,
            width: 720,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${palette.goldLight}, transparent)`,
            opacity: 0.75,
          }}
        />
      </div>

      <div style={{ position: "absolute", left: 92, top: 1230, display: "flex", flexDirection: "column", gap: 30 }}>
        <Eyebrow text="พบกับ Dr Mali" delay={30} color={palette.goldLight} />
        <Headline text="สแกนผิว ด้วย AI" delay={38} size={104} color={palette.cream} accentFrom={2} accentColor={palette.goldLight} />
        <Rule delay={80} width={200} dark />
        <Paragraph
          text="อัปโหลดรูปเพียงรูปเดียว Dr Mali จะอ่านผิวคุณทั้งพื้นผิว สีผิว สิว และรอยดำ — แล้วออกรายงานสไตล์แพทย์บนหัวจดหมายของคลินิกเรา"
          delay={88}
          color={palette.greyLight}
          width={880}
        />
        <div style={{ display: "flex", gap: 44, marginTop: 14, fontFamily: body, color: palette.gold, fontSize: 26, letterSpacing: 3 }}>
          <span>สแกน 60 วินาที</span>
          <span>รายงาน PDF</span>
          <span>ไทย / EN</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
