import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock, MessageCircle, Facebook, Music2 } from "lucide-react";
import { ClinicLogo } from "@/components/site/ClinicLogo";
import { CLINIC } from "@/lib/clinic";
import { useLang } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <ClinicLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={CLINIC.socials.line}
              target="_blank"
              rel="noreferrer"
              aria-label="LINE"
              className="border border-border p-2 text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={CLINIC.socials.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="border border-border p-2 text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
            >
              <Facebook className="size-4" />
            </a>
            <a
              href={CLINIC.socials.tiktok}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="border border-border p-2 text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
            >
              <Music2 className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-wide">{t("footer.explore")}</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/services" className="hover:text-foreground">
                {t("nav.treatments")}
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                {t("nav.pricing")}
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-foreground">
                {t("nav.skincare")}
              </Link>
            </li>
            <li>
              <Link to="/ai-skin-analysis" className="hover:text-foreground">
                {t("nav.ai")}
              </Link>
            </li>
            <li>
              <Link to="/mali" search={{ tool: "before-after" as const }} className="hover:text-foreground">
                {t("nav.predict")}
              </Link>
            </li>
            <li>
              <Link to="/results" className="hover:text-foreground">
                {t("nav.results")}
              </Link>
            </li>
            <li>
              <Link to="/book" className="hover:text-foreground">
                {t("nav.book")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                {t("cta.book")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-wide">{t("footer.clinic")}</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {CLINIC.branches.map((branch) => (
              <li key={branch.id} className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    {branch.name} — {branch.address}
                  </a>
                  <a href={branch.phoneHref} className="mt-1 flex items-center gap-2 hover:text-foreground">
                    <Phone className="size-3.5 shrink-0 text-gold" />
                    {branch.phone}
                  </a>
                </span>
              </li>
            ))}

            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
              <a href={`mailto:${CLINIC.email}`} className="hover:text-foreground">
                {CLINIC.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-wide">{t("footer.hours")}</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>
                {t("hours.week")}
                <br />
                {t("hours.sun")}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-5 py-5">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {t("footer.legal")}
            <span className="mx-2 text-border">|</span>
            Powered by{" "}
            <a
              href="https://ezdevsoft.net"
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:text-foreground"
            >
              ezdevsoft.net
            </a>
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
