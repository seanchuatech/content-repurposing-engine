import { ECSDispatcher } from './ecs-dispatcher';
import { LocalDispatcher } from './local-dispatcher';
import type { JobDispatcher } from './types';

let dispatcher: JobDispatcher;

export function getDispatcher(): JobDispatcher {
  if (dispatcher) return dispatcher;

  if (process.env.NODE_ENV === 'production' && process.env.ECS_CLUSTER_ARN) {
    dispatcher = new ECSDispatcher();
  } else {
    dispatcher = new LocalDispatcher();
  }

  return dispatcher;
}

export * from './types';
