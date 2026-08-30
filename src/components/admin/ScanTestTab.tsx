import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FlaskConical, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { runScanTest, type ScanTestResult } from "@/lib/scan-test.functions";
import { getActiveMaliModel } from "@/lib/mali-models.functions";
import { generateScanReport, type ReportScan } from "@/lib/scan-report";

type Engine = { source: "mali" | "language-model"; modelVersion: string | null; maliPrimary: boolean };

export function ScanTestTab() {
  const { user } = useAuth();
  const test = useServerFn(runScanTest);
  const fetchModel = useServerFn(getActiveMaliModel);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bodyArea, setBodyArea] = useState("");
  const [concern, setConcern] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanTestResult | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  async function run() {
    if (!file || !user) return;
    setBusy(true);
    setResult(null);
    setEngine(null);
    try {
      setStage("Uploading photo…");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/test-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("scans").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (up.error) throw up.error;

      let mali: {
        melanoma: number;
        nevus: number;
        seborrheicKeratosis: number;
        modelVersion: string;
      } | null = null;
      try {
        const active = await fetchModel({});
        if (active.model) {
          setStage("Dr Mali is reading the lesion…");
          const { classifyLesion } = await import("@/lib/mali-runtime");
          const probs = await classifyLesion(file, active.model.url);
          mali = { ...probs, modelVersion: active.model.version };
        }
      } catch (error) {
        console.error("[scan-test] on-device inference failed", error);
      }

      setStage("Writing the report…");
      const response = await test({ data: { storagePath: path, bodyArea, concern, mali } });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.scan);
      setEngine(response.engine);
      toast.success("Test scan complete", { description: "No credit was used. Download the PDF to check it." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test scan failed");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-border/70 bg-card p-8">
        <p className="eyebrow">Scan test mode</p>
        <h2 className="mt-3 text-2xl">Run a photo through the live pipeline</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          This runs the exact MALI-first pipeline a patient gets — the live lesion model reads the photo,
          the language model only writes the wording — then lets you download the PDF. No scan credit is
          used, no face signature is stored and nothing is saved to the patient's scan history.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="rounded-2xl border border-dashed border-primary/50 bg-secondary/30 p-6 text-center">
              {preview ? (
                <img src={preview} alt="Test photo preview" className="mx-auto max-h-56 object-contain" />
              ) : (
                <FlaskConical className="mx-auto h-9 w-9 text-primary" />
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {file?.name ?? "JPG or PNG close-up of a lesion, under 8MB."}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (!picked) return;
                  setFile(picked);
                  setPreview(URL.createObjectURL(picked));
                }}
              />
              <Button variant="outline" className="mt-5 gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> {preview ? "Change photo" : "Choose photo"}
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="test-area">Body area</Label>
                <Input
                  id="test-area"
                  value={bodyArea}
                  onChange={(event) => setBodyArea(event.target.value)}
                  placeholder="e.g. left cheek, upper back"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="test-concern">Reported concern</Label>
                <Textarea
                  id="test-concern"
                  value={concern}
                  onChange={(event) => setConcern(event.target.value)}
                  rows={3}
                  placeholder="Darkening over 3 months…"
                  className="mt-2"
                />
              </div>
              <Button onClick={run} disabled={!file || busy} className="w-full gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {busy ? (stage ?? "Running…") : "Run test scan"}
              </Button>
            </div>
          </div>

          <div>
            {result ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {engine?.source === "mali" ? (
                    <Badge className="bg-primary/15 text-primary">
                      MALI {engine.modelVersion} {engine.maliPrimary ? "· primary reader" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline">No live MALI model — language model only</Badge>
                  )}
                </div>
                <h3 className="mt-4 text-xl">{result.condition}</h3>
                <p className="mt-2 text-sm text-primary">
                  Confidence {Math.round(result.confidence * 100)}% · Severity {result.severity} · Follow-up{" "}
                  {result.urgency}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

                {result.mali ? (
                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Melanoma</p>
                      <p>{Math.round(result.mali.melanoma * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Naevus</p>
                      <p>{Math.round(result.mali.nevus * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Seb. keratosis</p>
                      <p>{Math.round(result.mali.seborrheicKeratosis * 100)}%</p>
                    </div>
                  </div>
                ) : null}

                {result.findings.length > 0 ? (
                  <ul className="mt-5 space-y-2 text-sm">
                    {result.findings.map((f) => (
                      <li key={f.label}>
                        <span className="font-medium">{f.label}</span>
                        <span className="text-muted-foreground"> — {f.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {result.recommendations.length > 0 ? (
                  <ul className="mt-5 space-y-1 text-sm text-muted-foreground">
                    {result.recommendations.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                ) : null}

                <Button
                  className="mt-6 gap-2"
                  onClick={() =>
                    generateScanReport(result as unknown as ReportScan, {
                      name: "Test patient",
                      email: user?.email ?? "",
                    })
                  }
                >
                  <FileText className="h-4 w-4" /> Download PDF report
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-6 text-sm text-muted-foreground">
                Upload a photo and run a test scan. The verdict, the model version that produced it and the
                downloadable PDF all appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
