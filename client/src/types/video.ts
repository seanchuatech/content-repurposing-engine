export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithDetails extends Project {
  video: {
    originalName: string;
    mimeType: string;
    durationSeconds: number | null;
  } | null;
  job: {
    status: JobStatus;
    progressPercent: number;
    transcriptionBackend: string | null;
    whisperModel: string | null;
    llmBackend: string | null;
    llmModel: string | null;
  } | null;
  clipCount: number;
}

export interface Video {
  id: string;
  projectId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface Clip {
  id: string;
  projectId: string;
  videoId: string;
  jobId: string;
  filePath: string;
  startTime: number;
  endTime: number;
  viralityScore: number;
  title: string;
  explanation: string;
  createdAt: string;
}

export type JobStatus =
  | 'PENDING'
  | 'TRANSCRIBING'
  | 'ANALYZING'
  | 'CLIPPING'
  | 'CAPTIONING'
  | 'REFRAMING'
  | 'COMPLETED'
  | 'FAILED';

export interface Job {
  id: string;
  projectId: string;
  videoId: string;
  status: JobStatus;
  progressPercent: number;
  failedReason: string | null;
  clips?: Clip[];
  createdAt: string;
  updatedAt: string;
}
