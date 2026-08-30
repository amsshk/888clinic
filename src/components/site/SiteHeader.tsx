import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicLogo } from "@/components/site/ClinicLogo";
import { BookingDialog } from "@/components/site/BookingDialog";
import { CLINIC } from "@/lib/clinic";
import { AccountMenu } from "@/components/site/AccountMenu";
import { useLang, type TKey } from "@/lib/i18n";

const nav: { to: string; key: TKey }[] = [
  { to: "/services", key: "nav.treatments" },
  { to: "/pricing", key: "nav.pricing" },
  { to: "/products", key: "nav.skincare" },
  { to: "/ai-skin-analysis", key: "nav.ai" },
  { to: "/results", key: "nav.results" },
  
  { to: "/book", key: "nav.book" },
  { to: "/contact", key: "nav.contact" },
];

function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`flex items-center border border-border text-[0.7rem] uppercase tracking-widest ${className ?? ""}`}
    >
      {(["en", "th"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={
            lang === l
              ? "bg-accent px-2.5 py-1 text-foreground"
              : "px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-5">
        <Link to="/" aria-label={CLINIC.name} className="shrink-0">
          <ClinicLogo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LangSwitch />
          <a
            href={CLINIC.phoneHref}
            aria-label={t("cta.call")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Phone className="size-4" />
          </a>
          <AccountMenu />
          <BookingDialog>
            <Button size="sm" className="rounded-none px-5">
              {t("cta.book")}
            </Button>
          </BookingDialog>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LangSwitch />
          <button
            type="button"
            aria-label={t("menu.toggle")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-5 pb-5 lg:hidden">
          <nav className="flex flex-col divide-y divide-border">
            {[{ to: "/", key: "nav.home" as TKey }, ...nav].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-4 [&>*]:w-full">
            <AccountMenu onNavigate={() => setOpen(false)} />
          </div>
          <BookingDialog>
            <Button className="mt-3 w-full rounded-none">
              {t("cta.book")}
            </Button>
          </BookingDialog>
        </div>
      )}
    </header>
  );
}
