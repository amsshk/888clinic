import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getEngineStatus,
  setLanguageModelFallback,
  testAestheticEngine,
} from "@/lib/engine-settings.functions";

type Health = {
  ok: boolean;
  configured: boolean;
  stub?: boolean;
  modelVersion?: string | null;
  lesion?: boolean;
  aestheticStages?: string[];
  refiner?: string | null;
  error?: string;
};

/**
 * Live status of the clinic's own MALI service — the engine that now produces
 * every lesion verdict and every before-and-after render.
 */
export function EnginePanel() {
  const status = useServerFn(getEngineStatus);
  const setFallback = useServerFn(setLanguageModelFallback);
  const runTest = useServerFn(testAestheticEngine);
  const fileRef = useRef<HTMLInputElement>(null);

  const [health, setHealth] = useState<Health | null>(null);
  const [allowFallback, setAllowFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await status({});
      setHealth(result.health as Health);
      setAllowFallback(result.allowFallback);
    } catch {
      toast.error("Could not read engine status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  async function toggleFallback(next: boolean) {
    setAllowFallback(next);
    const result = await setFallback({ data: { allow: next } });
    if (!result.ok) {
      setAllowFallback(!next);
      toast.error(result.error ?? "Could not save that setting");
      return;
    }
    toast.success(
      next
        ? "Scans may fall back to the language model while our engine is down"
        : "Scans now use our own model only",
    );
  }

  async function onTestFile(file: File) {
    setTesting(true);
    setPreview(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.readAsDataURL(file);
      });
      const result = await runTest({ data: { dataUrl, zoneId: "glabella" } });
      if (!result.ok) {
        toast.error(result.error ?? "Engine test failed");
        return;
      }
      setPreview(result.preview.afterImage);
      toast.success(`Engine responded — ${result.preview.stages.join(" + ") || "warp"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Engine test failed");
    } finally {
      setTesting(false);
    }
  }

  const online = health?.ok === true;

  return (
    <section className="border border-border/70 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl">Our own engine</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Lesion verdicts and every before-and-after render come from the clinic's MALI
            service. Reports are still written by the language model — it only puts words
            around what our engine decided.
          </p>
        </div>
        <Button variant="outline" className="rounded-none" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking the service…
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Service
              </span>
              <Badge variant={online ? "default" : "destructive"} className="rounded-none">
                {online ? "Online" : health?.configured ? "Unreachable" : "Not connected"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {online
                ? health?.stub
                  ? "Running in test mode — verdicts are placeholders until a trained model is loaded."
                  : `Lesion model: ${health?.modelVersion ?? "not loaded"}`
                : (health?.error ??
                  "Add MALI_API_URL and MALI_API_KEY, then start the service in ml/mali/serve.")}
            </p>
          </div>

          <div className="border border-border/60 p-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Before &amp; after stages
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              {online
                ? (health?.aestheticStages?.length
                    ? health.aestheticStages.join(" + ")
                    : "none") +
                  (health?.refiner ? ` · finishing pass: ${health.refiner}` : " · geometric only")
                : "Unavailable while the service is down."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-border/60 p-4">
        <div className="max-w-xl">
          <Label htmlFor="fallback" className="text-sm">
            Allow language-model fallback for skin scans
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            This only matters once our own service is connected: if it is connected but
            silent, turning this on keeps scans running (marked as a screening-aid reading
            instead of a MALI verdict). While no service is connected at all, scans and
            before-and-after renders always run on the AI so patients are never turned
            away.
          </p>
        </div>

        <Switch id="fallback" checked={allowFallback} onCheckedChange={toggleFallback} />
      </div>

      <div className="mt-6 border border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Test the before &amp; after engine</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Runs one photo through a 20-unit glabella plan on the live service.
            </p>
          </div>
          <Button
            className="rounded-none"
            disabled={testing}
            onClick={() => fileRef.current?.click()}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {testing ? "Rendering…" : "Choose a photo"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onTestFile(file);
            }}
          />
        </div>
        {preview && (
          <img
            src={preview}
            alt="Engine test render"
            className="mt-4 max-h-72 w-auto border border-border/60"
          />
        )}
      </div>
    </section>
  );
}
