import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Clinic Gallery — 888clinic Dermatology" },
      {
        name: "description",
        content:
          "Photos and videos from 888clinic: treatment rooms, clinical skincare and the team behind your skin care.",
      },
      { property: "og:title", content: "Clinic Gallery — 888clinic Dermatology" },
      {
        property: "og:description",
        content: "A look inside 888clinic — treatments, skincare and our clinic.",
      },
    ],
  }),
  component: Gallery,
});

type Item = {
  id: string;
  kind: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  tags: string[];
};

function Gallery() {
  const { t } = useLang();
  const [items, setItems] = useState<Item[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("media_items")
        .select("id, kind, storage_path, title, description, alt_text, tags")
        .eq("published", true)
        .order("created_at", { ascending: false });
      const rows = (data as Item[]) ?? [];
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

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("gal.eyebrow")}</p>
          <h1 className="mt-4 text-5xl leading-tight">
            {t("gal.title1")} <span className="text-gradient-gold">{t("gal.title2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("gal.lede")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-16">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("gal.empty")}
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <figure key={item.id} className="border border-border bg-card">
                <div className="aspect-[4/3] bg-shell">
                  {urls[item.id] &&
                    (item.kind === "video" ? (
                      <video src={urls[item.id]} controls className="size-full object-cover" />
                    ) : (
                      <img
                        src={urls[item.id]}
                        alt={item.alt_text ?? item.title ?? "888clinic clinic media"}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ))}
                </div>
                <figcaption className="p-5">
                  <h2 className="text-lg leading-snug">{item.title ?? "888clinic"}</h2>
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
