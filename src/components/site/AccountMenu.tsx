import { Link, useNavigate } from "@tanstack/react-router";
import { User, LogOut, ScanFace, Package, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isStaff, loading, signOut } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline" className="rounded-none px-4">
        <Link to="/auth" onClick={onNavigate}>
          {t("cta.signin")}
        </Link>
      </Button>
    );
  }

  const name = (user.user_metadata?.["full_name"] as string | undefined) || user.email || t("account.default");

  async function handleSignOut() {
    onNavigate?.();
    await signOut();
    toast.success(t("account.signedout"));
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-none border-border px-3"
          aria-label={t("account.menu")}
        >
          <User className="size-4" />
          <span className="ml-2 hidden max-w-[9rem] truncate text-[0.7rem] uppercase tracking-[0.14em] xl:inline">
            {name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-none">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/mali" search={{ tool: "scan" as const }} onClick={onNavigate}>
            <ScanFace className="mr-2 size-4" /> {t("account.scans")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/mali" search={{ tool: "before-after" as const }} onClick={onNavigate}>
            <Sparkles className="mr-2 size-4" /> {t("account.predict")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orders" onClick={onNavigate}>
            <Package className="mr-2 size-4" /> {t("account.orders")}
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link to="/admin" onClick={onNavigate}>
              <ShieldCheck className="mr-2 size-4" /> {t("account.admin")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 size-4" /> {t("account.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
