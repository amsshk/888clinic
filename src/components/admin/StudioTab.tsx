import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaptionsTab } from "@/components/admin/CaptionsTab";
import { LineBroadcastTab } from "@/components/admin/LineBroadcastTab";
import { VideoCheckTab } from "@/components/admin/VideoCheckTab";

/** Content studio: captions, video (enhance + check) and LINE broadcast in one place. */
export function StudioTab({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Tabs defaultValue="captions">
      <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-none border border-border/70 bg-card p-1.5">
        <TabsTrigger value="captions" className="rounded-none">
          แคปชัน · Captions
        </TabsTrigger>
        <TabsTrigger value="video" className="rounded-none">
          วิดีโอ · Video
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="line" className="rounded-none">
            LINE
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="captions" className="mt-6">
        <CaptionsTab />
      </TabsContent>
      <TabsContent value="video" className="mt-6">
        <VideoCheckTab />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="line" className="mt-6">
          <LineBroadcastTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
