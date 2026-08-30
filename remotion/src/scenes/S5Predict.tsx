import React from "react";
import { AbsoluteFill, Img, staticFile, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, Eyebrow, Headline, Paragraph, Rule } from "../components/Atoms";
import { palette, body } from "../theme";

export const S5Predict: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [24, 84], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 120], [1.08, 1]);
  return (
    <AbsoluteFill>
      <Backdrop dark />
      <div style={{ position: "absolute", left: 92, top: 120, display: "flex", flexDirection: "column", gap: 26 }}>
        <Eyebrow text="พรีวิวก่อน–หลัง" delay={4} color={palette.goldLight} />
        <Headline text="เห็นผลลัพธ์ ก่อนลงเข็ม" delay={12} size={92} color={palette.cream} accentFrom={1} accentColor={palette.goldLight} />
      </div>

      {/* Real results gallery, wiped in */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 560,
          width: 960,
          height: 820,
          overflow: "hidden",
          borderRadius: 6,
          boxShadow: "0 50px 100px rgba(0,0,0,0.5)",
        }}
      >
        <Img
          src={staticFile("images/results.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 22%",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, rgba(27,26,24,0) ${wipe}%, rgba(27,26,24,0.96) ${wipe}%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${wipe}%`,
            top: 0,
            width: 3,
            height: "100%",
            background: palette.goldLight,
            opacity: wipe > 1 && wipe < 99 ? 0.9 : 0,
          }}
        />
      </div>

      <div style={{ position: "absolute", left: 92, top: 1450, display: "flex", flexDirection: "column", gap: 24 }}>
        <Rule delay={70} width={180} dark />
        <Paragraph
          text="เลือกจุดฉีดบนแผนผังใบหน้า กรอกข้อมูลของคุณ แล้ว Dr Mali จะสร้างภาพพรีวิวโบท็อกซ์และฟิลเลอร์แบบระมัดระวัง ทั่วไป และดีที่สุด — เทียบกับผลลัพธ์คนไข้จริง"
          delay={78}
          color={palette.greyLight}
          width={890}
        />
        <div style={{ fontFamily: body, fontSize: 24, letterSpacing: 3, color: palette.gold, marginTop: 6 }}>
          คนไข้จริง · เผยแพร่โดยได้รับอนุญาต
        </div>
      </div>
    </AbsoluteFill>
  );
};
