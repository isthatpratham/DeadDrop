import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { cn } from '../utils/cn';

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  animateEntrance?: boolean;
}

export function GlassContainer({ children, className, animateEntrance = true }: GlassContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animateEntrance || !containerRef.current) return;

    gsap.fromTo(containerRef.current.children, 
      { 
        y: 40, 
        opacity: 0 
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.1
      }
    );
  }, [animateEntrance]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-[min(max(400px,60vh),800px)] w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
