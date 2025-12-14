import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSearchParams } from './hooks/useSearchParams';
import { useTimePeriod } from './hooks/useTimePeriod';
import { useQuotes } from './hooks/useQuotes';
import { useQuoteFilters } from './hooks/useQuoteFilters';
import { useUIState } from './hooks/useUIState';
import LoginScreen from './components/auth/LoginScreen';
import AddQuoteModal from './components/AddQuoteModal';
import ApiKeySettingsModal from './components/ApiKeySettingsModal';
import LogViewer from './components/LogViewer';
import TranscriptViewer from './components/TranscriptViewer';
import TranscriptImporter from './components/TranscriptImporter';
import { SrtTranscriptImporter } from './components/SrtTranscriptImporter';
import { exportQuotesToFile, importQuotesFromFile } from './utils/file';
import { saveQuote, fetchArticle, getSession, getContentAnalysis } from './utils/api';
import { ExportData, Quote, Person, AnalysisSession } from './types';
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
import { UsageStatsDashboard } from './components/admin/UsageStatsDashboard';

const App: React.FC = () => {
  // Custom hooks
  const { user, loginError, googleButtonRef, handleLogout, loginWithPassword, updateUser } = useAuth();

  const {
    personName,
    setPersonName,
    selectedAI,
    handleAISelectionChange,
    selectedLanguages,
    resultCount,
    setResultCount,
    temperature,
    setTemperature,
    maxQuoteLength,
    setMaxQuoteLength,
    textToExtract,
    setTextToExtract,
    isExtracting,
    setIsExtracting,
    handleLanguageChange,
    clearTextToExtract,
    // Status filters
    isAnalyzed,
    setIsAnalyzed,
    isImproved,
    setIsImproved,
    isAgentic,
    setIsAgentic,
    agenticMode,
    setAgenticMode,
  } = useSearchParams();

  const {
    timePeriodType,
    timePeriodValue,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
    handleTimePeriodTypeChange,
    handleTimePeriodValueChange,
    getTimePeriod,
  } = useTimePeriod();

  const {
    quotes,
    articles,
    isLoading,
    error,
    rawApiResponseError,
    handleSearch: searchQuotes,
    handleAnalyzeQuote: analyzeQuote,
    handleExtractQuotes: extractQuotes,
    handleExtractFromUrl: extractFromUrl,
    handleAddQuoteManually: addQuoteManually,
    handleUpdateQuoteLanguage,
    handleClearQuotes,
    handleImproveQuote: improveQuote,
    handleAcceptQuote: acceptQuote,
    handleDiscardQuote: discardQuote,
    handleRemoveQuote: removeQuote,
    handleLoadQuotes,
    clearError,
    markQuoteAsStored,
    handleCancelSearch,
  } = useQuotes(handleLogout);

  const {
    sortOrder,
    setSortOrder,
    filterCategory,
    filterRating,
    filteredAndSortedQuotes,
  } = useQuoteFilters(quotes);

  const {
    isFormCollapsed,
    setIsFormCollapsed,
    toggleFormCollapsed,
    isAddModalOpen,
    openAddModal,
    closeAddModal,
    isTranscriptViewerOpen,
    transcriptData,
    openTranscriptViewer,
    closeTranscriptViewer,
    updateTranscriptSessionId,
  } = useUIState();

  const [logsVisible, setLogsVisible] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'extract'>('add');
  const [activeTab, setActiveTab] = useState<'search' | 'people' | 'users' | 'sessions'>('search');
  const [resultsTab, setResultsTab] = useState<'new' | 'stored' | 'transcript'>('new');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sessionsRefreshTrigger, setSessionsRefreshTrigger] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [extractionLanguage, setExtractionLanguage] = useState<string>('lt');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedSourceUrl, setExtractedSourceUrl] = useState<string>('');
  const [shouldAnalyzeImmediately, setShouldAnalyzeImmediately] = useState<boolean>(true);
  const [isUsageStatsDashboardOpen, setIsUsageStatsDashboardOpen] = useState<boolean>(false);

  const handleExport = () => {
    exportQuotesToFile(personName, quotes);
  };

  const handleAutoExtract = React.useCallback(async (url: string) => {
    setIsExtracting(true);
    setExtractionStatus('Fetching article content...');
    setExtractionError(null);
    try {
      const response = await fetchArticle(url, extractionLanguage);
      const { textContent, metadata, transcript } = response.data;
      setTextToExtract(textContent);
      setExtractedSourceUrl(metadata.url);

      // Auto-open transcript viewer if this is a YouTube video
      if (transcript) {
        setExtractionStatus('Opening transcript viewer...');
        setTimeout(() => {
          openTranscriptViewer({
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
      setIsExtracting(false);
      setExtractionStatus('');
    }
  }, [extractionLanguage, setIsExtracting, setExtractionStatus, setExtractionError, setTextToExtract, setExtractedSourceUrl, openTranscriptViewer]);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importQuotesFromFile(
        file,
        (data: ExportData) => {
          setPersonName(data.personName);
          handleLoadQuotes(data);
        },
        (errorMessage: string) => {
          // You might want to use your existing error display mechanism
          alert(errorMessage);
        }
      );
    }
  };

  // Collapse the form when logs are shown to provide more space
  useEffect(() => {
    if (logsVisible) {
      setIsFormCollapsed(true);
    }
  }, [logsVisible, setIsFormCollapsed]);

  // Wrapped handlers
  const handleSearch = () => {
    setResultsTab('new');
    searchQuotes(
      selectedAI,
      personName,
      selectedLanguages,
      resultCount,
      temperature,
      maxQuoteLength,
      getTimePeriod(),
      filterCategory,
      filterRating,
      sortOrder,
      isAgentic,
      agenticMode
    );
  };

  const handleAnalyzeQuote = (quote: any) => {
    analyzeQuote(quote, selectedAI);
  };

  const handleImproveQuote = (quote: any) => {
    improveQuote(quote, selectedAI, personName);
  };

  const performExtraction = async (details: any) => {
    setIsExtracting(true);
    await extractQuotes(selectedAI, personName, textToExtract, details, () => {
      clearTextToExtract();
      setIsExtracting(false);
    });
    setIsExtracting(false);
  };

  const handleExtractFromUrl = async () => {
    setIsExtracting(true);
    setExtractionStatus('Fetching article...');
    setResultsTab('new');
    
    try {
      // First, fetch article with transcript data
      const response = await fetchArticle(textToExtract.trim(), extractionLanguage);
      const { transcript } = response.data;

      // Then extract quotes from the URL
      await extractFromUrl(
        selectedAI,
        personName,
        textToExtract.trim(),
        temperature,
        (status: string) => setExtractionStatus(status),
        () => {
          clearTextToExtract();
        }
      );

      // Auto-open transcript viewer if this is a YouTube video
      if (transcript) {
        setExtractionStatus('Opening transcript viewer...');
        setTimeout(() => {
          openTranscriptViewer({
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
      setIsExtracting(false);
      setExtractionStatus('');
    }
  };

  const handleModalSave = (details: any) => {
    if (modalMode === 'extract') {
      performExtraction(details);
    } else {
      addQuoteManually(personName, textToExtract, details, (quote) => {
        if (shouldAnalyzeImmediately) {
          analyzeQuote(quote, selectedAI);
        }
      });
      clearTextToExtract();
      setExtractedSourceUrl('');
    }
    closeAddModal();
  };

  const openExtractModal = () => {
    setModalMode('extract');
    openAddModal();
  };

  const openAddQuoteModal = (analyzeImmediately: boolean) => {
    setModalMode('add');
    setShouldAnalyzeImmediately(analyzeImmediately);
    openAddModal();
  };

  const handleFetchYoutubeTranscript = async (videoUrl: string) => {
    setIsExtracting(true);
    setExtractionStatus('Fetching YouTube transcript...');
    setExtractionError(null);
    
    try {
      const response = await fetch('/api/quotes/fetch-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl, save: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transcript');
      }

      const data = await response.json();
      
      // Open transcript viewer with the data
      openTranscriptViewer({
        videoId: data.videoId,
        languageCode: data.languageCode,
        isAutoGenerated: data.isAutoGenerated,
        segments: data.segments,
        sessionId: data.sessionId,
      });
    } catch (error: any) {
      console.error('YouTube transcript error:', error);
      setExtractionError(error.message || 'Failed to fetch YouTube transcript');
    } finally {
      setIsExtracting(false);
      setExtractionStatus('');
    }
  };

  const handleImportTranscript = (transcript: TranscriptData) => {
    openTranscriptViewer({
      videoId: transcript.videoId,
      languageCode: transcript.languageCode,
      isAutoGenerated: transcript.isAutoGenerated,
      segments: transcript.segments,
    });
  };

  const handleImportAnalysis = (analysis: FullAnalysisData) => {
    // Extract transcript from analysis
    const transcript = {
      videoId: analysis.videoId,
      languageCode: 'en',
      isAutoGenerated: false,
      segments: analysis.results[0]?.text ? [] : [], // Analysis doesn't contain raw segments, so we'll open with analysis data only
    };

    openTranscriptViewer({
      videoId: analysis.videoId,
      languageCode: 'en',
      isAutoGenerated: false,
      segments: [], // No segments in full analysis export
      initialSessionData: {
        topicAnalysis: analysis.results,
        speakerAnalysis: analysis.speakerResults,
        dialogAnalysis: analysis.dialogResults,
      }
    });
  };

  const openChangePasswordModal = () => {
    setIsChangePasswordModalOpen(true);
  };

  const openEditProfileModal = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleResumeSession = async (session: AnalysisSession) => {
    try {
      const response = await getSession(session._id);
      const fullSession: AnalysisSession = response.data;

      if (fullSession.sourceType === 'youtube' && fullSession.transcript) {
        openTranscriptViewer({
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
        // Automatically open the Transcript tab
        setResultsTab('transcript');
      }
    } catch (error: any) {
      console.error('Failed to resume session:', error);
      alert('Failed to resume session');
    }
  };

  const handleEditSource = async (quote: Quote) => {
    if (!quote.contentAnalysisId) {
      alert('This quote is not linked to a content analysis session.');
      return;
    }

    try {
      const response = await getContentAnalysis(quote.contentAnalysisId);
      const contentAnalysis = response.data;

      // Construct initialSelectedStatements
      const initialSelectedStatements = new Map<string, number>();
      // Default to group 1 if analysisGroupId is missing (legacy quotes or created via other paths)
      const groupId = quote.metadata?.analysisGroupId || 1;

      if (quote.originIds) {
        // Try to find matching statements in the content analysis
        // First try exact match, then try fuzzy match if indices seem wrong
        const matchedStatements: string[] = [];
        
        quote.originIds.forEach(originId => {
          const [groupIdFromOrigin, indexStr] = originId.split(':');
          const index = parseInt(indexStr, 10);
          
          // Try exact match first
          const group = contentAnalysis.dialogAnalysis?.find((g: any) => g.id === groupIdFromOrigin);
          if (group?.analysis?.summaryItems?.[index]) {
            matchedStatements.push(originId);
            initialSelectedStatements.set(originId, groupId);
          } else if (group?.analysis?.summaryItems) {
            // If index is out of bounds but the group exists, try to match by position
            // This handles cases where indices might have been stored incorrectly
            // Try to find a summaryItem at that position, or use the first available
            const availableIndices = group.analysis.summaryItems.length;
            if (availableIndices > 0) {
              // Map to the first few items if indices are out of bounds
              const correctedIndex = Math.min(index % availableIndices, availableIndices - 1);
              const correctedStatementId = `${groupIdFromOrigin}:${correctedIndex}`;
              matchedStatements.push(correctedStatementId);
              initialSelectedStatements.set(correctedStatementId, groupId);
            }
          }
        });

        console.log('[handleEditSource] Statement matching:', {
          originalOriginIds: quote.originIds,
          matchedStatements,
          initialSelectedStatementsSize: initialSelectedStatements.size
        });
      }

      openTranscriptViewer({
        videoId: contentAnalysis.transcript?.videoId || '',
        languageCode: contentAnalysis.languageCode || 'en',
        isAutoGenerated: contentAnalysis.transcript?.isAutoGenerated || false,
        segments: [], // Content analysis uses dialogAnalysis
        initialSessionData: {
          topicAnalysis: contentAnalysis.topicAnalysis,
          speakerAnalysis: contentAnalysis.speakerAnalysis,
          dialogAnalysis: contentAnalysis.dialogAnalysis,
        },
        editQuoteId: quote._id,
        contentAnalysisId: quote.contentAnalysisId,
        initialSelectedStatements,
        lockedGroupId: groupId,
      });

    } catch (error: any) {
      console.error('Failed to load content analysis for editing:', error);
      alert('Failed to load source analysis.');
    }
  };

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
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Admin Security Alert Banner */}
      <AdminAlertBanner 
        isAdmin={user?.role === 'admin'} 
        onViewDashboard={() => setIsUsageStatsDashboardOpen(true)}
      />
      
      {/* Usage Stats Dashboard Modal */}
      {isUsageStatsDashboardOpen && (
        <UsageStatsDashboard onClose={() => setIsUsageStatsDashboardOpen(false)} />
      )}
      
      <div className={`container mx-auto p-4 md:p-6 lg:p-8 ${user?.role === 'admin' ? 'pt-16' : ''}`}>
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
                    searchParams={{
                      personName,
                      setPersonName,
                      selectedAI,
                      handleAISelectionChange,
                      resultCount,
                      setResultCount,
                      temperature,
                      setTemperature,
                      maxQuoteLength,
                      setMaxQuoteLength,
                      isAgentic,
                      setIsAgentic,
                      agenticMode,
                      setAgenticMode,
                    }}
                    statusFilters={{
                      isAnalyzed,
                      setIsAnalyzed,
                      isImproved,
                      setIsImproved,
                    }}
                    timePeriod={{
                      type: timePeriodType,
                      value: timePeriodValue,
                      customDateFrom,
                      customDateTo,
                      handleTypeChange: handleTimePeriodTypeChange,
                      handleValueChange: handleTimePeriodValueChange,
                      setCustomDateFrom,
                      setCustomDateTo,
                      description: getTimePeriod().description,
                    }}
                    languages={{
                      selected: selectedLanguages,
                      onChange: handleLanguageChange,
                    }}
                    onSearch={handleSearch}
                    onCancel={handleCancelSearch}
                    isLoading={isLoading}
                  />
                  <ExtractionControls
                    textToExtract={textToExtract}
                    setTextToExtract={setTextToExtract}
                    isExtracting={isExtracting}
                    personName={personName}
                    onExtract={openExtractModal}
                    onAdd={openAddQuoteModal}
                    onExtractFromUrl={handleExtractFromUrl}
                    onAutoExtract={handleAutoExtract}
                    extractionStatus={extractionStatus}
                    extractionLanguage={extractionLanguage}
                    setExtractionLanguage={setExtractionLanguage}
                    extractionError={extractionError}
                  />
                  <TranscriptImporter
                    onImport={handleImportTranscript}
                    isLoading={isExtracting}
                  />
                  <SrtTranscriptImporter
                    onImport={handleImportTranscript}
                    isLoading={isExtracting}
                  />
                  <AnalysisImporter
                    onImport={handleImportAnalysis}
                    isLoading={isExtracting}
                  />
                </div>
              )}
            </Sidebar>

            {/* Right Panel: Results */}
            <div className="md:col-span-2 space-y-6">
              {activeTab === 'users' ? (
                <UserManager />
              ) : (
                <>
                  <div className="flex space-x-1 mb-4 bg-gray-800 p-1 rounded-lg">
                    <button
                      onClick={() => setResultsTab('new')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        resultsTab === 'new'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Search Results
                    </button>
                    <button
                      onClick={() => setResultsTab('stored')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        resultsTab === 'stored'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Stored Quotes
                    </button>
                    {transcriptData && (
                      <button
                        onClick={() => setResultsTab('transcript')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                          resultsTab === 'transcript'
                            ? 'bg-cyan-600 text-white shadow'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Transcript
                      </button>
                    )}
                  </div>

                  {resultsTab === 'transcript' ? (
                    transcriptData && (
                      <TranscriptViewer
                        segments={transcriptData.segments}
                        videoId={transcriptData.videoId}
                        languageCode={transcriptData.languageCode}
                        isAutoGenerated={transcriptData.isAutoGenerated}
                        sessionId={transcriptData.sessionId}
                        initialSessionData={transcriptData.initialSessionData}
                        editQuoteId={transcriptData.editQuoteId}
                        contentAnalysisId={transcriptData.contentAnalysisId}
                        initialSelectedStatements={transcriptData.initialSelectedStatements}
                        lockedGroupId={transcriptData.lockedGroupId}
                        onSessionCreated={updateTranscriptSessionId}
                        onPromoteSuccess={() => setSessionsRefreshTrigger(prev => prev + 1)}
                      />
                    )
                  ) : resultsTab === 'stored' ? (
                    <div className="space-y-4">
                      {selectedPerson && (
                        <div className="p-4 bg-gray-800/50 rounded-lg flex justify-between items-center">
                          <span className="text-gray-300">
                            Filtered by: <strong>{selectedPerson.name}</strong>
                          </span>
                          <button
                            onClick={() => setSelectedPerson(null)}
                            className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            Clear Filter
                          </button>
                        </div>
                      )}
                      <StoredQuotes
                        selectedPerson={selectedPerson}
                        selectedAI={selectedAI}
                        isApiKeySet={!!user}
                        onEditSource={handleEditSource}
                      />
                    </div>
                  ) : (
                    articles.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-white">Found Articles ({articles.length})</h3>
                          <button 
                            onClick={() => handleClearQuotes()} // Reusing clear quotes to clear results
                            className="text-sm text-gray-400 hover:text-white"
                          >
                            Clear Results
                          </button>
                        </div>
                        {articles.map((article, idx) => (
                          <div key={idx} className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors">
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-medium text-lg block mb-2">
                              {article.title}
                            </a>
                            <p className="text-gray-300 text-sm leading-relaxed">{article.summary}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {article.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full border border-gray-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                              <span>Relevance: {(article.relevanceScore * 100).toFixed(0)}%</span>
                              {article.publishedDate && <span>{article.publishedDate}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                    <SearchResults
                      results={filteredAndSortedQuotes}
                      error={error}
                      rawApiResponseError={rawApiResponseError}
                      personName={personName}
                      sortOrder={sortOrder}
                      setSortOrder={setSortOrder}
                      onClear={handleClearQuotes}
                      onAnalyze={(quote) => analyzeQuote(quote, selectedAI)}
                      onImprove={(quote) => improveQuote(quote, selectedAI, personName)}
                      onSave={(quote) => {
                        saveQuote({
                          text: quote.text,
                          personName: personName,
                          source: quote.source,
                          date: quote.date,
                          analysisContext: quote.analysisContext,
                          links: quote.links,
                          // Include provider info if quote has analysis
                          ...(quote.analysis ? {
                            analyzedByProvider: selectedAI,
                            analyzedAt: new Date().toISOString()
                          } : {}),
                          metadata: {
                            title: quote.title,
                            languageCode: quote.languageCode,
                            languageName: quote.languageName,
                            analysis: quote.analysis
                          }
                        }).then((response) => markQuoteAsStored(quote.id, response.data._id));
                      }}
                      onLanguageChange={handleUpdateQuoteLanguage}
                      onAccept={(quote) => acceptQuote(quote, selectedAI)}
                      onDiscard={discardQuote}
                      onRemove={removeQuote}
                      clearError={clearError}
                    />
                    )
                  )}
                </>
              )}
            </div>
          </main>

          {isAddModalOpen && (
            <AddQuoteModal
              isOpen={isAddModalOpen}
              onClose={closeAddModal}
              onSave={handleModalSave}
              mode={modalMode}
              initialSource={extractedSourceUrl}
            />
          )}
          <ApiKeySettingsModal
            isOpen={isApiKeyModalOpen}
            onClose={() => setIsApiKeyModalOpen(false)}
          />
          {isChangePasswordModalOpen && user && user._id && (
            <PasswordModal
              user={{ _id: user._id, name: user.name }}
              onClose={() => setIsChangePasswordModalOpen(false)}
              onSubmit={() => {
                setIsChangePasswordModalOpen(false);
                alert('Password updated successfully');
              }}
            />
          )}
          {isEditProfileModalOpen && user && user._id && (
            <EditProfileModal
              user={{ _id: user._id, name: user.name }}
              onClose={() => setIsEditProfileModalOpen(false)}
              onSubmit={(newName) => {
                setIsEditProfileModalOpen(false);
                updateUser({ name: newName });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;