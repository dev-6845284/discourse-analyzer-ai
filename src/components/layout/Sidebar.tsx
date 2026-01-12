import SidebarSection from './SidebarSection';
import React from 'react';
import { useI18n } from '../../i18n';
import DevRoleSelector from '../DevRoleSelector';
import { Globe, ExternalLink } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchContent?: React.ReactNode;
  peopleContent?: React.ReactNode;
  sessionsContent?: React.ReactNode;
  usersContent?: React.ReactNode;
  managementContent?: React.ReactNode;
  userRole?: string;
  asDrawer?: boolean;
  onClose?: () => void;
  openSection?: string | null;
  setOpenSection?: (key: string | null) => void;
  activeTab?: 'search' | 'people' | 'users' | 'sessions' | 'admin';
  setActiveTab?: (tab: 'search' | 'people' | 'users' | 'sessions' | 'admin') => void;
  setAdminView?: (v: 'users' | 'categories' | 'logs' | 'management' | 'keysets' | null) => void;
  openAdminCategories?: () => void;
  logsVisible?: boolean;
  setLogsVisible?: (v: boolean) => void;
  onPublicView?: () => void;
  systemSettings?: any;
  onOpenSettings?: () => void;
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
  managementContent,
  userRole,
  asDrawer,
  onClose,
  openSection,
  setOpenSection,
  activeTab,
  setActiveTab,
  setAdminView,
  openAdminCategories,
  logsVisible,
  setLogsVisible,
  onPublicView,
  systemSettings,
  onOpenSettings,
}) => {
  const { t } = useI18n();

  const containerClass = asDrawer
    ? 'p-3 md:p-6 bg-gray-900/80 h-full overflow-y-auto min-w-0 w-full'
    : 'md:col-span-1 p-3 md:p-6 bg-gray-900/80 backdrop-blur-sm md:sticky top-0 h-auto md:h-screen overflow-y-auto min-w-0 w-full';

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {/* Export/Import moved to Search Results header */}
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
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-16 h-16 bg-cyan-700 text-white flex items-center justify-center shadow-lg border-2 border-cyan-400 md:hidden"
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

          {activeTab !== 'admin' && (
            <>
              <SidebarSection
                title={t('searchTab')}
                sectionKey="search"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('analysisTag')}
              >
                {searchContent}
              </SidebarSection>

              <SidebarSection
                title={t('peopleTab')}
                sectionKey="people"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('analysisTag')}
              >
                {peopleContent}
              </SidebarSection>

              <SidebarSection
                title={t('sessionsTab')}
                sectionKey="sessions"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('analysisTag')}
              >
                {sessionsContent}
              </SidebarSection>
            </>
          )}

          {userRole === 'admin' && activeTab !== 'search' && (
            <>
              <SidebarSection
                title={t('adminActions')}
                sectionKey="admin-actions"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('adminTag')}
                defaultOpen={true}
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setActiveTab && setActiveTab('admin');
                      setAdminView && setAdminView('management');
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    {t('api_management')}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab && setActiveTab('admin');
                      setAdminView && setAdminView('categories');
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    {t('analysisCategories')}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab && setActiveTab('admin');
                      setAdminView && setAdminView('keysets');
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    {t('keyset_management')}
                  </button>

                  <button
                    onClick={() => onOpenSettings && onOpenSettings()}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    System Settings (Feature Toggles)
                  </button>
                </div>
              </SidebarSection>

              <SidebarSection
                title={t('troubleshooting')}
                sectionKey="troubleshooting"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('adminTag')}
                defaultOpen={true}
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setAdminView && setAdminView('logs');
                      setActiveTab && setActiveTab('admin');
                      setLogsVisible && setLogsVisible(true);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    {t('analysis_logs')}
                  </button>
                </div>
              </SidebarSection>

              <SidebarSection
                title={t('testing')}
                sectionKey="testing"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('adminTag')}
                defaultOpen={true}
              >
                <div className="flex flex-col gap-2">
                  <DevRoleSelector />
                </div>
              </SidebarSection>

              <SidebarSection
                title={t('usersTab')}
                sectionKey="users"
                openSection={openSection}
                setOpenSection={setOpenSection}
                tag={t('adminTag')}
                defaultOpen={true}
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setAdminView && setAdminView('users');
                      setActiveTab && setActiveTab('admin');
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    {t('userManagement')}
                  </button>
                </div>
              </SidebarSection>
            </>
          )}
          {managementContent && activeTab !== 'search' && (
            <SidebarSection
              title={t('api_management')}
              sectionKey="management"
              openSection={openSection}
              setOpenSection={setOpenSection}
              tag={t('adminTag')}
              defaultOpen={true}
            >
              {managementContent}
            </SidebarSection>
          )}
        </div>
      </div>
    </div>
  );
};
