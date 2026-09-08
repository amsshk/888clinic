import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event);
    if (!formData) throw new Error('No form data');

    const videoFile = formData.find((f) => f.name === 'video');
    const captionText = formData.find((f) => f.name === 'caption')?.data?.toString() || '';
    const captionBg = formData.find((f) => f.name === 'captionBg')?.data?.toString() || '#000000';
    const captionPos = formData.find((f) => f.name === 'captionPosition')?.data?.toString() || 'bottom';

    if (!videoFile?.data) throw new Error('No video file');

    const s3Config = {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      bucket: process.env.BUCKET,
      endpoint: process.env.ENDPOINT,
      region: process.env.REGION,
    };

    if (!Object.values(s3Config).every(Boolean)) {
      throw new Error('S3 bucket not configured');
    }

    const tempDir = '/tmp/videos';
    await mkdir(tempDir, { recursive: true });
    const timestamp = Date.now();
    const tempInput = join(tempDir, `input-${timestamp}.mp4`);
    const tempOutput = join(tempDir, `output-${timestamp}.mp4`);

    await writeFile(tempInput, videoFile.data);

    let ffmpegCmd = `ffmpeg -i "${tempInput}" -c:v libx264 -preset medium -crf 20 -b:v 8000k -s 1920x1080 -r 30 -c:a aac -b:a 128k`;

    if (captionText.trim()) {
      const captionY = captionPos === 'bottom' ? 'h-60' : '60';
      const escapedCaption = captionText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
      ffmpegCmd += ` -vf "drawtext=text='${escapedCaption}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=${captionY}:box=1:boxcolor=${captionBg}@0.8:boxborderw=10"`;
    }

    ffmpegCmd += ` -y "${tempOutput}"`;
    await execAsync(ffmpegCmd);

    const client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    const videoData = await readFile(tempOutput);
    const videoKey = `videos/${timestamp}-${Math.random().toString(36).slice(2)}.mp4`;

    await client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: videoKey,
      Body: videoData,
      ContentType: 'video/mp4',
    }));

    await Promise.all([rm(tempInput, { force: true }), rm(tempOutput, { force: true })]);

    return {
      success: true,
      videoUrl: `${s3Config.endpoint}/${s3Config.bucket}/${videoKey}`,
      videoKey,
      message: 'Video uploaded and processed in HD',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Video processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
