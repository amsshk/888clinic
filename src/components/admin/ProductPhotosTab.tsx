import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageOff, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listCatalogAdmin } from "@/lib/catalog-admin.functions";
import { FILLER_PRODUCTS } from "@/lib/filler-products.shared";
import type {
  CatalogProductImageRow,
  CatalogProductKind,
} from "@/lib/catalog-product-images.shared";
import { ProductBackgroundEditor } from "@/components/admin/ProductBackgroundEditor";

type Row = {
  productId: string;
  kind: CatalogProductKind;
  label: string;
  /** Falls back to this if no admin-edited photo has been saved yet (fillers only). */
  fallbackImage: string | null;
};

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function ProductPhotosTab() {
  const loadSkincare = useServerFn(listCatalogAdmin);
  const [rows, setRows] = useState<Row[]>([]);
  const [images, setImages] = useState<Record<string, CatalogProductImageRow>>({});
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fillerRows: Row[] = FILLER_PRODUCTS.map((p) => ({
        productId: p.slug,
        kind: "filler",
        label: p.nameEn,
        fallbackImage: p.staticImage,
      }));

      const catalog = await loadSkincare({});
      const skincareRows: Row[] = catalog.ok
        ? catalog.items
            .filter((item) => item.kind === "skincare")
            .map((item) => ({
              productId: item.id,
              kind: "skincare" as const,
              label: item.name,
              fallbackImage: null,
            }))
        : [];

      const all = [...fillerRows, ...skincareRows];
      setRows(all);

      const { data } = await supabase
        .from("catalog_product_images")
        .select("product_id, kind, original_path, final_path, updated_at");
      const byId: Record<string, CatalogProductImageRow> = {};
      for (const row of data ?? []) byId[row.product_id] = row as CatalogProductImageRow;
      setImages(byId);

      const thumbs: Record<string, string> = {};
      await Promise.all(
        all.map(async (row) => {
          const path = byId[row.productId]?.final_path ?? null;
          const url = await signedUrl(path);
          if (url) thumbs[row.productId] = url;
        }),
      );
      setThumbnails(thumbs);
    } catch {
      toast.error("Could not load the product list");
    } finally {
      setLoading(false);
    }
  }, [loadSkincare]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [editorSourceUrl, setEditorSourceUrl] = useState<string | null>(null);

  const openEditor = useCallback(
    async (row: Row) => {
      const existing = images[row.productId] ?? null;
      const path = existing?.original_path ?? existing?.final_path ?? null;
      const url = path ? await signedUrl(path) : row.fallbackImage;
      setEditorSourceUrl(url);
      setEditing(row);
    },
    [images],
  );

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <div>
        <h2 className="text-2xl">Product photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cut a real product photo out of its background and place it on a clean backdrop. This
          replaces only that product&apos;s photograph on the public catalogue — it never touches
          the Results page or clinical photos.
        </p>
      </div>

      <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const thumb = thumbnails[row.productId] ?? row.fallbackImage;
          return (
            <div key={`${row.kind}:${row.productId}`} className="flex flex-col gap-3 bg-card p-4">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-border bg-secondary/40">
                {thumb ? (
                  <img src={thumb} alt={row.label} className="h-full w-full object-contain" />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{row.label}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {row.kind === "filler" ? "Filler catalogue" : "Skincare"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={() => void openEditor(row)}
              >
                <Pencil className="size-4" /> Edit photo
              </Button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="bg-card p-6 text-center text-sm text-muted-foreground">
            No products found yet.
          </p>
        )}
      </div>

      {editing && (
        <ProductBackgroundEditor
          productId={editing.productId}
          kind={editing.kind}
          label={editing.label}
          sourceUrl={editorSourceUrl}
          existing={images[editing.productId] ?? null}
          onSaved={() => {
            void refresh();
          }}
          onClose={() => {
            setEditing(null);
            setEditorSourceUrl(null);
          }}
        />
      )}
    </div>
  );
}
