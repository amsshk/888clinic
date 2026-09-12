import { ExternalLink, ShieldCheck, AlertCircle, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEz888nAppUrl } from "@/lib/ez888n.shared";

export function EZ888NConnection() {
  const result = getEz888nAppUrl();

  return (
    <section className="border border-border/70 bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 items-center justify-center border border-gold/30 bg-gold/10 text-gold">
            <Cpu className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl">EZ888N application connection</h3>
              {result.isValid ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs">
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs">
                  Configuration required
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Protected advertising workspace connection for 888clinic administrators.
            </p>
          </div>
        </div>

        {result.isValid && result.url && (
          <Button asChild variant="default" className="rounded-none gap-2">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              Open EZ888N <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
      </div>

      <div className="mt-4">
        {result.isValid && result.url ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground bg-muted/30 p-3 border border-border/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
              <span>
                Connected to hosted EZ888N instance at <code className="text-foreground font-mono">{result.url}</code>
              </span>
            </div>
            {result.isLocalhost && (
              <span className="text-amber-400 font-mono">[Development Localhost Mode]</span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-amber-500/5 p-4 border border-amber-500/20 text-xs text-muted-foreground">
            <AlertCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-300 text-sm">
                EZ888N application URL is required
              </p>
              <p>
                {result.error || "Please configure VITE_EZ888N_APP_URL with the secure HTTPS address of your deployed EZ888N service."}
              </p>
              <p className="text-[11px] text-muted-foreground/80 pt-1">
                Environment variable: <code className="bg-background px-1 py-0.5 border border-border">VITE_EZ888N_APP_URL=https://ez888n.888clinic.co</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
