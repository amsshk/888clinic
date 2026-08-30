import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Upload, LogOut, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { describeMedia } from "@/lib/media.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { PatientsTab } from "@/components/admin/PatientsTab";
import { AccessTab } from "@/components/admin/AccessTab";
import { MaliModelTab } from "@/components/admin/MaliModelTab";
import { ScanTestTab } from "@/components/admin/ScanTestTab";
import { BillingTab } from "@/components/admin/BillingTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { MarketingTab } from "@/components/admin/MarketingTab";
import { CopyTab } from "@/components/admin/CopyTab";
import { AssistantTab } from "@/components/admin/AssistantTab";

import { RESULT_CATEGORIES } from "@/lib/before-after";


import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Clinic Admin — 888clinic" },
      { name: "description", content: "Enquiry inbox and AI-assisted media library for 888clinic staff." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Clinic Admin — 888clinic" },
      { property: "og:description", content: "Manage enquiries and clinic media." },
    ],
  }),
  component: AdminPage,
});

type Enquiry = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  concern: string | null;
  preferred_date: string | null;
  status: string;
  created_at: string;
};

type MediaItem = {
  id: string;
  kind: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  tags: string[];
  published: boolean;
  show_in_results: boolean;
  results_category: string | null;
  created_at: string;
};

function AdminPage() {
  const { user, isStaff, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl">Access pending</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in as {user.email}, but this account has no staff role yet. An
          administrator needs to grant you access.
        </p>
        <Button variant="outline" className="mt-6 rounded-none" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Clinic console</p>
          <h1 className="mt-3 text-4xl leading-tight">
            Admin <span className="text-gradient-gold">dashboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" className="rounded-none" onClick={() => signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "patients" : "inbox"} className="mt-10">
        <TabsList className="rounded-none">
          {isAdmin && (
            <TabsTrigger value="patients" className="rounded-none">
              Patients
            </TabsTrigger>
          )}
          <TabsTrigger value="inbox" className="rounded-none">
            Enquiry inbox
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-none">
            Media library
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none">
            Skincare orders
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="access" className="rounded-none">
              Team &amp; access
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="mali" className="rounded-none">
              Dr Mali engine
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="scan-test" className="rounded-none">
              Scan test
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="billing" className="rounded-none">
              Billing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="marketing" className="rounded-none">
              Marketing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="pricing" className="rounded-none">
              Plans &amp; pricing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="copy" className="rounded-none">
              Wording &amp; Thai
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="assistant" className="rounded-none">
              AI admin
            </TabsTrigger>
          )}
        </TabsList>


        {isAdmin && (
          <TabsContent value="patients" className="mt-8">
            <PatientsTab />
          </TabsContent>
        )}
        <TabsContent value="inbox" className="mt-8">
          <Inbox />
        </TabsContent>
        <TabsContent value="media" className="mt-8">
          <MediaLibrary />
        </TabsContent>
        <TabsContent value="orders" className="mt-8">
          <OrdersTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="access" className="mt-8">
            <AccessTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="mali" className="mt-8">
            <MaliModelTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="scan-test" className="mt-8">
            <ScanTestTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="billing" className="mt-8">
            <BillingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="marketing" className="mt-8">
            <MarketingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="pricing" className="mt-8">
            <PricingTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="copy" className="mt-8">
            <CopyTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="assistant" className="mt-8">
            <AssistantTab />
          </TabsContent>
        )}




      </Tabs>
    </div>
  );
}

function Inbox() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("id, full_name, email, phone, concern, preferred_date, status, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load enquiries");
    setRows((data as Enquiry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("enquiries").update({ status }).eq("id", id);
    if (error) {
      toast.error("Update failed");
      return;
    }
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-gold" />;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No enquiries yet.</p>;

  return (
    <div className="space-y-px bg-border">
      {rows.map((row) => (
        <article key={row.id} className="bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg">{row.full_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.email} · {row.phone}
                {row.preferred_date ? ` · prefers ${row.preferred_date}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-border px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                {row.status}
              </span>
              {row.status !== "confirmed" && (
                <Button size="sm" className="rounded-none" onClick={() => setStatus(row.id, "confirmed")}>
                  Mark confirmed
                </Button>
              )}
              {row.status !== "archived" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setStatus(row.id, "archived")}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
          {row.concern && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{row.concern}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}

function MediaLibrary() {
  const { user } = useAuth();
  const describe = useServerFn(describeMedia);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("media_items")
      .select("id, kind, storage_path, title, description, alt_text, tags, published, show_in_results, results_category, created_at")
      .order("created_at", { ascending: false });
    const rows = (data as MediaItem[]) ?? [];
    setItems(rows);

    const signed: Record<string, string> = {};
    await Promise.all(
      rows.map(async (row) => {
        const { data: s } = await supabase.storage.from("media").createSignedUrl(row.storage_path, 60 * 60);
        if (s?.signedUrl) signed[row.id] = s.signedUrl;
      }),
    );
    setUrls(signed);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadOne(file: File, index: number, total: number) {
    if (!user) return false;
    const label = total > 1 ? ` (${index + 1}/${total})` : "";

    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} is too large`, { description: "Please keep uploads under 50 MB." });
      return false;
    }

    const kind = file.type.startsWith("video") ? "video" : "photo";
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

    try {
      setStep(`Uploading…${label}`);
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      setStep(`Writing details with AI…${label}`);
      const ai = await describe({ data: { storagePath: path, kind, hint } });

      const { error: insErr } = await supabase.from("media_items").insert({
        kind,
        storage_path: path,
        public_url: path,
        created_by: user.id,
        title: ai.ok ? ai.result.title : file.name,
        description: ai.ok ? ai.result.description : null,
        alt_text: ai.ok ? ai.result.alt_text : null,
        tags: ai.ok ? ai.result.tags : [],
      });
      if (insErr) throw insErr;

      if (!ai.ok) toast.warning(`Uploaded ${file.name}`, { description: ai.error });
      return true;
    } catch (error) {
      toast.error(`${file.name} failed`, {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !user) return;

    setBusy(true);
    let done = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const ok = await uploadOne(file, i, files.length);
      if (ok) done++;
    }
    setBusy(false);
    setStep("");
    if (done > 0) {
      toast.success(done === 1 ? "Uploaded and described" : `${done} files uploaded and described`);
      setHint("");
      await load();
    }
  }

  async function downloadItem(item: MediaItem) {
    const { data, error } = await supabase.storage.from("media").download(item.storage_path);
    if (error || !data) {
      toast.error(`Could not download ${item.title ?? "file"}`);
      return false;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.storage_path.split("/").pop() ?? "888clinic-media";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  async function downloadAll() {
    if (items.length === 0) return;
    setBusy(true);
    let done = 0;
    for (let i = 0; i < items.length; i++) {
      setStep(`Downloading… (${i + 1}/${items.length})`);
      const it = items[i];
      if (it && (await downloadItem(it))) done++;
      await new Promise((r) => setTimeout(r, 400));
    }
    setBusy(false);
    setStep("");
    toast.success(`${done} file${done === 1 ? "" : "s"} downloaded`);
  }

  async function save(item: MediaItem, patch: Partial<MediaItem>) {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("media_items").update(patch).eq("id", item.id);
    if (error) toast.error("Could not save changes");
  }

  async function regenerate(item: MediaItem) {
    setBusy(true);
    setStep("Rewriting with AI…");
    const ai = await describe({ data: { storagePath: item.storage_path, kind: item.kind === "video" ? "video" : "photo", hint } });
    setBusy(false);
    setStep("");
    if (!ai.ok) {
      toast.error(ai.error);
      return;
    }
    await save(item, {
      title: ai.result.title,
      description: ai.result.description,
      alt_text: ai.result.alt_text,
      tags: ai.result.tags,
    });
    toast.success("Details refreshed");
  }

  async function remove(item: MediaItem) {
    await supabase.storage.from("media").remove([item.storage_path]);
    const { error } = await supabase.from("media_items").delete().eq("id", item.id);
    if (error) {
      toast.error("Could not delete");
      return;
    }
    setItems((list) => list.filter((i) => i.id !== item.id));
  }

  return (
    <div className="space-y-8">
      <div className="border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Upload photos or videos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select several files at once — the AI writes a title, description, alt text and tags for
              each one. You can edit anything after.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={busy || items.length === 0}
            onClick={downloadAll}
          >
            <Download className="size-4" /> Download all ({items.length})
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hint">Optional context for the AI</Label>
            <Input
              id="hint"
              value={hint}
              maxLength={300}
              placeholder="e.g. laser treatment room, new vitamin C serum"
              onChange={(event) => setHint(event.target.value)}
              className="rounded-none"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? step || "Working…" : "Choose files"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={onUpload}
            />
          </label>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="border border-border bg-card">
              <div className="aspect-video bg-shell">
                {urls[item.id] &&
                  (item.kind === "video" ? (
                    <video src={urls[item.id]} controls className="size-full object-cover" />
                  ) : (
                    <img
                      src={urls[item.id]}
                      alt={item.alt_text ?? item.title ?? "Clinic media"}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ))}
              </div>
              <div className="space-y-4 p-5">
                <Input
                  value={item.title ?? ""}
                  onChange={(e) => setItems((l) => l.map((i) => (i.id === item.id ? { ...i, title: e.target.value } : i)))}
                  onBlur={(e) => save(item, { title: e.target.value })}
                  className="rounded-none"
                />
                <Textarea
                  rows={3}
                  value={item.description ?? ""}
                  onChange={(e) =>
                    setItems((l) => l.map((i) => (i.id === item.id ? { ...i, description: e.target.value } : i)))
                  }
                  onBlur={(e) => save(item, { description: e.target.value })}
                  className="rounded-none"
                />
                <Input
                  value={item.alt_text ?? ""}
                  placeholder="Alt text"
                  onChange={(e) =>
                    setItems((l) => l.map((i) => (i.id === item.id ? { ...i, alt_text: e.target.value } : i)))
                  }
                  onBlur={(e) => save(item, { alt_text: e.target.value })}
                  className="rounded-none"
                />
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="space-y-3 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={item.show_in_results}
                      onCheckedChange={(v) =>
                        save(item, {
                          show_in_results: v,
                          published: v ? true : item.published,
                        })
                      }
                    />
                    Show on Before &amp; After results page
                  </label>
                  {item.show_in_results && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Results category</Label>
                      <select
                        value={item.results_category ?? ""}
                        onChange={(e) => save(item, { results_category: e.target.value || null })}
                        className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Uncategorised</option>
                        {RESULT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={item.published}
                      onCheckedChange={(v) => save(item, { published: v })}
                    />
                    Published to gallery
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-none" disabled={busy} onClick={() => regenerate(item)}>
                      <Sparkles className="size-4" /> Redo AI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => downloadItem(item)}
                    >
                      <Download className="size-4" /> Download
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-none" onClick={() => remove(item)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Published media appears on the <Link to="/gallery" className="underline">gallery page</Link>. Items marked
        &ldquo;Show on Before &amp; After results&rdquo; also appear on the{" "}
        <Link to="/results" className="underline">results page</Link>.
      </p>
    </div>
  );
}
