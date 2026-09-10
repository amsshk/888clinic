import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { Loader2, Redo2, Save, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  BACKGROUND_PRESETS,
  PRODUCT_IMAGE_SIZE,
  type BackgroundPresetId,
  type CatalogProductImageRow,
  type CatalogProductKind,
} from "@/lib/catalog-product-images.shared";

const WORK_MAX = 1100;
const HISTORY_LIMIT = 20;

type BrushMode = "restore" | "erase";
type BackgroundChoice = BackgroundPresetId | "custom-color" | "custom-image";

type Props = {
  productId: string;
  kind: CatalogProductKind;
  label: string;
  sourceUrl: string | null;
  existing: CatalogProductImageRow | null;
  onSaved: () => void;
  onClose: () => void;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image"));
    img.src = url;
  });
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const tile = 16;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const even = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
      ctx.fillStyle = even ? "#e6e6e6" : "#ffffff";
      ctx.fillRect(x, y, tile, tile);
    }
  }
}

/** Fit `img` to cover the full `w`×`h` rect, cropping any overflow (like CSS background-size: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * ratio;
  const dh = img.naturalHeight * ratio;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Client-side product photo editor: an ISNet segmentation model runs entirely
 * in the browser (no photo is ever sent to a third-party image-generation
 * service) to cut the product out, the admin can refine the cutout with a
 * restore/erase brush, then the product is composited over a chosen
 * background and exported as a WebP. Used for filler and skincare product
 * photos only — never for Results-page or clinical photographs.
 */
export function ProductBackgroundEditor({
  productId,
  kind,
  label,
  sourceUrl,
  existing,
  onSaved,
  onClose,
}: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cutoutCanvasRef = useRef<HTMLCanvasElement>(null);
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const autoMaskRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pendingSourceFileRef = useRef<File | null>(null);
  const customBgImageRef = useRef<HTMLImageElement | null>(null);

  const [loading, setLoading] = useState(Boolean(sourceUrl));
  const [ready, setReady] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [mode, setMode] = useState<BrushMode>("restore");
  const [brushSize, setBrushSize] = useState(60);
  const [feather, setFeather] = useState(0.5);
  const [background, setBackground] = useState<BackgroundChoice>("warm-stone");
  const [customColor, setCustomColor] = useState("#cdbda6");
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [shadow, setShadow] = useState(0.4);
  const [brightness, setBrightness] = useState(1);
  const [canUndo, setCanUndo] = useState(false);

  async function runSegmentation(img: HTMLImageElement, pickedFile: File | null) {
    setLoading(true);
    setReady(false);
    try {
      const ratio = Math.min(1, WORK_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));

      const source = sourceCanvasRef.current;
      const mask = maskCanvasRef.current;
      if (!source || !mask) return;
      source.width = w;
      source.height = h;
      const sctx = source.getContext("2d");
      if (!sctx) return;
      sctx.clearRect(0, 0, w, h);
      sctx.drawImage(img, 0, 0, w, h);

      mask.width = w;
      mask.height = h;
      const mctx = mask.getContext("2d");
      if (!mctx) return;

      try {
        // Lazy-loaded: the segmentation model is only fetched once this editor opens.
        const { segmentForeground } = await import("@imgly/background-removal");
        const maskBlob = await segmentForeground(source.toDataURL("image/png"), {
          output: { format: "image/png" },
          device: "cpu",
        });
        const maskImg = await loadImage(URL.createObjectURL(maskBlob));
        mctx.clearRect(0, 0, w, h);
        mctx.drawImage(maskImg, 0, 0, w, h);
        const raw = mctx.getImageData(0, 0, w, h);
        for (let i = 0; i < raw.data.length; i += 4) {
          const a = raw.data[i + 3];
          raw.data[i] = a;
          raw.data[i + 1] = a;
          raw.data[i + 2] = a;
          raw.data[i + 3] = 255;
        }
        mctx.putImageData(raw, 0, 0);
      } catch (segError) {
        console.error("[product-photo] auto segmentation failed", segError);
        toast.warning("Automatic cutout failed — use the restore brush to reveal the product.");
        mctx.fillStyle = "rgba(0,0,0,255)";
        mctx.fillRect(0, 0, w, h);
      }

      autoMaskRef.current = mctx.getImageData(0, 0, w, h);
      historyRef.current = [];
      setCanUndo(false);
      pendingSourceFileRef.current = pickedFile;
      setReady(true);
      repaint();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;
    loadImage(sourceUrl)
      .then((img) => {
        if (!cancelled) void runSegmentation(img, null);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          toast.error("Could not load the current photo. Upload a new one to start.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  function buildMaskedProduct(): HTMLCanvasElement {
    const source = sourceCanvasRef.current!;
    const mask = maskCanvasRef.current!;
    const w = source.width;
    const h = source.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d")!;
    octx.drawImage(source, 0, 0);
    const srcData = octx.getImageData(0, 0, w, h);
    const maskData = mask.getContext("2d")!.getImageData(0, 0, w, h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      srcData.data[i + 3] = maskData.data[i];
    }
    octx.putImageData(srcData, 0, 0);
    return out;
  }

  function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (background === "custom-image" && customBgImageRef.current) {
      drawCover(ctx, customBgImageRef.current, w, h);
    } else {
      const preset = BACKGROUND_PRESETS.find((p) => p.id === background);
      const color = background === "custom-color" ? customColor : (preset?.color ?? "#ffffff");
      const accent = background === "custom-color" ? customColor : (preset?.accent ?? color);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.7);
      grad.addColorStop(0, `${accent}66`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    if (brightness !== 1) {
      ctx.fillStyle =
        brightness > 1
          ? `rgba(255,255,255,${Math.min(0.6, (brightness - 1) * 0.6)})`
          : `rgba(0,0,0,${Math.min(0.6, (1 - brightness) * 0.6)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function repaint() {
    const source = sourceCanvasRef.current;
    const cutout = cutoutCanvasRef.current;
    const final = finalCanvasRef.current;
    if (!source || !cutout || !final || source.width === 0) return;

    const masked = buildMaskedProduct();

    cutout.width = masked.width;
    cutout.height = masked.height;
    const cctx = cutout.getContext("2d")!;
    drawCheckerboard(cctx, cutout.width, cutout.height);
    cctx.drawImage(masked, 0, 0);

    final.width = PRODUCT_IMAGE_SIZE;
    final.height = PRODUCT_IMAGE_SIZE;
    const fctx = final.getContext("2d")!;
    drawBackground(fctx, PRODUCT_IMAGE_SIZE, PRODUCT_IMAGE_SIZE);

    const targetSize = PRODUCT_IMAGE_SIZE * 0.72 * scale;
    const aspect = masked.width / masked.height;
    let drawW = targetSize;
    let drawH = targetSize / aspect;
    if (drawH > targetSize) {
      drawH = targetSize;
      drawW = targetSize * aspect;
    }
    const cx = PRODUCT_IMAGE_SIZE / 2 + offsetX * PRODUCT_IMAGE_SIZE * 0.3;
    const cy = PRODUCT_IMAGE_SIZE / 2 + offsetY * PRODUCT_IMAGE_SIZE * 0.3;

    if (shadow > 0) {
      fctx.save();
      fctx.globalAlpha = Math.min(0.6, shadow * 0.55);
      fctx.fillStyle = "#000000";
      fctx.filter = "blur(24px)";
      fctx.beginPath();
      fctx.ellipse(cx, cy + drawH * 0.42, drawW * 0.36, drawH * 0.09, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.restore();
    }

    fctx.drawImage(masked, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }

  useEffect(() => {
    repaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background, customColor, scale, offsetX, offsetY, shadow, brightness, ready]);

  function canvasPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = cutoutCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pushHistory() {
    const mask = maskCanvasRef.current!;
    const data = mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height);
    historyRef.current.push(data);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    setCanUndo(true);
  }

  function paintAt(x: number, y: number) {
    const mctx = maskCanvasRef.current!.getContext("2d")!;
    const radius = brushSize;
    const grad = mctx.createRadialGradient(x, y, radius * (1 - feather), x, y, radius);
    const restore = mode === "restore";
    grad.addColorStop(0, restore ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)");
    grad.addColorStop(1, restore ? "rgba(255,255,255,0)" : "rgba(0,0,0,0)");
    mctx.globalCompositeOperation = "source-over";
    mctx.fillStyle = grad;
    mctx.beginPath();
    mctx.arc(x, y, radius, 0, Math.PI * 2);
    mctx.fill();
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pushHistory();
    const p = canvasPoint(e);
    lastPointRef.current = p;
    paintAt(p.x, p.y);
    repaint();
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = canvasPoint(e);
    const last = lastPointRef.current ?? p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.floor(dist / Math.max(4, brushSize / 4)));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      paintAt(last.x + (p.x - last.x) * t, last.y + (p.y - last.y) * t);
    }
    lastPointRef.current = p;
    repaint();
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    maskCanvasRef.current!.getContext("2d")!.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    repaint();
  }

  function resetMask() {
    if (!autoMaskRef.current) return;
    pushHistory();
    maskCanvasRef.current!.getContext("2d")!.putImageData(autoMaskRef.current, 0, 0);
    repaint();
  }

  async function pickNewPhoto(file: File) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      await runSegmentation(img, file);
    } catch {
      toast.error("Could not read that photo");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function pickBackgroundImage(file: File) {
    const url = URL.createObjectURL(file);
    try {
      customBgImageRef.current = await loadImage(url);
      setBackground("custom-image");
    } catch {
      toast.error("Could not read that background image");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleSave() {
    if (!ready) return;
    setBusySave(true);
    try {
      const final = finalCanvasRef.current!;
      const finalBlob = await new Promise<Blob>((resolve, reject) => {
        final.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not export the image"))),
          "image/webp",
          0.92,
        );
      });

      const ts = Date.now();
      const finalPath = `catalog-images/${kind}/${productId}/final-${ts}.webp`;
      const upFinal = await supabase.storage.from("media").upload(finalPath, finalBlob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (upFinal.error) throw upFinal.error;

      let originalPath = existing?.original_path ?? null;
      const pending = pendingSourceFileRef.current;
      if (pending) {
        const ext = pending.name.split(".").pop() || "jpg";
        originalPath = `catalog-images/${kind}/${productId}/original-${ts}.${ext}`;
        const upOriginal = await supabase.storage
          .from("media")
          .upload(originalPath, pending, { upsert: true });
        if (upOriginal.error) throw upOriginal.error;
      }

      const { data: userData } = await supabase.auth.getUser();
      const upsert = await supabase.from("catalog_product_images").upsert({
        product_id: productId,
        kind,
        original_path: originalPath,
        final_path: finalPath,
        updated_by: userData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      });
      if (upsert.error) throw upsert.error;

      toast.success("Product photo saved");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this photo");
    } finally {
      setBusySave(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit photo — {label}</DialogTitle>
          <DialogDescription>
            Cuts the product out of its photo and places it on a clean background. Never applied to
            the Results page or clinical photos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Cutout — restore or erase
            </p>
            <div className="relative mt-2 aspect-square w-full overflow-hidden rounded border border-border bg-secondary">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-6 animate-spin text-gold" />
                </div>
              )}
              {!loading && !ready && (
                <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Upload a product photo to start cutting it out.
                </div>
              )}
              <canvas
                ref={cutoutCanvasRef}
                className="h-full w-full touch-none object-contain"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={mode === "restore" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setMode("restore")}
              >
                Restore
              </Button>
              <Button
                size="sm"
                variant={mode === "erase" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setMode("erase")}
              >
                Erase
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="size-4" /> Undo
              </Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={resetMask}>
                <Redo2 className="size-4" /> Reset to auto
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Brush size</Label>
                <Slider
                  value={[brushSize]}
                  min={10}
                  max={160}
                  step={2}
                  onValueChange={([v]) => setBrushSize(v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Edge softness</Label>
                <Slider
                  value={[feather]}
                  min={0}
                  max={0.95}
                  step={0.01}
                  onValueChange={([v]) => setFeather(v)}
                />
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-none"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" /> Upload a different photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void pickNewPhoto(file);
                e.target.value = "";
              }}
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Final catalogue photo
            </p>
            <div className="mt-2 aspect-square w-full overflow-hidden rounded border border-border">
              <canvas ref={finalCanvasRef} className="h-full w-full object-contain" />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {BACKGROUND_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBackground(p.id)}
                  className={`border px-3 py-1.5 text-xs ${
                    background === p.id ? "border-gold bg-accent" : "border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBackground("custom-color")}
                className={`flex items-center gap-2 border px-3 py-1.5 text-xs ${
                  background === "custom-color" ? "border-gold bg-accent" : "border-border"
                }`}
              >
                Custom colour
                <input
                  type="color"
                  value={customColor}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setBackground("custom-color");
                  }}
                  className="size-4 border-0 p-0"
                />
              </button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={() => bgFileInputRef.current?.click()}
              >
                Upload background
              </Button>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void pickBackgroundImage(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Product scale</Label>
                <Slider
                  value={[scale]}
                  min={0.6}
                  max={1.4}
                  step={0.02}
                  onValueChange={([v]) => setScale(v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Shadow strength</Label>
                <Slider
                  value={[shadow]}
                  min={0}
                  max={1}
                  step={0.02}
                  onValueChange={([v]) => setShadow(v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Horizontal position</Label>
                <Slider
                  value={[offsetX]}
                  min={-1}
                  max={1}
                  step={0.02}
                  onValueChange={([v]) => setOffsetX(v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vertical position</Label>
                <Slider
                  value={[offsetY]}
                  min={-1}
                  max={1}
                  step={0.02}
                  onValueChange={([v]) => setOffsetY(v)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Background brightness</Label>
                <Slider
                  value={[brightness]}
                  min={0.7}
                  max={1.3}
                  step={0.02}
                  onValueChange={([v]) => setBrightness(v)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" className="rounded-none" onClick={onClose}>
                Cancel
              </Button>
              <Button className="rounded-none" onClick={handleSave} disabled={!ready || busySave}>
                {busySave ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save photo
              </Button>
            </div>
          </div>
        </div>

        {/* Off-screen working canvases: full-resolution source pixels and the editable mask. */}
        <canvas ref={sourceCanvasRef} className="hidden" />
        <canvas ref={maskCanvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
