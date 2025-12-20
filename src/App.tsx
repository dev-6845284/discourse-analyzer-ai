import React from 'react';
import { useAppController } from './hooks/useAppController';
import LoginScreen from './components/auth/LoginScreen';
import AddQuoteModal from './components/AddQuoteModal';
import ApiKeySettingsModal from './components/ApiKeySettingsModal';
import LogViewer from './components/LogViewer';
import TranscriptViewer from './components/TranscriptViewer';
import TranscriptImporter from './components/TranscriptImporter';
import { SrtTranscriptImporter } from './components/SrtTranscriptImporter';
import { TranscriptMethodSelector } from './components/TranscriptMethodSelector';
import { YoutubeTranscriptButton } from './components/YoutubeTranscriptButton';

import { PersonManager } from './components/people/PersonManager';
import { UserManager } from './components/users/UserManager';
import { PasswordModal } from './components/users/PasswordModal';
import { EditProfileModal } from './components/users/EditProfileModal';
import StoredQuotes from './components/StoredQuotes';
import { TranscriptData } from './utils/transcriptStorage';
import { AnalysisSessionsList } from './components/AnalysisSessionsList';
import { AnalysisImporter } from './components/AnalysisImporter';
import { FullAnalysisData } from './utils/analysisStorage';

// New Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { SearchControls } from './components/search/SearchControls';
import { ExtractionControls } from './components/search/ExtractionControls';
import { SearchResults } from './components/results/SearchResults';
import { AdminAlertBanner } from './components/admin/AdminAlertBanner';
import ModalsContainer from './components/ModalsContainer';
import MainContent from './components/MainContent';
import { useI18n } from './i18n';
import { UsageStatsDashboard } from './components/admin/UsageStatsDashboard';

const App: React.FC = () => {
  const ctrl = useAppController();
  const { t } = useI18n();
  const {
    user,
    loginError,
    googleButtonRef,
    loginWithPassword,
    handleLogout,
    updateUser,

    searchParams,
    timePeriod,
    quotesState,
    quoteFilters,
    uiState,

    // uiState passthroughs
    isFormCollapsed,
    toggleFormCollapsed,
    isAddModalOpen,
    openAddModal,
    closeAddModal,
    transcriptData,
    updateTranscriptSessionId,

    logsVisible,
    setLogsVisible,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    isChangePasswordModalOpen,
    setIsChangePasswordModalOpen,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    modalMode,

    activeTab,
    setActiveTab,
    resultsTab,
    setResultsTab,
    selectedPerson,
    setSelectedPerson,
    sessionsRefreshTrigger,
    setSessionsRefreshTrigger,
    extractionStatus,
    extractionLanguage,
    setExtractionLanguage,
    extractionError,
    setAutoFetchError,
    extractedSourceUrl,
    shouldAnalyzeImmediately,
    isUsageStatsDashboardOpen,
    setIsUsageStatsDashboardOpen,
    isAdminBannerCollapsed,
    setIsAdminBannerCollapsed,
    isTranscriptMethodSelectorOpen,
    setIsTranscriptMethodSelectorOpen,
    autoFetchError,

    handleExport,
    handleAutoExtract,
    handleImport,
    handleSearch,
    handleAnalyzeQuote,
    handleImproveQuote,
    performExtraction,
    handleExtractFromUrl,
    handleModalSave,
    openExtractModal,
    openAddQuoteModal,
    handleFetchYoutubeTranscript,
    handleImportTranscript,
    handleImportAnalysis,
    openChangePasswordModal,
    openEditProfileModal,
    handleResumeSession,
    handleEditSource,
    handleSaveQuote,

    quotesState: { quotes, articles, isLoading, error, rawApiResponseError, handleLoadQuotes, handleClearQuotes, markQuoteAsStored, handleCancelSearch },
    quoteFilters: { sortOrder, setSortOrder, filterCategory, filterRating, filteredAndSortedQuotes }
  } = ctrl;
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <div className="container mx-auto p-4 md:p-8">
          <LoginScreen 
            googleButtonRef={googleButtonRef} 
            loginError={loginError} 
            onLogin={loginWithPassword}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Provided translations via root I18nProvider */}
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Admin Security Alert Banner - shown in dev mode or for admins */}
      <AdminAlertBanner 
        isAdmin={import.meta.env.DEV || user?.role === 'admin'} 
        onViewDashboard={() => setIsUsageStatsDashboardOpen(true)}
        isCollapsed={isAdminBannerCollapsed}
        onCollapsedChange={setIsAdminBannerCollapsed}
      />
      

      
      <div className={`container mx-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ${
        (import.meta.env.DEV || user?.role === 'admin') ? (isAdminBannerCollapsed ? 'pt-6' : 'pt-14') : ''
      }`}>
          <Header
            user={user}
            isFormCollapsed={isFormCollapsed}
            toggleFormCollapsed={toggleFormCollapsed}
            logsVisible={logsVisible}
            setLogsVisible={setLogsVisible}
            setIsApiKeyModalOpen={setIsApiKeyModalOpen}
            googleButtonRef={googleButtonRef}
            handleLogout={handleLogout}
            onChangePassword={openChangePasswordModal}
            onEditProfile={openEditProfileModal}
          />
          {(import.meta.env.DEV || user?.role === 'admin') && <LogViewer logsVisible={logsVisible} />}

        <div
          className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-500 overflow-hidden ${
            isFormCollapsed ? 'max-h-16' : ''
          }`}
        >
          <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Sidebar
              isCollapsed={isFormCollapsed}
              onToggleCollapse={toggleFormCollapsed}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onExport={handleExport}
              onImport={handleImport}
              userRole={user.role}
            >
              {activeTab === 'sessions' ? (
                <AnalysisSessionsList 
                  onResume={handleResumeSession} 
                  refreshTrigger={sessionsRefreshTrigger}
                />
              ) : activeTab === 'people' ? (
                <div className="bg-gray-100 rounded-lg h-[calc(100vh-200px)] overflow-hidden text-gray-900">
                  <PersonManager
                    onSelectPerson={(person) => {
                      setSelectedPerson(person);
                      setResultsTab('stored');
                    }}
                  />
                </div>
              ) : activeTab === 'users' ? (
                <div className="text-gray-400 text-sm text-center mt-4">
                  Manage system users, roles and passwords.
                </div>
              ) : (
                <div className="space-y-6">
                  <SearchControls
                    searchParams={searchParams}
                    statusFilters={{
                      isAnalyzed: searchParams.isAnalyzed,
                      setIsAnalyzed: searchParams.setIsAnalyzed,
                      isImproved: searchParams.isImproved,
                      setIsImproved: searchParams.setIsImproved,
                    }}
                    timePeriod={{
                      type: timePeriod.timePeriodType,
                      value: timePeriod.timePeriodValue,
                      customDateFrom: timePeriod.customDateFrom,
                      customDateTo: timePeriod.customDateTo,
                      handleTypeChange: timePeriod.handleTimePeriodTypeChange,
                      handleValueChange: timePeriod.handleTimePeriodValueChange,
                      setCustomDateFrom: timePeriod.setCustomDateFrom,
                      setCustomDateTo: timePeriod.setCustomDateTo,
                      description: timePeriod.getTimePeriod().description,
                    }}
                    languages={{
                      selected: searchParams.selectedLanguages,
                      onChange: searchParams.handleLanguageChange,
                    }}
                    onSearch={handleSearch}
                    onCancel={quotesState.handleCancelSearch}
                    isLoading={isLoading}
                  />
                  <ExtractionControls
                    textToExtract={searchParams.textToExtract}
                    setTextToExtract={searchParams.setTextToExtract}
                    isExtracting={searchParams.isExtracting}
                    personName={searchParams.personName}
                    onExtract={openExtractModal}
                    onAdd={openAddQuoteModal}
                    onExtractFromUrl={handleExtractFromUrl}
                    onAutoExtract={handleAutoExtract}
                    extractionStatus={extractionStatus}
                    extractionLanguage={extractionLanguage}
                    setExtractionLanguage={setExtractionLanguage}
                    extractionError={extractionError}
                  />
                  <YoutubeTranscriptButton
                    onClick={() => setIsTranscriptMethodSelectorOpen(true)}
                    isLoading={searchParams.isExtracting}
                  />
                  <TranscriptImporter
                    onImport={handleImportTranscript}
                    isLoading={searchParams.isExtracting}
                  />
                  <SrtTranscriptImporter
                    onImport={handleImportTranscript}
                    isLoading={searchParams.isExtracting}
                  />
                  <AnalysisImporter
                    onImport={handleImportAnalysis}
                    isLoading={searchParams.isExtracting}
                  />
                </div>
              )}
            </Sidebar>

            <MainContent
              activeTab={activeTab}
              resultsTab={resultsTab}
              setResultsTab={setResultsTab}
              transcriptData={transcriptData}
              selectedPerson={selectedPerson}
              setSelectedPerson={setSelectedPerson}

              quotes={quotes}
              articles={articles}
              isLoading={isLoading}
              error={error}
              rawApiResponseError={rawApiResponseError}
              filteredAndSortedQuotes={filteredAndSortedQuotes}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}

              onClearQuotes={quotesState.handleClearQuotes}
              selectedAI={searchParams.selectedAI}
              onAnalyze={(quote, model) => quotesState.handleAnalyzeQuote(quote, model)}
              onImprove={handleImproveQuote}
              onSave={(quote: any) => {
                handleSaveQuote({
                  text: quote.text,
                  personName: searchParams.personName,
                  source: quote.source,
                  date: quote.date,
                  analysisContext: quote.analysisContext,
                  links: quote.links,
                  ...(quote.audit ? {
                    analyzedByProvider: searchParams.selectedAI,
                    analyzedAt: new Date().toISOString()
                  } : {}),
                  metadata: {
                    title: quote.title,
                    languageCode: quote.languageCode,
                    languageName: quote.languageName,
                    // Keep legacy backup if present
                    ...(quote.audit ? { audit: quote.audit } : (quote.analysis ? { legacyAnalysis: quote.analysis } : {}))
                  }
                }).then((response) => markQuoteAsStored(quote.id, response.data._id));
              }}
              onLanguageChange={quotesState.handleUpdateQuoteLanguage}
              onAccept={(quote: any) => quotesState.handleAcceptQuote(quote, searchParams.selectedAI)}
              onDiscard={quotesState.handleDiscardQuote}
              onRemove={quotesState.handleRemoveQuote}
              clearError={quotesState.clearError}
              onEditSource={handleEditSource}
              onResumeSession={handleResumeSession}
              onStoredPromoteSuccess={() => setSessionsRefreshTrigger(prev => prev + 1)}
            />
          </main>

          <ModalsContainer
            isAddModalOpen={isAddModalOpen}
            closeAddModal={closeAddModal}
            onSave={handleModalSave}
            mode={modalMode}
            initialSource={extractedSourceUrl}

            isApiKeyModalOpen={isApiKeyModalOpen}
            onCloseApiKeyModal={() => setIsApiKeyModalOpen(false)}

            isTranscriptMethodSelectorOpen={isTranscriptMethodSelectorOpen}
            onCloseTranscriptMethodSelector={() => {
              setIsTranscriptMethodSelectorOpen(false);
              setAutoFetchError(null);
            }}
            onImportTranscript={(t) => {
              handleImportTranscript(t);
              setIsTranscriptMethodSelectorOpen(false);
              setAutoFetchError(null);
            }}
            onAutoFetchTranscript={handleFetchYoutubeTranscript}
            autoFetchError={autoFetchError}
            isExtracting={searchParams.isExtracting}

            isChangePasswordModalOpen={isChangePasswordModalOpen}
            isEditProfileModalOpen={isEditProfileModalOpen}
            user={user ? { _id: user._id, name: user.name } : null}
            onPasswordUpdated={() => {
              setIsChangePasswordModalOpen(false);
              alert(t('passwordUpdated'));
            }}
            onProfileUpdated={(newName) => {
              setIsEditProfileModalOpen(false);
              updateUser({ name: newName });
            }}

            isUsageStatsDashboardOpen={isUsageStatsDashboardOpen}
            onCloseUsageStats={() => setIsUsageStatsDashboardOpen(false)}
          />
        </div>
      </div>
    </div>
    </div>
  );
};

export default App;