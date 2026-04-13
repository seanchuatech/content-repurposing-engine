import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteProject, getProjects } from '../lib/api';
import type { ProjectWithDetails } from '../types/video';

type SortColumn =
  | 'title'
  | 'createdAt'
  | 'durationSeconds'
  | 'clipCount'
  | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [projectToDelete, setProjectToDelete] =
    useState<ProjectWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Utility to handle table header clicks
  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column)
      return (
        <ChevronDown className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100" />
      );
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-indigo-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-indigo-400" />
    );
  };

  // Sort the projects array based on criteria
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortColumn === 'durationSeconds') {
        aVal = a.video?.durationSeconds || 0;
        bVal = b.video?.durationSeconds || 0;
      } else if (sortColumn === 'status') {
        aVal = a.job?.status || '';
        bVal = b.job?.status || '';
      } else {
        // Use a type-safe way to access properties
        const key = sortColumn as keyof ProjectWithDetails;
        const valA = a[key];
        const valB = b[key];

        aVal =
          typeof valA === 'string' || typeof valA === 'number'
            ? valA
            : String(valA || '');
        bVal =
          typeof valB === 'string' || typeof valB === 'number'
            ? valB
            : String(valB || '');
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortColumn, sortDirection]);

  // Paginate the sorted array
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const paginatedProjects = sortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'Unknown';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const parseSourceFormat = (mimeType?: string | null) => {
    if (!mimeType) return 'Unknown';
    if (mimeType.includes('youtube')) return 'YouTube';
    if (mimeType.includes('mp4')) return 'MP4';
    if (mimeType.includes('quicktime') || mimeType.includes('mov'))
      return 'MOV';
    return mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-zinc-400">
            Manage your generated content and pipeline results.
          </p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 mb-8">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">
            No projects yet
          </h3>
          <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
            Upload your first video to start generating viral clips with AI.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            Upload your first video
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer group hover:text-zinc-200 uppercase text-xs font-semibold tracking-wider"
                      onClick={() => toggleSort('title')}
                    >
                      Project <SortIcon column="title" />
                    </button>
                  </th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer group hover:text-zinc-200 uppercase text-xs font-semibold tracking-wider"
                      onClick={() => toggleSort('durationSeconds')}
                    >
                      Duration <SortIcon column="durationSeconds" />
                    </button>
                  </th>
                  <th className="px-6 py-4">AI Metadata</th>
                  <th className="px-6 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer group hover:text-zinc-200 uppercase text-xs font-semibold tracking-wider"
                      onClick={() => toggleSort('status')}
                    >
                      Status <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer group hover:text-zinc-200 uppercase text-xs font-semibold tracking-wider"
                      onClick={() => toggleSort('clipCount')}
                    >
                      Clips <SortIcon column="clipCount" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer group hover:text-zinc-200 uppercase text-xs font-semibold tracking-wider"
                      onClick={() => toggleSort('createdAt')}
                    >
                      Date Created <SortIcon column="createdAt" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {paginatedProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Title */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <p className="font-medium text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                            {project.title}
                          </p>
                          <p
                            className="text-xs text-zinc-500 truncate"
                            title={project.video?.originalName || ''}
                          >
                            {project.video?.originalName || 'No source file'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Format */}
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300">
                        {parseSourceFormat(project.video?.mimeType)}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="px-6 py-4 text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        {formatDuration(project.video?.durationSeconds)}
                      </div>
                    </td>

                    {/* AI Metadata Overview */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className="text-xs text-zinc-400 truncate max-w-[150px]"
                          title={project.job?.transcriptionBackend || 'None'}
                        >
                          🗣{' '}
                          {project.job?.transcriptionBackend === 'groq'
                            ? `Groq (${project.job?.whisperModel})`
                            : project.job?.transcriptionBackend || 'None'}
                        </span>
                        <span
                          className="text-xs text-zinc-400 truncate max-w-[150px]"
                          title={project.job?.llmModel || 'None'}
                        >
                          🧠{' '}
                          {project.job?.llmBackend === 'openai'
                            ? 'OpenAI'
                            : project.job?.llmBackend}{' '}
                          ({project.job?.llmModel})
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {project.job?.status === 'COMPLETED' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Generated
                        </div>
                      ) : project.job?.status === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Failed
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {project.job?.status || 'PENDING'}
                        </div>
                      )}
                    </td>

                    {/* Clips Count */}
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      {project.clipCount}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-zinc-300">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(project.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/projects/${project.id}`}
                          className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md border border-transparent hover:border-indigo-500/20 transition-all"
                          title="View Project"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md border border-transparent hover:border-red-500/20 transition-all"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/40">
              <span className="text-sm text-zinc-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, projects.length)} of{' '}
                {projects.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      type="button"
                      key={`page-${i + 1}`}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
                        currentPage === i + 1
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Delete Project
            </h3>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-zinc-200 font-medium">
                "{projectToDelete.title}"
              </span>
              ? This will permanently remove all associated videos, extracted
              clips, and processing data. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteProject(projectToDelete.id);
                    setProjects((p) =>
                      p.filter((x) => x.id !== projectToDelete.id),
                    );
                    setProjectToDelete(null);
                  } catch (e) {
                    setError('Failed to delete project');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
