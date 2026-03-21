export const JobState = {
  PENDING: 'PENDING',
  TRANSCRIBING: 'TRANSCRIBING',
  ANALYZING: 'ANALYZING',
  CLIPPING: 'CLIPPING',
  CAPTIONING: 'CAPTIONING',
  REFRAMING: 'REFRAMING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type JobStateType = (typeof JobState)[keyof typeof JobState];
