export interface VideoProcessingPayload {
  jobId: string;
  projectId: string;
  videoId: string;
  filePath: string;
  manualSegments?: { start: number; end: number; title: string }[];
  whisperModel?: string;
  useYouTubeSubtitles?: boolean;
  llmBackend?: string;
  llmModel?: string;
  onlyClipId?: string;
}

export interface YoutubeDownloadPayload {
  downloadId: string;
  youtubeUrl: string;
  quality: string;
  formatString: string;
}

export interface JobDispatcher {
  dispatchVideoProcessing(payload: VideoProcessingPayload): Promise<void>;
  dispatchYoutubeDownload(payload: YoutubeDownloadPayload): Promise<void>;
}
