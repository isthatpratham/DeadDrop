import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, X, Lock, Clock, DownloadCloud } from 'lucide-react';
import { GlassContainer } from '../components/GlassContainer';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { GlassButton } from '../components/GlassButton';
import { uploadFileAPI } from '../services/api';
import { Logo } from '../components/Logo';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('1440'); // default 24h = 1440m
  const [maxDownloads, setMaxDownloads] = useState('1');

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const nextFile = e.dataTransfer.files[0];
      if (nextFile.size > MAX_UPLOAD_BYTES) {
        setErrorStatus('File exceeds the 10MB limit');
        setFile(null);
        return;
      }
      setErrorStatus(null);
      setFile(nextFile);
    }
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const nextFile = e.target.files[0];
      if (nextFile.size > MAX_UPLOAD_BYTES) {
        setErrorStatus('File exceeds the 10MB limit');
        setFile(null);
        return;
      }
      setErrorStatus(null);
      setFile(nextFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorStatus('File exceeds the 10MB limit');
      return;
    }
    setIsUploading(true);
    setProgress(10); // Fake initial progress for UI feel
    setErrorStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expiryMinutes', expiry);
      formData.append('maxDownloads', maxDownloads);
      if (password) {
        formData.append('password', password);
      }

      // We approximate progress since Axios doesn't support multipart onUploadProgress easily for all streaming forms, 
      // but doing a fast animation handles local feeling
      const progressInterval = setInterval(() => {
        setProgress(p => (p < 90 ? p + 10 : p));
      }, 200);

      const res = await uploadFileAPI(formData);

      clearInterval(progressInterval);
      setProgress(100);

      if (res.success) {
        setTimeout(() => {
          navigate(`/result/${res.fileId}`, {
            state: {
              name: file.name,
              size: file.size,
              expiryMinutes: expiry,
              downloadsLeft: maxDownloads
            }
          });
        }, 500);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err: any) {
      setErrorStatus(err.message || 'Error communicating with server');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <GlassContainer>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto"
      >
        <GlassCard className="flex flex-col gap-8 p-8 md:p-12 border-white/30 bg-white/20" hoverEffect={false}>
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <Logo size="medium" variant="with-text" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2 drop-shadow-sm">Share a File</h1>
            <p className="text-gray-600 font-medium">Secure, encrypted, and transient.</p>
          </div>

          <div
            className={`relative w-full h-56 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${isDragging
              ? 'border-gray-800 bg-white/40 shadow-inner scale-[1.02]'
              : 'border-white/50 bg-white/20 hover:bg-white/40 hover:border-white/80'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-gray-600 pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center mb-4 shadow-sm">
                    <UploadCloud className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-lg text-gray-800">Click or drag file to upload</p>
                  <p className="text-sm mt-1 text-gray-500">Maximum file size: 10MB</p>
                </motion.div>
              ) : (
                <motion.div
                  key="file-info"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-gray-800 w-full px-6"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100/50 flex items-center justify-center mb-4 shadow-sm border border-emerald-200/50">
                    <File className="w-8 h-8 text-emerald-700" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-lg truncate w-full text-center max-w-[80%]">{file.name}</p>
                  <p className="text-sm text-gray-600 mt-1 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 hover:rotate-90 rounded-full transition-all duration-300"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="flex flex-col gap-2 relative">
              <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-500" /> Expiry Time
              </label>
              <select
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full rounded-xl border border-white/30 bg-white/40 backdrop-blur-md px-4 py-3.5 text-gray-800 shadow-glass transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none font-medium cursor-pointer"
              >
                <option value="60">1 Hour (Burn after reading)</option>
                <option value="1440">24 Hours</option>
                <option value="10080">7 Days</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-gray-500" /> Max Downloads
              </label>
              <GlassInput
                type="number"
                min="1"
                max="100"
                value={maxDownloads}
                onChange={e => setMaxDownloads(e.target.value)}
                placeholder="e.g., 1"
                className="font-medium bg-white/40 border-white/30"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-500" /> Secure Password <span className="text-gray-400 font-normal ml-1">(Optional)</span>
              </label>
              <GlassInput
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to skip password protection"
                className="font-medium bg-white/40 border-white/30"
              />
            </div>
          </div>

          {errorStatus && <p className="text-red-600 text-center font-semibold mt-2">{errorStatus}</p>}

          <div className="mt-2 flex flex-col gap-4">
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full h-2 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm shadow-inner"
                >
                  <motion.div
                    className="h-full bg-gray-900"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <GlassButton
              variant="secondary"
              className={`w-full py-4 text-lg font-semibold shadow-xl transition-all duration-300 ${!file || isUploading ? 'opacity-50 cursor-not-allowed transform-none' : 'hover:shadow-2xl hover:-translate-y-1'
                }`}
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? `Encrypting and Uploading... ${progress}%` : 'Upload File securely'}
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </GlassContainer>
  );
}
