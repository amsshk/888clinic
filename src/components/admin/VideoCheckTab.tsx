import { VideoEnhancePanel } from "@/components/admin/VideoEnhancePanel";

/** Studio → Video: bulk enhance for Facebook, plus how to keep videos sharp. */

const TIPS = [
  "ถ่ายด้วยโหมด 1080p หรือ 4K, 30fps · record at 1080p or 4K",
  "อย่าส่งไฟล์ผ่าน LINE/WhatsApp ก่อนโพสต์ · never pass the file through LINE first",
  "CapCut: Export → 1080p, 30fps, คุณภาพสูงสุด/บิตเรตสูง",
  "แอป Facebook: การตั้งค่า → สื่อ → เปิด \"อัปโหลด HD\"",
  "ในโฆษณา: ปิด \"ปรับแต่งภาพ/Enhance video\" ใน Advantage+ creative ถ้าภาพดูเพี้ยน",
];

export function VideoCheckTab() {
  return (
    <div className="space-y-8">
      <VideoEnhancePanel />
      <section className="border border-border/70 bg-card p-6">
        <h3 className="font-serif text-lg">วิธีให้วิดีโอคมชัดบน Facebook · How to keep it sharp</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
