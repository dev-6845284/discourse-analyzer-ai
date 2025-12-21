import SidebarSection from './SidebarSection';
import React from 'react';
import { useI18n } from '../../i18n';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchContent?: React.ReactNode;
  peopleContent?: React.ReactNode;
  sessionsContent?: React.ReactNode;
  usersContent?: React.ReactNode;
  userRole?: string;
  asDrawer?: boolean;
  onClose?: () => void;
  openSection?: string | null;
  setOpenSection?: (key: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onExport,
  onImport,
  searchContent,
  peopleContent,
  sessionsContent,
  usersContent,
  userRole,
  asDrawer,
  onClose,
  openSection,
  setOpenSection,
}) => {
  const { t } = useI18n();

  const containerClass = asDrawer
    ? 'p-3 md:p-6 bg-gray-900/80 h-full overflow-y-auto min-w-0 w-full'
    : 'md:col-span-1 p-3 md:p-6 bg-gray-900/80 backdrop-blur-sm md:sticky top-0 h-auto md:h-screen overflow-y-auto min-w-0 w-full';

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center mb-6">
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

      {asDrawer && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Collapse/expand controls button (mobile only) */}
      {!isCollapsed ? (
        <div className="md:hidden mb-4">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            aria-expanded={!isCollapsed}
            aria-controls="controls-panel"
          >
            <span>{t('hideControls')} {t('controls')}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transition-transform rotate-180"
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
      ) : null}

      {/* Floating show controls button, always visible when collapsed (mobile only) */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-16 h-16 bg-cyan-600 text-white flex items-center justify-center shadow-lg border-2 border-cyan-400 md:hidden"
          style={{ borderRadius: '18px' }}
          aria-label={t('showControls')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Only collapse the sidebar controls, not the main content */}
      <div
        id="controls-panel"
        className={`${isCollapsed ? 'hidden' : 'block'} md:block`}
      >
        <div className="space-y-2">
          <SidebarSection
            title={t('searchTab')}
            sectionKey="search"
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            {searchContent}
          </SidebarSection>
          <SidebarSection
            title={t('peopleTab')}
            sectionKey="people"
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            {peopleContent}
          </SidebarSection>
          <SidebarSection
            title={t('sessionsTab')}
            sectionKey="sessions"
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            {sessionsContent}
          </SidebarSection>
          {userRole === 'admin' && (
            <SidebarSection
              title={t('usersTab')}
              sectionKey="users"
              openSection={openSection}
              setOpenSection={setOpenSection}
            >
              {usersContent}
            </SidebarSection>
          )}
        </div>
      </div>
    </div>
  );
};
