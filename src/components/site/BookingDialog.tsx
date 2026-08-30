import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitEnquiry } from "@/lib/enquiries.functions";
import { toast } from "sonner";
import { useLang, type TKey } from "@/lib/i18n";
import { useContactIdentity } from "@/hooks/useContactIdentity";

const SERVICES: { value: string; key: TKey }[] = [
  { value: "Dermatology consultation", key: "bksvc.consult" },
  { value: "Acne programme", key: "bksvc.acne" },
  { value: "Pigmentation & melasma", key: "bksvc.pigment" },
  { value: "Mole / skin cancer check", key: "bksvc.mole" },
  { value: "Botox", key: "bksvc.botox" },
  { value: "Dermal filler", key: "bksvc.filler" },
  { value: "Laser & skin resurfacing", key: "bksvc.laser" },
  { value: "Skincare advice", key: "bksvc.skincare" },
];

const TIMES = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] as const;

type Props = {
  children: React.ReactNode;
  defaultService?: string;
};

export function BookingDialog({ children, defaultService }: Props) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [service, setService] = useState<string>(defaultService ?? (SERVICES[0]?.value ?? ""));
  const [time, setTime] = useState<string>("");
  const send = useServerFn(submitEnquiry);
  const identity = useContactIdentity();
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (!phoneTouched && identity.phone) setPhone(identity.phone);
  }, [identity.phone, phoneTouched]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      const result = await send({
        data: {
          fullName: identity.signedIn
            ? identity.fullName || identity.email
            : String(fd.get("name") ?? ""),
          phone,
          email: identity.signedIn ? identity.email : String(fd.get("email") ?? ""),
          concern: String(fd.get("concern") ?? ""),
          preferredDate: String(fd.get("preferredDate") ?? ""),
          service,
          preferredTime: time,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      void identity.rememberPhone(phone);
      form.reset();
      setTime("");
      setOpen(false);
      toast.success(t("bk.ok"), {
        description: t("bk.dialog.ok.body"),
      });
    } catch {
      toast.error(t("bk.fail"), {
        description: t("bk.failBody"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {t("bk.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("bk.dialog.desc")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          {identity.signedIn ? (
            <div className="border border-border/70 bg-shell px-4 py-3 text-sm">
              <p>
                {t("bk.asYou")}{" "}
                <strong className="text-foreground">{identity.fullName || identity.email}</strong>
                {identity.fullName && identity.email ? (
                  <span className="text-muted-foreground"> · {identity.email}</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("bk.autofill")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bk-name">{t("bk.name")}</Label>
                <Input id="bk-name" name="name" required maxLength={100} className="rounded-none" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-email">{t("bk.email")}</Label>
                <Input id="bk-email" name="email" type="email" required maxLength={255} className="rounded-none" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bk-phone">{t("bk.phone")}</Label>
            <Input
              id="bk-phone"
              name="phone"
              type="tel"
              required
              maxLength={40}
              value={phone}
              onChange={(e) => {
                setPhoneTouched(true);
                setPhone(e.target.value);
              }}
              className="rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("bk.treatment")}</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder={t("bk.treatment.ph")} />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {t(s.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bk-date">{t("bk.prefDate")}</Label>
              <Input id="bk-date" name="preferredDate" type="date" className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>{t("bk.prefTime")}</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder={t("bk.anytime")} />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {TIMES.map((tm) => (
                    <SelectItem key={tm} value={tm}>
                      {tm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-concern">{t("bk.notes")}</Label>
            <Textarea
              id="bk-concern"
              name="concern"
              rows={3}
              maxLength={1000}
              placeholder={t("bk.notes.ph")}
              className="rounded-none"
            />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="w-full rounded-none">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
            {busy ? t("bk.sending") : t("bk.request")}
          </Button>

          <p className="text-xs text-muted-foreground">
            {t("bk.dialog.disclaimer")}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
