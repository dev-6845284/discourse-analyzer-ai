import React, { Suspense } from 'react';
import AddQuoteModal from './AddQuoteModal';
import ApiKeySettingsModal from './ApiKeySettingsModal';
import { TranscriptMethodSelector } from './TranscriptMethodSelector';
import { PasswordModal } from './users/PasswordModal';
import { EditProfileModal } from './users/EditProfileModal';
import { UsageStatsDashboard } from './admin/UsageStatsDashboard';
const AdminCategoriesLazy = React.lazy(() => import('./admin/AdminCategories'));
import type { TranscriptData } from '../utils/transcriptStorage';

interface ModalsProps {
  // Add quote modal
  isAddModalOpen: boolean;
  closeAddModal: () => void;
  onSave: (details: any, analysisType?: 'audit'|'flaws') => void;
  mode: 'add' | 'extract';
  initialSource: string;
  initialAnalysisType?: 'audit'|'flaws';

  // Api key
  isApiKeyModalOpen: boolean;
  onCloseApiKeyModal: () => void;

  // Transcript method selector
  isTranscriptMethodSelectorOpen: boolean;
  onCloseTranscriptMethodSelector: () => void;
  onImportTranscript: (t: TranscriptData) => void;
  onAutoFetchTranscript: (url: string) => Promise<void>;
  autoFetchError: string | null;
  isExtracting: boolean;

  // Password & profile
  isChangePasswordModalOpen: boolean;
  isEditProfileModalOpen: boolean;
  user: { _id: string; name: string } | null;
  onPasswordUpdated: () => void;
  onProfileUpdated: (newName: string) => void;

  // Usage dashboard
  isUsageStatsDashboardOpen: boolean;
  onCloseUsageStats: () => void;
  // Admin categories
  isAdminCategoriesOpen?: boolean;
  onCloseAdminCategories?: () => void;
}

export const ModalsContainer: React.FC<ModalsProps> = ({
  isAddModalOpen,
  closeAddModal,
  onSave,
  mode,
  initialSource,
  initialAnalysisType,
  isApiKeyModalOpen,
  onCloseApiKeyModal,
  isTranscriptMethodSelectorOpen,
  onCloseTranscriptMethodSelector,
  onImportTranscript,
  onAutoFetchTranscript,
  autoFetchError,
  isExtracting,
  isChangePasswordModalOpen,
  isEditProfileModalOpen,
  user,
  onPasswordUpdated,
  onProfileUpdated,
  isUsageStatsDashboardOpen,
  onCloseUsageStats,
  isAdminCategoriesOpen,
  onCloseAdminCategories,
}) => {
  return (
    <>
      {isUsageStatsDashboardOpen && (
        <UsageStatsDashboard onClose={onCloseUsageStats} />
      )}

      {isAdminCategoriesOpen && onCloseAdminCategories && (
        <Suspense fallback={<div>Loading admin categories...</div>}>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onCloseAdminCategories} />
            <div className="relative w-full max-w-4xl mx-4 bg-gray-900 text-gray-100 rounded-xl shadow-lg overflow-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Audit Categories</h3>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-gray-700 rounded" onClick={onCloseAdminCategories}>Close</button>
                </div>
              </div>
              <div className="p-4">
                <AdminCategoriesLazy />
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {isAddModalOpen && (
        <AddQuoteModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onSave={onSave}
          mode={mode}
          initialSource={initialSource}
          initialAnalysisType={initialAnalysisType}
        />
      )}

      <ApiKeySettingsModal isOpen={isApiKeyModalOpen} onClose={onCloseApiKeyModal} />

      <TranscriptMethodSelector
        isOpen={isTranscriptMethodSelectorOpen}
        onClose={onCloseTranscriptMethodSelector}
        onImport={(t) => {
          onImportTranscript(t);
          onCloseTranscriptMethodSelector();
        }}
        onAutoFetch={onAutoFetchTranscript}
        autoFetchError={autoFetchError}
        isLoading={isExtracting}
      />

      {isChangePasswordModalOpen && user && (
        <PasswordModal
          user={{ _id: user._id, name: user.name }}
          onClose={() => onPasswordUpdated()}
          onSubmit={() => onPasswordUpdated()}
        />
      )}

      {isEditProfileModalOpen && user && (
        <EditProfileModal
          user={{ _id: user._id, name: user.name }}
          onClose={() => onProfileUpdated(user.name)}
          onSubmit={(newName) => onProfileUpdated(newName)}
        />
      )}
    </>
  );
};

export default ModalsContainer;
