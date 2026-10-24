import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getVideoTicket } from "@/lib/video-enhance.functions";

type Info = { w: number; h: number; kbps: number; mb: number } | null;
type Job = {
  id: number;
  name: string;
  status: "queued" | "working" | "done" | "failed";
  created_at: string | null;
  before: Info;
  after: Info;
  error: string | null;
};

const STATUS: Record<Job["status"], string> = {
  queued: "รอคิว · Waiting",
  working: "กำลังปรับ · Enhancing…",
  done: "เสร็จแล้ว · Ready",
  failed: "ไม่สำเร็จ · Failed",
};

const fmt = (i: Info) => (i ? `${i.w}×${i.h} · ${i.kbps.toLocaleString()} kbps · ${i.mb} MB` : "–");

/**
 * Upload a clip, get back a Facebook-ready 1080×1920 file. The upload goes
 * directly to the clinic's video server with a 2-hour staff ticket.
 */
export function VideoEnhancePanel() {
  const ticketFn = useServerFn(getVideoTicket);
  const [ticket, setTicket] = useState<{ base: string; token: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ensureTicket = useCallback(async () => {
    if (ticket && ticket.expiresAt - Date.now() / 1000 > 300) return ticket;
    const res = await ticketFn();
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    const next = { base: res.base, token: res.token, expiresAt: res.expiresAt };
    setTicket(next);
    return next;
  }, [ticket, ticketFn]);

  const loadJobs = useCallback(async () => {
    const t = await ensureTicket();
    if (!t) return;
    try {
      const res = await fetch(`${t.base}/api/video/jobs`, { headers: { Authorization: `Bearer ${t.token}` } });
      if (!res.ok) throw new Error(String(res.status));
      setJobs(((await res.json()) as { jobs: Job[] }).jobs);
      setError(null);
    } catch {
      setError("Could not reach the video server.");
    }
  }, [ensureTicket]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const busy = jobs.some((j) => j.status === "queued" || j.status === "working");
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(loadJobs, 5000);
    return () => clearInterval(id);
  }, [busy, loadJobs]);

  async function upload(file: File | undefined) {
    if (!file) return;
    const t = await ensureTicket();
    if (!t) return;
    const form = new FormData();
    form.append("file", file);
    setProgress(0);
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${t.base}/api/video/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${t.token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) toast.success("Uploaded · กำลังปรับวิดีโอ");
        else if (xhr.status === 413) toast.error("File too large (max 1.5 GB)");
        else toast.error(`Upload failed (${xhr.status})`);
        resolve();
      };
      xhr.onerror = () => {
        toast.error("Upload failed. Check the connection and try again.");
        resolve();
      };
      xhr.send(form);
    });
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    loadJobs();
  }

  return (
    <section className="border border-border/70 bg-card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-gold" />
        <h2 className="font-serif text-2xl">ปรับวิดีโอให้คมชัด · Enhance a video</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        อัปโหลดไฟล์ต้นฉบับ (ไม่ใช่ไฟล์ที่ส่งผ่าน LINE) ได้กลับมาเป็น 1080×1920 คุณภาพสูง พร้อมโพสต์ Facebook ·
        Upload the original file; it comes back Facebook-ready in a few minutes. Files are kept 7 days.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <Button className="rounded-none" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
            {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {progress !== null ? `กำลังอัปโหลด ${progress}% · keep this page open` : "อัปโหลดวิดีโอ · Upload video"}
          </Button>
        </div>
      )}

      {jobs.length > 0 && (
        <ul className="mt-6 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 border border-border/70 p-4">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{j.name}</p>
                <p className="text-xs text-muted-foreground">{STATUS[j.status]}</p>
                <p className="text-xs text-muted-foreground">ก่อน · before: {fmt(j.before)}</p>
                <p className="text-xs text-muted-foreground">หลัง · after: {fmt(j.after)}</p>
                {j.status === "failed" && j.error && <p className="text-xs text-red-600">{j.error}</p>}
              </div>
              {j.status === "done" && ticket ? (
                <Button asChild variant="outline" size="sm" className="rounded-none">
                  <a href={`${ticket.base}/api/video/${j.id}/file?t=${encodeURIComponent(ticket.token)}`}>
                    <Download className="size-4" /> ดาวน์โหลด · Download
                  </a>
                </Button>
              ) : j.status === "queued" || j.status === "working" ? (
                <Loader2 className="size-4 animate-spin text-gold" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
