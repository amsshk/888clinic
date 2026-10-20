import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type FeaturedItem = {
  id: string;
  kind: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  results_category: string | null;
};

export type ResultsArea = "all" | "face";

type Props = {
  filter: ResultsArea;
  onAvailabilityChange?: (available: boolean) => void;
};

function isFaceResult(category: string | null): boolean {
  return !category?.toLowerCase().includes("body");
}

export function FeaturedResultsMedia({ filter, onAvailabilityChange }: Props) {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(4);

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

            if (signedUrl?.signedUrl) {
              signed[row.id] = signedUrl.signedUrl;
            }
          }),
        );

        if (active) {
          // A published row is usable only when its media URL can be resolved.
          const available = rows.filter((row) => signed[row.id]);
          setItems(available);
          setUrls(signed);
          onAvailabilityChange?.(available.length > 0);
        }
      } catch {
        if (active) {
          setItems([]);
          setUrls({});
          onAvailabilityChange?.(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [onAvailabilityChange]);

  useEffect(() => {
    setVisibleCount(4);
  }, [filter]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((item) => isFaceResult(item.results_category))),
    [filter, items],
  );

  if (items.length === 0) return null;

  if (filtered.length === 0) {
    return (
      <p className="results-empty">
        No {filter} results are currently available. Please check again soon.
      </p>
    );
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section className="results-gallery" aria-label="Patient results">
      <div className="results-grid">
        {visible.map((item) => (
          <figure key={item.id} className="results-card">
            <div className="results-media-frame">
              {urls[item.id] ? (
                item.kind === "video" ? (
                  <video
                    src={urls[item.id]}
                    controls
                    playsInline
                    preload="metadata"
                    className="results-media"
                  />
                ) : (
                  <img
                    src={urls[item.id]}
                    alt={item.alt_text ?? item.title ?? "888clinic result"}
                    loading="lazy"
                    className="results-media"
                  />
                )
              ) : (
                <div className="results-media results-media-loading" />
              )}
            </div>

            <figcaption className="results-card-caption">
              <h2>{item.title ?? "888clinic result"}</h2>
              <p>
                {item.results_category ??
                  (item.kind === "video" ? "Video result" : "Clinic result")}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {filtered.length > 4 && (
        <div className="results-more-wrap">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => (hasMore ? count + 4 : 4))}
            className="results-more-button"
          >
            {hasMore ? "View more results" : "Show fewer results"}
          </button>
        </div>
      )}
    </section>
  );
}
