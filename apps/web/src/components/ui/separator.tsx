'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

// Separator with label
interface LabeledSeparatorProps {
  label: string;
  className?: string;
}

function LabeledSeparator({ label, className }: LabeledSeparatorProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <div className="flex-grow border-t border-border" />
      <span className="px-4 text-xs text-muted-foreground">{label}</span>
      <div className="flex-grow border-t border-border" />
    </div>
  );
}

export { Separator, LabeledSeparator };
