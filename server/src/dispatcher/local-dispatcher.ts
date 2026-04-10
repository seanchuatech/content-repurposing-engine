import { spawn } from 'node:child_process';
import path from 'node:path';
import { SignJWT } from 'jose';
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

  private async generateWorkerToken(): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const jwt = await new SignJWT({ userId: 'worker', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    return jwt;
  }

  async dispatchVideoProcessing(payload: VideoProcessingPayload): Promise<void> {
    console.log(`[LocalDispatcher] Dispatching video processing job ${payload.jobId}`);
    
    await this.spawnWorker('video-processing', payload);
  }

  async dispatchYoutubeDownload(payload: YoutubeDownloadPayload): Promise<void> {
    console.log(`[LocalDispatcher] Dispatching youtube download job ${payload.downloadId}`);

    await this.spawnWorker('youtube-download', payload);
  }

  private async spawnWorker(mode: string, payload: any) {
    const token = await this.generateWorkerToken();
    
    const workerProcess = spawn('uv', ['run', 'src/main.py'], {
      cwd: this.workersPath,
      stdio: 'inherit',
      detached: true,
      env: {
        ...process.env,
        PYTHONPATH: this.workersPath,
        JOB_MODE: mode,
        JOB_PAYLOAD: JSON.stringify(payload),
        WORKER_API_TOKEN: token,
      },
    });

    workerProcess.unref();

    workerProcess.on('error', (err) => {
      console.error(`[LocalDispatcher] Failed to spawn worker:`, err);
    });
  }
}
