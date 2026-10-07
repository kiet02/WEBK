import React, { useState } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Fallback initials when image is missing or errors */
  fallback: string;
  /** Size scale */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional user presence status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away' | 'live';
  /** Indicates if the user is live streaming (YouTube style animated ring & LIVE badge) */
  isLive?: boolean;
}

const sizeStyles: Record<
  NonNullable<AvatarProps['size']>,
  { container: string; text: string; status: string; liveBadge: string }
> = {
  sm: { container: 'h-8 w-8', text: 'text-xs', status: 'h-2 w-2 ring-1', liveBadge: 'text-[7px] px-1 -bottom-1' },
  md: { container: 'h-10 w-10', text: 'text-sm', status: 'h-2.5 w-2.5 ring-2', liveBadge: 'text-[8px] px-1.5 -bottom-1' },
  lg: { container: 'h-12 w-12', text: 'text-base', status: 'h-3 w-3 ring-2', liveBadge: 'text-[9px] px-2 -bottom-1.5' },
  xl: { container: 'h-16 w-16', text: 'text-lg', status: 'h-3.5 w-3.5 ring-2', liveBadge: 'text-[10px] px-2.5 -bottom-2' },
};

const statusColors: Record<Exclude<NonNullable<AvatarProps['status']>, 'live'>, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
  offline: 'bg-zinc-400',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  fallback,
  size = 'md',
  status,
  isLive = false,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = sizeStyles[size];
  const isCurrentlyLive = isLive || status === 'live';

  return (
    <div className={`relative inline-block select-none ${className}`} {...props}>
      <div
        className={`relative flex items-center justify-center rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold transition-all ${
          isCurrentlyLive
            ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 animate-pulse'
            : 'ring-1 ring-zinc-200 dark:ring-zinc-700'
        } ${sizeConfig.container}`}
      >
        {src && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className={sizeConfig.text}>
            {fallback}
          </span>
        )}
      </div>
      {status && status !== 'live' && !isLive && (
        <span
          role="status"
          aria-label={`Status: ${status}`}
          data-testid="status-indicator"
          className={`absolute bottom-0 right-0 rounded-full ring-white dark:ring-zinc-950 ${statusColors[status]} ${sizeConfig.status}`}
        />
      )}
      {isCurrentlyLive && (
        <span
          role="status"
          aria-label="Đang phát trực tiếp"
          data-testid="live-indicator"
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-red-600 font-bold text-white uppercase tracking-wider shadow-sm ring-2 ring-white dark:ring-zinc-950 ${sizeConfig.liveBadge}`}
        >
          LIVE
        </span>
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';
