import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  Upload,
  ScanFace,
  ShieldAlert,
  FileText,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { analyzeSkinScan, getScanAccount, type ScanResult } from "@/lib/skin-ai.functions";
import { getActiveMaliModel } from "@/lib/mali-models.functions";
import { generateScanReport, type ReportScan } from "@/lib/scan-report";
import { DEFAULT_CREDIT_PRICE_ID } from "@/lib/credit-packs";
import { useCatalog } from "@/hooks/useCatalog";
import { findAlternative } from "@/lib/catalog.shared";
import { useLang } from "@/lib/i18n";
import { conditionLabel, severityLabel, urgencyLabel } from "@/lib/public-content";


type ScanRow = ScanResult & { body_area?: string; concern?: string };

export function SkinScanTool() {
  const { t, lang } = useLang();
  const { items: packs } = useCatalog("scan_pack");
  const { user } = useAuth();
  const fetchAccount = useServerFn(getScanAccount);
  const runAnalysis = useServerFn(analyzeSkinScan);
  const fetchModel = useServerFn(getActiveMaliModel);
  const { openCheckout, closeCheckout, checkoutElement } = useStripeCheckout();
  const inputRef = useRef<HTMLInputElement>(null);
  const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` : undefined;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bodyArea, setBodyArea] = useState("");
  const [concern, setConcern] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRow | null>(null);

  const account = useQuery({
    queryKey: ["scan-account"],
    queryFn: () => fetchAccount({}),
  });

  const wallet = account.data?.wallet ?? { free_scans_remaining: 0, credits: 0 };
  const remaining = wallet.free_scans_remaining + wallet.credits;
  const history = (account.data?.scans ?? []) as ScanRow[];

  const patient = {
    name: (user?.user_metadata?.["full_name"] as string | undefined) ?? "",
    email: user?.email ?? "",
  };

  function download(scan: ScanRow) {
    generateScanReport(scan as ReportScan, patient, lang);
  }

  async function onAnalyse() {
    if (!file || !user) return;
    if (remaining <= 0) {
      toast.error(t("sa.err.none"), { description: t("sa.err.noneBody") });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const upload = await supabase.storage.from("scans").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (upload.error) throw upload.error;

      // Run our own MALI lesion model on this device before asking the server
      // to write the report, so the diagnosis comes from the trained model.
      let mali: {
        melanoma: number;
        nevus: number;
        seborrheicKeratosis: number;
        modelVersion: string;
      } | null = null;
      try {
        const active = await fetchModel({});
        if (active.model) {
          setStage(t("sa.stage.lesion"));
          const { classifyLesion } = await import("@/lib/mali-runtime");
          const probs = await classifyLesion(file, active.model.url);
          mali = { ...probs, modelVersion: active.model.version };
        }
      } catch (error) {
        console.error("[mali] on-device inference failed", error);
      }

      setStage(t("sa.stage.report"));
      const response = await runAnalysis({
        data: { storagePath: path, bodyArea, concern, mali, lang },
      });

      if (!response.ok) {
        if ("duplicateFace" in response && response.duplicateFace) {
          toast.error(t("sa.err.dupe"), { description: response.error, duration: 10000 });
        } else if ("needsCredits" in response && response.needsCredits) {
          toast.error(t("sa.err.used"), { description: t("sa.err.usedBody") });
        } else {
          toast.error(response.error);
        }
        return;
      }

      setResult(response.scan as ScanRow);
      toast.success(t("sa.done"), { description: t("sa.doneBody") });
      await account.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("sa.err.fail"));
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div>
      <PaymentTestModeBanner />
      <section className="bg-shell">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-14">
          <div>
            <p className="eyebrow">{t("sa.eyebrow")}</p>
            <h2 className="mt-4 text-3xl leading-tight sm:text-4xl">
              {t("sa.title1")}{" "}
              <span className="text-gradient-gold">{t("sa.title2")}</span>
            </h2>
          </div>
          <div className="border border-border bg-card px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("sa.available")}</p>
            <p className="mt-2 font-display text-4xl text-foreground">{remaining}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("sa.availableSub", { free: wallet.free_scans_remaining, paid: wallet.credits })}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1fr_1fr]">
        {/* Upload */}
        <div>
          <div className="border border-dashed border-gold/60 bg-card p-8 text-center">
            {preview ? (
              <img src={preview} alt={t("sa.previewAlt")} className="mx-auto max-h-64 object-contain" />
            ) : (
              <ImageIcon className="mx-auto size-10 text-gold" />
            )}
            <h2 className="mt-6 text-2xl">{preview ? t("sa.ready") : t("sa.uploadTitle")}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {file?.name ?? t("sa.uploadHint")}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-xs text-muted-foreground">
              {t("sa.consent")}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (!picked) return;
                setFile(picked);
                setPreview(URL.createObjectURL(picked));
              }}
            />
            <Button className="mt-6 rounded-none px-7" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 size-4" /> {preview ? t("sa.change") : t("sa.choose")}
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="area">{t("sa.area")}</Label>
              <Input
                id="area"
                value={bodyArea}
                onChange={(e) => setBodyArea(e.target.value)}
                placeholder={t("sa.area.ph")}
                className="mt-2 rounded-none"
              />
            </div>
            <div>
              <Label htmlFor="concern">{t("sa.concern")}</Label>
              <Textarea
                id="concern"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder={t("sa.concern.ph")}
                className="mt-2 rounded-none"
                rows={3}
              />
            </div>
            <Button
              size="lg"
              className="w-full rounded-none"
              disabled={!file || busy || remaining <= 0}
              onClick={onAnalyse}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> {stage ?? t("sa.analysing")}
                </>
              ) : (
                <>
                  <ScanFace className="mr-2 size-4" /> {t("sa.analyse")}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("sa.usesOne", { n: remaining })}
            </p>
          </div>

          <div className="mt-6 flex gap-3 border border-border bg-secondary/60 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-deep" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("sa.triage")}
            </p>
          </div>

          <div className="mt-4 flex gap-3 border border-gold/30 bg-gold/5 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">
                {t("sa.limit.title")}
              </p>
              <p className="mt-1">
                {t("sa.limit.body")}
              </p>
            </div>
          </div>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="border border-border bg-card p-8">
              <p className="eyebrow">{t("sa.latest")}</p>
               <h2 className="mt-3 text-3xl">{conditionLabel(result.condition, lang)}</h2>
              <p className="mt-3 text-sm text-gold-deep">
                {t("sa.meta", {
                  c: Math.round(result.confidence * 100),
                   s: severityLabel(result.severity, lang),
                   u: urgencyLabel(result.urgency, lang),
                })}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>

              {result.mali ? (
                <div className="mt-6 border border-gold/40 bg-secondary/40 p-5">
                  <p className="text-xs uppercase tracking-widest text-gold-deep">
                    {result.mali.primary
                      ? t("sa.mali.primary")
                      : t("sa.mali.support")}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("sa.mali.melanoma")}</p>
                      <p className="text-lg">{Math.round(result.mali.melanoma * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("sa.mali.nevus")}</p>
                      <p className="text-lg">{Math.round((result.mali.nevus ?? 0) * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("sa.mali.sk")}</p>
                      <p className="text-lg">{Math.round(result.mali.seborrheicKeratosis * 100)}%</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {t("sa.mali.note", { v: result.mali.modelVersion })}
                  </p>
                </div>
              ) : null}

              {result.findings.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground">{t("sa.features")}</h3>
                  <ul className="mt-3 space-y-3">
                    {result.findings.map((f) => (
                      <li key={f.label} className="text-sm">
                        <span className="font-semibold">{f.label}</span>
                        <span className="text-muted-foreground"> — {f.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground">{t("sa.next")}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {result.recommendations.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="rounded-none px-6" onClick={() => download(result)}>
                  <FileText className="mr-2 size-4" /> {t("sa.download")}
                </Button>
                <Button asChild variant="outline" className="rounded-none border-gold/60 px-6">
                  <Link to="/contact">{t("sa.bookReview")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-secondary/40 p-8">
              <Sparkles className="size-6 text-gold" />
              <h2 className="mt-4 text-2xl">{t("sa.empty.title")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("sa.empty.body")}
              </p>
            </div>
          )}

          {/* Credit packs */}
          <div className="mt-8 border border-border bg-card p-8">
            <p className="eyebrow">{t("sa.packs.eyebrow")}</p>
            <h2 className="mt-3 text-2xl">{t("sa.packs.title")}</h2>
            <div className="mt-6 space-y-px bg-border">
              {packs.map((pack) => {
                const alt = pack.available ? null : findAlternative(pack, packs);
                const target = pack.available ? pack : alt;
                return (
                  <div
                    key={pack.id}
                    className={`flex items-center justify-between px-5 py-4 ${pack.available ? "bg-card" : "bg-secondary/40"}`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${pack.available ? "" : "text-muted-foreground"}`}>
                        {t("sa.packs.scans", { n: pack.credits ?? 1 })}
                        {!pack.available && (
                          <span className="ml-2 border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {t("sa.packs.soldout")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pack.available ? (
                          <>
                            {t("sa.packs.price", {
                              price: pack.priceThb.toLocaleString(),
                              each: Math.round(pack.priceThb / (pack.credits ?? 1)),
                            })}
                          </>
                        ) : alt ? (
                          <>
                            {t("sa.packs.alt", {
                              n: alt.credits ?? 1,
                              price: alt.priceThb.toLocaleString(),
                            })}
                          </>
                        ) : (
                          <>{t("sa.packs.none")}</>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none border-gold/60"
                      disabled={!target}
                      onClick={() => {
                        if (!user || !target) return;
                        openCheckout({
                          priceId: target.oncePriceId ?? DEFAULT_CREDIT_PRICE_ID,
                          quantity: 1,
                          userId: user.id,
                          customerEmail: user.email,
                          returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
                        });
                      }}
                    >
                      {pack.available
                        ? t("sa.packs.buy")
                        : alt
                          ? t("sa.packs.buyAlt", { n: alt.credits ?? 1 })
                          : t("sa.packs.unavailable")}
                    </Button>
                  </div>
                );
              })}

            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("sa.orders.q")}{" "}
              <Link to="/orders" className="text-gold-deep underline">
                {t("sa.orders.link")}
              </Link>
              .
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("sa.payNote")}
            </p>
          </div>

          <Dialog open={!!checkoutElement} onOpenChange={(open) => !open && closeCheckout()}>
            <DialogContent className="max-w-3xl p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>{t("sa.checkout")}</DialogTitle>
              </DialogHeader>
              {checkoutElement}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* History */}
      <div className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl">{t("sa.history")}</h2>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("sa.history.empty")}</p>
        ) : (
          <ul className="mt-6 space-y-px border border-border bg-border">
            {history.map((scan) => (
              <li key={scan.id} className="flex flex-wrap items-center justify-between gap-4 bg-card px-5 py-4">
                <div>
                   <p className="text-sm font-semibold">{conditionLabel(scan.condition, lang)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("sa.history.meta", {
                      date: new Date(scan.created_at).toLocaleString(),
                      c: Math.round(scan.confidence * 100),
                    })}
                    {scan.body_area ? ` · ${scan.body_area}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => download(scan)}>
                  <FileText className="mr-2 size-3.5" /> {t("sa.report")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
