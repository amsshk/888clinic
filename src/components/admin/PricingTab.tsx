import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatThb } from "@/lib/skincare-catalog";
import { getStripeEnvironment } from "@/lib/stripe";
import type { CatalogItem, CatalogKind } from "@/lib/catalog.shared";
import {
  deleteCatalogItem,
  listCatalogAdmin,
  saveCatalogItem,
  setCatalogAvailability,
} from "@/lib/catalog-admin.functions";

type Draft = {
  id: string;
  kind: CatalogKind;
  name: string;
  category: string;
  size: string;
  note: string;
  actives: string;
  priceThb: string;
  refillThb: string;
  credits: string;
  oncePriceId: string;
  refillPriceId: string;
  available: boolean;
  sortOrder: string;
  isNew: boolean;
};

const emptyDraft = (kind: CatalogKind): Draft => ({
  id: "",
  kind,
  name: "",
  category: kind === "skincare" ? "Treat" : "",
  size: "",
  note: "",
  actives: "",
  priceThb: "",
  refillThb: "",
  credits: kind === "scan_pack" ? "3" : "",
  oncePriceId: "",
  refillPriceId: "",
  available: true,
  sortOrder: "100",
  isNew: true,
});

const toDraft = (item: CatalogItem): Draft => ({
  id: item.id,
  kind: item.kind,
  name: item.name,
  category: item.category ?? "",
  size: item.size ?? "",
  note: item.note ?? "",
  actives: item.actives.join(", "),
  priceThb: String(item.priceThb),
  refillThb: item.refillThb == null ? "" : String(item.refillThb),
  credits: item.credits == null ? "" : String(item.credits),
  oncePriceId: item.oncePriceId ?? "",
  refillPriceId: item.refillPriceId ?? "",
  available: item.available,
  sortOrder: String(item.sortOrder),
  isNew: false,
});

export function PricingTab() {
  const load = useServerFn(listCatalogAdmin);
  const save = useServerFn(saveCatalogItem);
  const toggle = useServerFn(setCatalogAvailability);
  const remove = useServerFn(deleteCatalogItem);

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncStripe, setSyncStripe] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await load();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems(result.items);
    } catch {
      toast.error("Could not load the price list");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onSave() {
    if (!draft) return;
    const price = Number(draft.priceThb);
    if (!draft.id.trim() || !draft.name.trim() || !Number.isFinite(price)) {
      toast.error("An internal ID, a name and a price are required");
      return;
    }
    setBusy(true);
    try {
      const result = await save({
        data: {
          id: draft.id.trim().toLowerCase(),
          kind: draft.kind,
          name: draft.name.trim(),
          category: draft.category.trim() || null,
          size: draft.size.trim() || null,
          note: draft.note.trim() || null,
          actives: draft.actives
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          priceThb: Math.round(price),
          refillThb: draft.refillThb.trim() === "" ? null : Math.round(Number(draft.refillThb)),
          credits: draft.kind === "scan_pack" ? Math.max(1, Math.round(Number(draft.credits) || 1)) : null,
          oncePriceId: draft.oncePriceId.trim() || null,
          refillPriceId: draft.refillPriceId.trim() || null,
          available: draft.available,
          sortOrder: Math.round(Number(draft.sortOrder) || 100),
          syncStripe,
          environment: getStripeEnvironment(),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems(result.items);
      setDraft(null);
      if (result.stripeNote) {
        toast.warning("Saved, but checkout prices need attention", { description: result.stripeNote });
      } else {
        toast.success("Saved", {
          description: syncStripe ? "Website and checkout prices updated." : "Website price updated.",
        });
      }
    } catch {
      toast.error("Could not save this item");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(item: CatalogItem) {
    const result = await toggle({ data: { id: item.id, available: !item.available } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setItems(result.items);
    toast.success(item.available ? `${item.name} hidden from the shop` : `${item.name} is live`);
  }

  async function onDelete(item: CatalogItem) {
    if (!window.confirm(`Remove ${item.name} from the price list?`)) return;
    const result = await remove({ data: { id: item.id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setItems(result.items);
    toast.success("Removed");
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  const packs = items.filter((i) => i.kind === "scan_pack");
  const skincare = items.filter((i) => i.kind === "skincare");

  const section = (title: string, kind: CatalogKind, rows: CatalogItem[], hint: string) => (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-none"
          onClick={() => setDraft(emptyDraft(kind))}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <div className="mt-4 divide-y divide-border border border-border">
        {rows.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-4 bg-card p-4">
            <div className="min-w-[12rem] flex-1">
              <p className="flex items-center gap-2">
                {item.name}
                {!item.available && (
                  <Badge variant="outline" className="rounded-none text-[0.6rem] uppercase tracking-[0.14em]">
                    Hidden
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {[item.category, item.size, item.credits ? `${item.credits} scans` : null]
                  .filter(Boolean)
                  .join(" · ") || item.id}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl">{formatThb(item.priceThb)}</p>
              {item.refillThb != null && (
                <p className="text-xs text-muted-foreground">refill {formatThb(item.refillThb)}/mo</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={item.available} onCheckedChange={() => onToggle(item)} aria-label="Available" />
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setDraft(toDraft(item))}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="rounded-none" onClick={() => onDelete(item)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="bg-card p-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl">Plans &amp; pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change prices, credits per pack, and what patients can see — no code, no redeploy. Saving also updates the
          matching {getStripeEnvironment() === "live" ? "live" : "test"} checkout price.
        </p>
      </div>

      {draft && (
        <div className="border border-gold/50 bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg">
              {draft.isNew ? "New" : "Edit"} {draft.kind === "scan_pack" ? "scan pack" : "skincare product"}
            </h3>
            <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name shown to patients</Label>
              <Input
                id="c-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-id">Internal ID</Label>
              <Input
                id="c-id"
                value={draft.id}
                disabled={!draft.isNew}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-price">Price (฿)</Label>
              <Input
                id="c-price"
                inputMode="numeric"
                value={draft.priceThb}
                onChange={(e) => setDraft({ ...draft, priceThb: e.target.value })}
                className="rounded-none"
              />
            </div>
            {draft.kind === "scan_pack" ? (
              <div className="space-y-2">
                <Label htmlFor="c-credits">Scans included</Label>
                <Input
                  id="c-credits"
                  inputMode="numeric"
                  value={draft.credits}
                  onChange={(e) => setDraft({ ...draft, credits: e.target.value })}
                  className="rounded-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="c-refill">Monthly refill price (฿)</Label>
                <Input
                  id="c-refill"
                  inputMode="numeric"
                  value={draft.refillThb}
                  onChange={(e) => setDraft({ ...draft, refillThb: e.target.value })}
                  className="rounded-none"
                />
              </div>
            )}
            {draft.kind === "skincare" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="c-cat">Category</Label>
                  <Input
                    id="c-cat"
                    value={draft.category}
                    placeholder="Cleanse / Treat / Hydrate / Protect"
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-size">Size</Label>
                  <Input
                    id="c-size"
                    value={draft.size}
                    placeholder="30 ml"
                    onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                    className="rounded-none"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="c-actives">Key ingredients (comma separated)</Label>
                  <Input
                    id="c-actives"
                    value={draft.actives}
                    onChange={(e) => setDraft({ ...draft, actives: e.target.value })}
                    className="rounded-none"
                  />
                </div>
              </>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-note">Description</Label>
              <Textarea
                id="c-note"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="rounded-none"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-once">Checkout price key (one-off)</Label>
              <Input
                id="c-once"
                value={draft.oncePriceId}
                onChange={(e) => setDraft({ ...draft, oncePriceId: e.target.value })}
                className="rounded-none"
              />
            </div>
            {draft.kind === "skincare" && (
              <div className="space-y-2">
                <Label htmlFor="c-refillkey">Checkout price key (refill)</Label>
                <Input
                  id="c-refillkey"
                  value={draft.refillPriceId}
                  onChange={(e) => setDraft({ ...draft, refillPriceId: e.target.value })}
                  className="rounded-none"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="c-sort">Display order</Label>
              <Input
                id="c-sort"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                className="rounded-none"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={draft.available} onCheckedChange={(v) => setDraft({ ...draft, available: v })} />
              Visible to patients
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={syncStripe} onCheckedChange={setSyncStripe} />
              Also update the checkout price
            </label>
            <Button className="rounded-none" onClick={onSave} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </Button>
          </div>
        </div>
      )}

      {section(
        "Scan credit packs",
        "scan_pack",
        packs,
        "What patients pay after their free scan, and how many scans each pack adds.",
      )}
      {section("Skincare range", "skincare", skincare, "Shop prices, refill prices, and what is in stock.")}
    </div>
  );
}
