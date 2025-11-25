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
import { exportQuotesToFile, importQuotesFromFile } from './utils/file';
import { saveQuote } from './utils/api';
import { ExportData, Quote, Person } from './types';
import { PersonManager } from './components/people/PersonManager';
import { UserManager } from './components/users/UserManager';
import { PasswordModal } from './components/users/PasswordModal';
import { EditProfileModal } from './components/users/EditProfileModal';
import StoredQuotes from './components/StoredQuotes';

// New Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { SearchControls } from './components/search/SearchControls';
import { ExtractionControls } from './components/search/ExtractionControls';
import { SearchResults } from './components/results/SearchResults';

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
    isLoading,
    error,
    rawApiResponseError,
    handleSearch: searchQuotes,
    handleAnalyzeQuote: analyzeQuote,
    handleExtractQuotes: extractQuotes,
    handleAddQuoteManually: addQuoteManually,
    handleUpdateQuoteLanguage,
    handleClearQuotes,
    handleImproveQuote: improveQuote,
    handleAcceptQuote: acceptQuote,
    handleDiscardQuote: discardQuote,
    handleLoadQuotes,
    clearError,
    markQuoteAsStored,
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
  } = useUIState();

  const [logsVisible, setLogsVisible] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'extract'>('add');
  const [activeTab, setActiveTab] = useState<'search' | 'people' | 'users'>('search');
  const [resultsTab, setResultsTab] = useState<'new' | 'stored'>('new');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const handleExport = () => {
    exportQuotesToFile(personName, quotes);
  };

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
      sortOrder
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

  const handleModalSave = (details: any) => {
    if (modalMode === 'extract') {
      performExtraction(details);
    } else {
      addQuoteManually(personName, textToExtract, details, handleAnalyzeQuote);
      clearTextToExtract();
    }
    closeAddModal();
  };

  const openExtractModal = () => {
    setModalMode('extract');
    openAddModal();
  };

  const openAddQuoteModal = () => {
    setModalMode('add');
    openAddModal();
  };

  const openChangePasswordModal = () => {
    setIsChangePasswordModalOpen(true);
  };

  const openEditProfileModal = () => {
    setIsEditProfileModalOpen(true);
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
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
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
              {activeTab === 'people' ? (
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
                    isLoading={isLoading}
                  />
                  <ExtractionControls
                    textToExtract={textToExtract}
                    setTextToExtract={setTextToExtract}
                    isExtracting={isExtracting}
                    personName={personName}
                    onExtract={openExtractModal}
                    onAdd={openAddQuoteModal}
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
                  </div>

                  {resultsTab === 'stored' ? (
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
                      />
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
                        }).then(() => markQuoteAsStored(quote.id));
                      }}
                      onLanguageChange={handleUpdateQuoteLanguage}
                      onAccept={acceptQuote}
                      onDiscard={discardQuote}
                      clearError={clearError}
                    />
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