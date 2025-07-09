import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

import { cn } from '../utils/cn';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-neutral-950 dark:[&>svg]:text-neutral-50',
  {
    variants: {
      variant: {
        default: 'bg-white text-neutral-950 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-50 dark:border-neutral-800',
        destructive:
          'border-error-500/50 text-error-900 bg-error-50 dark:border-error-500/50 dark:bg-error-900/20 dark:text-error-100 [&>svg]:text-error-600 dark:[&>svg]:text-error-400',
        success:
          'border-success-500/50 text-success-900 bg-success-50 dark:border-success-500/50 dark:bg-success-900/20 dark:text-success-100 [&>svg]:text-success-600 dark:[&>svg]:text-success-400',
        warning:
          'border-warning-500/50 text-warning-900 bg-warning-50 dark:border-warning-500/50 dark:bg-warning-900/20 dark:text-warning-100 [&>svg]:text-warning-600 dark:[&>svg]:text-warning-400',
        info:
          'border-info-500/50 text-info-900 bg-info-50 dark:border-info-500/50 dark:bg-info-900/20 dark:text-info-100 [&>svg]:text-info-600 dark:[&>svg]:text-info-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

// Icon components for different alert types
const AlertIcon = ({ variant }: { variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' | null }) => {
  switch (variant) {
    case 'destructive':
      return <XCircle className="h-4 w-4" />;
    case 'success':
      return <CheckCircle className="h-4 w-4" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'info':
      return <Info className="h-4 w-4" />;
    case null:
    case undefined:
    case 'default':
    default:
      return <Info className="h-4 w-4" />;
  }
};

export { Alert, AlertTitle, AlertDescription, AlertIcon };