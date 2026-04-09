import { spawn } from 'node:child_process';
import path from 'node:path';
import type {
  JobDispatcher,
  VideoProcessingPayload,
  YoutubeDownloadPayload,
} from './types';

export class LocalDispatcher implements JobDispatcher {
  private workersPath: string;

  constructor() {
    this.workersPath = path.resolve(__dirname, '../../../workers');
  }

  async dispatchVideoProcessing(payload: VideoProcessingPayload): Promise<void> {
    console.log(`[LocalDispatcher] Dispatching video processing job ${payload.jobId}`);
    
    this.spawnWorker('video-processing', payload);
  }

  async dispatchYoutubeDownload(payload: YoutubeDownloadPayload): Promise<void> {
    console.log(`[LocalDispatcher] Dispatching youtube download job ${payload.downloadId}`);

    this.spawnWorker('youtube-download', payload);
  }

  private spawnWorker(mode: string, payload: any) {
    const workerProcess = spawn('uv', ['run', 'src/main.py'], {
      cwd: this.workersPath,
      stdio: 'inherit',
      detached: true,
      env: {
        ...process.env,
        JOB_MODE: mode,
        JOB_PAYLOAD: JSON.stringify(payload),
      },
    });

    workerProcess.unref();

    workerProcess.on('error', (err) => {
      console.error(`[LocalDispatcher] Failed to spawn worker:`, err);
    });
  }
}
