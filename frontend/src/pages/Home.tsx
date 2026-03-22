import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { GlassContainer } from '../components/GlassContainer';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Logo } from '../components/Logo';

export function Home() {
  const navigate = useNavigate();
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shapesRef.current) return;
    const shapes = shapesRef.current.children;
    
    // GSAP floating animation for background shapes
    const ctx = gsap.context(() => {
      gsap.to(shapes, {
        y: "random(-30, 30)",
        x: "random(-30, 30)",
        rotation: "random(-20, 20)",
        scale: "random(0.9, 1.1)",
        duration: "random(4, 7)",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        stagger: {
          amount: 2.5,
          from: "random"
        }
      });
    }, shapesRef);

    return () => ctx.revert();
  }, []);

  return (
    <GlassContainer className="relative z-10 min-h-[80vh] flex flex-col items-center justify-center">
      {/* Floating abstract elements animated via GSAP */}
      <div 
        ref={shapesRef} 
        className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center"
      >
        <div className="absolute top-[15%] left-[10%] w-64 h-64 bg-white/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-white/30 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute top-[35%] right-[25%] w-32 h-32 bg-white/40 rounded-full blur-2xl mix-blend-overlay" />
        <div className="absolute bottom-[15%] left-[25%] w-48 h-48 bg-white/20 rounded-full blur-3xl mix-blend-overlay" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] mix-blend-overlay" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center w-full max-w-3xl mx-auto flex flex-col items-center gap-8 px-4"
      >
        <GlassCard hoverEffect={false} className="p-10 md:p-16 flex flex-col items-center gap-8 w-full border-white/30 bg-white/20">
          <Logo size="large" variant="icon-only" className="mb-1" />

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter text-gray-900 drop-shadow-sm"
          >
            DeadDrop
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-700 font-medium max-w-xl text-center"
          >
            Secure self-destructing file sharing
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-4"
          >
            <GlassButton 
              variant="secondary"
              onClick={() => navigate('/upload')}
              className="text-lg px-10 py-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              Start Sharing
            </GlassButton>
          </motion.div>
        </GlassCard>
      </motion.div>
    </GlassContainer>
  );
}
