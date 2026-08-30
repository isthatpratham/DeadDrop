import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';
import type { ReactNode } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function GlassButton({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: GlassButtonProps) {
  const reduceMotion = usePrefersReducedMotion();
  const baseStyles = "relative overflow-hidden rounded-xl font-medium transition-all duration-300 backdrop-blur-md px-6 py-3 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30";
  
  const variants = {
    primary: "bg-white/20 border border-white/30 text-gray-800 shadow-glass hover:bg-white/30 hover:shadow-glass-hover",
    secondary: "bg-black/80 border border-white/10 text-white shadow-lg hover:bg-black",
    ghost: "bg-transparent border border-transparent text-gray-700 hover:bg-white/10"
  };

  return (
    <motion.button
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
