import React, { useState } from 'react';
import { Quote } from '../types';
import AnalysisReport from './AnalysisReport';
import Spinner from './Spinner';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quoteId: string, quoteText: string) => void;
  isApiKeySet: boolean;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onAnalyze, isApiKeySet }) => {
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
          <a
            href={quote.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 text-xs mt-3 block truncate hover:underline"
          >
            {quote.title}
          </a>
          
          {quote.analysis ? (
            <AnalysisReport analysis={quote.analysis} />
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => onAnalyze(quote.id, quote.text)}
                disabled={!isApiKeySet || quote.isAnalyzing}
                className="w-full flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                title={!isApiKeySet ? "Please set your API key in the control panel" : ""}
              >
                {quote.isAnalyzing ? <Spinner /> : 'Analyze Quote'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuoteCard;