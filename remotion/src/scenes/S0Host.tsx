import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { palette, body, display } from "../theme";
import { Eyebrow, Logo } from "../components/Atoms";

/** Presenter (host) explaining the platform, with Thai subtitle beats. */
const BEATS: { t: number; text: string }[] = [
  { t: 10, text: "สวัสดีค่ะ ยินดีต้อนรับสู่ 888clinic" },
  { t: 92, text: "สมัครสมาชิกฟรี รับสแกนผิวกับ Dr Mali 1 ครั้งทันที" },
  { t: 178, text: "เลือกจุดฉีดโบท็อกซ์และฟิลเลอร์บนแผนผังใบหน้า" },
];

export const S0Host: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, 260], [1.06, 1.14]);
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  const active = [...BEATS].filter((b) => b.text).reverse().find((b) => frame >= b.t);
  const capIn = active ? spring({ frame: frame - active.t, fps, config: { damping: 200, mass: 0.8 } }) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.charcoal }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <OffthreadVideo
          src={staticFile("videos/host.mp4")}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
        />
      </AbsoluteFill>

      {/* hide background signage on the left */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(16,15,14,0.95) 0%, rgba(16,15,14,0.75) 22%, rgba(16,15,14,0.10) 42%, transparent 60%)",
        }}
      />

      {/* cinematic grade */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(20,19,17,0.72) 0%, rgba(20,19,17,0.05) 34%, rgba(20,19,17,0.18) 58%, rgba(16,15,14,0.92) 100%)",
        }}
      />

      <div style={{ position: "absolute", left: 78, top: 92, display: "flex", flexDirection: "column", gap: 18 }}>
        <Logo scale={0.62} dark delay={6} />
        <Eyebrow text="แพลตฟอร์มความงามด้วย AI" delay={20} color={palette.goldLight} />
      </div>

      {/* subtitle card */}
      {active ? (
        <div
          style={{
            position: "absolute",
            left: 78,
            right: 78,
            bottom: 250,
            opacity: capIn,
            transform: `translateY(${interpolate(capIn, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              borderLeft: `3px solid ${palette.goldLight}`,
              paddingLeft: 28,
              fontFamily: display,
              fontWeight: 400,
              fontSize: 62,
              lineHeight: 1.28,
              color: palette.cream,
              textShadow: "0 6px 30px rgba(0,0,0,0.55)",
            }}
          >
            {active.text}
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 78,
          bottom: 132,
          fontFamily: body,
          fontWeight: 300,
          letterSpacing: 4,
          fontSize: 30,
          color: palette.goldLight,
          opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        888clinic.co · สมัครฟรี · ทดลองสแกน 1 ครั้ง
      </div>
    </AbsoluteFill>
  );
};
