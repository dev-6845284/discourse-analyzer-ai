import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSearchParams } from './hooks/useSearchParams';
import { useTimePeriod } from './hooks/useTimePeriod';
import { useQuotes } from './hooks/useQuotes';
import { useQuoteFilters } from './hooks/useQuoteFilters';
import { useUIState } from './hooks/useUIState';
import LoginScreen from './components/auth/LoginScreen';
import ErrorDisplay from './components/results/ErrorDisplay';
import QuoteCard from './components/QuoteCard';
import Spinner from './components/Spinner';
import AddQuoteModal from './components/AddQuoteModal';
import ApiKeySettingsModal from './components/ApiKeySettingsModal';
import { SUPPORTED_LANGUAGES } from './constants';
import LogViewer from './components/LogViewer';
import { exportQuotesToFile, importQuotesFromFile } from './utils/file';
import { ExportData } from './types';

const App: React.FC = () => {
  // Custom hooks
  const { user, loginError, googleButtonRef, handleLogout } = useAuth();

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
    handleLoadQuotes,
    clearError,
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
  const [modalMode, setModalMode] = useState<'add' | 'extract'>('add');

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <div className="container mx-auto p-4 md:p-8">
          <LoginScreen googleButtonRef={googleButtonRef} loginError={loginError} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
            Discourse Analyzer AI
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleFormCollapsed}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {isFormCollapsed ? 'Expand Form' : 'Collapse Form'}
            </button>
            <button
              onClick={() => setLogsVisible(!logsVisible)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {logsVisible ? 'Hide Logs' : 'Show Logs'}
            </button>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              API Keys
            </button>
            {(
              <p className="text-gray-700 dark:text-gray-300">
                Welcome, {user.name}
              </p>
            )}
            <div ref={googleButtonRef}></div>
            {(
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        <LogViewer logsVisible={logsVisible} />

        <div
          className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-500 overflow-hidden ${
            isFormCollapsed ? 'max-h-16' : ''
          }`}
        >
          <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Panel: Controls */}
            <div className="md:col-span-1 p-6 bg-gray-900/80 backdrop-blur-sm md:sticky top-0 h-auto md:h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-cyan-400">Discourse Analyzer</h1>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleExport}
                    className="text-sm text-gray-400 hover:text-white"
                    title="Export current quotes to a JSON file"
                  >
                    Export
                  </button>
                  <label
                    className="text-sm text-gray-400 hover:text-white cursor-pointer"
                    title="Import quotes from a JSON file"
                  >
                    Import
                    <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                  </label>
                  <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
                    Logout
                  </button>
                </div>
              </div>

              <div className="md:hidden mb-4">
                <button
                  onClick={toggleFormCollapsed}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  aria-expanded={!isFormCollapsed}
                  aria-controls="controls-panel"
                >
                  <span>{isFormCollapsed ? 'Show' : 'Hide'} Controls</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transition-transform ${isFormCollapsed ? '' : 'rotate-180'}`}
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
                className={`${isFormCollapsed ? 'hidden' : 'block'} md:block`}
              >
                <div className="space-y-6">
                  {/* Section 1: Search */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">Search for Quotes</h2>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        AI Provider
                      </label>
                      <div className="flex rounded-md bg-gray-700">
                        <button
                          onClick={() => handleAISelectionChange('gemini')}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-l-md ${
                            selectedAI === 'gemini'
                              ? 'bg-cyan-600 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Gemini
                        </button>
                        <button
                          onClick={() => handleAISelectionChange('grok')}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                            selectedAI === 'grok'
                              ? 'bg-cyan-600 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Grok
                        </button>
                        <button
                          onClick={() => handleAISelectionChange('chatgpt')}
                          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-r-md ${
                            selectedAI === 'chatgpt'
                              ? 'bg-cyan-600 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          ChatGPT
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="personName"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Person's Name
                      </label>
                      <input
                        type="text"
                        id="personName"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="e.g., Albert Einstein"
                      />
                    </div>

                    {/* Time Period Selection */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time Period
                      </label>
                      <div className="space-y-2">
                        <select
                          value={timePeriodType}
                          onChange={(e) =>
                            handleTimePeriodTypeChange(
                              e.target.value as 'day' | 'week' | 'months' | 'years' | 'custom'
                            )
                          }
                          className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                        >
                          <option value="day">Last Day</option>
                          <option value="week">Last Week</option>
                          <option value="months">Last Month(s)</option>
                          <option value="years">Last Year(s)</option>
                          <option value="custom">Custom Period</option>
                        </select>

                        {(timePeriodType === 'months' || timePeriodType === 'years') && (
                          <input
                            type="number"
                            min="1"
                            max={timePeriodType === 'months' ? 120 : 30}
                            value={timePeriodValue}
                            onChange={(e) =>
                              handleTimePeriodValueChange(parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            placeholder={`Number of ${timePeriodType}`}
                          />
                        )}

                        {timePeriodType === 'custom' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label
                                htmlFor="dateFrom"
                                className="block text-xs text-gray-400 mb-1"
                              >
                                From
                              </label>
                              <input
                                type="date"
                                id="dateFrom"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="dateTo" className="block text-xs text-gray-400 mb-1">
                                To
                              </label>
                              <input
                                type="date"
                                id="dateTo"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-400 mt-2">
                          Will search for quotes from {getTimePeriod().description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="resultCount"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Number of Results
                      </label>
                      <input
                        type="number"
                        id="resultCount"
                        value={resultCount}
                        min="1"
                        max="50"
                        onChange={(e) => setResultCount(parseInt(e.target.value, 10))}
                        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div className="mt-4">
                      <label
                        htmlFor="maxQuoteLength"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Max Quote Length (chars)
                      </label>
                      <input
                        type="number"
                        id="maxQuoteLength"
                        value={maxQuoteLength}
                        min="50"
                        max="500"
                        onChange={(e) => setMaxQuoteLength(parseInt(e.target.value, 10))}
                        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div className="mt-4">
                      <label
                        htmlFor="temperature"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Search Creativity (Temperature): {temperature.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        id="temperature"
                        min="0"
                        max="1"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Languages
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`px-2 py-1 text-sm rounded-md transition-colors ${
                              selectedLanguages.includes(lang.code)
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? <Spinner /> : 'Find New Quotes'}
                    </button>
                  </div>

                  {/* Section 2: Extract from text */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">Extract from Text</h2>
                    <textarea
                      value={textToExtract}
                      onChange={(e) => setTextToExtract(e.target.value)}
                      rows={6}
                      className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder={`Paste an article or a single quote by ${
                        personName || 'the person'
                      } here...`}
                    ></textarea>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={openExtractModal}
                        disabled={
                          isExtracting || !textToExtract || !personName
                        }
                        title={
                          !personName
                            ? "Please enter a person's name"
                            : !textToExtract
                            ? 'Please enter text to extract'
                            : ''
                        }
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {isExtracting ? <Spinner /> : 'Extract & Analyze'}
                      </button>
                      <button
                        onClick={openAddQuoteModal}
                        disabled={
                          isExtracting || !textToExtract || !personName
                        }
                        title={
                          !personName
                            ? "Please enter a person's name"
                            : !textToExtract
                            ? 'Please enter text to add'
                            : ''
                        }
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        Add as Quote
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Results */}
            <div className="md:col-span-2 space-y-6">
              <ErrorDisplay
                error={error}
                rawApiResponseError={rawApiResponseError}
                clearError={clearError}
              />

              <div className="p-4 bg-gray-800/50 rounded-lg mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-cyan-300 mb-2">
                    Results ({filteredAndSortedQuotes.length})
                  </h2>
                  {personName && (
                    <p className="text-gray-400">
                      Showing quotes for:{' '}
                      <span className="font-bold text-gray-300">{personName}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Sort by:</span>
                    <div className="flex rounded-md bg-gray-700">
                      <button
                        onClick={() => setSortOrder('newest')}
                        className={`px-3 py-1 text-sm font-medium transition-colors rounded-l-md ${
                          sortOrder === 'newest'
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => setSortOrder('oldest')}
                        className={`px-3 py-1 text-sm font-medium transition-colors rounded-r-md ${
                          sortOrder === 'oldest'
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Oldest
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleClearQuotes}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {quotes.length > 0 && (
                <div className="space-y-4">
                  {filteredAndSortedQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onAnalyze={handleAnalyzeQuote}
                      onImprove={handleImproveQuote}
                      onLanguageChange={handleUpdateQuoteLanguage}
                      isApiKeySet={true}
                    />
                  ))}
                </div>
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
        </div>
      </div>
    </div>
  );
};

export default App;