import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { TREATMENT_MENU, type MenuGroup, type MenuItem } from "@/lib/treatment-menu";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Treatment Catalogue 2026 — 888clinic Aesthetic & Wellness" },
      {
        name: "description",
        content:
          "The 888clinic treatment catalogue: authentic premium fillers, botox, thread lifts, skin vitamin drips, hair PRP and transplant, Ulthera, IPL hair removal, treatments and meso — every box opened in front of you.",
      },
      { property: "og:title", content: "Treatment Catalogue 2026 — 888clinic" },
      {
        property: "og:description",
        content:
          "Browse the full 888clinic treatment menu — fillers by brand, botox, threads, vitamin drips, hair programs, IPL, lifting and meso.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.888clinic.co/pricing" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.888clinic.co/pricing" }],
  }),
  component: Catalogue,
});

/**
 * Genuine product photography, served from `public/images/fillers`.
 * Keyed by `nameEn` so the catalogue order can change without breaking the map.
 */
const FILLER_IMAGES: Record<string, string> = {
  "Neuramis Deep Cross-Linked": "/images/fillers/01-neuramis-deep-cross-linked.png",
  "Neuramis Deep Lidocaine": "/images/fillers/02-neuramis-deep-lidocaine.png",
  "Neuramis Volume": "/images/fillers/03-neuramis-volume.png",
  "Restylane Skin Booster Vital Light": "/images/fillers/04-restylane-skinboosters-vital-light.png",
  "Restylane Perlane Lyft": "/images/fillers/05-restylane-perlane-lyft.png",
  "Juvederm Volbella": "/images/fillers/06-juvederm-volbella.png",
  "Juvederm Voluma 2": "/images/fillers/07-juvederm-voluma-2.png",
};

const BRANDS = ["Neuramis", "Restylane", "Juvederm"] as const;

function brandOf(item: MenuItem): string {
  const found = BRANDS.find((b) => item.nameEn.toLowerCase().startsWith(b.toLowerCase()));
  return found ?? "Signature";
}

/** Product card showing the genuine pack shot on its square studio canvas. */
function FillerCard({ item, image, th }: { item: MenuItem; image: string; th: boolean }) {
  const desc = th ? item.descTh : item.descEn;
  return (
    <article className="flex flex-col">
      <div className="flex items-center justify-center rounded-full bg-foreground px-6 py-3">
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-background">
          {brandOf(item)}
        </span>
      </div>

      <div className="mt-7 overflow-hidden rounded-[20px] border border-border/60">
        <img
          src={image}
          alt={`${item.nameEn} — authentic packaging`}
          width={1200}
          height={1200}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full bg-[#f4eee6] object-contain"
        />
      </div>

      <div className="mt-5 border-t border-border/70 pt-4">
        <h3 className="text-base leading-snug">{th ? item.nameTh : item.nameEn}</h3>
        {desc && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
    </article>
  );
}

function FillerSection({ group, th }: { group: MenuGroup; th: boolean }) {
  const [brand, setBrand] = useState<"All" | (typeof BRANDS)[number]>("All");

  const items = useMemo(
    () => (brand === "All" ? group.items : group.items.filter((i) => brandOf(i) === brand)),
    [brand, group.items],
  );

  return (
    <section id={group.id} className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-4">
            <span className="text-xs tracking-[0.3em] text-gold-deep">{group.no}</span>
            <span className="h-px w-10 bg-gold/50" />
            <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              {group.titleEn}
            </span>
          </div>
          <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
            {th ? "ฟิลเลอร์แท้ พรีเมียม" : "Floating Volume,"}
            <br />
            <span className="italic text-muted-foreground">
              {th ? "แกะกล่องใหม่ต่อหน้า" : "Blurrless Skin."}
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {th
              ? "คัดสรรฟิลเลอร์แท้พรีเมียมทุกแบรนด์ ทุกกล่องแกะใหม่ต่อหน้าคุณ พร้อมให้คุณหมอเลือกเนื้อฟิลเลอร์ที่เหมาะกับโครงหน้าของคุณค่ะ"
              : "Only authentic premium filler brands, every box opened in front of you, with the doctor matching the right gel to your facial structure."}
          </p>
        </div>

        <div className="lg:text-right">
          <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
            {(["All", ...BRANDS] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`rounded-full px-5 py-2 text-[0.6rem] uppercase tracking-[0.24em] transition-colors ${
                  brand === b
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "All" && th ? "ทั้งหมด" : b}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            {group.items.length} {th ? "รายการ" : "items"} • {th ? "ของแท้ 100%" : "100% authentic"}
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-[28px] border border-border bg-card px-6 py-10 shadow-soft sm:px-10">
        <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const image = FILLER_IMAGES[item.nameEn];
            return image ? (
              <FillerCard key={item.nameEn} item={item} image={image} th={th} />
            ) : null;
          })}
        </div>
        <p className="mt-10 border-t border-border/70 pt-5 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
          {th
            ? "ฟิลเลอร์ของแท้ • แกะกล่องใหม่ต่อหน้า • ฉีดโดยแพทย์เท่านั้น"
            : "Authentic filler • box opened in front of you • doctor-injected only"}
        </p>
      </div>
    </section>
  );
}

function ItemLine({ item, th }: { item: MenuItem; th: boolean }) {
  const desc = th ? item.descTh : item.descEn;
  const bullets = th ? item.bulletsTh : item.bulletsEn;
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[0.95rem]">{th ? item.nameTh : item.nameEn}</h3>
        {item.tag && (
          <span className="border border-gold/40 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-gold-deep">
            {item.tag}
          </span>
        )}
      </div>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
      {bullets && (
        <ul className="mt-2 space-y-1">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ProgramCard({ group, th }: { group: MenuGroup; th: boolean }) {
  const footnote = th ? group.footnoteTh : group.footnoteEn;
  const note = th ? group.noteTh : group.noteEn;

  return (
    <section id={group.id} className="scroll-mt-24 bg-card p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-xs tracking-[0.3em] text-gold-deep">{group.no}</span>
          <span className="h-px w-8 bg-gold/50" />
          <h2 className="text-[0.7rem] uppercase tracking-[0.28em]">{group.titleEn}</h2>
        </div>
        <span className="font-serif text-2xl text-border">{group.no}</span>
      </div>
      <p className="mt-2 text-sm italic text-muted-foreground">{group.titleTh}</p>
      {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}

      {group.compact ? (
        <ul className="mt-5 grid gap-x-10 sm:grid-cols-2">
          {group.items.map((item) => (
            <li
              key={item.nameEn}
              className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2.5 text-sm"
            >
              {th ? item.nameTh : item.nameEn}
              {item.tag && (
                <span className="border border-gold/40 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-gold-deep">
                  {item.tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : group.sections ? (
        <div className="mt-5 grid gap-8 sm:grid-cols-2">
          {group.sections.map((s) => (
            <div key={s.titleEn}>
              <p className="text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                {th ? s.titleTh : s.titleEn}
              </p>
              <ul className="mt-1 divide-y divide-border/60">
                {s.items.map((item) => (
                  <ItemLine key={item.nameEn} item={item} th={th} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {group.items.map((item) => (
            <ItemLine key={item.nameEn} item={item} th={th} />
          ))}
        </ul>
      )}

      {footnote && (
        <p className="mt-5 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          {footnote}
        </p>
      )}
    </section>
  );
}

function Catalogue() {
  const { t, lang } = useLang();
  const th = lang === "th";

  const filler = TREATMENT_MENU.find((g) => g.id === "filler");
  const rest = TREATMENT_MENU.filter((g) => g.id !== "filler");

  return (
    <div>
      {/* Catalogue cover */}
      <section className="border-b border-border bg-shell">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-gold/50" />
            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">
              Est. Bangkok — 2026
            </p>
            <span className="h-px w-12 bg-gold/50" />
          </div>
          <h1 className="mt-8 font-serif text-6xl leading-none tracking-widest text-gradient-gold">
            888
          </h1>
          <p className="mt-2 text-2xl uppercase tracking-[0.4em]">Clinic</p>
          <span className="mx-auto mt-7 block h-px w-20 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="mt-7 text-[0.7rem] uppercase tracking-[0.28em]">
            Aesthetic &amp; Wellness Treatment Catalogue 2026
          </p>
          <p className="mt-3 text-sm italic text-muted-foreground">
            ความงามเหนือระดับ ปลอดภัย ได้มาตรฐาน
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-5 text-[0.6rem] uppercase tracking-[0.22em]">
          <p className="text-muted-foreground">{t("price.vat")}</p>
          <p className="text-gold-deep">{t("price.badge")}</p>
        </div>

        <div className="py-14">
          {filler && <FillerSection group={filler} th={th} />}

          <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-2">
            {rest.map((group) => (
              <ProgramCard key={group.id} group={group} th={th} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border py-12">
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            {t("price.note")}
          </p>
          <Button asChild size="lg" className="rounded-none px-7">
            <Link to="/book">
              {t("home.cta.consult")} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
