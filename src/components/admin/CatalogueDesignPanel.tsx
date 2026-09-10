import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CATALOGUE_PRESETS, type CataloguePreset } from "@/lib/catalogue-design.shared";
import { saveCatalogueDesign } from "@/lib/catalogue-design.functions";

const labels: Record<CataloguePreset, string> = {
  "charcoal-gold": "Charcoal & gold",
  "cream-studio": "Cream studio",
  "pearl-white": "Pearl white",
  "midnight-gold": "Midnight & gold",
};

export function CatalogueDesignPanel() {
  const save = useServerFn(saveCatalogueDesign);
  const [preset, setPreset] = useState<CataloguePreset>("charcoal-gold");
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    try {
      const result = await save({ data: { preset } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Catalogue design saved");
    } catch {
      toast.error("Could not save the catalogue design");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-gold/35 bg-card p-6">
      <div>
        <p className="eyebrow">Product card style</p>
        <h3 className="mt-2 text-xl">Choose a filler-card colour style</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This changes the card frame (background, border and text colour) around each filler
          product on the public catalogue — it does not edit or replace the product photographs, and
          it never touches the Results page or clinical photos. Only administrators can save this
          setting.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {CATALOGUE_PRESETS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPreset(option)}
            className={`flex items-center justify-between border p-4 text-left transition-colors ${
              preset === option ? "border-gold bg-accent" : "border-border hover:border-gold/60"
            }`}
            aria-pressed={preset === option}
          >
            <span>{labels[option]}</span>
            {preset === option && <Check className="size-4 text-gold-deep" />}
          </button>
        ))}
      </div>
      <Button type="button" className="mt-5 rounded-none" onClick={onSave} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save preset
      </Button>
    </section>
  );
}
