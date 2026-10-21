import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import uploadedResults from "@/lib/uploaded-results.json";

type FeaturedItem = {
  id: string;
  kind: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  results_category: string | null;
  width?: number;
  height?: number;
};

export type ResultsArea = "all" | "face" | "thread-lift" | "filler";

const PAGE_SIZE = 12;
const uploadedItems: FeaturedItem[] = uploadedResults.map((item) => ({
  id: `uploaded-${item.id}`,
  kind: "photo",
  storage_path: item.url,
  title: item.zone,
  description: item.description,
  alt_text: item.alt,
  results_category: item.category,
  width: item.width,
  height: item.height,
}));
const uploadedUrls = Object.fromEntries(uploadedItems.map((item) => [item.id, item.storage_path]));
const thaiLabels: Record<string, string> = {
  "Face & jawline": "ใบหน้าและกรอบหน้า",
  Lips: "ริมฝีปาก",
  Chin: "คาง",
  "Nasolabial folds": "ร่องแก้ม",
  "Under-eyes": "ใต้ตา",
  "Facelift / Thread Lift": "ยกกระชับ / ร้อยไหม",
  "Dermal Filler": "ฟิลเลอร์",
};

function matchesFilter(category: string | null, filter: ResultsArea) {
  if (filter === "all") return true;
  if (filter === "face") return !category?.toLowerCase().includes("body");
  return filter === "thread-lift"
    ? /thread|lift|ร้อยไหม|ยกกระชับ/i.test(category ?? "")
    : /filler|ฟิลเลอร์/i.test(category ?? "");
}

export function FeaturedResultsMedia({ filter }: { filter: ResultsArea }) {
  const { lang } = useLang();
  const [items, setItems] = useState<FeaturedItem[]>(uploadedItems);
  const [urls, setUrls] = useState<Record<string, string>>(uploadedUrls);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<FeaturedItem | null>(null);
  const label = (text: string) => (lang === "th" ? (thaiLabels[text] ?? text) : text);
  const title = (item: FeaturedItem) => label(item.title ?? "Clinic result");
  const alt = (item: FeaturedItem) =>
    item.id.startsWith("uploaded-") && lang === "th"
      ? `ภาพเปรียบเทียบก่อนและหลัง ${label(item.results_category ?? "")} บริเวณ${title(item)}`
      : (item.alt_text ?? title(item));

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("media_items")
          .select("id, kind, storage_path, title, description, alt_text, results_category")
          .eq("published", true)
          .eq("show_in_results", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        const rows = (data as FeaturedItem[]) ?? [];
        if (!active) return;
        const signed: Record<string, string> = {};
        await Promise.allSettled(
          rows.map(async (row) => {
            const { data: signedUrl } = await supabase.storage
              .from("media")
              .createSignedUrl(row.storage_path, 60 * 60);
            if (signedUrl?.signedUrl) signed[row.id] = signedUrl.signedUrl;
          }),
        );
        if (active) {
          // Uploaded originals are permanent gallery entries, independent of media-service availability.
          setItems([...uploadedItems, ...rows.filter((row) => signed[row.id])]);
          setUrls({ ...uploadedUrls, ...signed });
        }
      } catch {
        // Keep the supplied originals available when the optional media service is unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);
  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item.results_category, filter)),
    [filter, items],
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section
      className="results-gallery"
      aria-label={lang === "th" ? "ภาพผลลัพธ์" : "Treatment results"}
    >
      <p className="results-count" aria-live="polite">
        {lang === "th"
          ? `แสดง ${visible.length} จาก ${filtered.length} ผลลัพธ์`
          : `Showing ${visible.length} of ${filtered.length} results`}
      </p>
      <div className="results-grid">
        {visible.map((item) => (
          <figure key={item.id} className="results-card">
            <div className="results-media-frame">
              {item.kind === "video" ? (
                <video
                  src={urls[item.id]}
                  controls
                  playsInline
                  preload="metadata"
                  className="results-media"
                />
              ) : (
                <button
                  type="button"
                  className="results-image-button"
                  onClick={() => setSelected(item)}
                  aria-label={`${lang === "th" ? "ดูภาพเต็ม" : "View full image"}: ${title(item)}`}
                >
                  <img
                    src={urls[item.id]}
                    alt={alt(item)}
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    decoding="async"
                    className="results-media"
                  />
                </button>
              )}
            </div>
            <figcaption className="results-card-caption">
              <h2>{title(item)}</h2>
              <p>
                {label(
                  item.results_category ??
                    (item.kind === "video" ? "Video result" : "Clinic result"),
                )}
              </p>
              {item.kind !== "video" && (
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="results-image-link"
                >
                  {lang === "th" ? "ดูภาพเต็ม" : "View full image"}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {filtered.length > PAGE_SIZE && (
        <div className="results-more-wrap">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => (hasMore ? count + PAGE_SIZE : PAGE_SIZE))}
            className="results-more-button"
          >
            {lang === "th"
              ? hasMore
                ? "ดูผลลัพธ์เพิ่มเติม"
                : "แสดงน้อยลง"
              : hasMore
                ? "View more results"
                : "Show fewer results"}
          </button>
        </div>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="results-image-dialog">
          <DialogTitle>{selected ? title(selected) : ""}</DialogTitle>
          <DialogDescription>
            {lang === "th" ? "ผลลัพธ์ขึ้นอยู่กับแต่ละบุคคล" : "Individual results vary."}
          </DialogDescription>
          {selected && (
            <img
              src={urls[selected.id]}
              alt={alt(selected)}
              width={selected.width}
              height={selected.height}
              className="results-full-image"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
