import { createFileRoute } from "@tanstack/react-router";
import { ScanFace, Syringe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkinScanTool } from "@/components/mali/SkinScanTool";
import { BeforeAfterTool } from "@/components/mali/BeforeAfterTool";
import { useLang } from "@/lib/i18n";

type Tool = "scan" | "before-after";

export const Route = createFileRoute("/_authenticated/mali")({
  head: () => ({
    meta: [
      { title: "MALI AI Studio — Skin Scan & Before/After — 888clinic" },
      {
        name: "description",
        content:
          "Two MALI tools in one place: an AI skin scan that reads a lesion or skin concern and gives you a clinic report, and a botox and filler before-and-after prediction from your own photo.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "MALI AI Studio — 888clinic" },
      {
        property: "og:description",
        content: "AI skin analysis and botox/filler before-after prediction, together in one page.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { tool: Tool } => ({
    tool: search["tool"] === "before-after" ? "before-after" : "scan",
  }),
  component: MaliStudio,
});

function MaliStudio() {
  const { lang } = useLang();
  const { tool } = Route.useSearch();
  const navigate = Route.useNavigate();
  const active: Tool = tool;
  const th = lang === "th";

  const copy = th
    ? {
        eyebrow: "MALI AI STUDIO",
        title1: "เครื่องมือ AI ของคลินิก",
        title2: "สองอย่าง รวมไว้ในหน้าเดียว",
        lede: "เลือกได้เลยค่ะว่าจะให้ MALI ช่วยเรื่องไหน — ตรวจผิวหาความผิดปกติ หรือดูภาพก่อน–หลังของโบท็อกซ์และฟิลเลอร์ ทั้งสองอย่างใช้เครดิตสแกนเดียวกัน",
        scanTab: "ตรวจผิวด้วย AI",
        baTab: "ทำนายก่อน–หลัง",
        scanTitle: "ตรวจผิวด้วย AI (วินิจฉัยเบื้องต้น)",
        scanBody:
          "อัปโหลดรูปไฝ ผื่น สิว หรือจุดที่กังวล MALI จะอ่านภาพ บอกว่าน่าจะเป็นอะไร ระดับความรุนแรง ความเร่งด่วนที่ควรมาพบหมอ และออกรายงานเป็น PDF มีโลโก้คลินิกให้ดาวน์โหลด — ไม่ใช่การวินิจฉัยแทนแพทย์ แต่ช่วยให้รู้ว่าควรรีบมาหรือไม่",
        scanUse: "ใช้เมื่อ: มีไฝ/จุด/ผื่นที่เปลี่ยนไป หรืออยากได้ความเห็นที่สองก่อนเข้าคลินิก",
        baTitle: "ทำนายก่อน–หลัง โบท็อกซ์ & ฟิลเลอร์",
        baBody:
          "อัปโหลดรูปหน้าตรง เลือกจุดที่จะฉีดบนแผนที่ใบหน้า เลือกว่าเป็นโบท็อกซ์หรือฟิลเลอร์และปริมาณ แล้ว MALI จะเรนเดอร์ภาพหลังทำให้ดู พร้อมช่วงผลลัพธ์แบบระวัง/ปกติ/ดีที่สุด ระยะเวลาเห็นผล และข้อควรระวัง",
        baUse: "ใช้เมื่อ: อยากเห็นผลก่อนตัดสินใจฉีด และอยากคุยกับหมอด้วยภาพที่ชัดเจน",
      }
    : {
        eyebrow: "MALI AI STUDIO",
        title1: "Both MALI tools,",
        title2: "now on one page",
        lede: "Pick what you need MALI for — reading a skin concern, or previewing a botox / filler result on your own face. Both draw on the same scan balance.",
        scanTab: "AI skin scan",
        baTab: "Before / after",
        scanTitle: "AI skin scan (what is this on my skin?)",
        scanBody:
          "Upload a photo of a mole, rash, spot or breakout. MALI reads the image and tells you the most likely condition, how severe it looks, how urgently you should be seen, and produces a clinic-branded PDF report you can download or bring to your appointment. It is a screening second opinion, not a diagnosis.",
        scanUse: "Use it when: a mole or patch has changed, or you want a second opinion before booking.",
        baTitle: "Botox & filler before / after prediction",
        baBody:
          "Upload a front-facing photo, tap the injection areas on the face map, choose botox or filler and the dose, and MALI renders a realistic predicted after photo — with a conservative / typical / best-case range, how long results take to show, and the cautions for each area.",
        baUse: "Use it when: you are deciding on treatment and want to see the change before you commit.",
      };

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
            {copy.title1} <span className="text-gradient-gold">{copy.title2}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.lede}</p>

          <div className="mt-10 grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-card p-6">
              <ScanFace className="size-6 text-gold" />
              <h2 className="mt-4 text-xl">{copy.scanTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.scanBody}</p>
              <p className="mt-3 text-xs text-gold-deep">{copy.scanUse}</p>
            </div>
            <div className="bg-card p-6">
              <Syringe className="size-6 text-gold" />
              <h2 className="mt-4 text-xl">{copy.baTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.baBody}</p>
              <p className="mt-3 text-xs text-gold-deep">{copy.baUse}</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs
        value={active}
        onValueChange={(value) =>
          navigate({ search: { tool: value as Tool }, resetScroll: false })
        }
      >
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-5">
            <TabsList className="h-auto justify-start gap-2 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="scan"
                className="rounded-none border-b-2 border-transparent px-4 py-4 text-xs uppercase tracking-[0.18em] data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <ScanFace className="mr-2 size-4" /> {copy.scanTab}
              </TabsTrigger>
              <TabsTrigger
                value="before-after"
                className="rounded-none border-b-2 border-transparent px-4 py-4 text-xs uppercase tracking-[0.18em] data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Syringe className="mr-2 size-4" /> {copy.baTab}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="scan" className="mt-0">
          <SkinScanTool />
        </TabsContent>
        <TabsContent value="before-after" className="mt-0">
          <BeforeAfterTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
