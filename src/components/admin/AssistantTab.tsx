import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  askSiteAssistant,
  type AssistantChange,
  type AssistantTurn,
} from "@/lib/site-assistant.functions";

type Bubble = AssistantTurn & { changes?: AssistantChange[] };

const EXAMPLES = [
  "Make the homepage headline shorter and more luxurious",
  "Rewrite the Thai booking button so it sounds friendlier",
  "Hide the retinol serum from the shop for now",
  "What do the scan packs cost right now?",
];

/**
 * Chat console where the clinic owner asks for a website change in plain
 * language. The assistant runs on the clinic's own OpenAI account and edits
 * live wording (English/Thai) and shop availability — no code, no patient data.
 */
export function AssistantTab() {
  const ask = useServerFn(askSiteAssistant);
  const [turns, setTurns] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    const history: AssistantTurn[] = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setBusy(true);

    try {
      const result = await ask({ data: { message, history } });
      if (!result.ok) {
        toast.error(result.error);
        setTurns((prev) => [...prev, { role: "assistant", content: result.error }]);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, changes: result.changes },
      ]);
      if (result.changes.length) toast.success(`${result.changes.length} change(s) are live`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Something went wrong";
      toast.error(detail);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl">
          AI <span className="text-gradient-gold">admin</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ask for a change in plain English or Thai. I can rewrite any text on the site in either
          language, and add, edit, reprice, hide or remove shop products and scan packs — price
          changes are pushed to checkout automatically. Layout and new pages still go through your
          developer.
        </p>
      </div>

      <div className="border border-border">
        <div className="max-h-[26rem] space-y-4 overflow-y-auto p-5">
          {turns.length === 0 && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    className="rounded-none text-left text-xs"
                    onClick={() => send(example)}
                  >
                    <Sparkles className="mr-2 size-3.5" /> {example}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, index) => (
            <div key={index} className="flex gap-3">
              <div className="mt-1 shrink-0 text-muted-foreground">
                {turn.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
                {turn.changes && turn.changes.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {turn.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-none text-[0.6rem] uppercase">
                          {change.kind === "copy" ? "Wording" : change.kind === "catalog" ? "Product" : "Shop"}
                        </Badge>
                        <span className="min-w-0 break-words">{change.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Working on it…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-end gap-3 border-t border-border p-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Tell me what to change on the website…"
            rows={2}
            className="rounded-none"
          />
          <Button
            className="rounded-none"
            disabled={busy || !input.trim()}
            onClick={() => void send(input)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
