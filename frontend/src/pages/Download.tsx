import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DownloadCloud, Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { GlassContainer } from '../components/GlassContainer';
import { GlassCard } from '../components/GlassCard';
import { GlassInput } from '../components/GlassInput';
import { GlassButton } from '../components/GlassButton';
import { downloadFileAPI } from '../services/api';
import { Logo } from '../components/Logo';

type PageStatus = 'valid' | 'password-required' | 'invalid' | 'expired';

export function Download() {
  const { id } = useParams<{ id: string }>();
  
  // Start assuming valid. We'll find out the truth when we try to download.
  const [status, setStatus] = useState<PageStatus>('valid');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const executeDownload = async () => {
    if (!id) return;
    setIsDownloading(true);
    setDownloadProgress(20);
    setPasswordError('');

    try {
      const res = await downloadFileAPI(id, password);

      if (res.status === 200) {
        // Handle Blob download successfully
        setDownloadProgress(100);
        
        // res.data is already a Blob because of responseType: 'blob' in api.ts
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Extract filename from Content-Disposition if available
        const disposition = res.headers['content-disposition'];
        let filename = 'deaddrop_secure_file';
        
        if (disposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          setIsDownloading(false);
          setStatus('expired'); // Assuming file has been securely burned or consumed
        }, 100);
      } else {
        setIsDownloading(false);
        setDownloadProgress(0);

        // API responded with an error payload in JSON representation of Blob
        const text = await res.data.text();
        const errData = JSON.parse(text);

        if (res.status === 403) {
          if (errData.message === 'Password required' || errData.message === 'Incorrect password') {
            setStatus('password-required');
            if (password) {
              setPasswordError('Incorrect password');
            }
          }
        } else if (res.status === 404) {
          setStatus('invalid');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          console.error("Unknown error:", errData);
        }
      }
    } catch (err) {
      console.error("Network or parsing error", err);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleUnlock = () => {
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    executeDownload();
  };

  const renderState = () => {
    switch (status) {
      case 'invalid':
      case 'expired':
        return (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center gap-6"
          >
            <Logo size="small" variant="with-text" textClassName="text-gray-700" />
            <div className="w-20 h-20 rounded-full bg-red-100/50 flex items-center justify-center shadow-glass border border-red-200/50">
              <ShieldAlert className="w-10 h-10 text-red-600" strokeWidth={1.5} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {status === 'expired' ? 'Link Expired' : 'Invalid Link'}
              </h2>
              <p className="text-gray-600 font-medium max-w-sm">
                {status === 'expired' 
                  ? 'This file has exceeded its time limit, max downloads, or you securely downloaded it.' 
                  : 'This link does not exist or has been permanently destroyed.'}
              </p>
            </div>

            <Link to="/">
              <GlassButton className="mt-4 px-8">Return Home</GlassButton>
            </Link>
          </motion.div>
        );

      case 'password-required':
        return (
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center w-full"
          >
            <Logo size="small" variant="with-text" className="mb-4" />
            <div className="w-16 h-16 rounded-full bg-amber-100/50 flex items-center justify-center mb-6 shadow-sm border border-amber-200/50">
              <Lock className="w-8 h-8 text-amber-600" strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Protected File</h2>
            <p className="text-gray-600 text-center mb-8 max-w-sm">This file is encrypted. Enter the password to Decrypt and Download.</p>
            
            <div className="w-full max-w-sm flex flex-col gap-4">
              <GlassInput 
                type="password"
                placeholder="Enter decryption password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
                disabled={isDownloading}
              />
              <GlassButton 
                onClick={handleUnlock}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2"
              >
                {isDownloading ? 'Decrypting...' : <><KeyRound className="w-4 h-4" /> Decrypt & Download</>}
              </GlassButton>
            </div>
          </motion.div>
        );

      case 'valid':
        return (
          <motion.div
            key="valid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col w-full items-center"
          >
            <div className="flex flex-col items-center mb-10">
              <Logo size="medium" variant="with-text" className="mb-6" />
              <div className="w-24 h-24 rounded-full bg-emerald-100/50 flex items-center justify-center mb-6 shadow-glass border border-emerald-200/50 relative">
                <FileText className="w-12 h-12 text-emerald-700 absolute" strokeWidth={1} />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="w-full h-full rounded-full border-2 border-dashed border-emerald-500/30"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 px-6 text-center drop-shadow-sm">Secure File Package</h2>
              <p className="text-emerald-700 font-medium bg-emerald-100/50 px-4 py-1.5 rounded-full text-sm mt-4 border border-emerald-200/50 flex items-center gap-2">
                <Lock className="w-4 h-4" /> End-to-end Encrypted
              </p>
            </div>

            <div className="relative w-full">
              <AnimatePresence>
                {isDownloading && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="w-full h-3 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm shadow-inner"
                  >
                    <motion.div 
                      className="h-full bg-emerald-500"
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ ease: "linear", duration: 0.1 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <GlassButton 
                variant="secondary"
                onClick={executeDownload}
                disabled={isDownloading}
                className={`w-full py-5 text-lg font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  isDownloading ? 'bg-black/40 cursor-wait transform-none' : 'hover:-translate-y-1 hover:shadow-2xl'
                }`}
              >
                <DownloadCloud className="w-6 h-6" /> 
                {isDownloading ? `Decrypting and Downloading... ${downloadProgress}%` : 'Secure Download'}
              </GlassButton>
            </div>
            
            <p className="text-xs text-gray-500 font-medium text-center mt-6 max-w-md">
              Link will be validated and consumed immediately upon clicking Secure Download. Password might be required.
            </p>
          </motion.div>
        );
    }
  };

  return (
    <GlassContainer>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl mx-auto"
      >
        <GlassCard className="p-8 md:p-12 border-white/30 bg-white/20 min-h-[460px] flex items-center justify-center transition-all duration-500" hoverEffect={false}>
          <AnimatePresence mode="wait">
            {renderState()}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </GlassContainer>
  );
}
