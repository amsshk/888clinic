import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Eyebrow, Headline, Paragraph } from "../components/Atoms";
import { palette, body } from "../theme";

const CARDS = [
  { src: "images/ba-lips.jpg", title: "ฟิลเลอร์ริมฝีปาก", note: "1 ml · เน้นรูปทรง ไม่เน้นปริมาณ", delay: 30 },
  { src: "images/ba-chin.jpg", title: "ฟิลเลอร์คาง", note: "1 ml · สมดุลด้านข้าง", delay: 52 },
  { src: "images/ba-lift.jpg", title: "ร้อยไหมยกกระชับ", note: "พยุงแก้มและกรอบหน้า", delay: 74 },
];

const Card: React.FC<{ src: string; title: string; note: string; delay: number }> = ({ src, title, note, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 1 } });
  const zoom = interpolate(frame - delay, [0, 140], [1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: 296,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 296,
          height: 620,
          overflow: "hidden",
          borderRadius: 6,
          background: palette.charcoal,
          boxShadow: "0 40px 90px rgba(20,18,15,0.28)",
          position: "relative",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            padding: "14px 16px",
            background: "linear-gradient(180deg, rgba(27,26,24,0) 0%, rgba(27,26,24,0.85) 60%)",
            fontFamily: body,
            fontSize: 19,
            letterSpacing: 3,
            color: palette.goldLight,
            textTransform: "uppercase",
          }}
        >
          ก่อน · หลัง
        </div>
      </div>
      <div style={{ fontFamily: body, fontSize: 27, color: palette.ink, marginTop: 18 }}>{title}</div>
      <div style={{ fontFamily: body, fontSize: 21, color: palette.grey, marginTop: 6 }}>{note}</div>
    </div>
  );
};

export const S2Pairs: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <div style={{ position: "absolute", left: 92, top: 140, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow text="เคสจริงของ 888clinic" delay={4} />
      <Headline text="โบท็อกซ์ & ฟิลเลอร์ ก่อน–หลังจริง" delay={12} size={88} accentFrom={2} />
    </div>

    <div style={{ position: "absolute", left: 92, top: 560, display: "flex", gap: 32 }}>
      {CARDS.map((c) => (
        <Card key={c.title} {...c} />
      ))}
    </div>

    <div style={{ position: "absolute", left: 92, bottom: 130, display: "flex", flexDirection: "column", gap: 18 }}>
      <Paragraph
        text="ทุกเคสรักษาที่คลินิกโดยแพทย์ผิวหนังของเรา และเผยแพร่โดยได้รับอนุญาตจากคนไข้ — เป็นผลลัพธ์ชุดเดียวกับที่ Dr Mali ใช้อ้างอิงเวลาคาดการณ์ผลของคุณ"
        delay={104}
        width={890}
      />
      <div style={{ fontFamily: body, fontSize: 23, letterSpacing: 3, color: palette.gold, textTransform: "uppercase" }}>
        ระมัดระวัง · ทั่วไป · ดีที่สุด
      </div>
    </div>
  </AbsoluteFill>
);
