import type * as React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'children'> {
  label: React.ReactNode;
}
