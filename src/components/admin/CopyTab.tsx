import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Languages, Loader2, RotateCcw, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BASE_COPY, fetchCopyOverrides, type CopyOverrides } from "@/lib/i18n";
import { saveCopyOverride, suggestCopy } from "@/lib/copy-overrides.functions";

type Lang = "en" | "th";

/** Groups match the key prefixes in the dictionary, so a screen can be fixed in one pass. */
const GROUPS: Array<{ id: string; label: string; prefixes: string[] }> = [
  { id: "all", label: "Everything", prefixes: [] },
  { id: "nav", label: "Header & footer", prefixes: ["nav.", "cta.", "footer.", "hours.", "lang.", "account."] },
  { id: "home", label: "Homepage", prefixes: ["home."] },
  { id: "svc", label: "Treatments", prefixes: ["svc.", "services."] },
  { id: "shop", label: "Skincare & checkout", prefixes: ["shop.", "prod.", "checkout.", "order."] },
  { id: "ai", label: "AI scan & preview", prefixes: ["ai.", "scan.", "predict.", "mali."] },
  { id: "book", label: "Booking & contact", prefixes: ["book.", "contact.", "enq."] },
  { id: "auth", label: "Sign in", prefixes: ["auth."] },
  { id: "gal", label: "Results & gallery", prefixes: ["gal.", "res."] },
];

/**
 * Admin-only copy editor: every visible string on the site, editable in English
 * and Thai, with an OpenAI pass that rewrites the Thai into natural local
 * wording. Saved wording is layered over the shipped dictionary at runtime, so
 * a fix goes live without a code change.
 */
export function CopyTab() {
  const save = useServerFn(saveCopyOverride);
  const suggest = useServerFn(suggestCopy);

  const [lang, setLang] = useState<Lang>("th");
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState<CopyOverrides>({ en: {}, th: {} });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCopyOverrides()
      .then(setOverrides)
      .finally(() => setLoading(false));
  }, []);

  const keys = useMemo(() => Object.keys(BASE_COPY.en) as Array<keyof typeof BASE_COPY.en>, []);

  const rows = useMemo(() => {
    const active = GROUPS.find((g) => g.id === group);
    const needle = query.trim().toLowerCase();
    return keys
      .filter((k) => {
        if (active && active.prefixes.length && !active.prefixes.some((p) => String(k).startsWith(p)))
          return false;
        if (!needle) return true;
        const en = BASE_COPY.en[k] ?? "";
        const th = (BASE_COPY.th as Record<string, string>)[k] ?? "";
        return (
          String(k).toLowerCase().includes(needle) ||
          en.toLowerCase().includes(needle) ||
          th.toLowerCase().includes(needle)
        );
      })
      .map((k) => {
        const key = String(k);
        const base = lang === "en" ? BASE_COPY.en[k] : ((BASE_COPY.th as Record<string, string>)[k] ?? "");
        const live = overrides[lang][key] ?? base ?? "";
        return {
          key,
          english: BASE_COPY.en[k] ?? "",
          base: base ?? "",
          live,
          draft: drafts[key] ?? live,
          overridden: Boolean(overrides[lang][key]),
        };
      });
  }, [keys, group, query, lang, overrides, drafts]);

  function setDraft(key: string, value: string) {
    setDrafts((d) => ({ ...d, [key]: value }));
  }

  async function persist(key: string, value: string) {
    setBusy(key);
    try {
      const result = await save({ data: { key, lang, value } });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save");
        return;
      }
      setOverrides((o) => {
        const next = { en: { ...o.en }, th: { ...o.th } };
        if (result.cleared) delete next[lang][key];
        else next[lang][key] = value;
        return next;
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      toast.success(result.cleared ? "Reset to the built-in wording" : "Saved — live on the site");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  /** Ask OpenAI to rewrite everything currently listed (max 40 per pass). */
  async function rewriteVisible() {
    const batch = rows.slice(0, 40);
    if (!batch.length) {
      toast.error("Nothing listed to rewrite");
      return;
    }
    setAiBusy(true);
    try {
      const result = await suggest({
        data: {
          lang,
          instruction,
          items: batch.map((r) => ({ key: r.key, source: r.english, current: r.draft })),
        },
      });
      if (!result.ok) {
        toast.error(result.error ?? "The AI could not rewrite that");
        return;
      }
      setDrafts((d) => {
        const next = { ...d };
        for (const s of result.suggestions) next[s.key] = s.value;
        return next;
      });
      setNotes((n) => {
        const next = { ...n };
        for (const s of result.suggestions) next[s.key] = s.why;
        return next;
      });
      toast.success(
        `${result.suggestions.length} lines rewritten — review them, then Save the ones you like`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The AI could not rewrite that");
    } finally {
      setAiBusy(false);
    }
  }

  /** Save every line that differs from what's currently live. */
  async function saveAllChanged() {
    const changed = rows.filter((r) => r.draft !== r.live);
    if (!changed.length) {
      toast.error("Nothing changed yet");
      return;
    }
    setAiBusy(true);
    let saved = 0;
    for (const row of changed) {
      try {
        const result = await save({ data: { key: row.key, lang, value: row.draft } });
        if (result.ok) saved += 1;
      } catch {
        /* keep going — a single failure shouldn't abandon the batch */
      }
    }
    setAiBusy(false);
    setOverrides(await fetchCopyOverrides());
    setDrafts({});
    toast.success(`${saved} of ${changed.length} lines saved`);
  }

  const changedCount = rows.filter((r) => r.draft !== r.live).length;

  return (
    <div className="space-y-6">
      <div className="border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Website wording</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every visible line of the site, in English and Thai. Edit anything here and it goes live
              immediately — no code change, no publish. Use the AI pass to rewrite Thai into natural
              Bangkok wording, then keep what you like.
            </p>
          </div>
          <div className="flex gap-1 border border-border/60">
            {(["th", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l);
                  setDrafts({});
                  setNotes({});
                }}
                className={`px-4 py-2 text-sm ${
                  lang === l ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === "th" ? "ไทย Thai" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search wording or key, e.g. 'book' or 'จอง'"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Extra instruction for the AI (optional)
            </Label>
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. shorter, friendlier, avoid formal Thai"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={`border px-3 py-1.5 text-xs ${
                group === g.id
                  ? "border-gold text-gold"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={rewriteVisible} disabled={aiBusy || loading} className="gap-2">
            {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Rewrite listed lines with AI
          </Button>
          <Button variant="outline" onClick={saveAllChanged} disabled={aiBusy || !changedCount} className="gap-2">
            <Check className="size-4" />
            Save all changed ({changedCount})
          </Button>
          <span className="text-xs text-muted-foreground">
            {rows.length} lines listed · AI rewrites the first 40
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading wording…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs text-muted-foreground">{row.key}</code>
                {row.overridden && (
                  <Badge variant="outline" className="border-gold/50 text-gold">
                    edited
                  </Badge>
                )}
                {notes[row.key] && (
                  <span className="text-xs text-muted-foreground">AI: {notes[row.key]}</span>
                )}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    English source
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap border border-border/40 bg-muted/30 p-3 text-sm">
                    {row.english || "—"}
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Languages className="size-3.5" />
                    {lang === "th" ? "Thai shown to patients" : "English shown to patients"}
                  </Label>
                  <Textarea
                    value={row.draft}
                    onChange={(e) => setDraft(row.key, e.target.value)}
                    rows={Math.min(6, Math.max(2, Math.ceil(row.draft.length / 70)))}
                    className="mt-1"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => persist(row.key, row.draft)}
                      disabled={busy === row.key || row.draft === row.live}
                      className="gap-1.5"
                    >
                      {busy === row.key ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Save
                    </Button>
                    {row.overridden && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => persist(row.key, "")}
                        disabled={busy === row.key}
                        className="gap-1.5"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!rows.length && (
            <p className="p-6 text-sm text-muted-foreground">No wording matches that search.</p>
          )}
        </div>
      )}
    </div>
  );
}
