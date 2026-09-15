import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Film,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export type AnimationSceneKey = "botox-map" | "filler-contours" | "mali-scan" | "treatment-pair";

interface SceneMarker {
  id: string;
  nameEn: string;
  nameTh: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  units: string;
  depth: string;
  category: "botox" | "filler" | "scan";
  activeFrameRange: [number, number];
}

const SCENES: {
  id: AnimationSceneKey;
  titleEn: string;
  titleTh: string;
  subtitle: string;
  durationFrames: number;
  markers: SceneMarker[];
}[] = [
  {
    id: "botox-map",
    titleEn: "Upper Facial Neuromodulator Precision Map",
    titleTh: "แผนผังการฉีดโบท็อกซ์ใบหน้าส่วนบน",
    subtitle: "Frontalis, Corrugator, Procerus, and Orbicularis Oculi micro-injection sites",
    durationFrames: 240, // 8s at 30fps
    markers: [
      {
        id: "forehead-1",
        nameEn: "Forehead Lines (Frontalis)",
        nameTh: "ริ้วรอยหน้าผาก",
        x: 50,
        y: 22,
        units: "12–16 Units",
        depth: "Intramuscular 2.0mm",
        category: "botox",
        activeFrameRange: [20, 240],
      },
      {
        id: "forehead-l",
        nameEn: "Frontalis Lateral (L)",
        nameTh: "กล้ามเนื้อหน้าผากด้านซ้าย",
        x: 35,
        y: 25,
        units: "4 Units",
        depth: "Intramuscular 1.8mm",
        category: "botox",
        activeFrameRange: [35, 240],
      },
      {
        id: "forehead-r",
        nameEn: "Frontalis Lateral (R)",
        nameTh: "กล้ามเนื้อหน้าผากด้านขวา",
        x: 65,
        y: 25,
        units: "4 Units",
        depth: "Intramuscular 1.8mm",
        category: "botox",
        activeFrameRange: [35, 240],
      },
      {
        id: "glabella-c",
        nameEn: "Frown Lines / Glabella",
        nameTh: "หว่างคิ้ว / กล้ามเนื้อโพรซิรัส",
        x: 50,
        y: 33,
        units: "16–20 Units",
        depth: "Deep Intramuscular 3.5mm",
        category: "botox",
        activeFrameRange: [60, 240],
      },
      {
        id: "crows-l",
        nameEn: "Crow's Feet Lateral (L)",
        nameTh: "ตีนกา / หางตาซ้าย",
        x: 24,
        y: 39,
        units: "8–12 Units",
        depth: "Subdermal Weal 1.0mm",
        category: "botox",
        activeFrameRange: [90, 240],
      },
      {
        id: "crows-r",
        nameEn: "Crow's Feet Lateral (R)",
        nameTh: "ตีนกา / หางตาขวา",
        x: 76,
        y: 39,
        units: "8–12 Units",
        depth: "Subdermal Weal 1.0mm",
        category: "botox",
        activeFrameRange: [90, 240],
      },
    ],
  },
  {
    id: "filler-contours",
    titleEn: "Mid & Lower Face Hyaluronic Volumization",
    titleTh: "การเติมเต็มฟิลเลอร์ไฮยาลูโรนิก ปรับรูปหน้า",
    subtitle: "Cheek Apex, Nasolabial Fold, Lip Architecture, and Mentalis Projection",
    durationFrames: 240,
    markers: [
      {
        id: "cheek-l",
        nameEn: "Malar Apex Projection (L)",
        nameTh: "โหนกแก้ม / แก้มส้มซ้าย",
        x: 33,
        y: 50,
        units: "0.5–1.0 ml",
        depth: "Supra-periosteal Bolus",
        category: "filler",
        activeFrameRange: [25, 240],
      },
      {
        id: "cheek-r",
        nameEn: "Malar Apex Projection (R)",
        nameTh: "โหนกแก้ม / แก้มส้มขวา",
        x: 67,
        y: 50,
        units: "0.5–1.0 ml",
        depth: "Supra-periosteal Bolus",
        category: "filler",
        activeFrameRange: [25, 240],
      },
      {
        id: "nasolabial-l",
        nameEn: "Pyriform Aperture (L)",
        nameTh: "ร่องแก้มซ้าย",
        x: 40,
        y: 60,
        units: "0.5 ml",
        depth: "Deep Subcutaneous Linear",
        category: "filler",
        activeFrameRange: [65, 240],
      },
      {
        id: "nasolabial-r",
        nameEn: "Pyriform Aperture (R)",
        nameTh: "ร่องแก้มขวา",
        x: 60,
        y: 60,
        units: "0.5 ml",
        depth: "Deep Subcutaneous Linear",
        category: "filler",
        activeFrameRange: [65, 240],
      },
      {
        id: "lips-vermilion",
        nameEn: "Vermilion Border & Body",
        nameTh: "ริมฝีปาก / ขอบปากกระจับ",
        x: 50,
        y: 72,
        units: "1.0 ml",
        depth: "Submucosal / Retrograde",
        category: "filler",
        activeFrameRange: [110, 240],
      },
      {
        id: "chin-pogonion",
        nameEn: "Pogonion Chin Projection",
        nameTh: "คาง / ปรับแนวกราม",
        x: 50,
        y: 86,
        units: "1.0–2.0 ml",
        depth: "Periosteal Structural Deposit",
        category: "filler",
        activeFrameRange: [145, 240],
      },
    ],
  },
  {
    id: "mali-scan",
    titleEn: "Dr MALI AI Multispectral Dermatology Sweep",
    titleTh: "การตรวจสแกนสภาพผิวด้วยระบบ AI ดร. มะลิ",
    subtitle: "Hydration index, UV pigmentation, erythema sensitivity, and pore micro-topology",
    durationFrames: 240,
    markers: [
      {
        id: "scan-forehead",
        nameEn: "Forehead Hydration & Sebum Balance",
        nameTh: "ความชุ่มชื้นและความมันบริเวณหน้าผาก",
        x: 50,
        y: 24,
        units: "Hydration: 78%",
        depth: "Epidermal Surface",
        category: "scan",
        activeFrameRange: [20, 240],
      },
      {
        id: "scan-eyes",
        nameEn: "Periorbital Micro-Circulation",
        nameTh: "การไหลเวียนโลหิตรอบดวงตา",
        x: 50,
        y: 38,
        units: "Elasticity: 84%",
        depth: "Dermal Capillary Layer",
        category: "scan",
        activeFrameRange: [60, 240],
      },
      {
        id: "scan-cheeks",
        nameEn: "Malar Melanin & Pigment Uniformity",
        nameTh: "การกระจายตัวของเม็ดสีเมลานิน",
        x: 50,
        y: 54,
        units: "Uniformity: 92%",
        depth: "Basal Dermal Layer",
        category: "scan",
        activeFrameRange: [100, 240],
      },
      {
        id: "scan-tzone",
        nameEn: "T-Zone Collagen Density Score",
        nameTh: "ความหนาแน่นของคอลลาเจนบริเวณ T-Zone",
        x: 50,
        y: 75,
        units: "Density: 88/100",
        depth: "Reticular Dermis",
        category: "scan",
        activeFrameRange: [140, 240],
      },
    ],
  },
  {
    id: "treatment-pair",
    titleEn: "Synchronized Aesthetic Protocol (Full Face)",
    titleTh: "แผนการรักษาแบบองค์รวม (โบท็อกซ์ + ฟิลเลอร์ + สแกน)",
    subtitle: "Harmonized neuromodulator relaxers with structural volumization anchors",
    durationFrames: 240,
    markers: [
      {
        id: "full-upper",
        nameEn: "Upper Face Line Softening",
        nameTh: "ลดเลือนริ้วรอยส่วนบน",
        x: 50,
        y: 25,
        units: "Botox 24U",
        depth: "Myomodulation",
        category: "botox",
        activeFrameRange: [20, 240],
      },
      {
        id: "full-mid",
        nameEn: "Mid-Face Structural Lift",
        nameTh: "ยกกระชับใบหน้าส่วนกลาง",
        x: 36,
        y: 52,
        units: "HA Filler 1.0ml",
        depth: "Deep Bolus",
        category: "filler",
        activeFrameRange: [60, 240],
      },
      {
        id: "full-lower",
        nameEn: "Jawline & Chin Definition",
        nameTh: "เน้นกรอบหน้าและคางเรียว",
        x: 50,
        y: 84,
        units: "HA Filler 1.5ml",
        depth: "Periosteal",
        category: "filler",
        activeFrameRange: [110, 240],
      },
    ],
  },
];

export function MedicalAnimationStudio() {
  const [selectedScene, setSelectedScene] = useState<AnimationSceneKey>("botox-map");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loop, setLoop] = useState(true);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  // Layer Visibility Controls
  const [showAnatomyGuide, setShowAnatomyGuide] = useState(true);
  const [showInjectionMarkers, setShowInjectionMarkers] = useState(true);
  const [showDepthBadge, setShowDepthBadge] = useState(true);
  const [showThaiLabels, setShowThaiLabels] = useState(true);
  const [showLaserSweep, setShowLaserSweep] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Export Settings State
  const [exportAspect, setExportAspect] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [exportQuality, setExportQuality] = useState<"1080p" | "4k">("1080p");
  const [selectedLang, setSelectedLang] = useState<"bilingual" | "th" | "en">("bilingual");

  const currentSceneConfig = useMemo(() => {
    return SCENES.find((s) => s.id === selectedScene) || SCENES[0];
  }, [selectedScene]);

  const maxFrames = currentSceneConfig.durationFrames;
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      return;
    }

    const frameDurationMs = 1000 / (30 * playbackSpeed);

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;

      if (delta >= frameDurationMs) {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= maxFrames) {
            if (loop) return 0;
            setIsPlaying(false);
            return maxFrames - 1;
          }
          return next;
        });
        lastTimeRef.current = timestamp;
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, maxFrames, loop, playbackSpeed]);

  // Handle scene change
  const handleSceneChange = (sceneId: AnimationSceneKey) => {
    setSelectedScene(sceneId);
    setCurrentFrame(0);
    setActiveMarkerId(null);
  };

  const handleTogglePlay = () => {
    if (currentFrame >= maxFrames - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  // Export Scene Blueprint JSON
  const handleDownloadBlueprint = () => {
    const blueprint = {
      generator: "888clinic Medical Animation Studio",
      timestamp: new Date().toISOString(),
      scene: currentSceneConfig.id,
      title: currentSceneConfig.titleEn,
      titleTh: currentSceneConfig.titleTh,
      aspectRatio: exportAspect,
      quality: exportQuality,
      durationFrames: maxFrames,
      fps: 30,
      totalSeconds: (maxFrames / 30).toFixed(1),
      languagePreference: selectedLang,
      layerVisibility: {
        anatomyGuide: showAnatomyGuide,
        injectionMarkers: showInjectionMarkers,
        depthBadges: showDepthBadge,
        thaiLabels: showThaiLabels,
        laserSweep: showLaserSweep,
        grid: showGrid,
      },
      markers: currentSceneConfig.markers,
    };

    const blob = new Blob([JSON.stringify(blueprint, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `888clinic-animation-blueprint-${selectedScene}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Animation schematic blueprint downloaded");
  };

  // Laser sweep calculation
  const sweepY = ((currentFrame % 120) / 120) * 100;
  const timeSeconds = (currentFrame / 30).toFixed(2);
  const totalSeconds = (maxFrames / 30).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="border border-gold/40 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center border border-gold/40 bg-gold/10 text-gold">
              <Film className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl tracking-wide">Medical Animation Studio</h2>
                <Badge variant="outline" className="border-gold/60 text-gold">
                  Interactive Prototype
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Design and simulate clinical motion animations, facial anatomy injection vectors,
                and Dr MALI multispectral scan sequences for marketing campaigns and patient
                education.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-border/80"
              onClick={handleDownloadBlueprint}
            >
              <Download className="mr-1.5 size-4" /> Download Scene Spec (.json)
            </Button>
          </div>
        </div>

        {/* Scene Selection Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {SCENES.map((scene) => {
            const isSelected = scene.id === selectedScene;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSceneChange(scene.id)}
                className={`flex items-center gap-2 border px-3.5 py-2 text-left text-xs transition ${
                  isSelected
                    ? "border-gold bg-gold/15 text-foreground font-medium shadow-xs"
                    : "border-border/70 text-muted-foreground hover:border-gold/50 hover:text-foreground"
                }`}
              >
                <div
                  className={`size-2 rounded-full ${
                    isSelected ? "bg-gold ring-2 ring-gold/30" : "bg-muted-foreground/40"
                  }`}
                />
                <div>
                  <div className="font-sans">{scene.titleEn}</div>
                  <div className="text-[10px] text-muted-foreground">{scene.titleTh}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Studio Viewport & Control Desk */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Viewport Screen & Timeline */}
        <div className="flex flex-col space-y-4">
          {/* Viewport Frame */}
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-border/80 bg-[#08080a] text-white shadow-inner sm:aspect-[16/10]">
            {/* Background Aesthetic Grid */}
            {showGrid && (
              <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(212, 175, 55, 0.25) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(212, 175, 55, 0.25) 1px, transparent 1px)
                  `,
                  backgroundSize: "32px 32px",
                }}
              />
            )}

            {/* Viewport Info Overlay (Top Left & Top Right) */}
            <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-col gap-1 font-mono text-[11px] text-gold/80">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 animate-pulse rounded-full bg-gold" />
                <span>888CLINIC_STUDIO // {selectedScene.toUpperCase()}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                FRAME: {currentFrame.toString().padStart(3, "0")} / {maxFrames} ({timeSeconds}s /{" "}
                {totalSeconds}s)
              </span>
            </div>

            <div className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="border border-border/60 bg-black/60 px-2 py-0.5 text-[10px]">
                {exportAspect}
              </span>
              <span className="border border-border/60 bg-black/60 px-2 py-0.5 text-[10px]">
                30 FPS
              </span>
            </div>

            {/* Medical Facial SVG Anatomy Silhouette */}
            <div className="relative h-[86%] w-[70%] max-w-[420px]">
              {showAnatomyGuide && (
                <svg
                  viewBox="0 0 400 520"
                  className="absolute inset-0 h-full w-full opacity-65 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                >
                  {/* Outer Cranial & Mandibular Oval */}
                  <path
                    d="M 200,30 C 290,30 350,110 350,220 C 350,340 280,470 200,485 C 120,470 50,340 50,220 C 50,110 110,30 200,30 Z"
                    stroke="rgba(212, 175, 55, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Forehead Contour */}
                  <path
                    d="M 110,120 Q 200,90 290,120"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                  />
                  {/* Eyebrow Arcs */}
                  <path
                    d="M 110,175 Q 150,160 185,175"
                    stroke="rgba(212, 175, 55, 0.7)"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M 215,175 Q 250,160 290,175"
                    stroke="rgba(212, 175, 55, 0.7)"
                    strokeWidth="1.8"
                  />
                  {/* Eye Orbits */}
                  <ellipse
                    cx="150"
                    cy="200"
                    rx="32"
                    ry="16"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                  />
                  <ellipse
                    cx="250"
                    cy="200"
                    rx="32"
                    ry="16"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                  />
                  {/* Central Vertical Symmetry Axis */}
                  <line
                    x1="200"
                    y1="35"
                    x2="200"
                    y2="480"
                    stroke="rgba(212, 175, 55, 0.25)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  {/* Nasal Bridge & Tip */}
                  <path
                    d="M 200,180 L 195,280 Q 200,295 205,280 Z"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1.2"
                  />
                  {/* Cheek Apex Contours */}
                  <path
                    d="M 100,260 Q 140,290 170,270"
                    stroke="rgba(212, 175, 55, 0.35)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 300,260 Q 260,290 230,270"
                    stroke="rgba(212, 175, 55, 0.35)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  {/* Lip Vermilion */}
                  <path
                    d="M 160,365 Q 200,350 240,365 Q 200,390 160,365 Z"
                    stroke="rgba(212, 175, 55, 0.6)"
                    strokeWidth="1.4"
                  />
                  {/* Mentalis Chin Curve */}
                  <path
                    d="M 175,435 Q 200,450 225,435"
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth="1.2"
                  />
                </svg>
              )}

              {/* Laser Scanning Sweep Line */}
              {showLaserSweep && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center transition-all duration-75"
                  style={{ top: `${sweepY}%` }}
                >
                  <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_rgba(212,175,55,0.9)]" />
                  <div className="absolute right-0 translate-x-3 text-[9px] font-mono text-gold/90">
                    MALI_AI_SCAN
                  </div>
                </div>
              )}

              {/* Clinical Markers Interactive Layer */}
              {showInjectionMarkers &&
                currentSceneConfig.markers.map((marker) => {
                  const isVisible =
                    currentFrame >= marker.activeFrameRange[0] &&
                    currentFrame <= marker.activeFrameRange[1];
                  const isFocused = activeMarkerId === marker.id;

                  const colorClass =
                    marker.category === "botox"
                      ? "border-gold bg-gold/20 text-gold"
                      : marker.category === "filler"
                        ? "border-amber-400 bg-amber-400/20 text-amber-300"
                        : "border-sky-400 bg-sky-400/20 text-sky-300";

                  const dotColor =
                    marker.category === "botox"
                      ? "bg-gold shadow-[0_0_8px_#d4af37]"
                      : marker.category === "filler"
                        ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                        : "bg-sky-400 shadow-[0_0_8px_#38bdf8]";

                  return (
                    <div
                      key={marker.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                        isVisible ? "scale-100 opacity-100" : "scale-75 opacity-20 pointer-events-none"
                      }`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      {/* Pulse Ring */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMarkerId(activeMarkerId === marker.id ? null : marker.id)
                        }
                        className="group relative flex size-7 items-center justify-center focus:outline-hidden"
                        title={marker.nameEn}
                      >
                        <span
                          className={`absolute size-6 rounded-full border opacity-75 transition-transform group-hover:scale-125 ${
                            isFocused ? "scale-150 animate-ping border-gold" : "border-gold/40"
                          }`}
                        />
                        <span className={`size-2.5 rounded-full ${dotColor}`} />
                      </button>

                      {/* Tooltip / Label Overlay */}
                      {(isFocused || isVisible) && (
                        <div
                          className={`pointer-events-none absolute left-8 top-1/2 z-30 min-w-[170px] -translate-y-1/2 rounded-none border border-gold/40 bg-black/90 p-2 text-left shadow-lg backdrop-blur-xs transition-opacity duration-200 ${
                            isFocused ? "opacity-100 ring-1 ring-gold" : "opacity-85"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-semibold text-gold uppercase">
                              {marker.category}
                            </span>
                            {showDepthBadge && (
                              <span className="font-mono text-[9px] text-muted-foreground">
                                {marker.units}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-white">
                            {selectedLang === "th"
                              ? marker.nameTh
                              : selectedLang === "en"
                                ? marker.nameEn
                                : marker.nameEn}
                          </div>
                          {showThaiLabels && selectedLang === "bilingual" && (
                            <div className="text-[10px] text-muted-foreground">{marker.nameTh}</div>
                          )}
                          {showDepthBadge && (
                            <div className="mt-1 border-t border-border/40 pt-1 font-mono text-[9px] text-gold/75">
                              Target: {marker.depth}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Bottom Caption Overlay */}
            <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20 flex items-end justify-between border-t border-border/40 bg-black/70 p-2 text-xs backdrop-blur-xs">
              <div>
                <span className="font-serif text-gold">{currentSceneConfig.titleEn}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{currentSceneConfig.subtitle}</span>
              </div>
              <div className="font-mono text-[10px] text-gold/80">888CLINIC BANGKOK</div>
            </div>
          </div>

          {/* Timeline & Player Controls */}
          <div className="border border-border/70 bg-card p-4 shadow-sm">
            {/* Scrubber Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono text-foreground font-medium">
                  {timeSeconds}s / {totalSeconds}s
                </span>
                <span className="font-mono">
                  Frame {currentFrame} / {maxFrames}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={maxFrames - 1}
                value={currentFrame}
                onChange={(e) => {
                  setCurrentFrame(Number(e.target.value));
                  if (isPlaying) setIsPlaying(false);
                }}
                className="h-2 w-full cursor-pointer accent-gold"
              />
            </div>

            {/* Playback Buttons Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none border-gold/40 hover:bg-gold/10"
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-1.5 size-4 text-gold" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 size-4 text-gold" /> Play
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-none"
                  onClick={handleReset}
                  title="Reset to start"
                >
                  <RotateCcw className="size-4" />
                </Button>
                <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                  <span className="text-[11px] text-muted-foreground">Speed:</span>
                  {[0.5, 1, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-1.5 py-0.5 text-xs font-mono transition ${
                        playbackSpeed === speed
                          ? "bg-gold text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`rounded-none text-xs ${loop ? "text-gold" : "text-muted-foreground"}`}
                  onClick={() => setLoop(!loop)}
                >
                  <RefreshCw className="mr-1 size-3.5" /> Loop {loop ? "ON" : "OFF"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Studio Configurator & Render Notice */}
        <div className="space-y-6">
          {/* Layer Visibility Controls */}
          <div className="border border-border/70 bg-card p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Layers className="size-4 text-gold" />
              <h3 className="font-serif text-sm font-semibold tracking-wide">Scene Layers</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Anatomy Silhouette Guide",
                  val: showAnatomyGuide,
                  set: setShowAnatomyGuide,
                },
                {
                  label: "Injection Vector Markers",
                  val: showInjectionMarkers,
                  set: setShowInjectionMarkers,
                },
                {
                  label: "Target Dosage & Depth",
                  val: showDepthBadge,
                  set: setShowDepthBadge,
                },
                {
                  label: "Thai Nomenclature Labels",
                  val: showThaiLabels,
                  set: setShowThaiLabels,
                },
                {
                  label: "Dr MALI Laser Sweep",
                  val: showLaserSweep,
                  set: setShowLaserSweep,
                },
                {
                  label: "Precision Perspective Grid",
                  val: showGrid,
                  set: setShowGrid,
                },
              ].map((layer, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{layer.label}</span>
                  <button
                    type="button"
                    onClick={() => layer.set(!layer.val)}
                    className={`flex items-center gap-1 rounded-none border px-2 py-0.5 text-[11px] transition ${
                      layer.val
                        ? "border-gold/50 bg-gold/10 text-foreground font-medium"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {layer.val ? <Eye className="size-3 text-gold" /> : <EyeOff className="size-3" />}
                    {layer.val ? "Visible" : "Hidden"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Export & Render Action Panel */}
          <div className="border border-border/70 bg-card p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sliders className="size-4 text-gold" />
              <h3 className="font-serif text-sm font-semibold tracking-wide">Export &amp; Render</h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Aspect Ratio Format</Label>
                <Select
                  value={exportAspect}
                  onValueChange={(val: "9:16" | "1:1" | "16:9") => setExportAspect(val)}
                >
                  <SelectTrigger className="mt-1.5 h-8 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">Vertical 9:16 (IG Reels / Stories)</SelectItem>
                    <SelectItem value="1:1">Square 1:1 (Feed Carousel)</SelectItem>
                    <SelectItem value="16:9">Landscape 16:9 (Display Screen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Language Subtitles</Label>
                <Select
                  value={selectedLang}
                  onValueChange={(val: "bilingual" | "th" | "en") => setSelectedLang(val)}
                >
                  <SelectTrigger className="mt-1.5 h-8 rounded-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bilingual">Bilingual (English + Thai)</SelectItem>
                    <SelectItem value="th">Thai Primary (ภาษาไทย)</SelectItem>
                    <SelectItem value="en">English Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Render Notice & Disabled Action Button */}
              <div className="space-y-3 pt-2">
                <div
                  role="status"
                  className="flex items-start gap-2.5 border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      Prototype Mode Notice:
                    </span>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      The Medical Animation Studio is currently in interactive preview mode.
                      Direct offline MP4 video export is intentionally disabled while the
                      server-side Remotion render pipeline is calibrated. You can simulate, scrub,
                      and export JSON blueprints.
                    </p>
                  </div>
                </div>

                <Button
                  disabled
                  className="w-full rounded-none opacity-60 cursor-not-allowed"
                >
                  <Film className="mr-2 size-4" /> Render MP4 Video (Disabled)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
