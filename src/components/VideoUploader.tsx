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
    </div>
  );
}
