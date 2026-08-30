import { createFileRoute } from "@tanstack/react-router";
import { useLang, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — 888clinic" },
      {
        name: "description",
        content:
          "Terms of service for using 888clinic, the AI skin scanner, and the credit pack system.",
      },
      { property: "og:title", content: "Terms of Service — 888clinic" },
      {
        property: "og:description",
        content:
          "Terms of service for using 888clinic, the AI skin scanner, and the credit pack system.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useLang();
  const sections: Array<[TKey, TKey]> = [["terms.s1", "terms.p1"], ["terms.s2", "terms.p2"], ["terms.s3", "terms.p3"], ["terms.s4", "terms.p4"], ["terms.s5", "terms.p5"]];
  return (
    <div className="bg-shell">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">{t("legal.eyebrow")}</p>
        <h1 className="mt-4 text-4xl leading-tight">{t("terms.title")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("legal.updated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {sections.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-semibold text-foreground">{t(heading)}</h2><p className="mt-3">{t(body)}</p></section>)}

          <section>
            <h2 className="text-lg font-semibold text-foreground">{t("terms.s6")}</h2>
            <p className="mt-3">
              {t("terms.p6")} {" "}
              <a href="mailto:care@888clinic.co" className="text-foreground underline hover:text-gold">
                care@888clinic.co
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
