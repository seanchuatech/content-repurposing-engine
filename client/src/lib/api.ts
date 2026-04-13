import type { AuthResponse, User } from '../types/auth';
import type { Download } from '../types/download';
import type { Clip, Job, ProjectWithDetails } from '../types/video';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api';

export interface UploadOptions {
  whisperModel?: string;
  manualSegments?: { start: number; end: number; title: string }[];
}

export interface YouTubeOptions extends UploadOptions {
  useYouTubeSubtitles?: boolean;
}

// Helper for authorized requests
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// --- AUTH ---

export async function login(data: {
  email: string;
  password?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function register(data: {
  email: string;
  password?: string;
  name?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

// --- PROJECTS ---

export async function getProjects(): Promise<ProjectWithDetails[]> {
  return request<ProjectWithDetails[]>('/projects');
}

export async function getProject(id: string): Promise<ProjectWithDetails> {
  return request<ProjectWithDetails>(`/projects/${id}`);
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/projects/${id}`, {
    method: 'DELETE',
  });
}

// --- UPLOAD ---

export async function uploadVideo(
  file: File,
  options?: UploadOptions,
): Promise<{ jobId: string; projectId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  if (options?.whisperModel) {
    formData.append('whisperModel', options.whisperModel);
  }

  if (options?.manualSegments) {
    formData.append('manualSegments', JSON.stringify(options.manualSegments));
  }

  return request<{ jobId: string; projectId: string }>('/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function importFromYouTube(
  url: string,
  options?: YouTubeOptions,
): Promise<{ jobId: string; projectId: string }> {
  return request<{ jobId: string; projectId: string }>('/upload/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      ...options,
    }),
  });
}

// --- JOBS ---

export async function getJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`);
}

export async function getJobByProject(projectId: string): Promise<Job> {
  return request<Job>(`/jobs/project/${projectId}`);
}

// --- CLIPS ---

export async function updateClip(
  clipId: string,
  data: { startTime?: number; endTime?: number; title?: string },
): Promise<Clip> {
  return request<Clip>(`/projects/clips/${clipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function regenerateClip(
  clipId: string,
): Promise<{ jobId: string }> {
  return request<{ jobId: string }>(`/projects/clips/${clipId}/regenerate`, {
    method: 'POST',
  });
}

// --- DOWNLOADS ---

export async function listDownloads(): Promise<Download[]> {
  return request<Download[]>('/download');
}

export async function startDownload(
  url: string,
  quality: string,
): Promise<Download> {
  return request<Download>('/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality }),
  });
}

export async function getDownload(id: string): Promise<Download> {
  return request<Download>(`/download/${id}`);
}

export function getDownloadFileUrl(id: string) {
  return `${API_BASE_URL}/download/${id}/file`;
}

// --- BILLING ---

export async function createCheckoutSession(token: string) {
  return request<{ url: string }>('/billing/create-checkout-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createPortalSession(token: string) {
  return request<{ url: string }>('/billing/create-portal-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Old compatibility export (optional, but good to keep if used as `api.xxx`)
export const api = {
  login,
  register,
  getMe,
  getProjects,
  getProject,
  deleteProject,
  uploadVideo,
  importFromYouTube,
  getJob,
  getJobByProject,
  updateClip,
  regenerateClip,
  listDownloads,
  startDownload,
  getDownload,
  getDownloadFileUrl,
  createCheckoutSession,
  createPortalSession,
};
