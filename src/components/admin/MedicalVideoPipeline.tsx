import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveMedicalVideoProject,
  generateMedicalVideoDraft,
  getMedicalVideoProject,
  saveMedicalVideoDraft,
  startMedicalVideoProject,
  type MedicalVideoProject,
} from "@/lib/medical-video.functions";
import { toast } from "sonner";
import { CheckCircle2, Download, Film, Loader2, Mic2, RefreshCw, Sparkles } from "lucide-react";

function isErrorResult(
  value: MedicalVideoProject | { ok: false; error: string },
): value is { ok: false; error: string } {
  return "ok" in value && value.ok === false;
}

const STATUS_LABELS: Record<MedicalVideoProject["status"], string> = {
  draft: "Draft ready for review",
  generating_clips: "Generating CGI clips",
  generating_narration: "Generating narration",
  rendering: "Rendering final MP4",
  ready: "Ready for private review",
  failed: "Needs attention",
};

export function MedicalVideoPipeline() {
  const createDraft = useServerFn(generateMedicalVideoDraft);
  const saveDraft = useServerFn(saveMedicalVideoDraft);
  const startProject = useServerFn(startMedicalVideoProject);
  const loadProject = useServerFn(getMedicalVideoProject);
  const approveProject = useServerFn(approveMedicalVideoProject);

  const [topic, setTopic] = useState("Botox for crow's feet");
  const [project, setProject] = useState<MedicalVideoProject | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "save" | "start" | "refresh" | "approve">("");
  const canEditDraft = project
    ? !["generating_clips", "generating_narration", "rendering"].includes(project.status)
    : false;

  const progress = useMemo(() => {
    if (!project || project.clips.length === 0) return 0;
    return Math.round(
      project.clips.reduce(
        (sum, clip) => sum + (clip.status === "completed" ? 100 : clip.progress),
        0,
      ) / project.clips.length,
    );
  }, [project]);

  const refreshProject = useCallback(
    async (projectId = project?.id, announce = true) => {
      if (!projectId) return;
      setBusy("refresh");
      try {
        const result = await loadProject({ data: { projectId } });
        if (isErrorResult(result)) {
          toast.error(result.error);
          return;
        }
        setProject(result);
        if (announce && result.status === "ready")
          toast.success("Medical marketing video is ready");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not check the video status.");
      } finally {
        setBusy("");
      }
    },
    [loadProject, project?.id],
  );

  useEffect(() => {
    if (!project) return;
    if (!["generating_clips", "generating_narration", "rendering"].includes(project.status)) return;
    const handle = window.setTimeout(() => void refreshProject(project.id, false), 8_000);
    return () => window.clearTimeout(handle);
  }, [project, refreshProject]);

  async function handleCreateDraft() {
    setBusy("draft");
    try {
      const result = await createDraft({ data: { topic, format: "vertical" } });
      if (isErrorResult(result)) {
        toast.error(result.error);
        return;
      }
      setProject(result);
      toast.success("Script and scene prompts are ready to review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the draft.");
    } finally {
      setBusy("");
    }
  }

  async function handleSaveDraft(nextProject = project) {
    if (!nextProject) return null;
    setBusy("save");
    try {
      const result = await saveDraft({
        data: {
          projectId: nextProject.id,
          script: nextProject.script,
          scenes: nextProject.scenes,
        },
      });
      if (isErrorResult(result)) {
        toast.error(result.error);
        return null;
      }
      setProject(result);
      toast.success("Draft saved");
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the draft.");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function handleStartProject() {
    if (!project) return;
    const saved = await handleSaveDraft(project);
    if (!saved) return;
    setBusy("start");
    try {
      const result = await startProject({ data: { projectId: saved.id } });
      if (isErrorResult(result)) {
        toast.error(result.error);
        return;
      }
      setProject(result);
      toast.success("Clip generation started — this can take several minutes");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start the medical video pipeline.",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleApprove() {
    if (!project) return;
    setBusy("approve");
    try {
      const result = await approveProject({ data: { projectId: project.id } });
      if (isErrorResult(result)) {
        toast.error(result.error);
        return;
      }
      setProject(result);
      toast.success("Medical promo marked approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the approval state.");
    } finally {
      setBusy("");
    }
  }

  function downloadFinalVideo() {
    if (!project?.finalVideoUrl) return;
    const a = document.createElement("a");
    a.href = project.finalVideoUrl;
    a.download = `888clinic-medical-promo-${project.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <section className="border border-border/70 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gold">
            <Film className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.28em]">
              Admin-only medical video pipeline
            </span>
          </div>
          <h3 className="mt-3 font-serif text-xl">
            Topic → script → scenes → clips → narration → MP4
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Build one private 45–50 second marketing video with medically constrained narration, CGI
            scene prompts, synced subtitles, and a downloadable review MP4.
          </p>
        </div>
        {project ? (
          <Badge variant="outline" className="rounded-none border-gold/40 text-gold-deep">
            {STATUS_LABELS[project.status]}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div>
            <Label htmlFor="medical-video-topic">Medical topic</Label>
            <div className="mt-2 flex gap-3">
              <Input
                id="medical-video-topic"
                className="rounded-none"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Botox for crow's feet"
              />
              <Button
                className="rounded-none gap-2"
                onClick={() => void handleCreateDraft()}
                disabled={busy !== ""}
              >
                {busy === "draft" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate draft
              </Button>
            </div>
          </div>

          {project ? (
            <>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="medical-video-script">Compliance-safe script</Label>
                  <Button
                    variant="outline"
                    className="rounded-none"
                    onClick={() => void handleSaveDraft()}
                    disabled={busy !== "" || !canEditDraft}
                  >
                    Save draft
                  </Button>
                </div>
                <Textarea
                  id="medical-video-script"
                  className="mt-2 min-h-[180px] rounded-none"
                  value={project.script}
                  onChange={(event) =>
                    setProject((current) =>
                      current ? { ...current, script: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-deep">
                      Scene prompts
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review the anatomical focus, narration, and CGI prompt for each scene before
                      starting.
                    </p>
                  </div>
                  <Button
                    className="rounded-none gap-2"
                    onClick={() => void handleStartProject()}
                    disabled={busy !== "" || !canEditDraft}
                  >
                    <Film className="size-4" />
                    Start full pipeline
                  </Button>
                </div>

                {project.scenes.map((scene, index) => {
                  const clip = project.clips.find((item) => item.sceneId === scene.id);
                  return (
                    <div key={scene.id} className="border border-border/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-none">
                            Scene {index + 1}
                          </Badge>
                          <Badge variant="secondary" className="rounded-none">
                            {scene.clipDurationSeconds}s clip
                          </Badge>
                          {clip ? (
                            <Badge variant="outline" className="rounded-none border-gold/35">
                              {clip.status === "completed"
                                ? "Clip ready"
                                : clip.status === "failed"
                                  ? "Clip failed"
                                  : `${clip.status.replace("_", " ")} · ${clip.progress}%`}
                            </Badge>
                          ) : null}
                        </div>
                        {clip?.videoUrl ? (
                          <a
                            href={clip.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-gold-deep underline underline-offset-4"
                          >
                            Open clip preview
                          </a>
                        ) : null}
                      </div>

                      <Input
                        className="mt-3 rounded-none"
                        value={scene.title}
                        onChange={(event) =>
                          setProject((current) =>
                            current
                              ? {
                                  ...current,
                                  scenes: current.scenes.map((item) =>
                                    item.id === scene.id
                                      ? { ...item, title: event.target.value }
                                      : item,
                                  ),
                                }
                              : current,
                          )
                        }
                      />

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Anatomical focus</Label>
                          <Input
                            className="mt-1 rounded-none"
                            value={scene.anatomyFocus.join(", ")}
                            onChange={(event) =>
                              setProject((current) =>
                                current
                                  ? {
                                      ...current,
                                      scenes: current.scenes.map((item) =>
                                        item.id === scene.id
                                          ? {
                                              ...item,
                                              anatomyFocus: event.target.value
                                                .split(",")
                                                .map((value) => value.trim())
                                                .filter(Boolean),
                                            }
                                          : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Narration segment</Label>
                          <Textarea
                            className="mt-1 min-h-[110px] rounded-none"
                            value={scene.narration}
                            onChange={(event) =>
                              setProject((current) =>
                                current
                                  ? {
                                      ...current,
                                      scenes: current.scenes.map((item) =>
                                        item.id === scene.id
                                          ? { ...item, narration: event.target.value }
                                          : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground">CGI scene prompt</Label>
                        <Textarea
                          className="mt-1 min-h-[140px] rounded-none"
                          value={scene.visualPrompt}
                          onChange={(event) =>
                            setProject((current) =>
                              current
                                ? {
                                    ...current,
                                    scenes: current.scenes.map((item) =>
                                      item.id === scene.id
                                        ? { ...item, visualPrompt: event.target.value }
                                        : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="border border-border/70 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gold-deep">
              Pipeline status
            </h4>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>CGI clip progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted">
                <div className="h-2 bg-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Narration segments</span>
                <span>{project?.narrationSegments.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Subtitle cues</span>
                <span>{project?.subtitleCues.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Review approval</span>
                <span>{project?.approved ? "Approved" : "Pending"}</span>
              </div>
            </div>

            {project ? (
              <Button
                variant="outline"
                className="mt-4 w-full rounded-none gap-2"
                onClick={() => void refreshProject()}
                disabled={busy !== ""}
              >
                {busy === "refresh" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh project
              </Button>
            ) : null}

            {project?.error ? (
              <p className="mt-4 text-sm text-destructive">{project.error}</p>
            ) : null}
          </div>

          {project?.narrationSegments.length ? (
            <div className="border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-gold-deep">
                <Mic2 className="size-4" /> Narration timing
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {project.narrationSegments.map((segment) => (
                  <div key={segment.sceneId} className="flex items-center justify-between gap-3">
                    <span>{segment.sceneId}</span>
                    <span>{segment.durationSeconds.toFixed(2)}s</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {project?.finalVideoUrl ? (
            <div className="border border-border/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-gold-deep">
                <CheckCircle2 className="size-4" /> Private review
              </div>
              <video
                className="mt-4 aspect-[9/16] w-full bg-black"
                controls
                src={project.finalVideoUrl}
              />
              <div className="mt-4 grid gap-3">
                <Button className="rounded-none gap-2" onClick={downloadFinalVideo}>
                  <Download className="size-4" /> Download MP4
                </Button>
                <Button
                  variant={project.approved ? "secondary" : "outline"}
                  className="rounded-none gap-2"
                  onClick={() => void handleApprove()}
                  disabled={busy !== "" || project.approved}
                >
                  {busy === "approve" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {project.approved ? "Approved" : "Approve video"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
