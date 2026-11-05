import type * as React from 'react';
import type * as TabsPrimitive from '@radix-ui/react-tabs';

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {}
export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}
export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {}
export interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}
