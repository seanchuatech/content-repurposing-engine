import { useState, useEffect } from 'react';
import { Job, JobStatus } from '../types/video';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function useJobStatus(jobId: string | undefined) {
  const [job, setJob] = useState<Partial<Job> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}/events`);

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        setJob((prev) => ({
          ...prev,
          status: data.status,
          progressPercent: data.progressPercent,
          failedReason: data.failedReason,
        }));
      } catch (err) {
        console.error('Failed to parse job progress:', err);
      }
    });

    eventSource.addEventListener('completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        setJob((prev) => ({
          ...prev,
          status: data.status,
          progressPercent: 100,
        }));
        // We might want to trigger a data refresh in the parent component here
      } catch (err) {
        console.error('Failed to parse job completion:', err);
      }
    });

    eventSource.addEventListener('failed', (event) => {
      try {
        const data = JSON.parse(event.data);
        setJob((prev) => ({
          ...prev,
          status: 'FAILED',
          failedReason: data.error,
        }));
      } catch (err) {
        console.error('Failed to parse job failure:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection to progress stream lost.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { job, error };
}
