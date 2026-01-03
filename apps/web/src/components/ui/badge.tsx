'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive/10 text-destructive',
        success:
          'border-transparent bg-success/10 text-success',
        warning:
          'border-transparent bg-warning/10 text-warning-foreground',
        outline:
          'border border-current text-foreground',
        ghost:
          'bg-muted text-muted-foreground',
        // Status badges
        paid:
          'bg-success/10 text-success border border-success/20',
        pending:
          'bg-warning/10 text-warning-foreground border border-warning/20',
        overdue:
          'bg-destructive/10 text-destructive border border-destructive/20',
        draft:
          'bg-muted text-muted-foreground border border-border',
        active:
          'bg-primary/10 text-primary border border-primary/20',
        inactive:
          'bg-muted text-muted-foreground border border-border',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({
  className,
  variant,
  size,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 -mr-1 h-3.5 w-3.5 rounded-full hover:bg-foreground/20 inline-flex items-center justify-center"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

// Status dot for inline status indicators
interface StatusDotProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  pulse?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

function StatusDot({ status, pulse = false, size = 'default' }: StatusDotProps) {
  const colors = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-destructive',
    info: 'bg-primary',
    neutral: 'bg-muted-foreground',
  };

  const sizes = {
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        colors[status],
        sizes[size],
        pulse && 'animate-pulse'
      )}
    />
  );
}

export { Badge, StatusDot, badgeVariants };
