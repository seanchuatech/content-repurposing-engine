import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Download, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  FileVideo,
  ChevronRight
} from 'lucide-react';
import { getProject, getJobByProject, getJob } from '../lib/api';
import { useJobStatus } from '../hooks/useJobStatus';
import type { Project, Clip, Job } from '../types/video';

const STORAGE_BASE_URL = 'http://localhost:3000/storage';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Use SSE for live updates - pass the actual JOB ID
  const { job: liveJob } = useJobStatus(currentJob?.id);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const projectData = await getProject(id);
        setProject(projectData);
        
        // Fetch job by project ID to get the JOB ID and clips
        const jobData = await getJobByProject(id);
        setCurrentJob(jobData);
        if (jobData.clips) {
          setClips(jobData.clips);
        }
      } catch (err) {
        setError('Failed to load project details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Update local state when live job data comes in
  useEffect(() => {
    if (liveJob?.status === 'COMPLETED' && currentJob?.id) {
      // Refresh clips
      getJob(currentJob.id).then(data => {
        if (data.clips) setClips(data.clips);
      });
    }
  }, [liveJob?.status, currentJob?.id]);

  const handlePlayClip = (clip: Clip) => {
    setActiveClip(clip);
    if (videoRef.current) {
      videoRef.current.src = `${STORAGE_BASE_URL}/${clip.filePath}`;
      videoRef.current.play();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex flex-col items-center gap-4">
        <AlertCircle className="w-12 h-12" />
        <p className="text-xl font-bold">{error || 'Project not found'}</p>
      </div>
    );
  }

  const currentStatus = liveJob?.status || currentJob?.status || 'PENDING';
  const currentProgress = liveJob?.progressPercent ?? currentJob?.progressPercent ?? 0;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(project.createdAt).toLocaleDateString()}</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">{clips.length} Clips Generated</span>
          </div>
        </div>
      </div>

      {currentStatus !== 'COMPLETED' && currentStatus !== 'FAILED' && (
        <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-sm">{currentStatus}...</span>
            </div>
            <span className="text-indigo-400 font-mono font-bold">{currentProgress}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
              style={{ width: `${currentProgress}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-zinc-500 italic text-center">
            AI is currently processing your video. Clips will appear below as they are ready.
          </p>
        </div>
      )}

      {currentStatus === 'FAILED' && (
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-bold mb-1">Processing Failed</h3>
            <p className="text-zinc-500 text-sm">{liveJob?.failedReason || currentJob?.failedReason || 'An unknown error occurred during video processing.'}</p>
            <button className="mt-4 text-sm font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Player */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative group">
            {activeClip ? (
              <video 
                ref={videoRef}
                controls 
                className="w-full h-full object-contain"
                poster={`${STORAGE_BASE_URL}/temp/${activeClip.jobId}/thumbnail.jpg`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <FileVideo className="w-16 h-16 opacity-20" />
                <p>Select a clip to preview</p>
              </div>
            )}
          </div>
          
          {activeClip && (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">{activeClip.title}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20">
                    <Sparkles className="w-3 h-3" />
                    {activeClip.viralityScore}% Viral Score
                  </div>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {activeClip.explanation}
              </p>
              <div className="mt-6 flex gap-3">
                <a 
                  href={`${STORAGE_BASE_URL}/${activeClip.filePath}`}
                  download
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Clip
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Clips Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-300 flex items-center gap-2 px-2">
            Generated Clips
            {clips.length > 0 && (
              <span className="ml-auto text-xs font-normal bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                {clips.length}
              </span>
            )}
          </h2>
          
          {clips.length === 0 ? (
            <div className="py-12 text-center bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl px-6">
              <Sparkles className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                {currentStatus === 'COMPLETED' 
                  ? 'No viral clips found in this video.' 
                  : 'Clips will appear here as they are processed.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {clips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => handlePlayClip(clip)}
                  className={`w-full text-left p-4 rounded-xl border transition-all group ${
                    activeClip?.id === clip.id
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700 group-hover:border-zinc-600 transition-colors">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className={`w-6 h-6 transition-transform ${activeClip?.id === clip.id ? 'text-indigo-400 scale-110' : 'text-zinc-600 group-hover:scale-110'}`} fill="currentColor" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-sm mb-1 truncate ${activeClip?.id === clip.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                        {clip.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed italic">
                        "{clip.explanation}"
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                          {Math.floor((clip.endTime - clip.startTime))}s duration
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">
                          <Sparkles className="w-2.5 h-3" />
                          {clip.viralityScore}%
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
