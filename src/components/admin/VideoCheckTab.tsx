import { useState } from "react";
import { FileVideo, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Video check — runs entirely in the browser, nothing is uploaded.
 * Reads the video's size, shape, length and bitrate and explains, in plain
 * Thai/English, why it may look soft on Facebook and how to fix it.
 */

type Finding = { level: "ok" | "warn" | "bad"; text: string };
type Report = { name: string; width: number; height: number; seconds: number; mb: number; kbps: number; findings: Finding[] };

function analyse(file: File, width: number, height: number, seconds: number): Report {
  const mb = file.size / 1_048_576;
  const kbps = seconds > 0 ? Math.round((file.size * 8) / seconds / 1000) : 0;
  const shortSide = Math.min(width, height);
  const findings: Finding[] = [];

  if (shortSide >= 1080) findings.push({ level: "ok", text: `คมชัด Full HD (${width}×${height}) · sharp enough` });
  else if (shortSide >= 720)
    findings.push({ level: "warn", text: `แค่ 720p (${width}×${height}) · export at 1080p in CapCut/the editor` });
  else findings.push({ level: "bad", text: `ความละเอียดต่ำ (${width}×${height}) · this will look blurry; use the original file` });

  const ratio = width / height;
  if (height > width && Math.abs(ratio - 9 / 16) < 0.03) findings.push({ level: "ok", text: "แนวตั้ง 9:16 · right shape for Reels and Stories" });
  else if (height > width && Math.abs(ratio - 4 / 5) < 0.03) findings.push({ level: "ok", text: "แนวตั้ง 4:5 · good for the feed" });
  else if (width >= height) findings.push({ level: "warn", text: "แนวนอน · most viewers are on phones; vertical 9:16 fills the screen" });
  else findings.push({ level: "warn", text: "สัดส่วนแปลก · Meta will crop it; use 9:16 or 4:5" });

  if (kbps >= 6000) findings.push({ level: "ok", text: `บิตเรตดี (${kbps.toLocaleString()} kbps)` });
  else if (kbps >= 2500)
    findings.push({ level: "warn", text: `บิตเรตปานกลาง (${kbps.toLocaleString()} kbps) · export with "high" quality / 10 Mbps` });
  else
    findings.push({
      level: "bad",
      text: `บิตเรตต่ำมาก (${kbps.toLocaleString()} kbps) · the file was compressed, usually by sending it through LINE or chat apps`,
    });

  if (/^line[_\s]/i.test(file.name))
    findings.push({ level: "bad", text: "ชื่อไฟล์บอกว่าผ่าน LINE มา · LINE shrinks videos; send the original by AirDrop/Google Drive/cable" });

  if (seconds > 90) findings.push({ level: "warn", text: `ยาว ${Math.round(seconds)} วินาที · Reels and ads work best under 60 s` });
  if (mb > 4000) findings.push({ level: "bad", text: "ไฟล์ใหญ่เกิน 4 GB · Meta won't accept it" });

  return { name: file.name, width, height, seconds, mb, kbps, findings };
}

const TIPS = [
  "ถ่ายด้วยโหมด 1080p หรือ 4K, 30fps · record at 1080p or 4K",
  "อย่าส่งไฟล์ผ่าน LINE/WhatsApp ก่อนโพสต์ · never pass the file through LINE first",
  "CapCut: Export → 1080p, 30fps, คุณภาพสูงสุด/บิตเรตสูง",
  "แอป Facebook: การตั้งค่า → สื่อ → เปิด \"อัปโหลด HD\"",
  "ในโฆษณา: ปิด \"ปรับแต่งภาพ/Enhance video\" ใน Advantage+ creative ถ้าภาพดูเพี้ยน",
];

export function VideoCheckTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setReport(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setReport(analyse(file, video.videoWidth, video.videoHeight, video.duration));
      URL.revokeObjectURL(url);
      setBusy(false);
    };
    video.onerror = () => {
      setReport({ name: file.name, width: 0, height: 0, seconds: 0, mb: file.size / 1_048_576, kbps: 0, findings: [{ level: "bad", text: "อ่านไฟล์ไม่ได้ · this browser can't read the file; use MP4 (H.264)" }] });
      URL.revokeObjectURL(url);
      setBusy(false);
    };
    video.src = url;
  }

  const color = { ok: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600" };
  const icon = { ok: "✓", warn: "!", bad: "✕" };

  return (
    <div className="space-y-8">
      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-center gap-2">
          <FileVideo className="size-5 text-gold" />
          <h2 className="font-serif text-2xl">ตรวจคุณภาพวิดีโอ · Video check</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the video file before posting. It is checked on this device only; nothing is uploaded.
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="video-check">ไฟล์วิดีโอ · Video file</Label>
          <input
            id="video-check"
            type="file"
            accept="video/*"
            className="block text-sm"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {busy && <Loader2 className="mt-6 size-5 animate-spin text-gold" />}
        {report && (
          <div className="mt-6 border border-border/70 p-4">
            <p className="text-sm font-medium">{report.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.width}×{report.height} · {Math.round(report.seconds)} s · {report.mb.toFixed(1)} MB
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {report.findings.map((f, i) => (
                <li key={i} className={color[f.level]}>
                  <span className="mr-2 font-bold">{icon[f.level]}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="border border-border/70 bg-card p-6">
        <h3 className="font-serif text-lg">วิธีให้วิดีโอคมชัดบน Facebook · How to keep it sharp</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
