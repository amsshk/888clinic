import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  ImagePlus,
  Link as LinkIcon,
  Megaphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CHANNELS = [
  { id: "instagram-reels", label: "Instagram Reels" },
  { id: "instagram-posts", label: "Instagram posts" },
  { id: "facebook", label: "Facebook" },
  { id: "line", label: "LINE" },
  { id: "google-business", label: "Google Business" },
] as const;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type TeamPromotionsTabProps = { onOpenMediaLibrary: () => void };

export function TeamPromotionsTab({ onOpenMediaLibrary }: TeamPromotionsTabProps) {
  const [headline, setHeadline] = useState("");
  const [service, setService] = useState("");
  const [offer, setOffer] = useState("");
  const [qualification, setQualification] = useState("");
  const [destination, setDestination] = useState("https://888clinic.com/book");
  const [campaign, setCampaign] = useState("team-organic");
  const [channels, setChannels] = useState<string[]>(["instagram-reels", "instagram-posts"]);
  const [creative, setCreative] = useState<{ fileName: string; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => creative && URL.revokeObjectURL(creative.url), [creative]);

  const captions = useMemo(() => {
    const title = headline.trim() || "Thoughtful care for your skin";
    const topic = service.trim() || "skin consultation";
    const deal = offer.trim() || "Book a consultation to discuss your goals";
    const requirement = qualification.trim();
    const qualificationLine = requirement ? `\n${requirement}` : "";
    return {
      en: `${title}\n\nExplore ${topic} with a consultation tailored to you. ${deal}.${qualificationLine}\n\nResults vary from person to person. A consultation is the best way to understand what may be suitable for you. Message us to enquire.\n\n#888clinic #BangkokClinic #SkinHealth #AestheticClinic`,
      th: `${title}\n\nมาปรึกษาเรื่อง${topic}กับทีมแพทย์ของเรา เพื่อวางแผนที่เหมาะกับคุณ ${deal}${qualificationLine}\n\nผลลัพธ์ของแต่ละคนแตกต่างกัน การปรึกษาแพทย์ช่วยให้เข้าใจทางเลือกที่เหมาะสมกับคุณมากขึ้น ทักหาเราเพื่อสอบถามรายละเอียดได้เลยค่ะ\n\n#888clinic #คลินิกผิวหนัง #ดูแลผิว #คลินิกความงาม`,
    };
  }, [headline, service, offer, qualification]);

  const campaignUrl = useMemo(() => {
    try {
      const url = new URL(destination.trim() || "https://888clinic.com/book");
      url.searchParams.set("utm_source", "organic");
      url.searchParams.set("utm_medium", "social");
      url.searchParams.set("utm_campaign", campaign.trim() || "team-organic");
      return url.toString();
    } catch {
      return "";
    }
  }, [destination, campaign]);

  function toggleChannel(channel: string) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  function chooseCreative(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Images must be 10 MB or smaller.");
      return;
    }
    setCreative((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { fileName: file.name, url: URL.createObjectURL(file) };
    });
  }

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  function downloadKit() {
    const kit = {
      captions,
      destination: campaignUrl || destination,
      channels: CHANNELS.filter((channel) => channels.includes(channel.id)).map(
        (channel) => channel.label,
      ),
      creativeFilename: creative?.fileName ?? null,
      organicBudget: "฿0",
    };
    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${campaign.trim() || "team-organic"}-launch-kit.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-1 size-5 text-gold" />
          <div>
            <h2 className="font-serif text-2xl">Marketing team</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Visible to clinic staff → Marketing team. Prepare an organic campaign without opening
              ezWar. Everything here runs in this browser, uses no OpenAI credit, and does not send
              anything to an advertising platform.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="team-promotion-headline">Campaign headline</Label>
            <Input
              id="team-promotion-headline"
              className="mt-2 rounded-none"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              maxLength={120}
              placeholder="A calmer, clearer skin plan"
            />
          </div>
          <div>
            <Label htmlFor="team-promotion-service">Service or topic</Label>
            <Input
              id="team-promotion-service"
              className="mt-2 rounded-none"
              value={service}
              onChange={(event) => setService(event.target.value)}
              maxLength={120}
              placeholder="skin consultation"
            />
          </div>
          <div>
            <Label htmlFor="team-promotion-offer">Genuine offer</Label>
            <Textarea
              id="team-promotion-offer"
              className="mt-2 rounded-none"
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Complimentary consultation for new enquiries this month"
            />
          </div>
          <div>
            <Label htmlFor="team-promotion-qualification">Required qualification</Label>
            <Textarea
              id="team-promotion-qualification"
              className="mt-2 rounded-none"
              value={qualification}
              onChange={(event) => setQualification(event.target.value)}
              rows={3}
              maxLength={240}
              placeholder="Available for adults; consultation required before treatment"
            />
          </div>
        </div>
        <div className="mt-6">
          <Label>Publishing channels</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map((channel) => {
              const selected = channels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={`flex items-center gap-2 border px-3 py-2 text-sm transition ${selected ? "border-gold bg-gold/10" : "border-border/70 text-muted-foreground hover:border-gold/60"}`}
                >
                  {selected && <Check className="size-4 text-gold" />}
                  {channel.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-start gap-3">
          <ImagePlus className="mt-1 size-5 text-gold" />
          <div>
            <h2 className="font-serif text-xl">Before &amp; After promotional image</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview a before-and-after promotional image in PNG, JPEG, or WebP format up to 10 MB.
              The file stays local and is not uploaded to an advertising platform.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => chooseCreative(event.target.files?.[0])}
        />
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {creative ? "Replace promotional image" : "Choose promotional image"}
          </Button>
          {creative && (
            <img
              src={creative.url}
              alt="Before & After promotional image preview"
              className="h-28 w-28 border border-border/70 object-cover"
            />
          )}
          {creative && <span className="text-sm text-muted-foreground">{creative.fileName}</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={onOpenMediaLibrary}
          >
            <Upload className="size-4" /> Create a Before &amp; After result
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            Opens Media library without duplicating its clinical uploader.
          </span>
        </div>
      </section>

      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-start gap-3">
          <LinkIcon className="mt-1 size-5 text-gold" />
          <div>
            <h2 className="font-serif text-xl">Organic campaign link</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use one consistent destination and UTM tracking across every selected channel.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="team-promotion-destination">Destination</Label>
            <Input
              id="team-promotion-destination"
              className="mt-2 rounded-none"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="team-promotion-campaign">Campaign name</Label>
            <Input
              id="team-promotion-campaign"
              className="mt-2 rounded-none"
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              maxLength={80}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            readOnly
            value={campaignUrl || "Enter a valid destination URL"}
            className="min-w-0 flex-1 rounded-none"
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={!campaignUrl}
            onClick={() => void copy(campaignUrl, "Campaign link copied")}
          >
            <Clipboard className="size-4" /> Copy link
          </Button>
        </div>
      </section>

      <section className="border border-border/70 bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">Ready-to-use captions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              English and Thai copy includes a consultation CTA, responsible results wording, and
              clinic hashtags.
            </p>
          </div>
          <Button type="button" className="rounded-none" onClick={downloadKit}>
            <Download className="size-4" /> Download ฿0 launch kit
          </Button>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="team-caption-en">English</Label>
            <Textarea
              id="team-caption-en"
              readOnly
              value={captions.en}
              rows={10}
              className="mt-2 rounded-none"
            />
            <Button
              type="button"
              variant="ghost"
              className="mt-2 rounded-none"
              onClick={() => void copy(captions.en, "English caption copied")}
            >
              <Clipboard className="size-4" /> Copy English
            </Button>
          </div>
          <div>
            <Label htmlFor="team-caption-th">ไทย</Label>
            <Textarea
              id="team-caption-th"
              readOnly
              value={captions.th}
              rows={10}
              className="mt-2 rounded-none"
            />
            <Button
              type="button"
              variant="ghost"
              className="mt-2 rounded-none"
              onClick={() => void copy(captions.th, "Thai caption copied")}
            >
              <Clipboard className="size-4" /> Copy Thai
            </Button>
          </div>
        </div>
        <div className="mt-6 border-l-2 border-gold pl-4 text-sm text-muted-foreground">
          <p>
            Distribution plan: adapt the same approved creative for Reels and Stories, then share
            the campaign link on Facebook, LINE, and Google Business.
          </p>
          <p>
            Organic promotion can reduce costs, but no one can guarantee free views. Do not use
            bots, fake engagement, or account-policy workarounds.
          </p>
          <p className="mt-2">
            Never upload diagnoses, scan findings, patient information, or audience lists to
            advertising platforms.
          </p>
        </div>
      </section>
    </div>
  );
}
