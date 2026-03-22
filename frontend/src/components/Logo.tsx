import { cn } from '../utils/cn';

type LogoSize = 'small' | 'medium' | 'large';
type LogoVariant = 'icon-only' | 'with-text';

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  textClassName?: string;
}

const sizeMap: Record<LogoSize, { icon: string; text: string; gap: string }> = {
  small: { icon: 'h-6 w-6', text: 'text-sm', gap: 'gap-2' },
  medium: { icon: 'h-8 w-8', text: 'text-lg', gap: 'gap-2.5' },
  large: { icon: 'h-12 w-12', text: 'text-2xl', gap: 'gap-3' },
};

export function Logo({
  size = 'medium',
  variant = 'with-text',
  className,
  textClassName,
}: LogoProps) {
  const currentSize = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center', currentSize.gap, className)}>
      <img
        src="/favicon.svg"
        alt="DeadDrop Logo"
        className={cn(
          currentSize.icon,
          'shrink-0 rounded-lg object-contain drop-shadow-[0_2px_10px_rgba(73,87,160,0.28)]'
        )}
      />
      {variant === 'with-text' && (
        <span
          className={cn(
            currentSize.text,
            'font-semibold tracking-tight text-gray-900 whitespace-nowrap',
            textClassName
          )}
        >
          DeadDrop
        </span>
      )}
    </span>
  );
}
