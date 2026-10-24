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
  const [progress, setProgress] = useState<{ file: number; files: number; pct: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ensureTicket = useCallback(async () => {
    if (ticket && ticket.expiresAt - Date.now() / 1000 > 300) return ticket;
    let res: Awaited<ReturnType<typeof ticketFn>>;
    try {
      res = await ticketFn();
    } catch (e) {
      setError(`Could not get an upload pass from the site: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
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
      if (res.status === 401) throw new Error("the video server rejected the pass (VIDEO_SHARED_SECRET differs between the site and the server)");
      if (!res.ok) throw new Error(`video server answered ${res.status}`);
      setJobs(((await res.json()) as { jobs: Job[] }).jobs);
      setError(null);
    } catch (e) {
      setError(`Could not reach the video server at ${t.base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [ensureTicket]);

  useEffect(() => {
    loadJobs();
    // load once on open; later refreshes come from the polling below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = jobs.some((j) => j.status === "queued" || j.status === "working");
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(loadJobs, 5000);
    return () => clearInterval(id);
  }, [busy, loadJobs]);

  /** One file: resolves true when the server accepted it. */
  function sendOne(t: { base: string; token: string }, file: File, index: number, total: number) {
    const form = new FormData();
    form.append("file", file);
    return new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${t.base}/api/video/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${t.token}`);
      xhr.upload.onprogress = (e) =>
        e.lengthComputable && setProgress({ file: index, files: total, pct: Math.round((e.loaded / e.total) * 100) });
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve(true);
        toast.error(xhr.status === 413 ? `${file.name}: too large (max 1.5 GB)` : `${file.name}: upload failed (${xhr.status})`);
        resolve(false);
      };
      xhr.onerror = () => {
        toast.error(`${file.name}: could not connect to ${t.base}`);
        resolve(false);
      };
      xhr.send(form);
    });
  }

  /** Several files at once: uploaded one after another, enhanced in order on the server. */
  async function upload(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const t = await ensureTicket();
    if (!t) {
      toast.error("Upload not started — see the message in the panel.");
      return;
    }
    let ok = 0;
    for (const [i, file] of files.entries()) {
      setProgress({ file: i + 1, files: files.length, pct: 0 });
      if (await sendOne(t, file, i + 1, files.length)) ok += 1;
      loadJobs();
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) toast.success(`${ok} video${ok > 1 ? "s" : ""} uploaded · กำลังปรับวิดีโอ`);
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
        Upload the original files (you can pick several); each comes back Facebook-ready. Files are kept 7 days.
      </p>

      {error ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={() => {
              setError(null);
              setTicket(null);
              loadJobs();
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
          <Button className="rounded-none" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
            {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {progress !== null
              ? `กำลังอัปโหลด ${progress.file}/${progress.files} · ${progress.pct}% · keep this page open`
              : "อัปโหลดวิดีโอ (เลือกได้หลายไฟล์) · Upload videos"}
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
