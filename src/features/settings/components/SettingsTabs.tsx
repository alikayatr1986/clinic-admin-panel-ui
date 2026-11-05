import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SettingsTabsProps, SettingsTabKey } from '../types/settings.types';

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => onTabChange(val as SettingsTabKey)}
      aria-label="Settings sections"
    >
      <TabsList>
        <TabsTrigger
          value="timeframes"
          id="tab-timeframes"
          aria-controls="timeframes-panel"
        >
          Timeframes
        </TabsTrigger>
        <TabsTrigger
          value="procedures"
          id="tab-procedures"
          aria-controls="procedures-panel"
        >
          Procedures
        </TabsTrigger>
        <TabsTrigger
          value="categories"
          id="tab-categories"
          aria-controls="categories-panel"
        >
          Blog Categories
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
