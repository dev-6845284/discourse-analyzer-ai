import React from 'react';
import AddQuoteModal from './AddQuoteModal';
import ApiKeySettingsModal from './ApiKeySettingsModal';
import { TranscriptMethodSelector } from './TranscriptMethodSelector';
import { PasswordModal } from './users/PasswordModal';
import { EditProfileModal } from './users/EditProfileModal';
import { UsageStatsDashboard } from './admin/UsageStatsDashboard';
import type { FullAnalysisData } from '../utils/analysisStorage';
import type { TranscriptData } from '../utils/transcriptStorage';

interface ModalsProps {
  // Add quote modal
  isAddModalOpen: boolean;
  closeAddModal: () => void;
  onSave: (details: any) => void;
  mode: 'add' | 'extract';
  initialSource: string;

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
}

export const ModalsContainer: React.FC<ModalsProps> = ({
  isAddModalOpen,
  closeAddModal,
  onSave,
  mode,
  initialSource,
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
}) => {
  return (
    <>
      {isUsageStatsDashboardOpen && (
        <UsageStatsDashboard onClose={onCloseUsageStats} />
      )}

      {isAddModalOpen && (
        <AddQuoteModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onSave={onSave}
          mode={mode}
          initialSource={initialSource}
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
