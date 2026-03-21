import { videoProcessingQueue, downloadQueue } from './connection';

export type VideoProcessingJobPayload = {
  jobId: string;
  projectId: string;
  videoId: string;
  filePath: string;
  manualSegments?: { start: number; end: number; title: string }[];
  whisperModel?: string;
  useYouTubeSubtitles?: boolean;
  transcriptionBackend?: string;
  llmBackend?: string;
  llmModel?: string;
  onlyClipId?: string;
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

export type YoutubeDownloadJobPayload = {
  downloadId: string;
  youtubeUrl: string;
  quality: string;
  formatString: string;
};

export async function dispatchYoutubeDownloadJob(
  payload: YoutubeDownloadJobPayload,
) {
  return await downloadQueue.add(
    `download-youtube-${payload.downloadId}`,
    payload,
    { jobId: payload.downloadId }, // DB Download ID maps exactly to BullMQ Job ID
  );
}
