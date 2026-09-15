import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";

export interface MedicalPromoScene {
  id: string;
  title: string;
  anatomyFocus: string[];
  clipUrl: string;
  narrationUrl: string;
  narration: string;
  clipDurationSeconds: number;
}

export interface MedicalPromoSubtitleCue {
  id: string;
  sceneId: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface MedicalPromoVideoProps extends Record<string, unknown> {
  topic: string;
  scenes: MedicalPromoScene[];
  subtitles: MedicalPromoSubtitleCue[];
}

const FPS = 30;

function SubtitleOverlay({ subtitles }: Pick<MedicalPromoVideoProps, "subtitles">) {
  const frame = useCurrentFrame();
  const second = frame / FPS;
  const active = subtitles.find((cue) => second >= cue.startSeconds && second < cue.endSeconds);
  if (!active) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 110,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "18px 24px",
          backgroundColor: "rgba(10,10,10,0.78)",
          border: "1px solid rgba(201,165,92,0.55)",
          color: "#fff",
          fontSize: 42,
          lineHeight: 1.3,
          textAlign: "center",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {active.text}
      </div>
    </div>
  );
}

function Placeholder({ title, anatomyFocus }: Pick<MedicalPromoScene, "title" | "anatomyFocus">) {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 30% 20%, rgba(201,165,92,0.28), rgba(24,24,24,0.94) 55%)",
        color: "white",
        padding: 96,
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          fontSize: 28,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "#d5b271",
        }}
      >
        888clinic medical promo
      </div>
      <div>
        <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 600 }}>{title}</div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.82)",
          }}
        >
          {anatomyFocus.join(" · ")}
        </div>
      </div>
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.65)",
        }}
      >
        Server render fallback frame
      </div>
    </AbsoluteFill>
  );
}

export const MedicalPromoVideo: React.FC<MedicalPromoVideoProps> = ({
  topic,
  scenes,
  subtitles,
}) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0a0a", color: "#fff" }}>
      {scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.clipDurationSeconds * FPS));
        const sequence = (
          <Sequence key={scene.id} from={cursor} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              {scene.clipUrl ? (
                <OffthreadVideo
                  src={scene.clipUrl}
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Placeholder title={scene.title} anatomyFocus={scene.anatomyFocus} />
              )}
              {scene.narrationUrl ? <Audio src={scene.narrationUrl} /> : null}
              <div
                style={{
                  position: "absolute",
                  top: 54,
                  left: 54,
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "18px 22px",
                  maxWidth: "72%",
                  backgroundColor: "rgba(10,10,10,0.58)",
                  border: "1px solid rgba(201,165,92,0.42)",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#d5b271",
                  }}
                >
                  {topic}
                </div>
                <div style={{ fontSize: 46, lineHeight: 1.1, fontWeight: 600 }}>{scene.title}</div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
        cursor += durationInFrames;
        return sequence;
      })}
      <SubtitleOverlay subtitles={subtitles} />
    </AbsoluteFill>
  );
};
