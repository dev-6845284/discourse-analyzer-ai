import React, { useState } from 'react';
import { Quote } from '../types';
import AnalysisReport from './AnalysisReport';
import Spinner from './Spinner';
import { SUPPORTED_LANGUAGES } from '../constants';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quote: Quote) => void;
  onImprove: (quote: Quote) => void;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  isApiKeySet: boolean;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onAnalyze, onImprove, onLanguageChange, isApiKeySet }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <button
              onClick={() => onAnalyze(quote)}
              disabled={!isApiKeySet || quote.isAnalyzing}
              className="w-full flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title={!isApiKeySet ? "Please set your API key in the control panel" : ""}
            >
              {quote.isAnalyzing ? <Spinner /> : (quote.analysis ? 'Analyze Again' : 'Analyze Quote')}
            </button>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={() => onImprove(quote)}
              disabled={!isApiKeySet || quote.isImproving}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title={!isApiKeySet ? "Please set your API key in the control panel" : "Improve this quote by finding the full context from the source"}
            >
              {quote.isImproving ? <Spinner /> : '🔍 Improve Quote'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuoteCard;