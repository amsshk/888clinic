import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, random } from "remotion";
import { palette, display, body } from "../theme";

export const Backdrop: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill
      style={{
        background: dark
          ? `radial-gradient(120% 90% at ${50 + drift / 8}% 12%, #35322C 0%, ${palette.charcoal} 55%, #100F0E 100%)`
          : `linear-gradient(165deg, ${palette.paper} 0%, ${palette.cream} 45%, #EEEAE2 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 26% at ${20 + drift}px ${520 + drift * 2}px, ${
            dark ? "rgba(184,147,90,0.30)" : "rgba(184,147,90,0.16)"
          } 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(42% 28% at ${900 - drift}px ${1500 - drift}px, ${
            dark ? "rgba(227,201,143,0.16)" : "rgba(139,135,127,0.14)"
          } 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Dust: React.FC<{ count?: number; dark?: boolean }> = ({ count = 26, dark }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const y0 = random(`y${i}`) * 1920;
        const speed = 0.25 + random(`s${i}`) * 0.7;
        const size = 2 + random(`r${i}`) * 5;
        const y = (y0 - frame * speed * 3 + 1920) % 1920;
        const o = 0.12 + random(`o${i}`) * 0.4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin((frame + i * 30) / 60) * 18,
              top: y,
              width: size,
              height: size,
              borderRadius: size,
              background: dark ? palette.goldLight : palette.gold,
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Slow gold hairline that draws in. */
export const Rule: React.FC<{ delay?: number; width?: number; dark?: boolean }> = ({ delay = 0, width = 220, dark }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 34], [0, width], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ width: w, height: 2, background: dark ? palette.goldLight : palette.gold, opacity: 0.9 }} />;
};

/** Blur-to-sharp rise: the default entrance for the whole film. */
export const Rise: React.FC<{ delay?: number; children: React.ReactNode; distance?: number; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  distance = 46,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.9 } });
  const y = interpolate(s, [0, 1], [distance, 0]);
  const blur = interpolate(s, [0, 1], [14, 0]);
  return (
    <div style={{ transform: `translateY(${y}px)`, filter: `blur(${blur}px)`, opacity: s, ...style }}>{children}</div>
  );
};

/** Word-by-word display headline. */
export const Headline: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  accentFrom?: number;
  accentColor?: string;
  italicFrom?: number;
  lineHeight?: number;
  align?: "left" | "center";
}> = ({ text, delay = 0, size = 112, color = palette.ink, accentFrom = 99, accentColor = palette.gold, italicFrom = 99, lineHeight = 0.98, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `0 ${size * 0.22}px`,
        justifyContent: align === "center" ? "center" : "flex-start",
        maxWidth: 900,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 200, mass: 0.8 } });
        return (
          <span
            key={i}
            style={{
              fontFamily: display,
              fontWeight: 300,
              fontSize: size,
              lineHeight,
              color: i >= accentFrom ? accentColor : color,
              fontStyle: i >= italicFrom ? "italic" : "normal",
              display: "inline-block",
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [size * 0.35, 0])}px)`,
              filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Eyebrow: React.FC<{ text: string; delay?: number; color?: string }> = ({ text, delay = 0, color = palette.gold }) => (
  <Rise delay={delay} distance={18}>
    <div style={{ fontFamily: body, fontWeight: 500, letterSpacing: 3, fontSize: 26, color }}>
      {text}
    </div>
  </Rise>
);

export const Paragraph: React.FC<{ text: string; delay?: number; color?: string; width?: number; size?: number }> = ({
  text,
  delay = 0,
  color = palette.grey,
  width = 760,
  size = 34,
}) => (
  <Rise delay={delay} distance={26}>
    <div style={{ fontFamily: body, fontWeight: 300, fontSize: size, lineHeight: 1.5, color, maxWidth: width }}>{text}</div>
  </Rise>
);

/** Crown-mark 888 lockup. */
export const Logo: React.FC<{ scale?: number; dark?: boolean; delay?: number }> = ({ scale = 1, dark, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const gold = dark ? palette.goldLight : palette.gold;
  const txt = dark ? palette.cream : palette.ink;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22 * scale,
        transform: `scale(${interpolate(s, [0, 1], [0.9, 1]) * scale})`,
        opacity: s,
      }}
    >
      <svg width={86} height={70} viewBox="0 0 86 70">
        <path
          d="M6 56 L6 22 L23 38 L43 12 L63 38 L80 22 L80 56 Z"
          fill="none"
          stroke={gold}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeDasharray={320}
          strokeDashoffset={interpolate(frame - delay, [0, 40], [320, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
        <circle cx={43} cy={62} r={3.4} fill={gold} opacity={s} />
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: display, fontSize: 96, fontWeight: 400, color: txt, letterSpacing: 2 }}>888</span>
        <span style={{ fontFamily: body, fontSize: 42, fontWeight: 300, letterSpacing: 4, color: gold }}>clinic</span>
      </div>
    </div>
  );
};

/** Phone mockup that slow-pans a page screenshot. */
export const PhonePan: React.FC<{
  src: string;
  from?: number;
  to?: number;
  duration?: number;
  delay?: number;
  rotate?: number;
  zoom?: number;
}> = ({ src, from = 0, to = -420, duration = 110, delay = 0, rotate = 0, zoom = 320 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 1.1 } });
  const y = interpolate(frame - delay, [0, duration], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: 620,
        height: 1180,
        borderRadius: 62,
        background: palette.charcoal,
        padding: 12,
        boxShadow: "0 60px 120px rgba(20,18,15,0.45)",
        transform: `translateY(${interpolate(s, [0, 1], [70, 0])}px) rotate(${rotate}deg) scale(${interpolate(s, [0, 1], [0.94, 1])})`,
        opacity: s,
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: palette.paper, position: "relative" }}>
        <Img
          src={staticFile(src)}
          style={{ width: `${zoom}%`, position: "absolute", top: y, left: `${-(zoom - 100) / 2}%` }}
        />
      </div>
    </div>
  );
};


export const goldBtn = (text: string): React.ReactNode => (
  <div
    style={{
      fontFamily: body,
      fontWeight: 500,
      fontSize: 30,
      letterSpacing: 2,
      color: palette.charcoal,
      background: `linear-gradient(100deg, ${palette.goldLight}, ${palette.gold})`,
      padding: "24px 52px",
      borderRadius: 4,
    }}
  >
    {text}
  </div>
);
