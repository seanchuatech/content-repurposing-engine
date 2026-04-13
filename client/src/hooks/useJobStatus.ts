import { useEffect, useState } from 'react';
import type { Job } from '../types/video';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function useJobStatus(jobId: string | undefined) {
  const [job, setJob] = useState<Partial<Job> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const token = localStorage.getItem('auth_token');
    const url = new URL(`${API_BASE_URL}/jobs/${jobId}/events`);
    if (token) url.searchParams.set('token', token);

    const eventSource = new EventSource(url.toString());

    eventSource.addEventListener('progress', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload; // Handle both structured and flat formats
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
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        setJob((prev) => ({
          ...prev,
          status: data.status,
          progressPercent: 100,
        }));
      } catch (err) {
        console.error('Failed to parse job completion:', err);
      }
    });

    eventSource.addEventListener('failed', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        setJob((prev) => ({
          ...prev,
          status: 'FAILED',
          failedReason: data.error || data.failedReason,
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
