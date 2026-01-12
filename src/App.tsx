import React from 'react';
import { useAppController } from './hooks/useAppController';
import LoginScreen from './components/auth/LoginScreen';
import TranscriptImporter from './components/TranscriptImporter';
import { SrtTranscriptImporter } from './components/SrtTranscriptImporter';
import { YoutubeTranscriptButton } from './components/YoutubeTranscriptButton';
import { PersonSelector } from './components/people/PersonSelector';

import { PersonManager } from './components/people/PersonManager';
import { UserManager } from './components/users/UserManager';
import { AnalysisSessionsList } from './components/AnalysisSessionsList';
import { AnalysisImporter } from './components/AnalysisImporter';

// New Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { SearchControls } from './components/search/SearchControls';
import { ExtractionControls } from './components/search/ExtractionControls';
import { AdminAlertBanner } from './components/admin/AdminAlertBanner';
import ModalsContainer from './components/ModalsContainer';
import MainContent from './components/MainContent';
import { useI18n } from './i18n';
import type { Person } from './types';
import { PublicLanding } from './components/public/PublicLanding';
import { PublicQuotes } from './components/public/PublicQuotes';

const App: React.FC = () => {
  const ctrl = useAppController();
  const { t } = useI18n();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = React.useState(false);
  const [openSidebarSection, setOpenSidebarSection] = React.useState<string | null>(null);
  const [isAdminCategoriesOpen, setIsAdminCategoriesOpen] = React.useState<boolean>(false);
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

    // uiState passthroughs
    isFormCollapsed,
    toggleFormCollapsed,
    isAddModalOpen,
    closeAddModal,
    transcriptData,

    logsVisible,
    setLogsVisible,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    isChangePasswordModalOpen,
    setIsChangePasswordModalOpen,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    modalMode,
    modalAnalysisType,

    activeTab,
    setActiveTab,
    adminView,
    setAdminView,
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
    handleImproveQuote,
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

    quotesState: { quotes, articles, isLoading, error, rawApiResponseError, markQuoteAsStored },
    quoteFilters: { sortOrder, setSortOrder, filteredAndSortedQuotes }
  } = ctrl;

  // Routing Logic
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // 1. Auth Redirect Effect - Handles post-login / post-logout routing
  React.useEffect(() => {
    if (user && user.role !== 'public_guest') {
      // If real user is at public/login root, send to dashboard
      if (currentPath === '/login' || currentPath === '/') {
        navigateTo('/dashboard');
      }
    }
    // If logged out (user became null) and we are on dashboard -> handled by conditional render below
  }, [user, currentPath]);

  // Global Loading State (Session Check)
  if (ctrl.isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-gray-100 font-sans">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-medium text-gray-400">{t('initializing')}</p>
      </div>
    );
  }

  // 1. Login Route
  if (currentPath === '/login') {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <div className="w-full px-4 md:container md:mx-auto md:px-6 lg:px-8">
          <LoginScreen
            googleButtonRef={googleButtonRef}
            loginError={loginError}
            onLogin={loginWithPassword}
            onDevLogin={ctrl.loginAsDev}
          />
        </div>
      </div>
    );
  }

  // 2. Public Routes
  if (currentPath === '/' || currentPath === '/public') {
    return <PublicLanding
      onLoginSuccess={(u) => {
        // Public Guest Login Success
        updateUser(u); // Update context
        navigateTo('/public/quotes');
      }}
      onOpenLogin={() => navigateTo('/login')}
    />;
  }

  if (currentPath === '/public/quotes') {
    return <PublicQuotes onLogout={() => navigateTo('/')} onOpenLogin={() => navigateTo('/login')} />;
  }

  // 3. Dashboard Route (Protected)
  // If user is not authenticated or is a public guest, verify access
  const isPublicGuest = user?.role === 'public_guest';
  const isAuthenticatedRealUser = user && !isPublicGuest;

  if (currentPath.startsWith('/dashboard') || (!currentPath.startsWith('/public') && !currentPath.startsWith('/login'))) {
    if (!isAuthenticatedRealUser) {
      // Not authorized, redirect to Landing
      if (currentPath !== '/') {
        // Force redirect
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
        return null;
      }
    }
  }

  // If we are here, we are likely at /dashboard or valid internal route AND authenticated
  // Render Main App
  return (
    <div>
      {/* Provided translations via root I18nProvider */}
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        {/* Admin Security Alert Banner - shown in dev mode or for admins */}
        <AdminAlertBanner
          isAdmin={user?.role === 'admin'}
          onViewDashboard={() => setIsUsageStatsDashboardOpen(true)}
          isCollapsed={isAdminBannerCollapsed}
          onCollapsedChange={setIsAdminBannerCollapsed}
        />

        <div className={`w-full px-4 md:container md:mx-auto md:px-6 lg:px-8 transition-all duration-300 ${user?.role === 'admin' ? (isAdminBannerCollapsed ? 'pt-6' : 'pt-14') : ''}`}>
          <Header
            user={user!}
            isFormCollapsed={isFormCollapsed}
            toggleFormCollapsed={toggleFormCollapsed}
            logsVisible={logsVisible}
            setLogsVisible={setLogsVisible}
            setIsApiKeyModalOpen={setIsApiKeyModalOpen}
            handleLogout={() => {
              handleLogout();
              navigateTo('/');
            }}
            onChangePassword={openChangePasswordModal}
            onEditProfile={openEditProfileModal}
            openSidebarMobile={() => setIsSidebarOpenMobile(true)}
          />

          <div
            className={`p-6 bg-gray-800 rounded-xl shadow-lg transition-all duration-500 flex flex-col`}
          >
            <main className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-w-0 overflow-auto">

              <div className={`${isFormCollapsed ? 'max-h-16 overflow-hidden md:max-h-none' : ''} md:col-span-1`}>
                <Sidebar
                  isCollapsed={isFormCollapsed}
                  onToggleCollapse={toggleFormCollapsed}
                  onExport={handleExport}
                  onImport={handleImport}
                  userRole={user!.role}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setAdminView={setAdminView}
                  openAdminCategories={() => setIsAdminCategoriesOpen(true)}
                  logsVisible={logsVisible}
                  setLogsVisible={setLogsVisible}
                  onPublicView={() => navigateTo('/public/quotes')}
                  openSection={openSidebarSection}
                  setOpenSection={setOpenSidebarSection}
                  // Settings props
                  systemSettings={ctrl.systemSettings}
                  onOpenSettings={() => ctrl.setIsSettingsModalOpen(true)}
                  searchContent={
                    <div className="space-y-4">
                      {/* Always visible person selector */}
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('personsName')}</label>
                        <div>
                          <PersonSelector
                            value={searchParams.personName}
                            onChange={(name) => {
                              searchParams.setPersonName(name);
                              setSelectedPerson(null);
                            }}
                            onSelectPerson={(person) => {
                              setSelectedPerson(person);
                              searchParams.setPersonName(person.name);
                            }}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-gray-800/50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('aiProvider')}</label>
                        <div className="flex rounded-md bg-gray-700">
                          <button
                            onClick={() => searchParams.handleAISelectionChange('gemini')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors rounded-l-md ${searchParams.selectedAI === 'gemini'
                              ? 'bg-cyan-700 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                              }`}
                          >
                            Gemini
                          </button>
                          <button
                            onClick={() => searchParams.handleAISelectionChange('grok')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${searchParams.selectedAI === 'grok'
                              ? 'bg-cyan-700 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                              }`}
                          >
                            Grok
                          </button>
                          <button
                            onClick={() => searchParams.handleAISelectionChange('openai')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors rounded-r-md ${searchParams.selectedAI === 'openai'
                              ? 'bg-cyan-700 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                              }`}
                          >
                            OpenAI
                          </button>
                        </div>
                      </div>

                      {/* Search for Quotes (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.search && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.search ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('searchForQuotes')} {!ctrl.systemSettings.search && t('disabled')}
                        </summary>
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
                      </details>

                      {/* Extract from Text (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.text_extract && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.text_extract ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('extractFromText')} {!ctrl.systemSettings.text_extract && t('disabled')}
                        </summary>
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
                      </details>

                      {/* YouTube Transcript (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.youtube_transcript && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.youtube_transcript ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('youtubeTranscript')} {!ctrl.systemSettings.youtube_transcript && t('disabled')}
                        </summary>
                        <YoutubeTranscriptButton
                          onClick={() => setIsTranscriptMethodSelectorOpen(true)}
                          isLoading={searchParams.isExtracting}
                        />
                      </details>

                      {/* Import Transcript Data (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.import_transcript && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.import_transcript ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('importTranscriptDataTitle') || t('importTranscriptData')} {!ctrl.systemSettings.import_transcript && t('disabled')}
                        </summary>
                        <TranscriptImporter
                          onImport={handleImportTranscript}
                          isLoading={searchParams.isExtracting}
                        />
                      </details>

                      {/* Import SRT Transcript (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.import_transcript && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.import_transcript ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('importSrtTranscriptTitle')} {!ctrl.systemSettings.import_transcript && t('disabled')}
                        </summary>
                        <SrtTranscriptImporter
                          onImport={handleImportTranscript}
                          isLoading={searchParams.isExtracting}
                        />
                      </details>

                      {/* Import Analysis Data (collapsible) */}
                      <details className={`border rounded-lg bg-gray-800 ${!ctrl.systemSettings.import_analysis && user?.role !== 'admin' ? 'hidden' : ''} ${!ctrl.systemSettings.import_analysis ? 'border-gray-600 opacity-90' : ''}`}>
                        <summary className="px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg cursor-pointer hover:opacity-80 transition-opacity">
                          {t('importAnalysisTitle')} {!ctrl.systemSettings.import_analysis && t('disabled')}
                        </summary>
                        <AnalysisImporter
                          onImport={handleImportAnalysis}
                          isLoading={searchParams.isExtracting}
                        />
                      </details>
                    </div>
                  }
                  peopleContent={
                    <div className="bg-gray-800 rounded-lg flex flex-col h-full overflow-hidden text-gray-100">
                      <div className="flex-1 overflow-auto">
                        <PersonManager
                          onSelectPerson={(person: Person) => {
                            setSelectedPerson(person);
                            setResultsTab('stored');
                          }}
                        />
                      </div>
                    </div>
                  }
                  sessionsContent={
                    <AnalysisSessionsList
                      onResume={handleResumeSession}
                      refreshTrigger={sessionsRefreshTrigger}
                    />
                  }
                  usersContent={
                    <UserManager />
                  }
                />
              </div>

              <MainContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                adminView={adminView}
                setAdminView={setAdminView}
                openAdminCategories={() => setIsAdminCategoriesOpen(true)}
                logsVisible={logsVisible}
                setLogsVisible={setLogsVisible}
                resultsTab={resultsTab}
                setResultsTab={setResultsTab}
                transcriptData={transcriptData}
                selectedPerson={selectedPerson}
                setSelectedPerson={setSelectedPerson}
                userRole={user?.role}

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
                statusFilters={{
                  isAnalyzed: searchParams.isAnalyzed,
                  setIsAnalyzed: searchParams.setIsAnalyzed,
                  isImproved: searchParams.isImproved,
                  setIsImproved: searchParams.setIsImproved,
                }}
                onAnalyze={(quote, model, analysisType) => quotesState.handleAnalyzeQuote(quote, model, analysisType)}
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
                onExport={handleExport}
                onImport={handleImport}
                onPublicView={() => navigateTo('/public/quotes')}
              />
            </main>

            {isSidebarOpenMobile && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/60" onClick={() => setIsSidebarOpenMobile(false)} />
                <div className="relative z-50 w-full max-w-xs h-full">
                  <Sidebar
                    asDrawer
                    onClose={() => setIsSidebarOpenMobile(false)}
                    isCollapsed={isFormCollapsed}
                    onToggleCollapse={toggleFormCollapsed}
                    onExport={handleExport}
                    onImport={handleImport}
                    userRole={user!.role}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setAdminView={setAdminView}
                    openAdminCategories={() => setIsAdminCategoriesOpen(true)}
                    logsVisible={logsVisible}
                    setLogsVisible={setLogsVisible}
                    onPublicView={() => navigateTo('/public/quotes')}
                    openSection={openSidebarSection}
                    setOpenSection={setOpenSidebarSection}
                    // Settings props
                    systemSettings={ctrl.systemSettings}
                    onOpenSettings={() => ctrl.setIsSettingsModalOpen(true)}
                    searchContent={
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
                    }
                    peopleContent={
                      <div className="bg-gray-800 rounded-lg flex flex-col h-full overflow-hidden text-gray-100">
                        <div className="flex-1 overflow-auto">
                          <PersonManager
                            onSelectPerson={(person: Person) => {
                              setSelectedPerson(person);
                              setResultsTab('stored');
                            }}
                          />
                        </div>
                      </div>
                    }
                    sessionsContent={
                      <AnalysisSessionsList
                        onResume={handleResumeSession}
                        refreshTrigger={sessionsRefreshTrigger}
                      />
                    }
                    usersContent={
                      <div className="text-gray-400 text-sm text-center mt-4">
                        Manage system users, roles and passwords.
                      </div>
                    }
                  />
                </div>
              </div>
            )}

            <ModalsContainer
              isAddModalOpen={isAddModalOpen}
              closeAddModal={closeAddModal}
              onSave={handleModalSave}
              mode={modalMode}
              initialSource={extractedSourceUrl}
              initialAnalysisType={modalAnalysisType}
              initialSelectedAI={searchParams.selectedAI}
              initialAnalyzeImmediately={shouldAnalyzeImmediately}
              onImportTranscript={(t) => {
                handleImportTranscript(t);
                setIsTranscriptMethodSelectorOpen(false);
                setAutoFetchError(null);
              }}
              onAutoFetchTranscript={handleFetchYoutubeTranscript}
              autoFetchError={autoFetchError}
              isExtracting={searchParams.isExtracting}
              isApiKeyModalOpen={isApiKeyModalOpen}
              onCloseApiKeyModal={() => setIsApiKeyModalOpen(false)}
              isTranscriptMethodSelectorOpen={isTranscriptMethodSelectorOpen}
              onCloseTranscriptMethodSelector={() => setIsTranscriptMethodSelectorOpen(false)}

              isChangePasswordModalOpen={isChangePasswordModalOpen}
              isEditProfileModalOpen={isEditProfileModalOpen}
              user={{ _id: user!._id, name: user!.name }}
              onPasswordUpdated={() => {
                setIsChangePasswordModalOpen(false);
                alert(t('passwordUpdated'));
              }}
              closeChangePasswordModal={() => setIsChangePasswordModalOpen(false)}
              onProfileUpdated={(newName) => {
                setIsEditProfileModalOpen(false);
                updateUser({ name: newName });
              }}

              isUsageStatsDashboardOpen={isUsageStatsDashboardOpen}
              onCloseUsageStats={() => setIsUsageStatsDashboardOpen(false)}
              isAdminCategoriesOpen={isAdminCategoriesOpen}
              onCloseAdminCategories={() => setIsAdminCategoriesOpen(false)}

              // Settings props
              isSettingsModalOpen={ctrl.isSettingsModalOpen}
              onCloseSettingsModal={() => ctrl.setIsSettingsModalOpen(false)}
              systemSettings={ctrl.systemSettings}
              onUpdateSettings={ctrl.handleUpdateSettings}
            />
          </div>
        </div>
      </div>
    </div >
  );
};


export default App;
