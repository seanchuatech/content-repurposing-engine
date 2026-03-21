import type { ProjectWithDetails, Job } from '../types/video';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// --- AUTH ---

export async function login(data: any) {
  return request<any>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function register(data: any) {
  return request<any>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getMe(token?: string) {
  // If token is provided, use it explicitly (useful during init)
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<any>('/auth/me', { headers });
}

// --- PROJECTS ---

export async function getProjects(): Promise<ProjectWithDetails[]> {
  return request<ProjectWithDetails[]>('/projects');
}

export async function getProject(id: string): Promise<ProjectWithDetails> {
  return request<ProjectWithDetails>(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  return request<any>(`/projects/${id}`, {
    method: 'DELETE',
  });
}

// --- UPLOAD ---

export async function uploadVideo(projectId: string, file: File, options?: UploadOptions) {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('projectId', projectId);

  if (options?.whisperModel) {
    formData.append('whisperModel', options.whisperModel);
  }

  if (options?.manualSegments) {
    formData.append('manualSegments', JSON.stringify(options.manualSegments));
  }

  return request<any>('/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function importFromYouTube(url: string, options?: YouTubeOptions) {
  return request<any>('/upload/youtube', {
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
) {
  return request<any>(`/projects/clips/${clipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function regenerateClip(clipId: string) {
  return request<any>(`/projects/clips/${clipId}/regenerate`, {
    method: 'POST',
  });
}

// --- DOWNLOADS ---

export async function listDownloads() {
  return request<any[]>('/download');
}

export async function startDownload(url: string, quality: string) {
  return request<any>('/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality }),
  });
}

export async function getDownload(id: string) {
  return request<any>(`/download/${id}`);
}

export function getDownloadFileUrl(id: string) {
  return `${API_BASE_URL}/download/${id}/file`;
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
};
