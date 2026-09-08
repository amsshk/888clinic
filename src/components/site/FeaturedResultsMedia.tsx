import { useEffect, useState } from "react";
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

type Props = {
  filter: string;
  onAvailabilityChange?: (available: boolean) => void;
};

export function FeaturedResultsMedia({ filter, onAvailabilityChange }: Props) {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase
        .from("media_items")
        .select("id, kind, storage_path, title, description, alt_text, results_category")
        .eq("published", true)
        .eq("show_in_results", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      const rows = (data as FeaturedItem[]) ?? [];
      if (!active) return;

      setItems(rows);
      onAvailabilityChange?.(rows.length > 0);

      const signed: Record<string, string> = {};

      await Promise.all(
        rows.map(async (row) => {
          const { data: signedUrl } = await supabase.storage
            .from("media")
            .createSignedUrl(row.storage_path, 60 * 60);

          if (signedUrl?.signedUrl) {
            signed[row.id] = signedUrl.signedUrl;
          }
        }),
      );

      if (active) setUrls(signed);
    })();

    return () => {
      active = false;
    };
  }, [onAvailabilityChange]);

  useEffect(() => {
    setVisibleCount(4);
  }, [filter]);

  const filtered =
    filter === "all" ? items : items.filter((item) => item.results_category === filter);

  if (filtered.length === 0) return null;

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section className="mt-12">
      <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => (
          <figure key={item.id} className="min-w-0 text-center">
            <div className="overflow-hidden rounded-2xl border border-gold/25 bg-[#f7f3ed] p-2 shadow-[0_14px_40px_rgba(73,52,31,0.08)]">
              <div className="aspect-square overflow-hidden rounded-xl bg-white">
                {urls[item.id] ? (
                  item.kind === "video" ? (
                    <video
                      src={urls[item.id]}
                      controls
                      playsInline
                      preload="metadata"
                      className="size-full object-contain"
                    />
                  ) : (
                    <img
                      src={urls[item.id]}
                      alt={item.alt_text ?? item.title ?? "888clinic result"}
                      loading="lazy"
                      className="size-full object-contain"
                    />
                  )
                ) : (
                  <div className="size-full animate-pulse bg-shell" />
                )}
              </div>
            </div>

            <figcaption className="flex min-h-24 flex-col items-center px-3 pt-5">
              <h2 className="line-clamp-2 text-base leading-snug">
                {item.title ?? "888clinic result"}
              </h2>
              <p className="mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-gold">
                {item.results_category ??
                  (item.kind === "video" ? "Video result" : "Clinic result")}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {filtered.length > 4 && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => (hasMore ? count + 4 : 4))}
            className="min-w-64 rounded-full border border-gold px-8 py-3 text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold hover:text-white"
          >
            {hasMore ? "View more results" : "Show fewer results"}
          </button>
        </div>
      )}
    </section>
  );
}
