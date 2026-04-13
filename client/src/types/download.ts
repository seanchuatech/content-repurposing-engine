export type DownloadStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export interface Download {
  id: string;
  url: string;
  title: string | null;
  status: DownloadStatus;
  progressPercent: number;
  filePath: string | null;
  error: string | null;
  createdAt: string;
}
