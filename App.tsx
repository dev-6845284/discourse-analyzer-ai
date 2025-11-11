


import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// FIX: Import AnalysisDetail, UserInfo, and the new ExportData type.
import { Quote, AnalysisCategory, AnalysisRating, AnalysisDetail, UserInfo, ExportData } from './types';
import { fetchQuotesForPerson, analyzeQuoteText, extractQuotesFromText, JsonParsingError } from './services/geminiService';
import QuoteCard from './components/QuoteCard';
import Spinner from './components/Spinner';
import AddQuoteModal from './components/AddQuoteModal';
import { ALL_CATEGORIES, CATEGORY_COLORS, RATING_COLORS, SUPPORTED_LANGUAGES, APPROVED_EMAILS } from './constants';

// FIX: Declare the 'google' global object provided by the Google Identity Services script
// to resolve "Cannot find name 'google'" TypeScript errors.
declare const google: any;

// FIX: The global declaration for 'window.aistudio' has been removed to resolve a TypeScript error.
// The error indicated a conflict with an existing global type named 'AIStudio'.
// The application now relies on the ambient type definition for 'aistudio' provided by the environment.

// IMPORTANT: YOU MUST REPLACE THIS VALUE.
// This is a placeholder and will not work in production.
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create an "OAuth client ID" for a "Web application".
// 3. Under "Authorized JavaScript origins", add your production URL: https://discourse-analyzer-ai-850990674967.us-west1.run.app
// 4. Copy the generated Client ID and paste it here.
const GOOGLE_CLIENT_ID = '366810244569-3490uiu9puprf0otaj2eq58jdsc9as15.apps.googleusercontent.com'; // This is a placeholder.

// Helper to decode JWT
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

const App: React.FC = () => {
  // FIX: Updated logic to detect AI Studio and local development environments.
  // The login screen is bypassed for AI Studio (empty hostname), localhost, and 127.0.0.1.
  const [user, setUser] = useState<UserInfo | null>(() => {
    const hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        email: 'developer@example.com',
        name: 'Local Developer',
      };
    }
    return null;
  });

  const [loginError, setLoginError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponseError, setRawApiResponseError] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [resultCount, setResultCount] = useState<number>(10);
  const [textToExtract, setTextToExtract] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterCategory, setFilterCategory] = useState<AnalysisCategory | 'all'>('all');
  const [filterRating, setFilterRating] = useState<AnalysisRating | 'all'>('all');
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(true);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleCredentialResponse = useCallback((response: any) => {
    const decoded = decodeJwt(response.credential);
    if (decoded && decoded.email) {
      if (APPROVED_EMAILS.includes(decoded.email)) {
        setUser({ email: decoded.email, name: decoded.name, picture: decoded.picture });
        setLoginError(null);
      } else {
        setLoginError("Access denied. Your email is not on the approved list.");
      }
    } else {
      setLoginError("Login failed. Could not verify email.");
    }
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    // FIX: Updated logic to initialize Google Sign-In only in production-like environments.
    // It is skipped on localhost, 127.0.0.1, and in sandboxed environments like AI Studio (empty hostname).
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !user && googleButtonRef.current) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: false,
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
      });
      google.accounts.id.prompt();
    }
  }, [user, handleCredentialResponse]);

  const handleLogout = () => {
    setUser(null);
    setQuotes([]);
    setPersonName('');
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  }
  
  const handleSearch = useCallback(async () => {
    if (!apiKey) {
      setError("Please enter your Gemini API key in the Settings section.");
      return;
    }
    if (!personName) {
      setError("Please enter a person's name.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRawApiResponseError(null);
    try {
      const existingQuotesText = quotes.map(q => q.text);
      const newQuotes = await fetchQuotesForPerson(apiKey, personName, selectedLanguages, resultCount, existingQuotesText);
      
      const uniqueNewQuotes = newQuotes.filter(nq => !quotes.some(eq => eq.text === nq.text));

      if (uniqueNewQuotes.length === 0) {
        setError("No new quotes were found. Try a different search or clear existing quotes.");
      } else {
        setQuotes(prevQuotes => [...prevQuotes, ...uniqueNewQuotes]);
      }
    } catch (e: any) {
      if (e instanceof JsonParsingError) {
          setError(`Search failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
      } else {
          setError(`Search failed: ${e.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, personName, selectedLanguages, resultCount, quotes]);

  const handleAnalyzeQuote = useCallback(async (quote: Quote) => {
    if (!apiKey) {
      setError("Please enter your Gemini API key to analyze quotes.");
      return;
    }
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: true } : q));
    setError(null);
    setRawApiResponseError(null);
    try {
      const analysis = await analyzeQuoteText(apiKey, quote.text, quote.languageCode, quote.languageName);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, analysis, isAnalyzing: false } : q));
    } catch (e: any) {
      if (e instanceof JsonParsingError) {
          setError(`Analysis failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
      } else {
          setError(`Analysis failed: ${e.message}`);
      }
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: false } : q));
    }
  }, [apiKey, quotes]);

  const handleExtractQuotes = useCallback(async () => {
    if (!apiKey) {
      setError("Please enter your Gemini API key to extract quotes.");
      return;
    }
    if (!personName) {
        setError("Please enter a person's name to attribute the extracted quotes.");
        return;
    }
    if (!textToExtract) {
        setError("Please enter text to extract quotes from.");
        return;
    }
    setIsExtracting(true);
    setError(null);
    setRawApiResponseError(null);
    try {
        const extractedQuotes = await extractQuotesFromText(apiKey, personName, textToExtract);
        const uniqueNewQuotes = extractedQuotes.filter(nq => !quotes.some(eq => eq.text === nq.text));
        if (uniqueNewQuotes.length === 0) {
            setError("No new, unique quotes were extracted from the text.");
        } else {
            setQuotes(prevQuotes => [...prevQuotes, ...uniqueNewQuotes]);
            setTextToExtract('');
        }
    } catch (e: any) {
        if (e instanceof JsonParsingError) {
            setError(`Extraction failed: ${e.message}`);
            setRawApiResponseError(e.rawResponse);
        } else {
            setError(`Extraction failed: ${e.message}`);
        }
    } finally {
        setIsExtracting(false);
    }
  }, [apiKey, personName, textToExtract, quotes]);
  
  const handleAddQuoteManually = (details: { source: string; title: string; date: string; languageCode: string; languageName: string; }) => {
    if (!textToExtract.trim() || !personName) {
        setError("Person's name and quote text must be present to add a quote.");
        setIsAddModalOpen(false);
        return;
    };

    const trimmedText = textToExtract.trim();

    // Prevent adding duplicate quotes
    if (quotes.some(q => q.text === trimmedText)) {
        setError("This exact quote already exists in the list.");
        setIsAddModalOpen(false);
        return;
    }

    const newQuote: Quote = {
        id: `quote-manual-${Date.now()}`,
        text: trimmedText,
        source: details.source,
        title: details.title || details.source, // Use source as title if not provided
        date: details.date,
        languageCode: details.languageCode,
        languageName: details.languageName,
    };

    // Add the new quote to the top of the list and clear the input field
    setQuotes(prevQuotes => [newQuote, ...prevQuotes]);
    setTextToExtract('');
    setIsAddModalOpen(false);
    setError(null); // Clear previous errors
    setRawApiResponseError(null);

    // Immediately call the analysis function for the newly added quote
    handleAnalyzeQuote(newQuote);
  };

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguages(prev => 
        prev.includes(langCode) 
            ? prev.filter(l => l !== langCode)
            : [...prev, langCode]
    );
  };

  const handleUpdateQuoteLanguage = (quoteId: string, newLanguageCode: string) => {
    const newLanguageName = SUPPORTED_LANGUAGES.find(lang => lang.code === newLanguageCode)?.name || '';
    setQuotes(prevQuotes => prevQuotes.map(q => 
        q.id === quoteId 
            ? { ...q, languageCode: newLanguageCode, languageName: newLanguageName }
            : q
    ));
  };
  
  const handleClearQuotes = () => setQuotes([]);

  const filteredAndSortedQuotes = useMemo(() => {
    let tempQuotes = [...quotes];

    if (filterCategory !== 'all') {
        tempQuotes = tempQuotes.filter(q => q.analysis && q.analysis[filterCategory]?.rating !== "None" && q.analysis[filterCategory]?.rating !== undefined);
    }
    if (filterRating !== 'all') {
        // FIX: Explicitly type the 'detail' parameter to resolve "Property 'rating' does not exist on type 'unknown'".
        tempQuotes = tempQuotes.filter(q => q.analysis && Object.values(q.analysis).some((detail: AnalysisDetail) => detail.rating === filterRating));
    }

    tempQuotes.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
  
      // Handle invalid dates by moving them to the end of the list
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      if (sortOrder === 'oldest') {
          return dateA.getTime() - dateB.getTime();
      }
      // Default to newest
      return dateB.getTime() - a.date.localeCompare(b.date);
    });

    return tempQuotes;
  }, [quotes, filterCategory, filterRating, sortOrder]);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="container mx-auto p-4 md:p-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold text-cyan-400 mb-4">Discourse Analyzer AI</h1>
            <p className="text-gray-400 mb-8">Please sign in to continue</p>
            <div ref={googleButtonRef}></div>
            {loginError && <p className="mt-4 text-red-500">{loginError}</p>}
          </div>
        ) : (
          <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Panel: Controls */}
            <div className="md:col-span-1 p-6 bg-gray-900/80 backdrop-blur-sm md:sticky top-0 h-auto md:h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-cyan-400">Discourse Analyzer</h1>
                <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
              </div>
              
              <div className="md:hidden mb-4">
                <button
                  onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  aria-expanded={!isFormCollapsed}
                  aria-controls="controls-panel"
                >
                  <span>{isFormCollapsed ? 'Show' : 'Hide'} Controls</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isFormCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <div id="controls-panel" className={`${isFormCollapsed ? 'hidden' : 'block'} md:block`}>
                <div className="space-y-6">
                  {/* Section 0: Settings */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">Settings</h2>
                    <div>
                      <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
                      <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="Enter your API key"
                      />
                       <p className="mt-2 text-xs text-gray-400">
                        Get your key from{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                          Google AI Studio
                        </a>. Your key is stored in your browser's local storage.
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Search */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">Search for Quotes</h2>
                    <div>
                      <label htmlFor="personName" className="block text-sm font-medium text-gray-300 mb-1">Person's Name</label>
                      <input
                        type="text"
                        id="personName"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="e.g., Albert Einstein"
                      />
                    </div>
                    <div className="mt-4">
                      <label htmlFor="resultCount" className="block text-sm font-medium text-gray-300 mb-1">Number of Results</label>
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">Languages</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <button key={lang.code} onClick={() => handleLanguageChange(lang.code)} className={`px-2 py-1 text-sm rounded-md transition-colors ${selectedLanguages.includes(lang.code) ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSearch} disabled={!apiKey || isLoading} title={!apiKey ? "Please enter your Gemini API key" : ""} className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
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
                      placeholder={`Paste an article or a single quote by ${personName || 'the person'} here...`}
                    ></textarea>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <button 
                            onClick={handleExtractQuotes} 
                            disabled={!apiKey || isExtracting || !textToExtract || !personName} 
                            title={!apiKey ? "Please enter your Gemini API key" : !personName ? "Please enter a person's name" : !textToExtract ? "Please enter text to extract" : ""} 
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                            {isExtracting ? <Spinner /> : 'Extract & Analyze'}
                        </button>
                        <button 
                            onClick={() => setIsAddModalOpen(true)} 
                            disabled={!apiKey || isExtracting || !textToExtract || !personName} 
                            title={!apiKey ? "Please enter your Gemini API key" : !personName ? "Please enter a person's name" : !textToExtract ? "Please enter text to add" : ""} 
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
            <div className="md:col-span-2">
              {error && (
                <div className="bg-red-600/20 text-red-300 p-4 rounded-lg mb-6 ring-1 ring-inset ring-red-500/30">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}

              {rawApiResponseError && (
                <div className="bg-yellow-600/20 text-yellow-300 p-4 rounded-lg mb-6 ring-1 ring-inset ring-yellow-500/30">
                    <h3 className="font-bold mb-2">Raw AI Response for Examination</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm bg-gray-900 p-2 rounded-md">
                        <code>{rawApiResponseError}</code>
                    </pre>
                </div>
              )}
              
              <div className="p-4 bg-gray-800/50 rounded-lg mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-cyan-300 mb-2">Results ({filteredAndSortedQuotes.length})</h2>
                  {personName && <p className="text-gray-400">Showing quotes for: <span className="font-bold text-gray-300">{personName}</span></p>}
                </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Sort by:</span>
                        <div className="flex rounded-md bg-gray-700">
                            <button 
                                onClick={() => setSortOrder('newest')}
                                className={`px-3 py-1 text-sm font-medium transition-colors rounded-l-md ${sortOrder === 'newest' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            >
                                Newest
                            </button>
                            <button 
                                onClick={() => setSortOrder('oldest')}
                                className={`px-3 py-1 text-sm font-medium transition-colors rounded-r-md ${sortOrder === 'oldest' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            >
                                Oldest
                            </button>
                        </div>
                    </div>
                    <button onClick={handleClearQuotes} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm">Clear All</button>
                </div>
              </div>

              {quotes.length > 0 && (
                <div className="space-y-4">
                  {filteredAndSortedQuotes.map(quote => (
                    <QuoteCard 
                      key={quote.id} 
                      quote={quote} 
                      onAnalyze={handleAnalyzeQuote} 
                      onLanguageChange={handleUpdateQuoteLanguage}
                      isApiKeySet={!!apiKey} 
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        )}
        {isAddModalOpen && (
            <AddQuoteModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddQuoteManually}
            />
        )}
      </div>
    </div>
  );
};

export default App;