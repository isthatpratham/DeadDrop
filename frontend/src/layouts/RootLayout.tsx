import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {/* Background ambient orbs using GSAP/CSS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-white/30 blur-[100px] pointer-events-none" />

      {/* Minimal Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-20 flex items-center justify-between px-6 md:px-12 fixed top-0 left-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20"
      >
        <Link
          to="/"
          aria-label="Go to DeadDrop home"
          className="transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded-lg"
        >
          <Logo size="medium" variant="with-text" />
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/upload" className="text-sm font-medium text-gray-700 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 rounded-sm">
            Upload
          </Link>
          <a href="https://github.com/isthatpratham/DeadDrop" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 rounded-sm">
            Source
          </a>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full mt-20 flex flex-col relative z-10">
        <Outlet />
      </main>

      <footer className="w-full py-5 px-6 md:px-12 border-t border-white/20 bg-white/5 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/"
            aria-label="Go to DeadDrop home"
            className="transition-opacity hover:opacity-80"
          >
            <Logo size="small" variant="with-text" textClassName="text-gray-700" />
          </Link>
          <p className="text-xs text-gray-600">Private. Ephemeral. DeadDrop.</p>
        </div>
      </footer>
    </div>
  );
}
