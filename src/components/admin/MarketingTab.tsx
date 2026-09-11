import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  Film,
  ImagePlus,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  generateAdCopy,
  generateMarketingVideo,
  getMarketingVideo,
  type AdVariant,
} from "@/lib/marketing-ai.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFreeMarketingVideo, type FreeVideoSeconds } from "@/lib/free-marketing-video";
import promoVideo from "@/assets/videos/888clinic-mali-promo-vertical.mp4.asset.json";
import { AdsLaunchPlanner } from "@/components/admin/AdsLaunchPlanner";

const OBJECTIVES = [
  "Free MALI skin scan sign-ups",
  "Botox & filler consultations",
  "Skincare product sales",
  "Clinic appointment bookings",
  "Before & after prediction tool",
];

const LANGUAGES = [
  { id: "both", label: "EN + TH" },
  { id: "th", label: "Thai only" },
  { id: "en", label: "English only" },
] as const;

/** Directions that reliably produce on-brand clinic footage, so an admin never starts from a blank box. */
const VIDEO_PRESETS = [
  {
    id: "Skin science macro",
    prompt:
      "Extreme close-up macro of healthy Thai skin under soft clinical light, fine natural texture and a subtle gold reflection, the camera drifting slowly across cheek and jawline before easing back to a calm portrait. Premium white and grey clinic surfaces, quiet science-led mood.",
  },
  {
    id: "Clinic reveal",
    prompt:
      "A smooth gliding reveal through 888clinic in Bangkok: gold-lined reception, warm daylight on white and grey surfaces, a dermatologist greeting a Thai patient, ending on the MALI scanner screen. Elegant, unhurried camera movement, editorial quiet-luxury lighting.",
  },
  {
    id: "Gentle treatment",
    prompt:
      "A Thai patient relaxing in a modern treatment chair while a dermatologist performs a gentle, non-graphic skincare treatment. Soft hands, calm breathing, natural skin texture, warm reassuring eye contact, clean clinical light and shallow depth of field.",
  },
] as const;

const REFERENCE_MAX_BYTES = 10 * 1024 * 1024;
const REFERENCE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const FORMAT_SIZES = {
  vertical: { width: 720, height: 1280 },
  square: { width: 1024, height: 1024 },
  landscape: { width: 1280, height: 720 },
} as const;

/**
 * Sora only accepts a first frame that matches the requested video size, so the
 * upload is centre-cropped and resized in the browser. Doing it client-side
 * also keeps a 10 MB camera photo from ever crossing the wire.
 */
async function prepareReferenceImage(
  file: File,
  format: keyof typeof FORMAT_SIZES,
): Promise<string> {
  const { width, height } = FORMAT_SIZES[format];
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("That image could not be read."));
      element.src = bitmapUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not prepare the image.");

    // Centre crop: cover the frame, then trim the overflowing axis.
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/** Admin-only Meta ads copy studio. Never shown to patients or staff-only accounts. */
export function MarketingTab() {
  const run = useServerFn(generateAdCopy);
  const startVideo = useServerFn(generateMarketingVideo);
  const checkVideo = useServerFn(getMarketingVideo);

  const [objective, setObjective] = useState(OBJECTIVES[0]);
  const [offer, setOffer] = useState("");
  const [audience, setAudience] = useState(
    "Women 25-45 in Bangkok interested in skincare and aesthetics",
  );
  const [language, setLanguage] = useState<"en" | "th" | "both">("both");
  const [tone, setTone] = useState("warm luxury clinic");
  const [variants, setVariants] = useState(3);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdVariant[]>([]);
  const [videoPrompt, setVideoPrompt] = useState(
    "A Thai patient visits 888clinic, meets Dr MALI for a gentle AI skin scan, then has a warm consultation in the clinic. Smooth premium camera movement and realistic natural skin.",
  );
  const [videoDuration, setVideoDuration] = useState<"4" | "8" | "12">("8");
  const [videoFormat, setVideoFormat] = useState<"vertical" | "square" | "landscape">("vertical");
  const [videoJobId, setVideoJobId] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState("");
  const [referencePreparing, setReferencePreparing] = useState(false);
  const [freeVideoLoading, setFreeVideoLoading] = useState(false);
  const [freeVideoExtension, setFreeVideoExtension] = useState<"mp4" | "webm">("mp4");
  const [isFreeVideo, setIsFreeVideo] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  // Blob URLs from the free renderer are owned by this component, so they are
  // revoked when replaced and when the tab unmounts.
  const freeVideoUrlRef = useRef("");

  useEffect(
    () => () => {
      if (freeVideoUrlRef.current) {
        URL.revokeObjectURL(freeVideoUrlRef.current);
        freeVideoUrlRef.current = "";
      }
    },
    [],
  );

  // The crop depends on the chosen ad format, so re-prepare whenever it changes.
  useEffect(() => {
    if (!referenceFile) return;
    let cancelled = false;
    setReferencePreparing(true);
    void prepareReferenceImage(referenceFile, videoFormat)
      .then((dataUrl) => {
        if (!cancelled) setReferenceImage(dataUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setReferenceFile(null);
        setReferenceImage("");
        toast.error(error instanceof Error ? error.message : "That image could not be prepared.");
      })
      .finally(() => {
        if (!cancelled) setReferencePreparing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [referenceFile, videoFormat]);

  function chooseReference(file: File | undefined) {
    if (!file) return;
    if (!REFERENCE_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > REFERENCE_MAX_BYTES) {
      toast.error("That image is larger than 10 MB. Please choose a smaller file.");
      return;
    }
    setReferenceFile(file);
  }

  function clearReference() {
    setReferenceFile(null);
    setReferenceImage("");
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied — paste it into Meta Ads Manager");
    } catch {
      toast.error("Could not copy that text");
    }
  }

  async function generate() {
    setLoading(true);
    try {
      const result = await run({
        data: {
          objective,
          offer,
          audience,
          language,
          tone,
          placement: "Facebook & Instagram feed",
          variants,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setResults(result.variants);
      toast.success(`${result.variants.length} ad variants ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate ad copy");
    } finally {
      setLoading(false);
    }
  }

  async function refreshVideo(jobId = videoJobId) {
    if (!jobId) return;
    try {
      const result = await checkVideo({ data: { jobId } });
      if (!result.ok) {
        toast.error(result.error);
        setVideoError(result.error);
        setVideoLoading(false);
        return;
      }
      if (result.status === "completed") {
        setGeneratedVideoUrl(result.videoUrl);
        setVideoProgress(100);
        setVideoLoading(false);
        toast.success("Promotional video is ready");
        return;
      }
      setVideoProgress(result.progress);
      window.setTimeout(() => void refreshVideo(jobId), 8_000);
    } catch {
      toast.error("Could not check the video status");
      setVideoError("Could not check the video status.");
      setVideoLoading(false);
    }
  }

  async function createVideo() {
    setVideoLoading(true);
    setVideoProgress(0);
    setIsFreeVideo(false);
    releaseFreeVideoUrl();
    setGeneratedVideoUrl("");
    // A retry starts clean: the previous failure must not linger next to a running job.
    setVideoError("");
    try {
      const result = await startVideo({
        data: {
          objective,
          offer,
          audience,
          prompt: videoPrompt,
          duration: videoDuration,
          format: videoFormat,
          ...(referenceImage ? { referenceImage } : {}),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        setVideoError(result.error);
        setVideoLoading(false);
        return;
      }
      setVideoJobId(result.jobId);
      toast.success("Video generation started — this can take several minutes");
      window.setTimeout(() => void refreshVideo(result.jobId), 8_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start video generation";
      toast.error(message);
      setVideoError(message);
      setVideoLoading(false);
    }
  }

  function releaseFreeVideoUrl() {
    if (freeVideoUrlRef.current) {
      URL.revokeObjectURL(freeVideoUrlRef.current);
      freeVideoUrlRef.current = "";
    }
  }

  /** Free path: renders and records in this browser tab — no API call, no credit. */
  async function createFreeVideo() {
    setFreeVideoLoading(true);
    setVideoError("");
    try {
      const result = await createFreeMarketingVideo({
        ...(referenceImage ? { image: referenceImage } : {}),
        headline: objective,
        offer,
        format: videoFormat,
        seconds: Number(videoDuration) as FreeVideoSeconds,
      });
      releaseFreeVideoUrl();
      const url = URL.createObjectURL(result.blob);
      freeVideoUrlRef.current = url;
      setFreeVideoExtension(result.extension);
      setIsFreeVideo(true);
      setGeneratedVideoUrl(url);
      toast.success("Free motion video ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create the free motion video";
      toast.error(message);
      setVideoError(message);
    } finally {
      setFreeVideoLoading(false);
    }
  }

  const downloadName = isFreeVideo
    ? `888clinic-meta-promo.${freeVideoExtension}`
    : "888clinic-meta-promo.mp4";

  return (
    <div className="space-y-8">
      <AdsLaunchPlanner />
      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-1 size-5 text-gold" />
          <div>
            <h3 className="font-serif text-xl">ezWar campaign studio</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Write Facebook and Instagram ad copy for the clinic in English and local Thai, then
              paste it straight into Ads Manager. Restricted to the configured super admin.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="objective">Campaign objective</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {OBJECTIVES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setObjective(item)}
                  className={`border px-3 py-1.5 text-xs transition ${
                    objective === item
                      ? "border-gold bg-gold/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-gold/60"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <Input
              id="objective"
              className="mt-3 rounded-none"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Or type your own objective"
              maxLength={80}
            />
          </div>

          <div>
            <Label>Ad language</Label>
            <div className="mt-2 flex gap-2">
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLanguage(item.id)}
                  className={`border px-3 py-1.5 text-xs transition ${
                    language === item.id
                      ? "border-gold bg-gold/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-gold/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Label htmlFor="tone" className="mt-4 block">
              Tone
            </Label>
            <Input
              id="tone"
              className="mt-2 rounded-none"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              maxLength={80}
            />
          </div>

          <div>
            <Label htmlFor="offer">Offer or product</Label>
            <Textarea
              id="offer"
              className="mt-2 rounded-none"
              rows={3}
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. 3 AI skin scans for ฿500, or 1 ml chin filler package"
              maxLength={400}
            />
          </div>

          <div>
            <Label htmlFor="audience">Audience</Label>
            <Textarea
              id="audience"
              className="mt-2 rounded-none"
              rows={3}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              maxLength={400}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="variants"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Variants
            </Label>
            <Input
              id="variants"
              type="number"
              min={1}
              max={5}
              className="w-20 rounded-none"
              value={variants}
              onChange={(e) => setVariants(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
            />
          </div>
          <Button className="rounded-none" disabled={loading} onClick={() => void generate()}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            {loading ? "Writing…" : "Generate ad copy"}
          </Button>
        </div>
      </section>

      <section className="border border-border/70 bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Film className="mt-1 size-5 text-gold" />
            <div>
              <h3 className="font-serif text-xl">AI promotional video studio</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Generate a Meta-ready clinic video with your connected OpenAI account. Finished
                videos are saved securely to the clinic media library.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-none">
            <a href="https://adsmanager.facebook.com/" target="_blank" rel="noreferrer">
              Open Meta Ads Manager <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <div>
              <Label htmlFor="video-prompt">Video direction</Label>
              <Textarea
                id="video-prompt"
                value={videoPrompt}
                onChange={(event) => setVideoPrompt(event.target.value)}
                rows={5}
                maxLength={1800}
                className="mt-2 rounded-none"
                placeholder="Describe the people, clinic scene and story you want to show"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Presets
                </span>
                {VIDEO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setVideoPrompt(preset.prompt)}
                    className="border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-gold/60"
                  >
                    {preset.id}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="video-reference">Starting image (optional)</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPEG or WebP up to 10 MB. It is cropped to the selected ad format and used as
                the first frame.
              </p>
              <input
                ref={referenceInputRef}
                id="video-reference"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => chooseReference(event.target.files?.[0])}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => referenceInputRef.current?.click()}
                >
                  {referencePreparing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {referenceImage ? "Replace image" : "Upload image"}
                </Button>
                {referenceImage && (
                  <>
                    <img
                      src={referenceImage}
                      alt="Starting frame preview"
                      className="h-20 w-20 border border-border/70 object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-none"
                      onClick={clearReference}
                    >
                      <X className="size-4" /> Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Ad format</Label>
                <Select
                  value={videoFormat}
                  onValueChange={(value: "vertical" | "square" | "landscape") =>
                    setVideoFormat(value)
                  }
                >
                  <SelectTrigger className="mt-2 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Vertical · Reels & Stories</SelectItem>
                    <SelectItem value="square">Square · Feed</SelectItem>
                    <SelectItem value="landscape">Landscape · Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Select
                  value={videoDuration}
                  onValueChange={(value: "4" | "8" | "12") => setVideoDuration(value)}
                >
                  <SelectTrigger className="mt-2 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 seconds</SelectItem>
                    <SelectItem value="8">8 seconds</SelectItem>
                    <SelectItem value="12">12 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="rounded-none"
                disabled={
                  videoLoading ||
                  freeVideoLoading ||
                  referencePreparing ||
                  videoPrompt.trim().length < 10
                }
                onClick={() => void createVideo()}
              >
                {videoLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {videoLoading ? "Generating video…" : "Generate with OpenAI"}
              </Button>
              <Button
                variant="outline"
                className="rounded-none"
                disabled={freeVideoLoading || videoLoading || referencePreparing}
                onClick={() => void createFreeVideo()}
              >
                {freeVideoLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Video className="size-4" />
                )}
                {freeVideoLoading ? "Recording…" : "Create free motion video"}
              </Button>
              {videoJobId && videoLoading && (
                <Button
                  variant="outline"
                  className="rounded-none"
                  onClick={() => void refreshVideo()}
                >
                  <RefreshCw className="size-4" /> Check now
                </Button>
              )}
              {videoLoading && (
                <span className="text-sm text-muted-foreground">
                  {videoProgress > 0 ? `${videoProgress}% complete` : "Queued securely in OpenAI"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Free motion video runs entirely in your browser—no API key, credit, upload or charge.
              Keep this tab open while it records in real time.
            </p>
            {videoError && (
              <div
                role="alert"
                className="flex items-start gap-2 border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{videoError}</span>
              </div>
            )}
          </div>

          <div className="bg-shell p-3">
            <video
              key={generatedVideoUrl || promoVideo.url}
              src={generatedVideoUrl || promoVideo.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full bg-foreground object-cover"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {isFreeVideo
                  ? "Free browser-made motion video"
                  : generatedVideoUrl
                    ? "New OpenAI video"
                    : "Ready-made MALI promo"}
              </span>
              <Button asChild variant="ghost" size="sm" className="rounded-none">
                <a href={generatedVideoUrl || promoVideo.url} download={downloadName}>
                  <Download className="size-4" /> Download
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {results.map((variant, index) => (
        <section key={index} className="border border-border/70 bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge className="rounded-none">Variant {index + 1}</Badge>
              <span className="text-sm text-muted-foreground">{variant.angle}</span>
            </div>
            <Badge variant="outline" className="rounded-none">
              CTA: {variant.cta}
            </Badge>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {[
              {
                title: "English",
                primary: variant.primaryTextEn,
                headline: variant.headlineEn,
                description: variant.descriptionEn,
              },
              {
                title: "ไทย",
                primary: variant.primaryTextTh,
                headline: variant.headlineTh,
                description: variant.descriptionTh,
              },
            ]
              .filter((block) => block.primary || block.headline)
              .map((block) => (
                <div key={block.title} className="border border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {block.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none"
                      onClick={() =>
                        void copy(
                          `${block.primary}\n\n${block.headline}\n${block.description}`.trim(),
                        )
                      }
                    >
                      <Copy className="mr-2 size-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{block.primary}</p>
                  <p className="mt-3 text-sm font-medium">{block.headline}</p>
                  <p className="text-xs text-muted-foreground">{block.description}</p>
                </div>
              ))}
          </div>

          {variant.creativeIdea && (
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="uppercase tracking-wider">Creative</span> — {variant.creativeIdea}
            </p>
          )}

          {variant.hashtags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {variant.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none"
                onClick={() =>
                  void copy(
                    variant.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" "),
                  )
                }
              >
                <Copy className="mr-2 size-3.5" /> Copy tags
              </Button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
