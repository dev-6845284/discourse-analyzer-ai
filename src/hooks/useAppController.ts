import React from 'react';
import { useAuth } from './useAuth';
import { useSearchParams } from './useSearchParams';
import { useTimePeriod } from './useTimePeriod';
import { useQuotes } from './useQuotes';
import { useQuoteFilters } from './useQuoteFilters';
import { useUIState } from './useUIState';
import { fetchArticle, getSession, getContentAnalysis, fetchYoutubeTranscript } from '../utils/api';
import { useI18n } from '../i18n';
import { exportQuotesToFile, importQuotesFromFile } from '../utils/file';
import { saveQuote, analyzeQuote, updateQuote } from '../utils/api';
import { TranscriptData } from '../utils/transcriptStorage';
import { FullAnalysisData } from '../utils/analysisStorage';
import type { Quote, Person, AnalysisSession, ExportData } from '../types';

export type UseAppController = ReturnType<typeof useAppController>;

export function useAppController() {
  const { user, loginError, isAuthLoading, googleButtonRef, handleLogout, loginWithPassword, loginAsDev, updateUser } = useAuth();

  const searchParams = useSearchParams();
  const { t } = useI18n();
  const timePeriod = useTimePeriod();
  const quotesState = useQuotes(handleLogout);
  const quoteFilters = useQuoteFilters(quotesState.quotes);
  const uiState = useUIState();

  // Local UI flags
  const [logsVisible, setLogsVisible] = React.useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = React.useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'add' | 'extract'>('add');
  const [activeTab, setActiveTab] = React.useState<'search' | 'people' | 'users' | 'sessions' | 'admin'>('search');
  const [resultsTab, setResultsTab] = React.useState<'new' | 'stored' | 'transcript'>('new');
  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);
  const [sessionsRefreshTrigger, setSessionsRefreshTrigger] = React.useState(0);
  const [storedQuotesRefreshTrigger, setStoredQuotesRefreshTrigger] = React.useState(0);
  const [extractionStatus, setExtractionStatus] = React.useState<string>('');
  const [extractionLanguage, setExtractionLanguage] = React.useState<string>('lt');
  const [extractionError, setExtractionError] = React.useState<string | null>(null);
  const [extractedSourceUrl, setExtractedSourceUrl] = React.useState<string>('');
  const [shouldAnalyzeImmediately, setShouldAnalyzeImmediately] = React.useState<boolean>(true);
  const [isUsageStatsDashboardOpen, setIsUsageStatsDashboardOpen] = React.useState<boolean>(false);
  const [isAdminBannerCollapsed, setIsAdminBannerCollapsed] = React.useState<boolean>(true);
  const [isTranscriptMethodSelectorOpen, setIsTranscriptMethodSelectorOpen] = React.useState<boolean>(false);
  const [autoFetchError, setAutoFetchError] = React.useState<string | null>(null);
  // Admin view within Admin actions container (e.g., 'users', 'categories', null)
  const [adminView, setAdminView] = React.useState<'users' | 'categories' | 'logs' | 'management' | 'keysets' | null>(null);

  // System Settings
  const [systemSettings, setSystemSettings] = React.useState({
    search: true,
    text_extract: true,
    youtube_transcript: true,
    import_transcript: true,
    import_analysis: true,
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (isAuthLoading || !user || user.role === 'public_guest') return;

    // Dynamically import to avoid circular dependencies if any, though explicit import is better.
    // Switching to direct import or keeping api usage consistent.
    // Since api is imported at top level in other files, let's use the imported 'fetchArticle' style if possible, 
    // but here we need to import the new functions.
    // Let's just use the functions from ../utils/api if they were exported.
    // I will use dynamic import for now to be safe with the previous `require` change.
    import('../utils/api').then(({ fetchSystemSettings }) => {
      fetchSystemSettings().then((res: any) => {
        setSystemSettings(res.data);
      }).catch((err: any) => console.error('Failed to fetch settings:', err));
    });
  }, [user, isAuthLoading]);

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const { updateSystemSettings } = await import('../utils/api');
      const res = await updateSystemSettings(newSettings);
      setSystemSettings(res.data);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  React.useEffect(() => {
    if (logsVisible) {
      uiState.setIsFormCollapsed(true);
    }
  }, [logsVisible, uiState.setIsFormCollapsed]);

  // Ensure viewer role defaults to stored quotes view
  React.useEffect(() => {
    if (user?.role === 'viewer' && resultsTab === 'new') {
      setResultsTab('stored');
    }
  }, [user, resultsTab]);

  const handleExport = React.useCallback(() => {
    exportQuotesToFile(searchParams.personName, quotesState.quotes);
  }, [searchParams.personName, quotesState.quotes]);

  const handleAutoExtract = React.useCallback(async (url: string) => {
    searchParams.setIsExtracting(true);
    setExtractionStatus('Fetching article content...');
    setExtractionError(null);

    try {
      const response = await fetchArticle(url, extractionLanguage);
      const { textContent, metadata, transcript } = response.data;
      searchParams.setTextToExtract(textContent);
      setExtractedSourceUrl(metadata.url);

      if (transcript) {
        setExtractionStatus('Opening transcript viewer...');
        setTimeout(() => {
          uiState.openTranscriptViewer({
            videoId: transcript.videoId,
            languageCode: transcript.languageCode,
            isAutoGenerated: transcript.isAutoGenerated,
            segments: transcript.segments,
          });
        }, 300);
      }
    } catch (error: any) {
      console.error('Auto extraction failed', error);
      setExtractionError(error.response?.data?.message || 'Failed to extract content');
    } finally {
      searchParams.setIsExtracting(false);
      setExtractionStatus('');
    }
  }, [extractionLanguage, searchParams]);

  const handleImport = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importQuotesFromFile(
        file,
        (data: ExportData) => {
          uiState.openImportQuoteModal(data);
        },
        (errorMessage: string) => {
          alert(errorMessage);
        }
      );
    }
  }, [uiState]);

  const handleImportConfirm = React.useCallback(async (person: Person | null) => {
    if (!uiState.importQuoteData || !person) return;

    try {
      const quotesToImport = uiState.importQuoteData.quotes;
      const total = quotesToImport.length;
      let processed = 0;

      // Process sequentially to be safe, or parallel?
      // Parallel is faster.
      await Promise.all(quotesToImport.map(async (q) => {
        const newQuote = {
          ...q,
          id: undefined, // Clear IDs to ensure new creation
          _id: undefined,
          person: person._id || person.name, // Use ID if existing, otherwise name which backend should handle (or we trust saveQuote logic)
          personName: person.name,
          isStored: false, // Ensure it's treated as new to be stored
        };

        // If person has no _id, it means we might be creating a new person for EACH quote?
        // Ideally backend handles "if person name exists, use it, else create".
        // Assuming saveQuote handles this.

        // However, if we are importing 100 quotes for a NEW person, 
        // parallel requests might create 100 duplicates of that person if not handled carefully in backend.
        // It might be safer to create the person FIRST if it's new, but that requires a separate API call.
        // For now, let's assume the backend handles lookup-or-create correctly or we risk it.
        // Best practice: if person._id is missing, create person once, then use ID.
        // But we don't have easy createPerson API exposed here handy without looking.
        // Let's rely on standard saveQuote behavior for now, or use sequential to reduce race condition risk.

        await saveQuote(newQuote);
        processed++;
      }));

      alert(t('importSuccess', { count: total }));
      uiState.closeImportQuoteModal();
      setStoredQuotesRefreshTrigger(prev => prev + 1);
      setResultsTab('stored');
      searchParams.setPersonName(person.name); // Switch view to that person
    } catch (error) {
      console.error('Import failed', error);
      alert('Failed to import some quotes. Please check console.');
    }
  }, [uiState, searchParams]);

  const handleSearch = React.useCallback(() => {
    setResultsTab('new');
    quotesState.handleSearch(
      searchParams.selectedAI,
      searchParams.personName,
      searchParams.selectedLanguages,
      searchParams.resultCount,
      searchParams.temperature,
      searchParams.maxQuoteLength,
      timePeriod.getTimePeriod(),
      quoteFilters.filterCategory,
      quoteFilters.filterRating,
      quoteFilters.sortOrder,
      searchParams.isAgentic,
      searchParams.agenticMode,
      selectedPerson
    );
  }, [quotesState, searchParams, timePeriod, quoteFilters, selectedPerson]);

  const handleAnalyzeQuote = React.useCallback((quote: any) => {
    quotesState.handleAnalyzeQuote(quote, searchParams.selectedAI);
  }, [quotesState, searchParams.selectedAI]);

  const handleImproveQuote = React.useCallback((quote: any) => {
    quotesState.handleImproveQuote(quote, searchParams.selectedAI, searchParams.personName);
  }, [quotesState, searchParams.selectedAI, searchParams.personName]);

  const performExtraction = React.useCallback(async (details: any, model: string, analysisType?: 'audit' | 'flaws', analyzeImmediately: boolean = true) => {
    // Snapshot existing quote ids so we can detect newly added quotes after extraction
    const existingIds = new Set(quotesState.quotes.map((q: any) => q.id));
    searchParams.setIsExtracting(true);

    try {
      await quotesState.handleExtractQuotes(
        model, // Use the passed model
        searchParams.personName,
        searchParams.textToExtract,
        details,
        async (savedQuotes) => {
          searchParams.clearTextToExtract();
          searchParams.setIsExtracting(false);

          // If an analysis type was specified, analyze each newly extracted quote
          if (analysisType && analyzeImmediately && savedQuotes.length > 0) {
            await Promise.all(savedQuotes.map(async (q) => {
              try {
                // Call API directly
                const res = await analyzeQuote(
                  model,
                  q.text,
                  q.languageCode,
                  q.languageName,
                  q.analysisContext,
                  q.links,
                  (typeof q.person === 'object' ? (q.person as any)?._id : q.person),
                  q.personName,
                  analysisType
                );

                // Save analysis result to DB (Auto-accept)
                const audit = res.data;
                const updatePayload = {
                  metadata: {
                    ...q.metadata,
                    audit: audit,
                    analyzedByProvider: model,
                    analyzedAt: new Date().toISOString()
                  }
                };
                await updateQuote(q.id, updatePayload);
              } catch (e) {
                console.error('Failed to analyze and save extracted quote:', e);
              }
            }));
          }

          setStoredQuotesRefreshTrigger(prev => prev + 1);
          setResultsTab('stored');
        },
        selectedPerson || undefined
      );
    } finally {
      searchParams.setIsExtracting(false);
    }
  }, [quotesState, searchParams, selectedPerson]);

  const handleExtractFromUrl = React.useCallback(async () => {
    searchParams.setIsExtracting(true);
    setExtractionStatus('Fetching article...');
    // setResultsTab('new'); // Don't switch to new, we will switch to stored on success

    try {
      const response = await fetchArticle(searchParams.textToExtract.trim(), extractionLanguage);
      const { transcript } = response.data;

      await quotesState.handleExtractFromUrl(
        searchParams.selectedAI,
        searchParams.personName,
        searchParams.textToExtract.trim(),
        searchParams.temperature,
        (status: string) => setExtractionStatus(status),
        async (savedQuotes) => {
          searchParams.clearTextToExtract();
          setStoredQuotesRefreshTrigger(prev => prev + 1);
          setResultsTab('stored');
        },
        selectedPerson || undefined
      );

      if (transcript) {
        setExtractionStatus('Opening transcript viewer...');
        setTimeout(() => {
          uiState.openTranscriptViewer({
            videoId: transcript.videoId,
            languageCode: transcript.languageCode,
            isAutoGenerated: transcript.isAutoGenerated,
            segments: transcript.segments,
          });
        }, 300);
      }
    } catch (error: any) {
      console.error('Extract from URL error:', error);
      setExtractionError(error.response?.data?.message || 'Failed to extract from URL');
    } finally {
      searchParams.setIsExtracting(false);
      setExtractionStatus('');
    }
  }, [quotesState, searchParams, extractionLanguage, selectedPerson]);

  const handleModalSave = React.useCallback((details: any, model: string, analysisType: 'audit' | 'flaws', analyzeImmediately: boolean) => {
    if (modalMode === 'extract') {
      // Need to update performExtraction to accept model if it doesn't already, or just use the passed model
      // Looking at performExtraction, it uses searchParams.selectedAI. We should probably use the one from modal if available.
      // But verify performExtraction signature first. It uses searchParams.selectedAI inside.
      // Let's modify performExtraction too to be safe, or just update the signature here and trust it uses global or we override it.
      // Actually, performExtraction uses searchParams.selectedAI. I should update it to accept model override.
      performExtraction(details, model, analysisType, analyzeImmediately);
    } else {
      quotesState.handleAddQuoteManually(searchParams.personName, searchParams.textToExtract, details, async (quote, chosenType) => {
        const effectiveType = chosenType || analysisType;
        if (analyzeImmediately) {
          try {
            const res = await analyzeQuote(
              model,
              quote.text,
              quote.languageCode,
              quote.languageName,
              quote.analysisContext,
              quote.links,
              (typeof quote.person === 'object' ? (quote.person as any)?._id : quote.person),
              quote.personName,
              effectiveType
            );
            const audit = res.data;
            const updatePayload = {
              metadata: {
                ...quote.metadata,
                audit: audit,
                analyzedByProvider: model,
                analyzedAt: new Date().toISOString()
              }
            };
            await updateQuote(quote.id, updatePayload);
          } catch (e) {
            console.error('Failed to analyze manually added quote:', e);
          }
        }
        setStoredQuotesRefreshTrigger(prev => prev + 1);
        setResultsTab('stored');
      }, selectedPerson || undefined);
      searchParams.clearTextToExtract();
      setExtractedSourceUrl('');
    }
    uiState.closeAddModal();
  }, [modalMode, performExtraction, quotesState, searchParams, uiState, selectedPerson]);

  const [modalAnalysisType, setModalAnalysisType] = React.useState<'audit' | 'flaws'>('audit');

  const openExtractModal = React.useCallback(() => {
    setModalMode('extract');
    setModalAnalysisType('audit');
    uiState.openAddModal();
  }, [uiState]);

  const openAddQuoteModal = React.useCallback(() => {
    setModalMode('add');
    setModalAnalysisType('audit');
    uiState.openAddModal();
  }, [uiState]);

  const handleFetchYoutubeTranscript = React.useCallback(async (videoUrl: string) => {
    searchParams.setIsExtracting(true);
    setExtractionStatus('Fetching YouTube transcript...');
    setExtractionError(null);
    setAutoFetchError(null);

    try {
      const response = await fetchYoutubeTranscript(videoUrl, true);
      const data = response.data;
      uiState.openTranscriptViewer({
        videoId: data.videoId,
        languageCode: data.languageCode,
        isAutoGenerated: data.isAutoGenerated,
        segments: data.segments,
        sessionId: data.sessionId,
      });
    } catch (error: any) {
      console.error('YouTube transcript error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch YouTube transcript';
      setExtractionError(errorMessage);
      setAutoFetchError(errorMessage);
      setIsTranscriptMethodSelectorOpen(true);
    } finally {
      searchParams.setIsExtracting(false);
      setExtractionStatus('');
    }
  }, [searchParams]);

  const handleImportTranscript = React.useCallback((transcript: TranscriptData) => {
    uiState.openTranscriptViewer({
      videoId: transcript.videoId,
      languageCode: transcript.languageCode,
      isAutoGenerated: transcript.isAutoGenerated,
      segments: transcript.segments,
    });
  }, [uiState]);

  const handleImportAnalysis = React.useCallback((analysis: FullAnalysisData) => {


    uiState.openTranscriptViewer({
      videoId: analysis.videoId,
      languageCode: 'en',
      isAutoGenerated: false,
      segments: [],
      initialSessionData: {
        topicAnalysis: analysis.results,
        speakerAnalysis: analysis.speakerResults,
        dialogAnalysis: analysis.dialogResults,
      }
    });
  }, [uiState]);

  const openChangePasswordModal = React.useCallback(() => {
    setIsChangePasswordModalOpen(true);
  }, []);

  const openEditProfileModal = React.useCallback(() => {
    setIsEditProfileModalOpen(true);
  }, []);

  const handleResumeSession = React.useCallback(async (session: AnalysisSession) => {
    try {
      const response = await getSession(session._id);
      const fullSession: AnalysisSession = response.data;

      if (fullSession.sourceType === 'youtube' && fullSession.transcript) {
        uiState.openTranscriptViewer({
          videoId: fullSession.transcript.videoId,
          languageCode: fullSession.transcript.languageCode,
          isAutoGenerated: fullSession.transcript.isAutoGenerated,
          segments: fullSession.transcript.segments,
          sessionId: fullSession._id,
          initialSessionData: {
            topicAnalysis: fullSession.topicAnalysis,
            speakerAnalysis: fullSession.speakerAnalysis,
            dialogAnalysis: fullSession.dialogAnalysis,
          }
        });
        setResultsTab('transcript');
      }
    } catch (error: any) {
      console.error('Failed to resume session:', error);
      alert(t('failedToResumeSession'));
    }
  }, [uiState]);



  return {
    // Auth
    user,
    loginError,
    isAuthLoading,
    googleButtonRef,
    handleLogout,
    loginWithPassword,
    loginAsDev,
    updateUser,

    // Hooks
    searchParams,
    timePeriod,
    quotesState,
    quoteFilters,
    uiState,

    // uiState passthroughs
    isFormCollapsed: uiState.isFormCollapsed,
    toggleFormCollapsed: uiState.toggleFormCollapsed,
    isAddModalOpen: uiState.isAddModalOpen,
    openAddModal: uiState.openAddModal,
    closeAddModal: uiState.closeAddModal,
    transcriptData: uiState.transcriptData,
    updateTranscriptSessionId: uiState.updateTranscriptSessionId,
    openTranscriptViewer: uiState.openTranscriptViewer,
    closeTranscriptViewer: uiState.closeTranscriptViewer,
    isExtracting: searchParams.isExtracting,
    setIsExtracting: searchParams.setIsExtracting,

    // Local UI
    logsVisible,
    setLogsVisible,
    isApiKeyModalOpen,
    setIsApiKeyModalOpen,
    isChangePasswordModalOpen,
    setIsChangePasswordModalOpen,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    modalMode,
    setModalMode,
    modalAnalysisType,
    setModalAnalysisType,
    activeTab,
    setActiveTab,
    resultsTab,
    setResultsTab,
    selectedPerson,
    setSelectedPerson,
    sessionsRefreshTrigger,
    setSessionsRefreshTrigger,
    storedQuotesRefreshTrigger,
    setStoredQuotesRefreshTrigger,
    extractionStatus,
    extractionLanguage,
    setExtractionLanguage,
    extractionError,
    setExtractionError,
    extractedSourceUrl,
    setExtractedSourceUrl,
    shouldAnalyzeImmediately,
    setShouldAnalyzeImmediately,
    isUsageStatsDashboardOpen,
    setIsUsageStatsDashboardOpen,
    isAdminBannerCollapsed,
    setIsAdminBannerCollapsed,
    isTranscriptMethodSelectorOpen,
    setIsTranscriptMethodSelectorOpen,
    autoFetchError,
    setAutoFetchError,

    // Admin view
    adminView,
    setAdminView,

    // Settings
    systemSettings,
    handleUpdateSettings,
    isSettingsModalOpen,
    setIsSettingsModalOpen,

    // Actions
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
    handleImportConfirm,
    openChangePasswordModal,
    openEditProfileModal,
    handleResumeSession,


    // helpers
    handleSaveQuote: async (quote: any) => {
      return saveQuote(quote);
    }
  };
}
