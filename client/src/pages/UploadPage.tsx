import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, FileVideo, AlertCircle, CheckCircle2, Youtube, Link as LinkIcon } from 'lucide-react';
import { uploadVideo, importFromYouTube } from '../lib/api';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadType, setUploadType] = useState<'file' | 'youtube'>('file');
  
  // Optimization states
  const [whisperModel, setWhisperModel] = useState('base');
  const [useYouTubeSubtitles, setUseYouTubeSubtitles] = useState(true);
  const [manualSegments, setManualSegments] = useState<{ start: string; end: string; title: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadType === 'file') setIsDragging(true);
  }, [uploadType]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File) => {
    const validMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
    const fileExtension = file.name.toLowerCase().slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2);
    
    const isValidMime = validMimes.includes(file.type);
    const isValidExtension = validExtensions.includes(`.${fileExtension}`);

    if (!isValidMime && !isValidExtension) {
      setErrorMessage('Invalid file type. Only MP4, MOV, and WebM are supported.');
      return false;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
      setErrorMessage('File too large. Maximum size is 2GB.');
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      setErrorMessage('');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (uploadType === 'file' && !file) return;
    if (uploadType === 'youtube' && !ytUrl) return;

    setStatus('uploading');
    try {
      const options = {
        whisperModel,
        manualSegments: manualSegments.length > 0 
          ? manualSegments.map((s: { start: string; end: string; title: string }) => ({ 
              start: Number.parseFloat(s.start), 
              end: Number.parseFloat(s.end), 
              title: s.title 
            })) 
          : undefined,
      };

      let result: { projectId: string };
      if (uploadType === 'file' && file) {
        result = await uploadVideo(file, options);
      } else {
        result = await importFromYouTube(ytUrl, {
          ...options,
          useYouTubeSubtitles,
        });
      }

      setStatus('success');
      setTimeout(() => {
        navigate(`/projects/${result.projectId}`);
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    }
  };

  const reset = () => {
    setFile(null);
    setYtUrl('');
    setStatus('idle');
    setErrorMessage('');
    setManualSegments([]);
  };

  const addSegment = () => {
    setManualSegments([...manualSegments, { start: '', end: '', title: '' }]);
  };

  const removeSegment = (index: number) => {
    setManualSegments(manualSegments.filter((_: unknown, i: number) => i !== index));
  };

  const updateSegment = (index: number, field: 'start' | 'end' | 'title', value: string) => {
    const newSegments = [...manualSegments];
    newSegments[index][field] = value;
    setManualSegments(newSegments);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Add Content</h1>
        <p className="text-zinc-400">
          Upload a file or paste a YouTube link to start detecting viral moments.
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          type="button"
          onClick={() => { setUploadType('file'); reset(); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            uploadType === 'file' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Upload className="w-5 h-5" />
          File Upload
        </button>
        <button
          type="button"
          onClick={() => { setUploadType('youtube'); reset(); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            uploadType === 'youtube' 
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Youtube className="w-5 h-5" />
          YouTube URL
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 transition-all flex flex-col items-center justify-center min-h-[400px] ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/5' 
            : (file || ytUrl)
              ? 'border-zinc-700 bg-zinc-900/50' 
              : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
        }`}
      >
        {status === 'idle' && uploadType === 'youtube' && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <LinkIcon className="w-8 h-8 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-zinc-200">Paste YouTube Link</p>
              <p className="text-sm text-zinc-500 text-center">We'll download and process it automatically</p>
            </div>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
            />
            <button
              type="button"
              disabled={!ytUrl.includes('youtube.com') && !ytUrl.includes('youtu.be')}
              onClick={handleUpload}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-500/20"
            >
              Import Video
            </button>
          </div>
        )}

        {status === 'idle' && uploadType === 'file' && !file && (
          <>
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
              <Upload className="w-8 h-8 text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-zinc-200 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                MP4, MOV or WebM (MAX. 2GB)
              </p>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="video/*"
                onChange={handleFileChange}
              />
              <button type="button" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
                Select Video
              </button>
            </div>
          </>
        )}

        {(file || (ytUrl && status !== 'idle')) && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 mb-8 relative">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
                  {uploadType === 'file' ? <FileVideo className="w-6 h-6 text-indigo-400" /> : <Youtube className="w-6 h-6 text-red-400" />}
                </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{uploadType === 'file' ? file?.name : ytUrl}</p>
                <p className="text-sm text-zinc-500">
                  {uploadType === 'file' ? `${(file!.size / (1024 * 1024)).toFixed(2)} MB` : 'YouTube Video'}
                </p>
              </div>
              {status === 'idle' && (
                <button 
                type="button"
                onClick={reset}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Remove selection"
              >
                <X className="w-5 h-5" />
              </button>
              )}
            </div>

            {status === 'idle' && (
              <div className="space-y-6 mt-6 pt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
                >
                  {showAdvanced ? '− Hide Advanced Options' : '+ Show Advanced Options'}
                </button>

                {showAdvanced && (
                  <div className="space-y-6 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Whisper Model Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Transcription Model</label>
                      <select 
                        value={whisperModel}
                        onChange={(e) => setWhisperModel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="tiny">Tiny (Fastest, least accurate)</option>
                        <option value="base">Base (Balanced)</option>
                        <option value="small">Small (Better quality)</option>
                        <option value="medium">Medium (Professional quality)</option>
                        <option value="large-v3">Large-v3 (Best quality, slowest)</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 italic">Select smaller models to save compute time.</p>
                    </div>

                    {/* YouTube Specific Options */}
                    {uploadType === 'youtube' && (
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="ytSubs"
                          checked={useYouTubeSubtitles}
                          onChange={(e) => setUseYouTubeSubtitles(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="ytSubs" className="text-sm font-medium text-zinc-400">
                          Use existing YouTube subtitles if available
                        </label>
                      </div>
                    )}

                    {/* Manual Clipping */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-400">Manual Clips (Optional)</label>
                        <button 
                          type="button"
                          onClick={addSegment}
                          className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded hover:bg-indigo-600/30 transition-colors"
                        >
                          + Add Clip
                        </button>
                      </div>
                      
                      {manualSegments.length > 0 ? (
                        <div className="space-y-3">
                          {manualSegments.map((seg, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-end">
                              <input
                                placeholder="Clip Title"
                                value={seg.title}
                                onChange={(e) => updateSegment(idx, 'title', e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white"
                              />
                              <input
                                type="number"
                                placeholder="Start"
                                value={seg.start}
                                onChange={(e) => updateSegment(idx, 'start', e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white"
                              />
                              <input
                                type="number"
                                placeholder="End"
                                value={seg.end}
                                onChange={(e) => updateSegment(idx, 'end', e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white"
                              />
                              <button
                      type="button"
                      onClick={() => removeSegment(idx)}
                      className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500">If provided, AI analysis will be skipped.</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUpload}
                  className={`w-full py-3 text-white rounded-lg font-bold text-lg transition-all shadow-lg ${
                    uploadType === 'file' 
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' 
                      : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                  }`}
                >
                  Process Video
                </button>
              </div>
            )}

            {status === 'uploading' && (
              <div className="space-y-4">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-[progress_2s_ease-in-out_infinite] w-full origin-left" />
                </div>
                <p className="text-center text-indigo-400 font-medium animate-pulse">
                  {uploadType === 'file' ? 'Uploading and analyzing...' : 'Initiating download and analysis...'}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3 text-green-400 py-4">
                <CheckCircle2 className="w-12 h-12" />
                <p className="font-bold text-xl text-center">Success!</p>
                <p className="text-zinc-400 text-center text-sm">Redirecting to project page...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && status === 'idle' && (
        <div className="mt-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Automatic Clips', desc: 'AI identifies the best moments for you.' },
          { title: 'Subtitles', desc: 'Word-level captions burned in automatically.' },
          { title: 'Smart Crop', desc: 'Landscape converted to 9:16 portrait.' },
        ].map((feat, i) => (
          <div key={i} className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <h3 className="font-bold text-white mb-2">{feat.title}</h3>
            <p className="text-zinc-500 text-sm">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
