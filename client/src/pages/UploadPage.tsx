import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, FileVideo, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadVideo } from '../lib/api';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

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
    if (!file) return;

    setStatus('uploading');
    try {
      const result = await uploadVideo(file);
      setStatus('success');
      // Redirect to project page after a short delay
      setTimeout(() => {
        navigate(`/projects/${result.projectId}`);
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Video</h1>
        <p className="text-zinc-400">
          Upload your long-form video to start detecting viral moments.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 transition-all flex flex-col items-center justify-center min-h-[400px] ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/5' 
            : file 
              ? 'border-zinc-700 bg-zinc-900/50' 
              : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
        }`}
      >
        {!file ? (
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
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
                Select Video
              </button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 mb-8 relative">
              <div className="w-12 h-12 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <FileVideo className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{file.name}</p>
                <p className="text-sm text-zinc-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {status === 'idle' && (
                <button 
                  onClick={reset}
                  className="p-1 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {status === 'idle' && (
              <button
                onClick={handleUpload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                Process Video
              </button>
            )}

            {status === 'uploading' && (
              <div className="space-y-4">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-[progress_2s_ease-in-out_infinite] w-full origin-left" />
                </div>
                <p className="text-center text-indigo-400 font-medium animate-pulse">
                  Uploading and analyzing...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3 text-green-400 py-4">
                <CheckCircle2 className="w-12 h-12" />
                <p className="font-bold text-xl text-center">Upload Successful!</p>
                <p className="text-zinc-400 text-center text-sm">Redirecting to project page...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
                <button
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
