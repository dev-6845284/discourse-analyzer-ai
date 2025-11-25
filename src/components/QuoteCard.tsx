import React, { useState } from 'react';
import { Quote, AnalysisCategory, AnalysisResult } from '../types';
import AnalysisReport from './AnalysisReport';
import Spinner from './Spinner';
import { SUPPORTED_LANGUAGES, RATING_ORDER } from '../constants';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quote: Quote) => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  onAccept?: (quote: Quote) => void;
  onDiscard?: (quote: Quote) => void;
  isApiKeySet: boolean;
  hideSaveButton?: boolean;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ 
  quote, 
  onAnalyze, 
  onImprove, 
  onSave, 
  onLanguageChange, 
  onAccept,
  onDiscard,
  isApiKeySet, 
  hideSaveButton 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analysisContext, setAnalysisContext] = useState(quote.analysisContext || '');
  const [links, setLinks] = useState<{ url: string; title?: string; type: 'quote' | 'context' }[]>(quote.links || quote.metadata?.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<'quote' | 'context'>('context');
  const [selectedCategories, setSelectedCategories] = useState<AnalysisCategory[]>([]);

  // Sync state with props when quote updates
  React.useEffect(() => {
    setAnalysisContext(quote.analysisContext || '');
    setLinks(quote.links || quote.metadata?.links || []);
    
    // Initialize selected categories when draft analysis is available
    if (quote.draft?.analysis) {
      const initialSelection = (Object.entries(quote.draft.analysis) as [AnalysisCategory, any][])
        .filter(([_, detail]) => RATING_ORDER[detail.rating] >= RATING_ORDER['Medium'])
        .map(([category]) => category);
      setSelectedCategories(initialSelection);
    }
  }, [quote.analysisContext, quote.links, quote.metadata, quote.draft]);

  const isBusy = quote.isAnalyzing || quote.isImproving;
  const hasDraft = !!quote.draft;
  const displayQuote = hasDraft ? (quote.draft as Quote) : quote;

  const handleSave = () => {
    onSave({ ...quote, analysisContext, links });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddLink = () => {
    if (newLinkUrl) {
      setLinks([...links, { url: newLinkUrl, type: newLinkType }]);
      setNewLinkUrl('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    onAnalyze({ ...quote, analysisContext, links });
  };

  const handleToggleCategory = (category: AnalysisCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleAccept = () => {
    if (!onAccept || !quote.draft) return;

    // Filter analysis based on selected categories
    const filteredAnalysis: AnalysisResult = {};
    if (quote.draft.analysis) {
      selectedCategories.forEach(category => {
        if (quote.draft!.analysis![category]) {
          filteredAnalysis[category] = quote.draft!.analysis![category];
        }
      });
    }

    const quoteWithFilteredAnalysis = {
      ...quote,
      draft: {
        ...quote.draft,
        analysis: filteredAnalysis
      }
    };

    onAccept(quoteWithFilteredAnalysis);
  };

  return (
    <div className={`relative bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-700/50 hover:shadow-cyan-500/10 ${isCollapsed ? 'py-4 px-6' : 'p-6'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl font-light leading-none z-10"
        aria-label={isCollapsed ? 'Expand quote' : 'Collapse quote'}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '+' : '-'}
      </button>

      {hasDraft && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <div className="text-yellow-500 text-xs font-bold uppercase mb-2">Original Content</div>
          <blockquote className="border-l-4 border-yellow-600 pl-4">
            <p className="text-gray-400 italic text-sm">"{quote.text}"</p>
          </blockquote>
          {quote.analysis && !quote.draft?.analysis && (
             <div className="mt-2 text-xs text-gray-500">Original analysis available</div>
          )}
        </div>
      )}

      <blockquote className={`border-l-4 ${hasDraft ? 'border-green-500' : 'border-cyan-500'} pl-4 mr-8`}>
        <p className={`text-gray-200 italic ${isCollapsed ? 'truncate' : ''}`}>
          "{displayQuote.text}"
        </p>
      </blockquote>
      
      {!isCollapsed && (
        <>
          <div className="flex justify-between items-center mt-3 text-xs gap-4 flex-wrap">
            <a
              href={displayQuote.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 truncate hover:underline flex-1 min-w-0"
              title={displayQuote.title}
            >
              {displayQuote.title}
            </a>
            <div className="flex items-center gap-2 flex-shrink-0">
                <select
                    value={displayQuote.languageCode}
                    onChange={(e) => onLanguageChange(quote.id, e.target.value)}
                    disabled={isBusy || hasDraft}
                    className="bg-gray-700/50 text-gray-300 text-xs rounded border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Quote language"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
                <span className="text-gray-400">{displayQuote.date}</span>
            </div>
          </div>
          
          {displayQuote.analysis && (
            <AnalysisReport 
              analysis={displayQuote.analysis} 
              selectable={hasDraft}
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
            />
          )}

          {/* Audit Metadata Line */}
          {(quote.analyzedByName || quote.analyzedByProvider || quote.savedByName) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
              {quote.savedByName && quote.savedAt && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Saved by {quote.savedByName} • {new Date(quote.savedAt).toLocaleDateString()}
                </span>
              )}
              {quote.analyzedByName && quote.analyzedAt && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                  Analyzed by {quote.analyzedByName}
                  {quote.analyzedByProvider && <span className="text-cyan-500 uppercase"> via {quote.analyzedByProvider}</span>}
                  {' '}• {new Date(quote.analyzedAt).toLocaleDateString()}
                </span>
              )}
              {!quote.analyzedByName && quote.analyzedByProvider && quote.analyzedAt && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                  Analyzed <span className="text-cyan-500 uppercase">via {quote.analyzedByProvider}</span>
                  {' '}• {new Date(quote.analyzedAt).toLocaleDateString()}
                </span>
              )}
              {quote.improvedByName && quote.improvedAt && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Improved by {quote.improvedByName}
                  {quote.improvedByProvider && <span className="text-purple-400 uppercase"> via {quote.improvedByProvider}</span>}
                  {' '}• {new Date(quote.improvedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Display Context & Links (Read-only view) */}
          {!showAdvanced && (quote.analysisContext || (links && links.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-gray-700/30 text-xs">
              {quote.analysisContext && (
                <div className="mb-2">
                  <span className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Context: </span>
                  <span className="text-gray-400 italic">{quote.analysisContext}</span>
                </div>
              )}
              {links && links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {links.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
                        link.type === 'quote' 
                          ? 'border-blue-900/50 bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                          : 'border-purple-900/50 bg-purple-900/20 text-purple-400 hover:bg-purple-900/30'
                      }`}
                      title={link.url}
                    >
                      <span className="uppercase text-[10px] font-bold opacity-70">{link.type === 'quote' ? 'Source' : 'Ref'}</span>
                      <span className="max-w-[150px] truncate">{link.title || new URL(link.url).hostname}</span>
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advanced Analysis Section */}
          {!hasDraft && (
            <div className="mt-4 border-t border-gray-700/50 pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-2"
              >
                {showAdvanced ? '▼ Hide Advanced Analysis' : '▶ Advanced Analysis'}
              </button>
              
              {showAdvanced && (
                <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Context for Analysis</label>
                    <textarea
                      value={analysisContext}
                      onChange={(e) => setAnalysisContext(e.target.value)}
                      placeholder="Provide context to help the AI determine truthfulness (e.g., 'This was said during a debate about tax reform...')"
                      className="w-full bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fact-Checking Links</label>
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs bg-gray-800 p-1.5 rounded border border-gray-700">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${link.type === 'quote' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
                            {link.type}
                          </span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 truncate flex-1 hover:underline">
                            {link.url}
                          </a>
                          <button onClick={() => handleRemoveLink(index)} className="text-red-400 hover:text-red-300 px-1">×</button>
                        </div>
                      ))}
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-1.5 focus:border-cyan-500"
                        />
                        <select
                          value={newLinkType}
                          onChange={(e) => setNewLinkType(e.target.value as 'quote' | 'context')}
                          className="bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-1.5"
                        >
                          <option value="context">Context</option>
                          <option value="quote">Quote Source</option>
                        </select>
                        <button
                          onClick={handleAddLink}
                          disabled={!newLinkUrl}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-2 justify-end">
            {hasDraft ? (
              <>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept
                </button>
                <button
                  onClick={() => onDiscard && onDiscard(quote)}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Discard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAnalyze}
                  disabled={!isApiKeySet || isBusy}
                  className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!isApiKeySet ? "Please set your API key" : (quote.analysis ? 'Analyze Again' : 'Analyze Quote')}
                >
                  {quote.isAnalyzing ? <Spinner /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => onImprove(quote)}
                  disabled={!isApiKeySet || isBusy}
                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!isApiKeySet ? "Please set your API key" : "Improve quote context"}
                >
                  {quote.isImproving ? <Spinner /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>

                {!hideSaveButton && (
                  <button
                    onClick={handleSave}
                    disabled={!isApiKeySet || isBusy || quote.isStored}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSaved || quote.isStored ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title={isSaved || quote.isStored ? "Saved" : "Save to database"}
                  >
                    {isSaved || quote.isStored ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QuoteCard;