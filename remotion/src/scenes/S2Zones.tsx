import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Eyebrow, Headline, Paragraph, Rule } from "../components/Atoms";
import { palette, body } from "../theme";

type Zone = { x: number; y: number; label: string; kind: "โบท็อกซ์" | "ฟิลเลอร์"; delay: number; side: "left" | "right" };

const ZONES: Zone[] = [
  { x: 300, y: 150, label: "ริ้วรอยหน้าผาก", kind: "โบท็อกซ์", delay: 44, side: "left" },
  { x: 300, y: 232, label: "ริ้วรอยหว่างคิ้ว", kind: "โบท็อกซ์", delay: 56, side: "left" },
  { x: 158, y: 296, label: "ตีนกา", kind: "โบท็อกซ์", delay: 68, side: "left" },
  { x: 442, y: 372, label: "แก้ม", kind: "ฟิลเลอร์", delay: 80, side: "right" },
  { x: 300, y: 470, label: "ริมฝีปาก", kind: "ฟิลเลอร์", delay: 92, side: "left" },
  { x: 300, y: 560, label: "คาง", kind: "ฟิลเลอร์", delay: 104, side: "left" },
  { x: 448, y: 500, label: "กรอบหน้า", kind: "ฟิลเลอร์", delay: 116, side: "right" },
];

const Marker: React.FC<{ zone: Zone }> = ({ zone }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - zone.delay, fps, config: { damping: 200, mass: 0.7 } });
  const pulse = 1 + Math.sin((frame - zone.delay) / 9) * 0.14 * s;
  const gold = zone.kind === "โบท็อกซ์" ? palette.goldLight : palette.gold;
  return (
    <div style={{ position: "absolute", left: zone.x, top: zone.y, opacity: s }}>
      <div
        style={{
          position: "absolute",
          left: -26,
          top: -26,
          width: 52,
          height: 52,
          borderRadius: 52,
          border: `2px solid ${gold}`,
          opacity: 0.45,
          transform: `scale(${pulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -8,
          top: -8,
          width: 16,
          height: 16,
          borderRadius: 16,
          background: gold,
          boxShadow: `0 0 26px ${gold}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: zone.side === "left" ? -300 : 40,
          top: -20,
          width: 260,
          textAlign: zone.side === "left" ? "right" : "left",
          fontFamily: body,
          fontWeight: 300,
          fontSize: 27,
          color: palette.cream,
          transform: `translateX(${interpolate(s, [0, 1], [zone.side === "left" ? 24 : -24, 0])}px)`,
        }}
      >
        {zone.label}
        <div style={{ fontSize: 20, letterSpacing: 3, color: gold, textTransform: "uppercase", marginTop: 4 }}>
          {zone.kind}
        </div>
      </div>
    </div>
  );
};

export const S2Zones: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [8, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [30, 150], [0, 720], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop dark />

      <div style={{ position: "absolute", left: 92, top: 120, display: "flex", flexDirection: "column", gap: 26 }}>
        <Eyebrow text="วางแผนโบท็อกซ์และฟิลเลอร์" delay={4} color={palette.goldLight} />
        <Headline
          text="คุณเลือก จุดฉีด ได้เอง"
          delay={12}
          size={92}
          color={palette.cream}
          accentFrom={3}
          accentColor={palette.goldLight}
          italicFrom={4}
        />
      </div>

      {/* Face map */}
      <div style={{ position: "absolute", left: 190, top: 480, width: 700, height: 720 }}>
        <svg width={700} height={720} viewBox="0 0 700 720" style={{ position: "absolute", inset: 0 }}>
          <g
            fill="none"
            stroke={palette.greyLight}
            strokeOpacity={0.5}
            strokeWidth={2.5}
            strokeDasharray={2600}
            strokeDashoffset={2600 * (1 - draw)}
            strokeLinecap="round"
          >
            {/* face outline */}
            <path d="M300 60 C400 60 452 140 452 250 C452 360 420 470 350 560 C336 578 314 600 300 620 C286 600 264 578 250 560 C180 470 148 360 148 250 C148 140 200 60 300 60 Z" />
            {/* brows */}
            <path d="M205 260 C230 244 265 244 285 256" />
            <path d="M315 256 C335 244 370 244 395 260" />
            {/* eyes */}
            <path d="M208 296 C232 278 268 278 288 296 C268 314 232 314 208 296 Z" />
            <path d="M312 296 C332 278 368 278 392 296 C368 314 332 314 312 296 Z" />
            {/* nose */}
            <path d="M300 300 L300 396 C300 412 286 420 274 418" />
            {/* lips */}
            <path d="M244 468 C270 452 330 452 356 468 C330 494 270 494 244 468 Z" />
            {/* jaw / cheek guides */}
            <path d="M170 350 C220 400 250 430 254 470" strokeOpacity={0.28} />
            <path d="M430 350 C380 400 350 430 346 470" strokeOpacity={0.28} />
          </g>
        </svg>

        {/* diagnostic sweep */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: sweep - 40,
            width: 700,
            height: 80,
            background: `linear-gradient(180deg, transparent, ${palette.goldLight}22, transparent)`,
            borderTop: `2px solid ${palette.goldLight}`,
            opacity: frame > 30 && frame < 150 ? 0.7 : 0,
          }}
        />

        {ZONES.map((z) => (
          <Marker key={z.label} zone={z} />
        ))}
      </div>

      <div style={{ position: "absolute", left: 92, bottom: 96, display: "flex", flexDirection: "column", gap: 22 }}>
        <Rule delay={120} width={180} dark />
        <Paragraph
          text="เลือกจุดที่ต้องการบนแผนผังใบหน้า กรอกข้อมูลของคุณ แล้ว Dr Mali จะวางแผนจำนวนยูนิตและซีซีที่เหมาะสม — ครั้งละ 1–2 ml ไม่เกินกว่าที่โครงหน้ารับได้"
          delay={128}
          color={palette.greyLight}
          width={880}
        />
      </div>
    </AbsoluteFill>
  );
};
