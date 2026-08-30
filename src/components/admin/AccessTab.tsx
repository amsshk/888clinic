import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ShieldCheck, UserPlus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTeamUser,
  listTeam,
  setTeamCredits,
  setTeamRole,
} from "@/lib/admin-users.functions";
import type { TeamMember } from "@/lib/admin-users.shared";
import { AccessAuditLog } from "@/components/admin/AccessAuditLog";

export function AccessTab() {
  const load = useServerFn(listTeam);
  const create = useServerFn(createTeamUser);
  const changeRole = useServerFn(setTeamRole);
  const changeCredits = useServerFn(setTeamCredits);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [auditKey, setAuditKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "staff" as "admin" | "staff" | "patient",
    credits: "0",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await load({} as never);
      if (!res.ok) {
        toast.error(res.error);
        setMembers([]);
      } else {
        setMembers(res.members);
      }
    } catch {
      toast.error("Could not load accounts");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    try {
      const res = await create({
        data: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          credits: Number(form.credits) || 0,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Account created");
      setAuditKey((k) => k + 1);
      setForm({ email: "", password: "", fullName: "", role: "staff", credits: "0" });
      await refresh();
    } catch {
      toast.error("Could not create the account");
    } finally {
      setCreating(false);
    }
  }

  async function toggleRole(member: TeamMember, role: "admin" | "staff") {
    const grant = !member.roles.includes(role);
    const res = await changeRole({ data: { userId: member.id, role, grant } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(grant ? `${role} role granted` : `${role} role removed`);
    setAuditKey((k) => k + 1);
    setMembers((rows) =>
      rows.map((r) =>
        r.id === member.id
          ? { ...r, roles: grant ? [...r.roles, role] : r.roles.filter((x) => x !== role) }
          : r,
      ),
    );
  }

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${m.email ?? ""} ${m.full_name ?? ""} ${m.roles.join(" ")}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-gold" />
          <h2 className="text-lg">Create an account</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The account is confirmed immediately — share the password with the team member and ask
          them to change it after signing in.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="team-email">Email</Label>
            <Input
              id="team-email"
              type="email"
              required
              className="mt-1 rounded-none"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="team-name">Full name</Label>
            <Input
              id="team-name"
              className="mt-1 rounded-none"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="team-password">Temporary password</Label>
            <Input
              id="team-password"
              type="text"
              required
              minLength={8}
              className="mt-1 rounded-none"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="team-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as typeof form.role })}
            >
              <SelectTrigger id="team-role" className="mt-1 rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — full access</SelectItem>
                <SelectItem value="staff">Staff — console access</SelectItem>
                <SelectItem value="patient">Patient — no console</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="team-credits">Scan credits</Label>
            <Input
              id="team-credits"
              type="number"
              min={0}
              className="mt-1 rounded-none"
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" className="mt-5 rounded-none" disabled={creating}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Create account
        </Button>
      </form>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-gold" />
            <h2 className="text-lg">Roles &amp; scan credits</h2>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by email, name or role"
              className="h-9 w-64 rounded-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outline" size="sm" className="rounded-none" onClick={refresh}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <Loader2 className="mt-6 size-5 animate-spin text-gold" />
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No accounts match that search.</p>
        ) : (
          <div className="mt-5 space-y-px bg-border">
            {filtered.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onToggleRole={toggleRole}
                onSaveCredits={async (credits, freeScans) => {
                  const res = await changeCredits({
                    data: { userId: member.id, credits, freeScans },
                  });
                  if (!res.ok) {
                    toast.error(res.error);
                    return false;
                  }
                  toast.success("Scan balance updated");
                  setAuditKey((k) => k + 1);
                  setMembers((rows) =>
                    rows.map((r) =>
                      r.id === member.id
                        ? { ...r, credits, free_scans_remaining: freeScans }
                        : r,
                    ),
                  );
                  return true;
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AccessAuditLog reloadKey={auditKey} />
    </div>
  );
}

function MemberRow({
  member,
  onToggleRole,
  onSaveCredits,
}: {
  member: TeamMember;
  onToggleRole: (m: TeamMember, role: "admin" | "staff") => Promise<void>;
  onSaveCredits: (credits: number, freeScans: number) => Promise<boolean>;
}) {
  const [credits, setCredits] = useState(String(member.credits));
  const [freeScans, setFreeScans] = useState(String(member.free_scans_remaining));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCredits(String(member.credits));
    setFreeScans(String(member.free_scans_remaining));
  }, [member.credits, member.free_scans_remaining]);

  const dirty =
    Number(credits) !== member.credits || Number(freeScans) !== member.free_scans_remaining;

  return (
    <article className="bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base">{member.full_name ?? member.email ?? "Unnamed account"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {member.email ?? "no email"} · joined {new Date(member.created_at).toLocaleDateString()}
            {member.last_sign_in_at
              ? ` · last sign-in ${new Date(member.last_sign_in_at).toLocaleDateString()}`
              : " · never signed in"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {member.roles.length === 0 ? (
              <span className="border border-border px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                patient
              </span>
            ) : (
              member.roles.map((role) => (
                <span
                  key={role}
                  className="border border-gold/40 px-2 py-1 text-xs uppercase tracking-wider text-gold"
                >
                  {role}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            {(["admin", "staff"] as const).map((role) => {
              const has = member.roles.includes(role);
              return (
                <Button
                  key={role}
                  size="sm"
                  variant={has ? "default" : "outline"}
                  className="rounded-none"
                  onClick={() => onToggleRole(member, role)}
                >
                  {has ? `Remove ${role}` : `Make ${role}`}
                </Button>
              );
            })}
          </div>

          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor={`credits-${member.id}`} className="text-xs">
                Credits
              </Label>
              <Input
                id={`credits-${member.id}`}
                type="number"
                min={0}
                className="mt-1 h-9 w-24 rounded-none"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`free-${member.id}`} className="text-xs">
                Free scans
              </Label>
              <Input
                id={`free-${member.id}`}
                type="number"
                min={0}
                className="mt-1 h-9 w-24 rounded-none"
                value={freeScans}
                onChange={(e) => setFreeScans(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              disabled={!dirty || busy}
              onClick={async () => {
                setBusy(true);
                await onSaveCredits(Math.max(0, Number(credits) || 0), Math.max(0, Number(freeScans) || 0));
                setBusy(false);
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
