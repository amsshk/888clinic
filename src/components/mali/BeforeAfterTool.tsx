import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Upload, Bot, Loader2, Syringe, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getScanAccount } from "@/lib/skin-ai.functions";
import { predictAestheticResult } from "@/lib/aesthetic-ai.functions";
import {
  FACE_ZONES,
  DOSE_BAND_LABEL,
  doseBand,
  doseLabel,
  typicalRangeLabel,
  zoneSpec,
  zoneTreatments,
  type FaceZone,
  type Treatment,
} from "@/lib/aesthetic-zones";
import {
  DOSE_BAND_LABEL_TH,
  TREATMENT_LABEL_TH,
  doseLabelTh,
  typicalRangeLabelTh,
  zoneText,
} from "@/lib/aesthetic-zones.th";
import { useLang } from "@/lib/i18n";

import { useCatalog } from "@/hooks/useCatalog";


type Notes = {
  expected: string[];
  outcomeRange?: { conservative: string; typical: string; maximal: string };
  timeline: string;
  cautions: string[];
} | null;

export function BeforeAfterTool() {
  const { t, lang } = useLang();
  const { items: packs } = useCatalog("scan_pack");

  const { user } = useAuth();
  const fetchAccount = useServerFn(getScanAccount);
  const predict = useServerFn(predictAestheticResult);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [doses, setDoses] = useState<Record<string, number>>({});
  const [picks, setPicks] = useState<Record<string, Treatment>>({});
  const [mode, setMode] = useState<"all" | "botox" | "filler">("all");

  const [active, setActive] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("balanced");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [after, setAfter] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Notes>(null);
  const [reveal, setReveal] = useState(50);
  const [engine, setEngine] = useState<{ version: string; stages: string[] } | null>(null);

  const account = useQuery({ queryKey: ["scan-account"], queryFn: () => fetchAccount({}) });
  const wallet = account.data?.wallet ?? { free_scans_remaining: 0, credits: 0 };
  const remaining = wallet.free_scans_remaining + wallet.credits;

  /** The product chosen for a zone (its primary one unless the patient switched). */
  const chosen = (zone: FaceZone): Treatment => picks[zone.id] ?? zone.treatment;
  const specOf = (zone: FaceZone) => zoneSpec(zone, chosen(zone));

  /** Patient-facing wording, localised. */
  const textOf = (zone: FaceZone, treatment: Treatment) => zoneText(zone, treatment, lang);
  const tLabel = (treatment: Treatment) =>
    lang === "th" ? TREATMENT_LABEL_TH[treatment] : treatment === "botox" ? "Botox" : "Filler";
  const dose = (treatment: Treatment, value: number) =>
    lang === "th" ? doseLabelTh(treatment, value) : doseLabel({ treatment }, value);
  const bandLabel = (band: keyof typeof DOSE_BAND_LABEL) =>
    lang === "th" ? DOSE_BAND_LABEL_TH[band] : DOSE_BAND_LABEL[band];


  /** Areas shown on the map, filtered by the botox / filler choice. */
  const visibleZones = useMemo(
    () =>
      mode === "all"
        ? FACE_ZONES
        : FACE_ZONES.filter((z) => zoneTreatments(z).includes(mode)),
    [mode],
  );

  const selected = useMemo(
    () => FACE_ZONES.filter((z) => doses[z.id] !== undefined),
    [doses],
  );

  function toggleZone(zone: FaceZone) {
    const treatment: Treatment =
      picks[zone.id] ??
      (mode !== "all" && zoneTreatments(zone).includes(mode) ? mode : zone.treatment);
    setPicks((prev) => ({ ...prev, [zone.id]: treatment }));
    setDoses((prev) => {
      const next = { ...prev };
      if (next[zone.id] !== undefined) {
        delete next[zone.id];
        setActive(null);
      } else {
        next[zone.id] = zoneSpec(zone, treatment).defaultDose;
        setActive(zone.id);
      }
      return next;
    });
  }

  /** Switching product re-bases the dose onto that product's own scale. */
  function setTreatment(zone: FaceZone, treatment: Treatment) {
    setPicks((prev) => ({ ...prev, [zone.id]: treatment }));
    setDoses((prev) =>
      prev[zone.id] === undefined
        ? prev
        : { ...prev, [zone.id]: zoneSpec(zone, treatment).defaultDose },
    );
  }


  function onPick(picked: File | undefined) {
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setAfter(null);
    setAdvice(null);
  }

  async function onPredict() {
    if (!file || !user) {
      toast.error(t("pr.err.photo"));
      return;
    }
    if (!selected.length) {
      toast.error(t("pr.err.zones"));
      return;
    }
    if (remaining <= 0) {
      toast.error(t("pr.err.credits"), { description: t("pr.err.creditsBody") });

      return;
    }
    setBusy(true);
    setAfter(null);
    setAdvice(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/predict-${Date.now()}.${ext}`;
      const upload = await supabase.storage.from("scans").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (upload.error) throw upload.error;

      // Zone mask: only the selected areas may be repainted by the render.
      const { buildZoneMaskDataUrl } = await import("@/lib/aesthetic-mask");
      const mask = await buildZoneMaskDataUrl(
        file,
        selected.map((z) => z.id),
      );

      const response = await predict({
        data: {
          storagePath: path,
          ...(mask ? { maskImage: mask.dataUrl } : {}),
          zones: selected.map((z) => ({
            id: z.id,
            label: z.label,
            treatment: chosen(z),
            dose: doses[z.id] ?? specOf(z).defaultDose,
          })),
          age,
          gender,
          goal,
          notes,
          lang,
        },
      });

      if (!response.ok) {
        if ("duplicateFace" in response && response.duplicateFace) {
          toast.error(t("pr.err.dupe"), { description: response.error, duration: 10000 });
        } else {
          toast.error(
            "needsCredits" in response && response.needsCredits
              ? t("pr.err.needCredits")
              : response.error,
          );
        }
        return;
      }


      // Composite the render back over the original through the same mask, so
      // every pixel outside the treated zones is identical to the photo.
      let afterImage = response.afterImage;
      const zoneMasked = Array.isArray(response.stages)
        ? response.stages.includes("zone-masked-edit")
        : false;
      if (mask && zoneMasked) {
        const { compositeThroughMask } = await import("@/lib/aesthetic-mask");
        const composited = await compositeThroughMask(file, afterImage, mask.dataUrl);
        if (composited) afterImage = composited;
      }

      setAfter(afterImage);
      setAdvice(response.notes as Notes);
      setEngine({
        version: String(response.engineVersion ?? "unknown"),
        stages: Array.isArray(response.stages) ? response.stages : [],
      });

      setReveal(50);
      toast.success(t("pr.ready"), { description: t("pr.ready.body") });
      await account.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pr.err.fail"));

    } finally {
      setBusy(false);
    }
  }

  const activeZone = FACE_ZONES.find((z) => z.id === active) ?? null;

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-14">
          <div>
            <p className="eyebrow">{t("pr.eyebrow")}</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">{t("pr.title")}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t("pr.lede")}
            </p>

          </div>
          <div className="border border-border bg-card px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("pr.credits")}
            </p>
            <p className="mt-1 font-display text-3xl">{remaining}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pr.creditsSub", {
                free: wallet.free_scans_remaining,
                paid: wallet.credits,
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: inputs */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl">{t("pr.s1.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("pr.s1.body")}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center gap-3 border border-dashed border-gold/60 bg-card px-6 py-10 text-sm text-muted-foreground transition-colors hover:bg-accent/40"
            >
              {preview ? (
                <img
                  src={preview}
                  alt={t("pr.photoAlt")}
                  className="max-h-56 object-contain"
                  loading="lazy"
                />
              ) : (
                <>
                  <Upload className="size-4" /> {t("pr.upload")}
                </>
              )}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">{t("pr.consent")}</p>
          </div>


          <div>
            <h2 className="text-2xl">{t("pr.s2.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("pr.s2.body")}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                ["botox", t("pr.botox"), t("pr.botox.body")],
                ["filler", t("pr.filler"), t("pr.filler.body")],
                ["all", t("pr.both"), t("pr.both.body")],

              ] as const).map(([value, label, body]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`border p-4 text-left transition-colors ${
                    mode === value
                      ? "border-gold bg-accent/50"
                      : "border-border hover:bg-accent/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 ${
                        value === "filler" ? "bg-gold" : value === "botox" ? "bg-foreground" : "bg-gradient-to-r from-foreground to-gold"
                      }`}
                    />
                    <span className="text-base">{label}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
                </button>
              ))}
            </div>

            <h3 className="mt-8 text-lg">{t("pr.where")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("pr.where.body")}</p>



            <div className="mt-5 grid gap-6 sm:grid-cols-[260px_1fr]">
              <svg viewBox="0 0 100 110" className="w-full max-w-[260px] select-none">
                <ellipse cx="50" cy="55" rx="32" ry="45" className="fill-secondary stroke-border" strokeWidth="0.6" />
                <path d="M28 30 Q34 26 41 30" className="stroke-border" fill="none" strokeWidth="0.8" />
                <path d="M59 30 Q66 26 72 30" className="stroke-border" fill="none" strokeWidth="0.8" />
                <ellipse cx="35" cy="40" rx="6" ry="3" className="fill-background stroke-border" strokeWidth="0.5" />
                <ellipse cx="65" cy="40" rx="6" ry="3" className="fill-background stroke-border" strokeWidth="0.5" />
                <path d="M50 44 L50 60 Q46 63 50 63" className="stroke-border" fill="none" strokeWidth="0.8" />
                <path d="M42 71 Q50 76 58 71 Q50 68 42 71" className="fill-background stroke-border" strokeWidth="0.5" />
                {visibleZones.map((zone) => {
                  const on = doses[zone.id] !== undefined;
                  const treatment = chosen(zone);
                  return (
                    <ellipse
                      key={zone.id}
                      cx={zone.x}
                      cy={zone.y}
                      rx={on ? zone.rx : 1.6}
                      ry={on ? zone.ry : 1.6}
                      role="button"
                      tabIndex={0}
                      aria-label={`${textOf(zone, treatment).label} — ${tLabel(treatment)}`}
                      onClick={() => toggleZone(zone)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") toggleZone(zone);
                      }}
                      className={`cursor-pointer transition-all ${
                        treatment === "filler" ? "fill-gold" : "fill-foreground"
                      } ${on ? "opacity-60" : "opacity-45 hover:opacity-80"}`}
                    />
                  );
                })}
              </svg>

              <ul className="space-y-1.5 text-sm">
                {visibleZones.map((zone) => {
                  const on = doses[zone.id] !== undefined;
                  const treatment = chosen(zone);
                  const options = zoneTreatments(zone);
                  return (
                    <li key={zone.id} className="flex items-stretch gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleZone(zone)}
                        className={`flex flex-1 items-center gap-2 border px-3 py-1.5 text-left transition-colors ${
                          on
                            ? "border-gold bg-accent/50 text-foreground"
                            : "border-border text-muted-foreground hover:bg-accent/30"
                        }`}
                      >
                        <span
                          className={`size-2 shrink-0 ${treatment === "filler" ? "bg-gold" : "bg-foreground"}`}
                        />
                        <span className="flex-1">{textOf(zone, treatment).label}</span>
                        <span className="text-xs text-muted-foreground">
                          {on ? dose(treatment, doses[zone.id] ?? 0) : tLabel(treatment)}
                        </span>
                      </button>
                      {options.length > 1 && (
                        <div className="flex shrink-0">
                          {options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={treatment === option}
                              aria-label={`${textOf(zone, option).label}: ${tLabel(option)}`}
                              onClick={() => setTreatment(zone, option)}
                              className={`border px-2 text-[11px] transition-colors ${
                                treatment === option
                                  ? "border-gold bg-accent/50 text-foreground"
                                  : "border-border text-muted-foreground hover:bg-accent/30"
                              }`}
                            >
                              {lang === "th"
                                ? option === "botox"
                                  ? "โบ"
                                  : "ฟิล"
                                : option === "botox"
                                  ? "Btx"
                                  : "Fill"}
                            </button>

                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

            </div>

            {selected.length > 0 && (
              <div className="mt-6 space-y-5 border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("pr.dose.title")}
                </p>
                {selected.map((zone) => {
                  const spec = specOf(zone);
                  const value = doses[zone.id] ?? spec.defaultDose;
                  const band = doseBand(spec, value);
                  const options = zoneTreatments(zone);
                  const text = textOf(zone, spec.treatment);
                  return (
                    <div key={zone.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{text.label}</span>
                        <span className="text-gold">{dose(spec.treatment, value)}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={spec.treatment === option}
                            onClick={() => setTreatment(zone, option)}
                            disabled={options.length === 1}
                            className={`border px-3 py-1 text-xs transition-colors ${
                              spec.treatment === option
                                ? "border-gold bg-accent/50 text-foreground"
                                : "border-border text-muted-foreground hover:bg-accent/30"
                            } ${options.length === 1 ? "cursor-default" : ""}`}
                          >
                            {tLabel(option)}
                          </button>
                        ))}
                        {options.length === 1 && (
                          <span className="self-center text-xs text-muted-foreground">
                            {t("pr.dose.only", { t: tLabel(options[0]!) })}
                          </span>
                        )}
                      </div>

                      <input
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={spec.step}
                        value={value}
                        onChange={(e) =>
                          setDoses((prev) => ({ ...prev, [zone.id]: Number(e.target.value) }))
                        }
                        aria-label={t("pr.dose.for", { zone: text.label })}
                        className="mt-2 w-full accent-[var(--gold,#a67c30)]"
                      />
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs">
                        <p className="text-muted-foreground">{text.effect}</p>
                        <p className="text-muted-foreground">
                          {t("pr.dose.usual", {
                            range:
                              lang === "th"
                                ? typicalRangeLabelTh(spec.treatment, spec.typical)
                                : typicalRangeLabel(spec),
                          })}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{text.cannot}</p>

                      <p
                        className={
                          band === "above-typical"
                            ? "mt-1 text-xs text-gold"
                            : "mt-1 text-xs text-muted-foreground"
                        }
                      >
                        {bandLabel(band)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            {activeZone && !selected.length && (
              <p className="mt-3 text-xs text-muted-foreground">
                {textOf(activeZone, chosen(activeZone)).effect}
              </p>
            )}

          </div>


          <div>
            <h2 className="text-2xl">{t("pr.s3.title")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="age">{t("pr.age")}</Label>
                <Input
                  id="age"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="34"
                  className="mt-1.5 rounded-none"
                />
              </div>
              <div>
                <Label htmlFor="gender">{t("pr.gender")}</Label>
                <Input
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder={t("pr.gender.ph")}
                  className="mt-1.5 rounded-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>{t("pr.look")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  ["natural", t("pr.look.natural")],
                  ["balanced", t("pr.look.balanced")],
                  ["defined", t("pr.look.defined")],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGoal(value)}
                    className={`border px-4 py-2 text-sm transition-colors ${
                      goal === value
                        ? "border-gold bg-accent/50"
                        : "border-border text-muted-foreground hover:bg-accent/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="notes">{t("pr.notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("pr.notes.ph")}
                className="mt-1.5 rounded-none"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-none"
            disabled={busy}
            onClick={onPredict}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> {t("pr.busy")}
              </>
            ) : (
              <>
                <Syringe className="mr-2 size-4" /> {t("pr.cta")}
              </>
            )}
          </Button>

        </div>

        {/* Right: result */}
        <div className="space-y-6">
          <div className="border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Bot className="size-4 text-gold" />
              <p className="text-sm">{t("pr.preview")}</p>
            </div>

            {after && preview ? (
              <div className="p-5">
                <div className="relative overflow-hidden">
                  <img src={after} alt={t("pr.afterAlt")} className="w-full" />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-gold"
                    style={{ width: `${reveal}%` }}
                  >
                    <img
                      src={preview}
                      alt={t("pr.beforeAlt")}
                      className="h-full w-full object-cover object-left"
                      style={{ width: `${(100 / Math.max(reveal, 1)) * 100}%`, maxWidth: "none" }}
                    />
                  </div>
                  <span className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 text-xs">
                    {t("pr.before")}
                  </span>
                  <span className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 text-xs">
                    {t("pr.after")}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={reveal}
                  aria-label={t("pr.compare")}
                  onChange={(e) => setReveal(Number(e.target.value))}
                  className="mt-4 w-full"
                />
                {engine && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {engine.stages.includes("zone-masked-edit")
                      ? t("pr.engine.masked")
                      : engine.stages.includes("refine")
                        ? t("pr.engine.refine")
                        : t("pr.engine.geom")}{" "}
                    {t("pr.engine.version", { v: engine.version })}
                  </p>
                )}




                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="rounded-none"
                    onClick={() => {
                      setAfter(null);
                      setAdvice(null);
                    }}
                  >
                    <RotateCcw className="mr-2 size-4" /> {t("pr.tryAnother")}
                  </Button>
                  <Button asChild className="rounded-none">
                    <Link to="/book">{t("pr.bookPlan")}</Link>
                  </Button>
                </div>
              </div>
            ) : busy ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center gap-4 px-5 py-16 text-center"
              >
                <div className="relative">
                  <span className="absolute inset-0 animate-ping rounded-full border border-gold/40" />
                  <span className="flex size-16 items-center justify-center rounded-full border border-gold/50 bg-gold/5">
                    <Loader2 className="size-7 animate-spin text-gold" />
                  </span>
                </div>
                <div>
                  <p className="text-sm">{t("pr.wait.title")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("pr.wait.body")}</p>
                </div>
                {preview && (
                  <div className="relative mt-2 w-full max-w-xs overflow-hidden">
                    <img src={preview} alt={t("pr.analysingAlt")} className="w-full opacity-60" />
                    <div className="pointer-events-none absolute inset-x-0 h-1/3 animate-[pulse_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                {t("pr.empty")}
              </div>
            )}
          </div>

          {advice && (
            <div className="space-y-5 border border-border bg-card p-5 text-sm">
              {advice.expected.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("pr.expect")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {advice.expected.map((line) => (
                      <li key={line} className="flex gap-2 text-muted-foreground">
                        <span className="text-gold">·</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {advice.outcomeRange &&
                (advice.outcomeRange.conservative ||
                  advice.outcomeRange.typical ||
                  advice.outcomeRange.maximal) && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {t("pr.range")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{t("pr.range.body")}</p>
                    <dl className="mt-3 space-y-2">
                      {(
                        [
                          [t("pr.range.light"), advice.outcomeRange.conservative],
                          [t("pr.range.likely"), advice.outcomeRange.typical],
                          [t("pr.range.best"), advice.outcomeRange.maximal],
                        ] as const
                      )
                        .filter(([, value]) => Boolean(value))
                        .map(([label, value]) => (
                          <div key={label} className="border-l-2 border-gold/40 pl-3">
                            <dt className="text-xs uppercase tracking-wide text-gold">{label}</dt>
                            <dd className="text-muted-foreground">{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}
              {advice.timeline && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("pr.timeline")}
                  </p>
                  <p className="mt-2 text-muted-foreground">{advice.timeline}</p>
                </div>
              )}
              {advice.cautions.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("pr.cautions")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {advice.cautions.map((line) => (
                      <li key={line} className="flex gap-2 text-muted-foreground">
                        <span className="text-gold">·</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {remaining <= 0 && (
            <div className="border border-gold/50 bg-accent/40 p-5">
              <p className="text-sm">{t("pr.out")}</p>
              {packs
                .filter((pack) => pack.available)
                .map((pack) => (
                  <p key={pack.id} className="mt-2 text-sm text-muted-foreground">
                    {t("pr.out.pack", {
                      n: pack.credits ?? 1,
                      price: pack.priceThb.toLocaleString(),
                    })}
                  </p>
                ))}
              {packs.every((pack) => !pack.available) && (
                <p className="mt-2 text-sm text-muted-foreground">{t("pr.out.unavailable")}</p>
              )}

              <Button asChild className="mt-4 rounded-none">
                <Link to="/contact">{t("pr.out.ask")}</Link>
              </Button>
            </div>
          )}

          <div className="flex gap-3 border border-border bg-secondary/50 p-5 text-xs leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>{t("pr.disclaimer")}</p>
          </div>

        </div>
      </section>
    </div>
  );
}
