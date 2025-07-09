import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '../utils/cn';

const progressVariants = cva(
  'relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800',
  {
    variants: {
      size: {
        sm: 'h-1',
        default: 'h-2',
        lg: 'h-3',
      },
      variant: {
        default: 'bg-neutral-200 dark:bg-neutral-800',
        success: 'bg-success-200 dark:bg-success-800',
        warning: 'bg-warning-200 dark:bg-warning-800',
        error: 'bg-error-200 dark:bg-error-800',
        info: 'bg-info-200 dark:bg-info-800',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 dark:bg-primary-400',
        success: 'bg-success-600 dark:bg-success-400',
        warning: 'bg-warning-600 dark:bg-warning-400',
        error: 'bg-error-600 dark:bg-error-400',
        info: 'bg-info-600 dark:bg-info-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number;
  max?: number;
  showPercentage?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, max = 100, size, variant, showPercentage = false, ...props }, ref) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, variant }), className)}
        value={value}
        max={max}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant }))}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
      {showPercentage && (
        <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          {percentage}%
        </div>
      )}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular progress component
interface CircularProgressProps extends VariantProps<typeof progressIndicatorVariants> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

const CircularProgress = React.forwardRef<
  HTMLDivElement,
  CircularProgressProps
>(({ 
  value = 0, 
  max = 100, 
  size = 48, 
  strokeWidth = 4, 
  variant = 'default', 
  showPercentage = false, 
  className,
  ...props 
}, ref) => {
  const percentage = Math.round((value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    default: 'stroke-primary-600 dark:stroke-primary-400',
    success: 'stroke-success-600 dark:stroke-success-400',
    warning: 'stroke-warning-600 dark:stroke-warning-400',
    error: 'stroke-error-600 dark:stroke-error-400',
    info: 'stroke-info-600 dark:stroke-info-400',
  };

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      {...props}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-neutral-200 dark:stroke-neutral-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn('fill-none transition-all duration-300 ease-out', colorMap[variant || 'default'])}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
});
CircularProgress.displayName = 'CircularProgress';

export { Progress, CircularProgress };