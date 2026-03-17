import { videoProcessingQueue } from './connection';

export type VideoProcessingJobPayload = {
  jobId: string;
  projectId: string;
  videoId: string;
  filePath: string;
  manualSegments?: { start: number; end: number; title: string }[];
  whisperModel?: string;
  useYouTubeSubtitles?: boolean;
};

export async function dispatchVideoProcessingJob(
  payload: VideoProcessingJobPayload,
) {
  return await videoProcessingQueue.add(
    `process-video-${payload.videoId}`,
    payload,
    { jobId: payload.jobId }, // We use the DB Job ID as the BullMQ Job ID to link them perfectly
  );
}
