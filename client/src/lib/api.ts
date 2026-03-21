const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface UploadOptions {
  whisperModel?: string;
  manualSegments?: { start: number; end: number; title: string }[];
}

export async function uploadVideo(file: File, options?: UploadOptions) {
  const formData = new FormData();
  formData.append('file', file);

  if (options?.whisperModel) {
    formData.append('whisperModel', options.whisperModel);
  }

  if (options?.manualSegments) {
    formData.append('manualSegments', JSON.stringify(options.manualSegments));
  }

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

export interface YouTubeOptions extends UploadOptions {
  useYouTubeSubtitles?: boolean;
}

export async function importFromYouTube(url: string, options?: YouTubeOptions) {
  const response = await fetch(`${API_BASE_URL}/upload/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Import failed');
  }

  return response.json();
}

export async function getProjects(): Promise<
  import('../types/video').ProjectWithDetails[]
> {
  const response = await fetch(`${API_BASE_URL}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function getProject(id: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  return response.json();
}

export async function deleteProject(id: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
  return response.json();
}

export async function getJob(id: string) {
  const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
  if (!response.ok) throw new Error('Failed to fetch job');
  return response.json();
}

export async function getJobByProject(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/jobs/project/${projectId}`);
  if (!response.ok) throw new Error('Failed to fetch job for project');
  return response.json();
}

export async function updateClip(
  clipId: string,
  data: { startTime?: number; endTime?: number; title?: string },
) {
  const response = await fetch(`${API_BASE_URL}/projects/clips/${clipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update clip');
  return response.json();
}

export async function regenerateClip(clipId: string) {
  const response = await fetch(
    `${API_BASE_URL}/projects/clips/${clipId}/regenerate`,
    {
      method: 'POST',
    },
  );
  if (!response.ok) throw new Error('Failed to start regeneration');
  return response.json();
}

export async function listDownloads() {
  const response = await fetch(`${API_BASE_URL}/download`);
  if (!response.ok) throw new Error('Failed to fetch downloads');
  return response.json();
}

export async function startDownload(url: string, quality: string) {
  const response = await fetch(`${API_BASE_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start download');
  }
  return response.json();
}

export async function getDownload(id: string) {
  const response = await fetch(`${API_BASE_URL}/download/${id}`);
  if (!response.ok) throw new Error('Failed to fetch download status');
  return response.json();
}

export function getDownloadFileUrl(id: string) {
  return `${API_BASE_URL}/download/${id}/file`;
}
