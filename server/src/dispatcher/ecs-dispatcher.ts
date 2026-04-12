import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import type {
  JobDispatcher,
  VideoProcessingPayload,
  YoutubeDownloadPayload,
} from './types';

export class ECSDispatcher implements JobDispatcher {
  private ecs: ECSClient;

  constructor() {
    this.ecs = new ECSClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
    });
  }

  async dispatchVideoProcessing(
    payload: VideoProcessingPayload,
  ): Promise<void> {
    await this.runTask('video-processing', payload);
  }

  async dispatchYoutubeDownload(
    payload: YoutubeDownloadPayload,
  ): Promise<void> {
    await this.runTask('youtube-download', payload);
  }

  private async runTask(mode: string, payload: any) {
    const command = new RunTaskCommand({
      cluster: process.env.ECS_CLUSTER_ARN,
      taskDefinition: process.env.WORKER_TASK_DEF_ARN,
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: process.env.ECS_SUBNETS?.split(',') || [],
          securityGroups: process.env.ECS_SECURITY_GROUPS?.split(',') || [],
          assignPublicIp: 'ENABLED',
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: 'worker',
            environment: [
              { name: 'JOB_MODE', value: mode },
              { name: 'JOB_PAYLOAD', value: JSON.stringify(payload) },
            ],
          },
        ],
      },
    });

    try {
      const response = await this.ecs.send(command);
      console.log(
        `[ECSDispatcher] Task started: ${response.tasks?.[0]?.taskArn}`,
      );
    } catch (error) {
      console.error(`[ECSDispatcher] Failed to run task:`, error);
      throw error;
    }
  }
}
