import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  activateMaliModel,
  listMaliModels,
  registerMaliModel,
  type MaliModelRow,
} from "@/lib/mali-models.functions";
import { EnginePanel } from "@/components/admin/EnginePanel";

export function MaliModelTab() {
  const load = useServerFn(listMaliModels);
  const register = useServerFn(registerMaliModel);
  const activate = useServerFn(activateMaliModel);
  const fileRef = useRef<HTMLInputElement>(null);

  const [models, setModels] = useState<MaliModelRow[]>([]);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const result = await load({});
      setModels(result.models);
    } catch {
      toast.error("Could not load model versions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  async function upload() {
    if (!file || !version.trim()) {
      toast.error("Choose a .onnx file and give it a version tag");
      return;
    }
    setBusy(true);
    try {
      const path = `mali/${version.trim().replace(/[^a-zA-Z0-9._-]/g, "-")}-${Date.now()}.onnx`;
      const up = await supabase.storage.from("models").upload(path, file, {
        contentType: "application/octet-stream",
      });
      if (up.error) throw up.error;

      const result = await register({
        data: { storagePath: path, version: version.trim(), notes, activate: true },
      });
      if (!result.ok) throw new Error(result.error);

      toast.success("Model live", { description: "MALI is now reading every new scan." });
      setFile(null);
      setVersion("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const active = models.find((m) => m.is_active) ?? null;

  return (
    <div className="space-y-10">
      <EnginePanel />

      <div className="rounded-3xl border border-border/70 bg-card p-8">
        <p className="eyebrow">Dr Mali engine</p>
        <h2 className="mt-3 text-2xl">Lesion model</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Upload the ONNX export produced by <code>ml/mali/train.py</code>. Once a version is live, every
          new skin scan is read by this model first — the language model only writes the wording of the
          report around its verdict.
        </p>
        <div className="mt-5">
          {active ? (
            <Badge className="gap-2 bg-primary/15 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Live: {active.version}
            </Badge>
          ) : (
            <Badge variant="outline">No model live — reports fall back to the language model</Badge>
          )}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="mali-version">Version tag</Label>
            <Input
              id="mali-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="effb0-run1"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="mali-file">Model file (.onnx)</Label>
            <Input
              id="mali-file"
              ref={fileRef}
              type="file"
              accept=".onnx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mali-notes">Notes (AUC, dataset, threshold)</Label>
            <Textarea
              id="mali-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
        </div>

        <Button onClick={upload} disabled={busy} className="mt-6 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload and make live
        </Button>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card p-8">
        <h3 className="text-lg">Versions</h3>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : models.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          <ul className="mt-5 divide-y divide-border/60">
            {models.map((model) => (
              <li key={model.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">
                    {model.version}{" "}
                    {model.is_active ? <span className="text-xs text-primary">— live</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(model.created_at).toLocaleString()} · {model.notes || "no notes"}
                  </p>
                </div>
                {!model.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const result = await activate({ data: { id: model.id } });
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success(`${model.version} is live`);
                        await refresh();
                      }
                    }}
                  >
                    Make live
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
