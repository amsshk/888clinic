import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Eyebrow, Headline, Paragraph, Rule } from "../components/Atoms";
import { palette, body } from "../theme";

/**
 * Detailed upper-face botox map: forehead lines, frown (glabella) lines and
 * crow's feet — labelled, with leader arrows and injection-point clusters.
 */
const S = 1.5;

type Area = {
  key: string;
  label: string;
  sub: string;
  points: [number, number][];
  label_xy: [number, number];
  anchor: [number, number];
  side: "left" | "right";
  delay: number;
};

const AREAS: Area[] = [
  {
    key: "forehead",
    label: "หน้าผาก",
    sub: "10–16 ยูนิต",
    points: [
      [232, 148],
      [286, 132],
      [340, 132],
      [394, 148],
      [258, 196],
      [313, 184],
      [368, 196],
    ],
    label_xy: [-30, 176],
    anchor: [232, 150],
    side: "left",
    delay: 40,
  },
  {
    key: "glabella",
    label: "หว่างคิ้ว",
    sub: "16–20 ยูนิต",
    points: [
      [313, 250],
      [289, 262],
      [337, 262],
      [301, 286],
      [325, 286],
    ],
    label_xy: [716, 332],
    anchor: [340, 258],
    side: "right",
    delay: 78,
  },
  {
    key: "crows",
    label: "ตีนกา",
    sub: "8–12 ยูนิต / ข้าง",
    points: [
      [176, 318],
      [162, 348],
      [176, 378],
      [450, 318],
      [464, 348],
      [450, 378],
    ],
    label_xy: [-30, 470],
    anchor: [172, 350],
    side: "left",
    delay: 116,
  },
];

const Dot: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
  const pulse = 1 + Math.sin((frame - delay) / 8) * 0.25 * s;
  return (
    <g opacity={s}>
      <circle cx={x} cy={y} r={16 * pulse} fill="none" stroke={palette.goldLight} strokeOpacity={0.4} strokeWidth={1.5} />
      <path
        d={`M${x} ${y - 9} L${x} ${y + 9} M${x - 9} ${y} L${x + 9} ${y}`}
        stroke={palette.goldLight}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r={4} fill={palette.goldLight} />
    </g>
  );
};

const Arrow: React.FC<{ area: Area }> = ({ area }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - area.delay - 8, fps, config: { damping: 200 } });
  const [lx, ly] = area.label_xy;
  const [ax, ay] = [area.anchor[0] * S, area.anchor[1] * S];
  const startX = area.side === "left" ? lx + 244 : lx - 12;
  const startY = ly + 30;
  const midX = (startX + ax) / 2;
  const x = interpolate(s, [0, 1], [startX, ax]);
  const y = interpolate(s, [0, 1], [startY, ay]);
  const head = area.side === "left" ? 1 : -1;
  return (
    <g opacity={s}>
      <path
        d={`M${startX} ${startY} Q ${midX} ${startY} ${x} ${y}`}
        fill="none"
        stroke={palette.gold}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d={`M${x} ${y} l${-12 * head} ${-7} M${x} ${y} l${-12 * head} ${7}`}
        stroke={palette.gold}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </g>
  );
};

const Label: React.FC<{ area: Area }> = ({ area }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - area.delay, fps, config: { damping: 200, mass: 0.8 } });
  const [lx, ly] = area.label_xy;
  return (
    <div
      style={{
        position: "absolute",
        left: lx,
        top: ly,
        width: 240,
        textAlign: area.side === "left" ? "right" : "left",
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [area.side === "left" ? 28 : -28, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: body, fontWeight: 400, fontSize: 40, color: palette.cream }}>{area.label}</div>
      <div style={{ fontFamily: body, fontWeight: 300, fontSize: 25, color: palette.goldLight, marginTop: 6 }}>
        {area.sub}
      </div>
      <div
        style={{
          fontFamily: body,
          fontWeight: 500,
          fontSize: 18,
          letterSpacing: 3,
          color: palette.grey,
          marginTop: 6,
        }}
      >
        BOTOX
      </div>
    </div>
  );
};

export const S2Map: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [6, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Backdrop dark />

      <div style={{ position: "absolute", left: 92, top: 118, display: "flex", flexDirection: "column", gap: 24 }}>
        <Eyebrow text="แผนผังการฉีดโบท็อกซ์" delay={4} color={palette.goldLight} />
        <Headline
          text="จุดฉีด ที่ใช้บ่อยที่สุด"
          delay={12}
          size={84}
          color={palette.cream}
          accentFrom={1}
          accentColor={palette.goldLight}
        />
      </div>

      {/* map stage */}
      <div style={{ position: "absolute", left: 48, top: 430, width: 1000, height: 1020 }}>
        <svg width={1000} height={1020} viewBox="0 0 1000 1020" style={{ position: "absolute", inset: 0 }}>
          {/* face, upper-face focused */}
          <g transform={`scale(${S})`}>
          <g
            fill="none"
            stroke={palette.greyLight}
            strokeOpacity={0.55}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={2400}
            strokeDashoffset={2400 * (1 - draw)}
          >
            <path d="M313 62 C418 62 472 146 472 262 C472 372 436 486 362 578 C348 596 327 620 313 642 C299 620 278 596 264 578 C190 486 154 372 154 262 C154 146 208 62 313 62 Z" />
            {/* brows */}
            <path d="M212 268 C240 250 276 250 296 262" />
            <path d="M330 262 C350 250 386 250 414 268" />
            {/* eyes */}
            <path d="M216 316 C240 296 276 296 296 316 C276 336 240 336 216 316 Z" />
            <path d="M330 316 C350 296 386 296 410 316 C386 336 350 336 330 316 Z" />
            {/* nose + lips (light) */}
            <path d="M313 320 L313 414 C313 430 299 438 287 436" strokeOpacity={0.32} />
            <path d="M257 486 C283 470 343 470 369 486 C343 512 283 512 257 486 Z" strokeOpacity={0.32} />
          </g>

          {/* dynamic wrinkle lines that fade as botox "relaxes" them */}
          <g
            stroke={palette.gold}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={interpolate(frame, [30, 60, 150, 176], [0, 0.85, 0.85, 0.12], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {/* forehead lines */}
            <path d="M222 158 C270 142 356 142 404 158" />
            <path d="M228 186 C274 170 352 170 398 186" />
            <path d="M238 214 C280 200 346 200 388 214" />
            {/* frown lines */}
            <path d="M301 240 L297 292" />
            <path d="M325 240 L329 292" />
            {/* crow's feet */}
            <path d="M198 306 L166 292 M196 318 L160 318 M198 330 L166 344" />
            <path d="M428 306 L460 292 M430 318 L466 318 M428 330 L460 344" />
          </g>
          </g>

          {AREAS.map((a) => (
            <Arrow key={`arw-${a.key}`} area={a} />
          ))}
          {AREAS.map((a) =>
            a.points.map(([x, y], i) => <Dot key={`${a.key}-${i}`} x={x * S} y={y * S} delay={a.delay + 4 + i * 3} />)
          )}
        </svg>

        {AREAS.map((a) => (
          <Label key={a.key} area={a} />
        ))}
      </div>

      <div style={{ position: "absolute", left: 92, bottom: 92, display: "flex", flexDirection: "column", gap: 20 }}>
        <Rule delay={150} width={180} dark />
        <Paragraph
          text="โบท็อกซ์เน้นใบหน้าส่วนบน — หน้าผาก หว่างคิ้ว และตีนกา จุดกากบาททองคือตำแหน่งฉีด Dr Mali จะคำนวณยูนิตให้เหมาะกับกล้ามเนื้อของคุณ ผลลัพธ์ดูเป็นธรรมชาติ ไม่แข็ง"
          delay={158}
          color={palette.greyLight}
          width={880}
        />
      </div>
    </AbsoluteFill>
  );
};
