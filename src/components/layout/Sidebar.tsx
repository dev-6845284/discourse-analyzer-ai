import React from 'react';
import { useI18n } from '../../i18n';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: 'search' | 'people' | 'users' | 'sessions';
  onTabChange: (tab: 'search' | 'people' | 'users' | 'sessions') => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  onExport,
  onImport,
  children,
  userRole,
}) => {
  const { t } = useI18n();

  return (
    <div className="md:col-span-1 p-6 bg-gray-900/80 backdrop-blur-sm md:sticky top-0 h-auto md:h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-cyan-400">{t('appTitle')}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onExport}
            className="text-sm text-gray-400 hover:text-white"
            title={t('exportTitle')}
          >
            {t('export')}
          </button>
          <label
            className="text-sm text-gray-400 hover:text-white cursor-pointer"
            title={t('importTitle')}
          >
            {t('import')}
            <input
              type="file"
              className="hidden"
              accept=".json"
              onChange={onImport}
            />
          </label>
        </div>
      </div>

      <div className="md:hidden mb-4">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          aria-expanded={!isCollapsed}
          aria-controls="controls-panel"
        >
          <span>{isCollapsed ? t('showControls') : t('hideControls')} {t('controls')}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform ${
              isCollapsed ? '' : 'rotate-180'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div
        id="controls-panel"
        className={`${isCollapsed ? 'hidden' : 'block'} md:block`}
      >
        <div className="flex space-x-1 mb-4 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => onTabChange('search')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'search'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t('searchTab')}
          </button>
          <button
            onClick={() => onTabChange('people')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'people'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t('peopleTab')}
          </button>
          <button
            onClick={() => onTabChange('sessions')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sessions'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t('sessionsTab')}
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => onTabChange('users')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'users'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t('usersTab')}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};
