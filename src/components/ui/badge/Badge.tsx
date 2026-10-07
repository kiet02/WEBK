import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual color variant */
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  /** Size scale */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a colored status dot indicator */
  dot?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  secondary: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  destructive: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  outline: 'border border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200 bg-transparent',
};

const dotColors: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-white dark:bg-zinc-900',
  secondary: 'bg-zinc-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-red-500',
  outline: 'bg-zinc-500',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-0.5 gap-1.5',
  lg: 'text-sm px-3 py-1 gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
