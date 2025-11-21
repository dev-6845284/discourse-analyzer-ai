import React, { useState } from 'react';
import { Quote } from '../types';
import AnalysisReport from './AnalysisReport';
import Spinner from './Spinner';
import { SUPPORTED_LANGUAGES } from '../constants';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quote: Quote) => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  isApiKeySet: boolean;
  hideSaveButton?: boolean;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onAnalyze, onImprove, onSave, onLanguageChange, isApiKeySet, hideSaveButton }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(quote);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className={`relative bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-700/50 hover:shadow-cyan-500/10 ${isCollapsed ? 'py-4 px-6' : 'p-6'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl font-light leading-none z-10"
        aria-label={isCollapsed ? 'Expand quote' : 'Collapse quote'}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '+' : '×'}
      </button>

      <blockquote className="border-l-4 border-cyan-500 pl-4 mr-8">
        <p className={`text-gray-200 italic ${isCollapsed ? 'truncate' : ''}`}>
          "{quote.text}"
        </p>
      </blockquote>
      
      {!isCollapsed && (
        <>
          <div className="flex justify-between items-center mt-3 text-xs gap-4 flex-wrap">
            <a
              href={quote.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 truncate hover:underline flex-1 min-w-0"
              title={quote.title}
            >
              {quote.title}
            </a>
            <div className="flex items-center gap-2 flex-shrink-0">
                <select
                    value={quote.languageCode}
                    onChange={(e) => onLanguageChange(quote.id, e.target.value)}
                    className="bg-gray-700/50 text-gray-300 text-xs rounded border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-1"
                    aria-label="Quote language"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
                <span className="text-gray-400">{quote.date}</span>
            </div>
          </div>
          
          {quote.analysis && <AnalysisReport analysis={quote.analysis} />}

          <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-2 justify-end">
            <button
              onClick={() => onAnalyze(quote)}
              disabled={!isApiKeySet || quote.isAnalyzing}
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
              disabled={!isApiKeySet || quote.isImproving}
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
              disabled={isSaved || quote.isStored}
              className={`p-2 rounded-lg transition-colors ${isSaved || quote.isStored ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
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
          </div>
        </>
      )}
    </div>
  );
};

export default QuoteCard;