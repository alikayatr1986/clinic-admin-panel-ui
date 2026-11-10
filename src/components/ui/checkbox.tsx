import * as React from 'react';
import type { CheckboxProps } from '@/types/checkbox.types';

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, ...props }, ref
) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm leading-5 text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <input
        {...props}
        ref={ref}
        type="checkbox"
        data-slot="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <span>{label}</span>
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
