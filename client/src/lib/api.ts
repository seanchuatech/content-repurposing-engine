const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

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

export async function getProjects() {
  const response = await fetch(`${API_BASE_URL}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

export async function getProject(id: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
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
