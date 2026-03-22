import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../utils/cn';

interface GlassInputProps extends ComponentProps<"input"> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label className="text-sm font-medium text-gray-700 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-white/20 bg-white/40 backdrop-blur-md px-4 py-3 placeholder:text-gray-500",
            "text-gray-800 shadow-glass transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/60 focus:border-white/40",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-500 ml-1">{error}</span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
