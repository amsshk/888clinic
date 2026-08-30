import { createFileRoute } from "@tanstack/react-router";
import { useLang, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — 888clinic" },
      {
        name: "description",
        content:
          "How 888clinic collects, uses, stores and protects your personal information and skin scan photos.",
      },
      { property: "og:title", content: "Privacy Policy — 888clinic" },
      {
        property: "og:description",
        content:
          "How 888clinic collects, uses, stores and protects your personal information and skin scan photos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useLang();
  const sections: Array<[TKey, TKey]> = [["privacy.s1", "privacy.p1"], ["privacy.s2", "privacy.p2"], ["privacy.s3", "privacy.p3"], ["privacy.s4", "privacy.p4"]];
  return (
    <div className="bg-shell">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">{t("legal.eyebrow")}</p>
        <h1 className="mt-4 text-4xl leading-tight">{t("privacy.title")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("legal.updated")}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {sections.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-semibold text-foreground">{t(heading)}</h2><p className="mt-3">{t(body)}</p></section>)}

          <section>
            <h2 className="text-lg font-semibold text-foreground">{t("privacy.s5")}</h2>
            <p className="mt-3">
              {t("privacy.p5a")} {" "}
              <a href="mailto:care@888clinic.co" className="text-foreground underline hover:text-gold">
                care@888clinic.co
              </a>
              . {t("privacy.p5b")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">{t("privacy.s6")}</h2>
            <p className="mt-3">
              {t("privacy.p6")} {" "}
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
