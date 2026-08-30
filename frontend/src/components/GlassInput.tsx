import { forwardRef, useId } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../utils/cn';

interface GlassInputProps extends ComponentProps<"input"> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700 ml-1">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "w-full rounded-xl border border-white/20 bg-white/40 backdrop-blur-md px-4 py-3 placeholder:text-gray-500",
            "text-gray-800 shadow-glass transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus:bg-white/60 focus:border-white/40",
            error && "border-red-400 focus-visible:ring-red-400",
            className
          )}
          {...props}
        />
        {error && (
          <span id={errorId} role="alert" className="text-sm text-red-500 ml-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
