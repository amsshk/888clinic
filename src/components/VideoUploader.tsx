import { useState } from 'react';

export default function VideoUploader({ onSuccess }: { onSuccess?: (result: any) => void }) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [captionBg, setCaptionBg] = useState('#000000');
  const [captionPosition, setCaptionPosition] = useState<'top' | 'bottom'>('bottom');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const onVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
  };

  const uploadVideo = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('caption', captionText);
      formData.append('captionBg', captionBg);
      formData.append('captionPosition', captionPosition);

      const response = await fetch('/api/upload-video', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setMessage('✓ Video uploaded in HD!');
      if (onSuccess) onSuccess(result);
      setVideoFile(null);
      setCaptionText('');
    } catch (error) {
      setMessage(`✗ Error: ${error instanceof Error ? error.message : 'Failed'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="video-uploader space-y-6 p-6 bg-white rounded-lg border border-gray-200 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Upload Video</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <input type="file" accept="video/*" onChange={onVideoSelect} disabled={isUploading} />
        <p className="text-sm text-gray-500 mt-2">Videos encoded to 1080p HD</p>
      </div>
      <input
        type="text"
        placeholder="Caption text (optional)"
        value={captionText}
        onChange={(e) => setCaptionText(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
      <button
        onClick={uploadVideo}
        disabled={!videoFile || isUploading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
      >
        {isUploading ? 'Processing...' : 'Upload & Process'}
      </button>
      {message && <div className="p-4 rounded-lg bg-gray-100">{message}</div>}
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Film, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

type UploadResponse = {
  ok: boolean;
  url?: string;
  error?: string;
};

/**
 * Uploads a video file to S3 via /api/upload-video. The backend re-encodes the
 * file to HD (FFmpeg) before storing it, so this component only needs to hand
 * off the raw file and an optional caption.
 */
export function VideoUploader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  function pickFile(picked: File | null) {
    setFile(picked);
    setUploadedUrl(null);
    setProgress(0);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setUploadedUrl(null);

    try {
      const formData = new FormData();
      formData.append("video", file);
      if (caption.trim()) formData.append("caption", caption.trim());

      const result = await new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload-video");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText) as UploadResponse;
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error ?? "Upload failed"));
            }
          } catch {
            reject(new Error("Unexpected response from the server"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading"));
        xhr.send(formData);
      });

      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Video upload failed");
        return;
      }

      setUploadedUrl(result.url);
      toast.success("Video uploaded", { description: "HD encoding applied and saved to storage." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Video upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <Film className="mt-1 size-5 text-gold" />
        <div>
          <h2 className="text-lg">Upload video</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a video file to upload. The server re-encodes it to HD with FFmpeg and stores it
            in S3.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="video-file">Video file</Label>
          <div className="mt-2 border border-dashed border-border p-6 text-center">
            {file ? (
              <p className="text-sm">{file.name}</p>
            ) : (
              <Upload className="mx-auto size-6 text-muted-foreground" />
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "MP4, MOV or WebM"}
            </p>
            <input
              ref={fileRef}
              id="video-file"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-none"
              onClick={() => fileRef.current?.click()}
            >
              {file ? "Change file" : "Choose file"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="video-caption">Caption (optional)</Label>
          <Textarea
            id="video-caption"
            className="mt-2 rounded-none"
            rows={5}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Add a short caption or description for this video"
            maxLength={500}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button className="rounded-none" disabled={!file || busy} onClick={() => void upload()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Uploading…" : "Upload video"}
        </Button>
        {busy && (
          <div className="flex min-w-[180px] items-center gap-3">
            <Progress value={progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>

      {uploadedUrl && (
        <div className="mt-6 bg-shell p-3">
          <video src={uploadedUrl} controls playsInline preload="metadata" className="w-full bg-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Uploaded to {uploadedUrl}</p>
        </div>
      )}
    </div>
  );
}
