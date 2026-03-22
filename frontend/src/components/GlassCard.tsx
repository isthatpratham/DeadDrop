import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = true, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={hoverEffect ? { scale: 1.02, y: -5 } : {}}
      className={cn(
        "relative rounded-2xl border border-white/20 bg-white/25 backdrop-blur-xl shadow-glass",
        "p-6 sm:p-8 transition-all duration-300",
        hoverEffect && "hover:bg-white/30 hover:shadow-glass-hover hover:border-white/30",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
