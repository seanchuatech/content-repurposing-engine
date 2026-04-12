import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  FileAudio,
  Film,
  Link as LinkIcon,
  Loader2,
  XCircle,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { getDownloadFileUrl, listDownloads, startDownload } from '../lib/api';

type DownloadRecord = {
  id: string;
  youtubeUrl: string;
  quality: string;
  status: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';
  progressPercent: number;
  fileName: string | null;
  fileSize: number | null;
  failedReason: string | null;
  createdAt: string;
};

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('1080p');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch initial downloads
  const fetchDownloads = async () => {
    try {
      const data = await listDownloads();
      setDownloads(data);

      // Check if any downloads are active to trigger polling
      const hasActive = data.some(
        (d: DownloadRecord) =>
          d.status === 'PENDING' || d.status === 'DOWNLOADING',
      );
      setIsPolling(hasActive);
    } catch (err) {
      console.error('Failed to fetch downloads', err);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  // Polling mechanism
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      await fetchDownloads();
    }, 2000);

    return () => clearInterval(interval);
  }, [isPolling]);

  const handleFileDownload = async (download: DownloadRecord) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/download/${download.id}/file`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = download.fileName || `download_${download.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('File download failed:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await startDownload(url, quality);
      setUrl('');
      // Optimistically fetch history and start polling
      await fetchDownloads();
      setIsPolling(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start download');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'DOWNLOADING':
        return <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 outline-none pb-20">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            YouTube Downloader
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            Download raw videos or audio straight from YouTube. Fast and
            unrestricted.
          </p>
        </div>
      </div>

      {/* Input Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* URL Input */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">
                YouTube URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="block w-full pl-10 bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            {/* Quality Selector */}
            <div className="w-full md:w-64 space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">
                Format Quality
              </label>
              <div className="relative">
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="block w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 pr-10 text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none shadow-inner"
                >
                  <option value="best">Best Available (up to 4K)</option>
                  <option value="1080p">1080p (HD)</option>
                  <option value="720p">720p</option>
                  <option value="audio">Audio Only (.m4a/.webm)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Film className="h-5 w-5 text-zinc-500" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !url}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  Convert & Download
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* History Section */}
      {downloads.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            Download History
          </h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Quality</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {downloads.map((download) => (
                    <tr
                      key={download.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span
                            className="font-medium text-zinc-200 truncate max-w-[300px]"
                            title={download.fileName || download.youtubeUrl}
                          >
                            {download.fileName || 'Fetching metadata...'}
                          </span>
                          <a
                            href={download.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 truncate max-w-[300px] mt-1"
                          >
                            {download.youtubeUrl}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(download.status)}
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-300 capitalize text-xs">
                              {download.status.toLowerCase()}
                            </span>
                            {download.status === 'DOWNLOADING' && (
                              <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${download.progressPercent}%`,
                                  }}
                                />
                              </div>
                            )}
                            {download.status === 'FAILED' && (
                              <span
                                className="text-xs text-red-400/80 mt-1 max-w-[200px] truncate"
                                title={download.failedReason || 'Unknown error'}
                              >
                                {download.failedReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/50 w-fit px-2 py-1 rounded text-xs font-medium">
                          {download.quality === 'audio' ? (
                            <FileAudio className="w-3.5 h-3.5" />
                          ) : (
                            <Film className="w-3.5 h-3.5" />
                          )}
                          {download.quality === 'audio'
                            ? 'Audio'
                            : download.quality}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-400 text-xs">
                          {formatBytes(download.fileSize)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {download.status === 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => handleFileDownload(download)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold transition-colors border border-zinc-700 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Save File
                          </button>
                        ) : download.status === 'FAILED' ? (
                          <button
                            onClick={() => {
                              setUrl(download.youtubeUrl);
                              setQuality(download.quality);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-zinc-600"
                          >
                            Retry
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
