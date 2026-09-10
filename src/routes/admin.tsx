import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Upload, LogOut, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { describeMedia } from "@/lib/media.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { PatientsTab } from "@/components/admin/PatientsTab";
import { AccessTab } from "@/components/admin/AccessTab";
import { MaliModelTab } from "@/components/admin/MaliModelTab";
import { ScanTestTab } from "@/components/admin/ScanTestTab";
import { BillingTab } from "@/components/admin/BillingTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { CatalogueDesignPanel } from "@/components/admin/CatalogueDesignPanel";
import { MarketingTab } from "@/components/admin/MarketingTab";
import { CopyTab } from "@/components/admin/CopyTab";
import { AssistantTab } from "@/components/admin/AssistantTab";
import { VideoUploader } from "@/components/VideoUploader";

import { RESULT_CATEGORIES } from "@/lib/before-after";

import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Clinic Admin — 888clinic" },
      {
        name: "description",
        content: "Enquiry inbox and AI-assisted media library for 888clinic staff.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Clinic Admin — 888clinic" },
      { property: "og:description", content: "Manage enquiries and clinic media." },
    ],
  }),
  component: AdminPage,
});

type Enquiry = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  concern: string | null;
  preferred_date: string | null;
  status: string;
  created_at: string;
};

type MediaItem = {
  id: string;
  kind: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  tags: string[];
  published: boolean;
  show_in_results: boolean;
  results_category: string | null;
  created_at: string;
};

function AdminPage() {
  const { user, isStaff, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl">Access pending</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in as {user.email}, but this account has no staff role yet. An
          administrator needs to grant you access.
        </p>
        <Button variant="outline" className="mt-6 rounded-none" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Clinic console</p>
          <h1 className="mt-3 text-4xl leading-tight">
            Admin <span className="text-gradient-gold">dashboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" className="rounded-none" onClick={() => signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "patients" : "inbox"} className="mt-10">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-none bg-transparent p-0">
          {isAdmin && (
            <TabsTrigger value="patients" className="rounded-none">
              Patients
            </TabsTrigger>
          )}
          <TabsTrigger value="inbox" className="rounded-none">
            Enquiry inbox
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-none">
            Media library
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="video-upload" className="rounded-none">
              Video Upload
            </TabsTrigger>
          )}
          <TabsTrigger value="orders" className="rounded-none">
            Skincare orders
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="access" className="rounded-none">
              Team &amp; access
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="mali" className="rounded-none">
              Dr Mali engine
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="scan-test" className="rounded-none">
              Scan test
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="billing" className="rounded-none">
              Billing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="marketing" className="rounded-none">
              Marketing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="pricing" className="rounded-none">
              Plans &amp; pricing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="backgrounds" className="rounded-none">
              Product backgrounds
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="copy" className="rounded-none">
              Wording &amp; Thai
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="assistant" className="rounded-none">
              AI admin
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="patients" className="mt-8">
            <PatientsTab />
          </TabsContent>
        )}
        <TabsContent value="inbox" className="mt-8">
          <Inbox />
        </TabsContent>
        <TabsContent value="media" className="mt-8">
          <MediaLibrary />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="video-upload" className="mt-8">
            <VideoUploader />
          </TabsContent>
        )}
        <TabsContent value="orders" className="mt-8">
          <OrdersTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="access" className="mt-8">
            <AccessTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="mali" className="mt-8">
            <MaliModelTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="scan-test" className="mt-8">
            <ScanTestTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="billing" className="mt-8">
            <BillingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="marketing" className="mt-8">
            <MarketingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="pricing" className="mt-8">
            <PricingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="backgrounds" className="mt-8">
            <CatalogueDesignPanel />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="copy" className="mt-8">
            <CopyTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="assistant" className="mt-8">
            <AssistantTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Inbox() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("id, full_name, email, phone, concern, preferred_date, status, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load enquiries");
    setRows((data as Enquiry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("enquiries").update({ status }).eq("id", id);
    if (error) {
      toast.error("Update failed");
      return;
    }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-gold" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No enquiries yet.</p>;

  return (
    <div className="space-y-px bg-border">
      {rows.map((row) => (
        <article key={row.id} className="bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg">{row.full_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.email} · {row.phone}
                {row.preferred_date ? ` · prefers ${row.preferred_date}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-border px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                {row.status}
              </span>
              {row.status !== "confirmed" && (
                <Button
                  size="sm"
                  className="rounded-none"
                  onClick={() => setStatus(row.id, "confirmed")}
                >
                  Mark confirmed
                </Button>
              )}
              {row.status !== "archived" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setStatus(row.id, "archived")}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
          {row.concern && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{row.concern}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}

async function captureVideoFrame(source: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(source);
    const video = document.createElement("video");
    let finished = false;

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (value?: string, error?: Error) => {
      if (finished) return;
      finished = true;
      cleanup();

      if (error) reject(error);
      else if (value) resolve(value);
      else reject(new Error("Could not create the video preview."));
    };

    const draw = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          finish(undefined, new Error("The video has no readable frame."));
          return;
        }

        const limit = 960;
        const scale = Math.min(1, limit / video.videoWidth, limit / video.videoHeight);

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          finish(undefined, new Error("Could not create a preview canvas."));
          return;
        }

        const drawingContext: CanvasRenderingContext2D = context;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL("image/jpeg", 0.82);

        if (!frame.startsWith("data:image/jpeg;base64,")) {
          finish(undefined, new Error("Could not encode the video preview."));
          return;
        }

        finish(frame);
      } catch (error) {
        finish(
          undefined,
          error instanceof Error ? error : new Error("Could not capture the video frame."),
        );
      }
    };

    const timeout = window.setTimeout(
      () => finish(undefined, new Error("Video preview timed out.")),
      15_000,
    );

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.addEventListener(
      "error",
      () => finish(undefined, new Error("This video format could not be previewed.")),
      { once: true },
    );

    video.addEventListener(
      "loadedmetadata",
      () => {
        const duration = video.duration;
        const target = Number.isFinite(duration) && duration > 0.4 ? Math.min(1, duration / 2) : 0;

        if (target > 0) {
          video.addEventListener("seeked", draw, { once: true });
          video.currentTime = target;
        } else {
          video.addEventListener("loadeddata", draw, { once: true });
        }
      },
      { once: true },
    );

    video.src = objectUrl;
    video.load();
  });
}

function MediaLibrary() {
  const { user } = useAuth();
  const describe = useServerFn(describeMedia);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [hint, setHint] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [finishedResultFile, setFinishedResultFile] = useState<File | null>(null);
  const [resultCategory, setResultCategory] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("media_items")
      .select(
        "id, kind, storage_path, title, description, alt_text, tags, published, show_in_results, results_category, created_at",
      )
      .order("created_at", { ascending: false });
    const rows = (data as MediaItem[]) ?? [];
    setItems(rows);

    const signed: Record<string, string> = {};
    await Promise.all(
      rows.map(async (row) => {
        const { data: s } = await supabase.storage
          .from("media")
          .createSignedUrl(row.storage_path, 60 * 60);
        if (s?.signedUrl) signed[row.id] = s.signedUrl;
      }),
    );
    setUrls(signed);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadOne(
    file: File,
    index: number,
    total: number,
    options: {
      aiHint?: string;
      resultCategory?: string;
    } = {},
  ) {
    if (!user) return false;
    const label = total > 1 ? ` (${index + 1}/${total})` : "";

    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} is too large`, { description: "Please keep uploads under 50 MB." });
      return false;
    }

    const kind = file.type.startsWith("video") ? "video" : "photo";
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

    try {
      setStep(`Uploading…${label}`);
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      let previewDataUrl: string | undefined;

      if (kind === "video") {
        try {
          setStep(`Preparing video preview…${label}`);
          previewDataUrl = await captureVideoFrame(file);
        } catch (error) {
          console.warn("Could not extract video preview", error);
        }
      }

      setStep(`Writing details with AI…${label}`);
      const ai = await describe({
        data: {
          storagePath: path,
          kind,
          hint: options.aiHint ?? hint,
          previewDataUrl,
        },
      });

      const { error: insErr } = await supabase.from("media_items").insert({
        kind,
        storage_path: path,
        public_url: path,
        created_by: user.id,
        title: ai.ok ? ai.result.title : file.name,
        description: ai.ok ? ai.result.description : null,
        alt_text: ai.ok ? ai.result.alt_text : null,
        tags: ai.ok ? ai.result.tags : [],
        ...(options.resultCategory
          ? {
              published: true,
              show_in_results: true,
              results_category: options.resultCategory,
            }
          : {}),
      });
      if (insErr) throw insErr;

      if (!ai.ok) toast.warning(`Uploaded ${file.name}`, { description: ai.error });
      return true;
    } catch (error) {
      toast.error(`${file.name} failed`, {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !user) return;

    setBusy(true);
    let done = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const ok = await uploadOne(file, i, files.length);
      if (ok) done++;
    }
    setBusy(false);
    setStep("");
    if (done > 0) {
      toast.success(done === 1 ? "Upload complete" : `${done} uploads complete`);
      setHint("");
      await load();
    }
  }

  async function composeBeforeAfter(before: File, after: File): Promise<File> {
    if (!before.type.startsWith("image/") || !after.type.startsWith("image/")) {
      throw new Error("Before and After must both be image files.");
    }

    const [beforeImage, afterImage] = await Promise.all([
      createImageBitmap(before),
      createImageBitmap(after),
    ]);

    try {
      const canvas = document.createElement("canvas");
      const canvasWidth = 2400;
      const canvasHeight = 1600;
      const panelWidth = canvasWidth / 2;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not prepare the Before and After image.");
      }

      // This non-null variable is captured by drawContained below.
      const drawingContext: CanvasRenderingContext2D = context;

      context.fillStyle = "#080808";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      function drawFullBleed(image: ImageBitmap, panelX: number, panelW: number, panelH: number) {
        const scale = Math.max(panelW / image.width, panelH / image.height);

        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const x = panelX + Math.round((panelW - width) / 2);
        const y = Math.round((panelH - height) / 2);

        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.rect(panelX, 0, panelW, panelH);
        drawingContext.clip();
        drawingContext.drawImage(image, x, y, width, height);
        drawingContext.restore();
      }

      drawFullBleed(beforeImage, 0, panelWidth, canvasHeight);
      drawFullBleed(afterImage, panelWidth, panelWidth, canvasHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => {
            if (value) resolve(value);
            else reject(new Error("Could not encode the combined result."));
          },
          "image/jpeg",
          0.98,
        );
      });

      return new File([blob], `before-after-${Date.now()}.jpg`, { type: "image/jpeg" });
    } finally {
      beforeImage.close();
      afterImage.close();
    }
  }

  async function uploadFinishedResult() {
    if (!finishedResultFile || !resultCategory) {
      toast.error("Choose a finished image and treatment category.");
      return;
    }

    setBusy(true);
    try {
      setStep("Uploading original finished result…");
      const ok = await uploadOne(finishedResultFile, 0, 1, {
        aiHint: `Finished Before & After result. Treatment category: ${resultCategory}. Describe only visible facts; do not diagnose, exaggerate, retouch, invent detail, or alter the clinical outcome.`,
        resultCategory,
      });
      if (!ok) return;
      setFinishedResultFile(null);
      setResultCategory("");
      toast.success("Finished Before & After result created and published");
      await load();
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  async function uploadBeforeAfter() {
    if (!user) return;

    if (!beforeFile || !afterFile) {
      toast.error("Choose both a Before photo and an After photo.");
      return;
    }

    if (!resultCategory) {
      toast.error("Choose a treatment category.");
      return;
    }

    setBusy(true);

    try {
      setStep("Creating consistent Before & After image…");
      const combined = await composeBeforeAfter(beforeFile, afterFile);

      const aiHint = [
        "This is one combined patient Before and After result.",
        "The Before photograph is on the left.",
        "The After photograph is on the right.",
        `Treatment category: ${resultCategory}.`,
        "Describe only what is visibly shown.",
        "Do not diagnose, exaggerate, or promise outcomes.",
        hint ? `Clinic context: ${hint}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const ok = await uploadOne(combined, 0, 1, {
        aiHint,
        resultCategory,
      });

      if (!ok) return;

      setBeforeFile(null);
      setAfterFile(null);
      setResultCategory("");
      setHint("");
      toast.success("Before & After result created and published");
      await load();
    } catch (error) {
      toast.error("Could not create the Before & After result", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  async function downloadItem(item: MediaItem) {
    const { data, error } = await supabase.storage.from("media").download(item.storage_path);
    if (error || !data) {
      toast.error(`Could not download ${item.title ?? "file"}`);
      return false;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.storage_path.split("/").pop() ?? "888clinic-media";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  async function downloadAll() {
    if (items.length === 0) return;
    setBusy(true);
    let done = 0;
    for (let i = 0; i < items.length; i++) {
      setStep(`Downloading… (${i + 1}/${items.length})`);
      const it = items[i];
      if (it && (await downloadItem(it))) done++;
      await new Promise((r) => setTimeout(r, 400));
    }
    setBusy(false);
    setStep("");
    toast.success(`${done} file${done === 1 ? "" : "s"} downloaded`);
  }

  async function save(item: MediaItem, patch: Partial<MediaItem>) {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("media_items").update(patch).eq("id", item.id);
    if (error) toast.error("Could not save changes");
  }

  async function regenerate(item: MediaItem) {
    setBusy(true);

    let previewDataUrl: string | undefined;

    const itemUrl = urls[item.id];
    if (item.kind === "video" && itemUrl) {
      try {
        setStep("Preparing video preview…");
        const response = await fetch(itemUrl);
        if (!response.ok) throw new Error("Could not download the video.");
        previewDataUrl = await captureVideoFrame(await response.blob());
      } catch (error) {
        console.warn("Could not extract video preview", error);
      }
    }

    setStep("Rewriting with AI…");
    const ai = await describe({
      data: {
        storagePath: item.storage_path,
        kind: item.kind === "video" ? "video" : "photo",
        hint,
        previewDataUrl,
      },
    });
    setBusy(false);
    setStep("");
    if (!ai.ok) {
      toast.error(ai.error);
      return;
    }
    await save(item, {
      title: ai.result.title,
      description: ai.result.description,
      alt_text: ai.result.alt_text,
      tags: ai.result.tags,
    });
    toast.success("Details refreshed");
  }

  async function remove(item: MediaItem) {
    await supabase.storage.from("media").remove([item.storage_path]);
    const { error } = await supabase.from("media_items").delete().eq("id", item.id);
    if (error) {
      toast.error("Could not delete");
      return;
    }
    setItems((list) => list.filter((i) => i.id !== item.id));
  }

  return (
    <div className="space-y-8">
      <div className="border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Upload photos or videos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select several files at once — the AI writes a title, description, alt text and tags
              for each one. You can edit anything after.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={busy || items.length === 0}
            onClick={downloadAll}
          >
            <Download className="size-4" /> Download all ({items.length})
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hint">Optional context for the AI</Label>
            <Input
              id="hint"
              value={hint}
              maxLength={300}
              placeholder="e.g. laser treatment room, new vitamin C serum"
              onChange={(event) => setHint(event.target.value)}
              className="rounded-none"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? step || "Working…" : "Choose files"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={onUpload}
            />
          </label>
        </div>
      </div>

      <div className="border border-gold/35 bg-card p-6">
        <div>
          <p className="eyebrow">Results media</p>
          <h2 className="mt-2 text-xl">Publish a finished Before &amp; After result</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Recommended: upload the clinic-approved finished image directly. The original file is
            stored without resizing or recompression and published to Results under the selected
            category.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="block text-sm font-medium">Finished Before &amp; After image</span>
            <input
              key={finishedResultFile?.name ?? "finished-empty"}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => setFinishedResultFile(event.target.files?.[0] ?? null)}
              className="block w-full border border-border bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
            {finishedResultFile && (
              <span className="block truncate text-xs text-muted-foreground">
                Original: {finishedResultFile.name}
              </span>
            )}
          </label>
          <Button
            type="button"
            className="rounded-none px-6"
            disabled={busy || !finishedResultFile || !resultCategory}
            onClick={uploadFinishedResult}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? step || "Working…" : "Upload and publish"}
          </Button>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-base">Or compose from separate photos</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The alternative composer creates equal full-bleed panels on a 2400 × 1600 canvas and
            exports JPEG at quality 0.98.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium">Before photo</span>
            <input
              key={beforeFile?.name ?? "before-empty"}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => setBeforeFile(event.target.files?.[0] ?? null)}
              className="block w-full border border-border bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
            {beforeFile && (
              <span className="block truncate text-xs text-muted-foreground">
                Selected: {beforeFile.name}
              </span>
            )}
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium">After photo</span>
            <input
              key={afterFile?.name ?? "after-empty"}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => setAfterFile(event.target.files?.[0] ?? null)}
              className="block w-full border border-border bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
            {afterFile && (
              <span className="block truncate text-xs text-muted-foreground">
                Selected: {afterFile.name}
              </span>
            )}
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="result-category">Treatment category</Label>
            <select
              id="result-category"
              value={resultCategory}
              disabled={busy}
              onChange={(event) => setResultCategory(event.target.value)}
              className="w-full rounded-none border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Choose category</option>
              {RESULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            className="rounded-none px-6"
            disabled={busy || !beforeFile || !afterFile || !resultCategory}
            onClick={uploadBeforeAfter}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? step || "Working…" : "Create and publish result"}
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Use clean original patient photographs with verified consent. Neither path retouches skin,
          invents detail, or alters clinical outcomes.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="border border-border bg-card">
              <div className="aspect-video bg-shell">
                {urls[item.id] &&
                  (item.kind === "video" ? (
                    <video src={urls[item.id]} controls className="size-full object-cover" />
                  ) : (
                    <img
                      src={urls[item.id]}
                      alt={item.alt_text ?? item.title ?? "Clinic media"}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ))}
              </div>
              <div className="space-y-4 p-5">
                <Input
                  value={item.title ?? ""}
                  onChange={(e) =>
                    setItems((l) =>
                      l.map((i) => (i.id === item.id ? { ...i, title: e.target.value } : i)),
                    )
                  }
                  onBlur={(e) => save(item, { title: e.target.value })}
                  className="rounded-none"
                />
                <Textarea
                  rows={3}
                  value={item.description ?? ""}
                  onChange={(e) =>
                    setItems((l) =>
                      l.map((i) => (i.id === item.id ? { ...i, description: e.target.value } : i)),
                    )
                  }
                  onBlur={(e) => save(item, { description: e.target.value })}
                  className="rounded-none"
                />
                <Input
                  value={item.alt_text ?? ""}
                  placeholder="Alt text"
                  onChange={(e) =>
                    setItems((l) =>
                      l.map((i) => (i.id === item.id ? { ...i, alt_text: e.target.value } : i)),
                    )
                  }
                  onBlur={(e) => save(item, { alt_text: e.target.value })}
                  className="rounded-none"
                />
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="space-y-3 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={item.show_in_results}
                      onCheckedChange={(v) =>
                        save(item, {
                          show_in_results: v,
                          published: v ? true : item.published,
                        })
                      }
                    />
                    Show on Before &amp; After results page
                  </label>
                  {item.show_in_results && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Results category</Label>
                      <select
                        value={item.results_category ?? ""}
                        onChange={(e) => save(item, { results_category: e.target.value || null })}
                        className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Uncategorised</option>
                        {RESULT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={item.published}
                      onCheckedChange={(v) => save(item, { published: v })}
                    />
                    Published to gallery
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      disabled={busy}
                      onClick={() => regenerate(item)}
                    >
                      <Sparkles className="size-4" /> Redo AI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => downloadItem(item)}
                    >
                      <Download className="size-4" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-none"
                      onClick={() => remove(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Published media appears on the{" "}
        <Link to="/gallery" className="underline">
          gallery page
        </Link>
        . Items marked &ldquo;Show on Before &amp; After results&rdquo; also appear on the{" "}
        <Link to="/results" className="underline">
          results page
        </Link>
        .
      </p>
    </div>
  );
}
