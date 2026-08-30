import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Copy, Check, FileText, Clock, DownloadCloud, ArrowLeft, ShieldAlert } from 'lucide-react';
import { GlassContainer } from '../components/GlassContainer';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { getFileInfoAPI } from '../services/api';
import type { FileInfo } from '../services/fileInfo';
import { copyText } from '../utils/clipboard';
import { getApiErrorMessage } from '../utils/apiError';

interface FileState {
  name: string;
  size: number;
  expiryMinutes: string;
  downloadsLeft: string;
}

type ResultStatus = 'loading' | 'ready' | 'expired' | 'invalid' | 'error';

const formatSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatExpiryFromMinutes = (minutes: string) => {
  const m = parseInt(minutes, 10);
  if (m === 60) return '1 Hour';
  if (m === 1440) return '24 Hours';
  if (m === 10080) return '7 Days';
  if (!Number.isFinite(m)) return 'Unknown';
  return `${m} mins`;
};

const formatExpiresAt = (iso?: string) => {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fileState = location.state as FileState | null;
  const [isCopied, setIsCopied] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setDownloadLink(`${window.location.origin}/download/${id}`);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const result = await getFileInfoAPI(id);
        if (cancelled) return;
        if (result.status === 'ok') {
          setFileInfo(result.file);
          setStatus('ready');
          return;
        }
        if (result.status === 'expired') {
          setStatus('expired');
          return;
        }
        if (result.status === 'invalid') {
          setStatus('invalid');
          return;
        }
        setErrorMessage(result.message);
        setStatus('error');
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(getApiErrorMessage(error, 'Unable to load file information'));
        setStatus('error');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCopy = async () => {
    const copied = await copyText(downloadLink);
    if (copied) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const fileName = fileInfo?.originalName || fileState?.name || 'Shared file';
  const fileSize = fileInfo?.size || fileState?.size;
  const expiryLabel = fileInfo
    ? formatExpiresAt(fileInfo.expiresAt)
    : formatExpiryFromMinutes(fileState?.expiryMinutes || '');
  const downloadsLabel = fileInfo
    ? `${Math.max(fileInfo.maxDownloads - fileInfo.downloadCount, 0)} remaining`
    : fileState?.downloadsLeft
      ? `${fileState.downloadsLeft} total`
      : 'Unknown';

  return (
    <GlassContainer>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl mx-auto"
      >
        <GlassCard className="flex flex-col gap-6 p-8 md:p-10 border-emerald-200/30 bg-white/20" hoverEffect={false}>
          {status === 'loading' && (
            <p className="text-center text-gray-600 font-medium">Loading file details…</p>
          )}

          {(status === 'expired' || status === 'invalid' || status === 'error') && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100/50 flex items-center justify-center border border-red-200/50">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {status === 'expired' ? 'Link expired' : status === 'invalid' ? 'File not found' : 'Unable to load file'}
              </h1>
              <p className="text-gray-600 font-medium">
                {status === 'error' ? errorMessage : 'This private link is no longer available.'}
              </p>
              <Link to="/upload">
                <GlassButton>Share another file</GlassButton>
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <>
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-emerald-100/50 flex items-center justify-center mb-6 shadow-glass border border-emerald-200/50"
            >
              <CheckCircle className="w-10 h-10 text-emerald-600" strokeWidth={2} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold tracking-tight text-gray-900 mb-2 drop-shadow-sm"
            >
              Upload Complete!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 font-medium"
            >
              Your file is ready to share with a private, expiring link.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col gap-3 mt-4"
          >
            <label className="text-sm font-semibold text-gray-700 ml-1">Private download link</label>
            <div className="relative group">
              <input
                readOnly
                value={downloadLink}
                className="w-full rounded-xl border border-emerald-200/50 bg-white/50 backdrop-blur-md pl-4 pr-32 py-4 text-gray-800 shadow-inner font-medium focus:outline-none transition-all duration-300"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <GlassButton
                  variant="secondary"
                  onClick={handleCopy}
                  className={`px-4 py-2 text-sm transition-all duration-300 ${isCopied ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700' : ''
                    }`}
                >
                  <AnimatePresence mode="wait">
                    {isCopied ? (
                      <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Copied!
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="flex items-center gap-1.5">
                        <Copy className="w-4 h-4" /> Copy Link
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassButton>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"
          >
            <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/30 border border-white/20 backdrop-blur-sm shadow-sm transition-all hover:bg-white/40">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <FileText className="w-3.5 h-3.5" /> File
              </span>
              <span className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                {fileName}
                {fileSize ? ` (${formatSize(fileSize)})` : ''}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/30 border border-white/20 backdrop-blur-sm shadow-sm transition-all hover:bg-white/40">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" /> Expiry
              </span>
              <span className="text-sm font-medium text-gray-800">{expiryLabel}</span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-xl bg-white/30 border border-white/20 backdrop-blur-sm shadow-sm transition-all hover:bg-white/40">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <DownloadCloud className="w-3.5 h-3.5" /> Downloads
              </span>
              <span className="text-sm font-medium text-gray-800">{downloadsLabel}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 flex justify-center">
            <Link to="/upload" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2 px-4 rounded-lg hover:bg-black/5">
              <ArrowLeft className="w-4 h-4" /> Share another file
            </Link>
          </motion.div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </GlassContainer>
  );
}
