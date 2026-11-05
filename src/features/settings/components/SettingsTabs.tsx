import type { SettingsTabsProps } from '../types/settings.types';

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <nav className="border-b border-slate-200" aria-label="Settings sections">
      <div className="flex space-x-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeframes'}
          aria-controls="timeframes-panel"
          id="tab-timeframes"
          onClick={() => onTabChange('timeframes')}
          className={`py-3 px-1 text-sm border-b-2 transition-colors ${
            activeTab === 'timeframes'
              ? 'border-crimson text-crimson font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Timeframes
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'procedures'}
          aria-controls="procedures-panel"
          id="tab-procedures"
          onClick={() => onTabChange('procedures')}
          className={`py-3 px-1 text-sm border-b-2 ${activeTab === 'procedures' ? 'border-crimson text-crimson font-semibold' : 'border-transparent text-slate-500'}`}
        >
          Procedures
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          aria-controls="categories-panel"
          id="tab-categories"
          onClick={() => onTabChange('categories')}
          className={`py-3 px-1 text-sm border-b-2 ${activeTab === 'categories' ? 'border-crimson text-crimson font-semibold' : 'border-transparent text-slate-500'}`}
        >
          Blog Categories
        </button>
      </div>
    </nav>
  );
}

