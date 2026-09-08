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

/**
 * Photos and videos the clinic team has marked "Show on Before & After
 * results" in the admin media library.
 */
export function FeaturedResultsMedia({ filter }: { filter: string }) {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
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

      const signed: Record<string, string> = {};
      await Promise.all(
        rows.map(async (row) => {
          const { data: s } = await supabase.storage
            .from("media")
            .createSignedUrl(row.storage_path, 60 * 60);
          if (s?.signedUrl) signed[row.id] = s.signedUrl;
        }),
      );
      if (active) setUrls(signed);
    })();
    return () => {
      active = false;
    };
  }, []);

  const shown = filter === "all" ? items : items.filter((i) => i.results_category === filter);

  if (shown.length === 0) return null;

  return (
    <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((item) => (
        <figure key={item.id} className="min-w-0 text-center">
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-shell">
            {urls[item.id] &&
              (item.kind === "video" ? (
                <video
                  src={urls[item.id]}
                  controls
                  playsInline
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src={urls[item.id]}
                  alt={item.alt_text ?? item.title ?? "888clinic result"}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ))}
          </div>
          <figcaption className="px-2 pt-5">
            {item.title && <h2 className="text-base leading-snug">{item.title}</h2>}
            <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-gold">
              {item.results_category ?? (item.kind === "video" ? "Video result" : "Clinic result")}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
