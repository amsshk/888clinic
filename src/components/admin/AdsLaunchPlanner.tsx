import { useState } from "react";
import { Check, Clipboard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CHECKLIST = [
  "Use a broad location and age range rather than health or appearance interests.",
  "Use clinic-owned creative with no patient names, faces, diagnoses, or treatment records.",
  "Review copy for personal-attribute language, guarantees, and clinical claims.",
  "Confirm the landing page contains only the public offer and booking information.",
  "Keep Pixel and Conversions API tracking disabled unless the owner has approved the setup.",
];

export function AdsLaunchPlanner() {
  const [campaign, setCampaign] = useState("");
  const [offer, setOffer] = useState("");
  const [completed, setCompleted] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  const plan = [
    `Campaign: ${campaign.trim() || "Untitled campaign"}`,
    `Offer: ${offer.trim() || "Add a public, non-clinical offer"}`,
    "Audience: Adults in the service area, using broad non-health targeting",
    "Creative review: No patient or clinical information",
    `Launch gate: ${completed.every(Boolean) ? "Ready for owner review" : "Complete the privacy checklist"}`,
  ].join("\n");

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(plan);
      toast.success("Launch plan copied");
    } catch {
      toast.error("Could not copy the launch plan");
    }
  }

  return (
    <section className="border border-border/70 bg-card p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 size-5 text-gold" />
        <div>
          <h3 className="font-serif text-xl">Privacy-safe launch planner</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Prepare a campaign brief without entering patient, diagnostic, or treatment information.
            This planner stays in the browser and sends nothing to Meta.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="ez888n-campaign">Campaign name</Label>
            <Input
              id="ez888n-campaign"
              className="mt-2 rounded-none"
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              maxLength={80}
              placeholder="e.g. September skin scan"
            />
          </div>
          <div>
            <Label htmlFor="ez888n-offer">Public offer</Label>
            <Input
              id="ez888n-offer"
              className="mt-2 rounded-none"
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              maxLength={120}
              placeholder="e.g. Complimentary consultation"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => void copyPlan()}
          >
            <Clipboard className="size-4" /> Copy launch brief
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Owner review</p>
          {CHECKLIST.map((item, index) => (
            <label key={item} className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[hsl(var(--gold))]"
                checked={completed[index] ?? false}
                onChange={(event) =>
                  setCompleted((current) =>
                    current.map((value, itemIndex) =>
                      itemIndex === index ? event.target.checked : value,
                    ),
                  )
                }
              />
              <span className={completed[index] ? "text-muted-foreground line-through" : ""}>
                {item}
              </span>
              {completed[index] && <Check className="mt-0.5 size-4 shrink-0 text-gold" />}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
