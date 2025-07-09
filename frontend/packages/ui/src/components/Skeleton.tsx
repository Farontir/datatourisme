import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../utils/cn';

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800',
  {
    variants: {
      variant: {
        default: 'bg-neutral-200 dark:bg-neutral-800',
        text: 'bg-neutral-200 dark:bg-neutral-800 rounded-sm',
        avatar: 'bg-neutral-200 dark:bg-neutral-800 rounded-full',
        button: 'bg-neutral-200 dark:bg-neutral-800 rounded-md',
        card: 'bg-neutral-200 dark:bg-neutral-800 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn(
          'h-4',
          i === lines - 1 ? 'w-3/4' : 'w-full' // Last line is shorter
        )}
      />
    ))}
  </div>
);

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton variant="card" className="h-48 w-full" />
    <div className="space-y-2">
      <Skeleton variant="text" className="h-4 w-3/4" />
      <Skeleton variant="text" className="h-4 w-1/2" />
    </div>
  </div>
);

const SkeletonAvatar = ({ className }: { className?: string }) => (
  <Skeleton variant="avatar" className={cn('h-12 w-12', className)} />
);

const SkeletonButton = ({ className }: { className?: string }) => (
  <Skeleton variant="button" className={cn('h-10 w-24', className)} />
);

const SkeletonTable = ({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) => (
  <div className={cn('space-y-3', className)}>
    {/* Table header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-4 w-full" />
      ))}
    </div>
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonList = ({ 
  items = 5, 
  showAvatar = true, 
  className 
}: { 
  items?: number; 
  showAvatar?: boolean; 
  className?: string; 
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        {showAvatar && <SkeletonAvatar className="h-10 w-10" />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonTable,
  SkeletonList,
};