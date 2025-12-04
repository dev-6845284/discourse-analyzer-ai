import React from 'react';
import { Quote } from '../types';
import Spinner from '../Spinner';

interface QuoteCardActionsProps {
  quote: Quote;
  hasDraft: boolean;
  isApiKeySet: boolean;
  isBusy: boolean;
  isSaved: boolean;
  hideSaveButton?: boolean;
  onAnalyze: () => void;
  onImprove: () => void;
  onSave: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  onDelete: () => void;
  onRemove: () => void;
}

const QuoteCardActions: React.FC<QuoteCardActionsProps> = ({
  quote,
  hasDraft,
  isApiKeySet,
  isBusy,
  isSaved,
  hideSaveButton,
  onAnalyze,
  onImprove,
  onSave,
  onAccept,
  onDiscard,
  onDelete,
  onRemove,
}) => {
  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-2 justify-end">
      {hasDraft ? (
        <>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
          <button
            onClick={onDiscard}
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
            onClick={onAnalyze}
            disabled={!isApiKeySet || isBusy}
            className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isApiKeySet ? 'Please set your API key' : quote.analysis ? 'Analyze Again' : 'Analyze Quote'}
          >
            {quote.isAnalyzing ? (
              <Spinner />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            )}
          </button>

          <button
            onClick={onImprove}
            disabled={!isApiKeySet || isBusy}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isApiKeySet ? 'Please set your API key' : 'Improve quote context'}
          >
            {quote.isImproving ? (
              <Spinner />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>

          {!hideSaveButton && (
            <button
              onClick={onSave}
              disabled={!isApiKeySet || isBusy || quote.isStored}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSaved || quote.isStored ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={isSaved || quote.isStored ? 'Saved' : 'Save to database'}
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

          {/* Delete button for stored quotes */}
          {quote.isStored && (
            <button
              onClick={onDelete}
              disabled={isBusy}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete from database"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Remove/Discard button for non-stored quotes */}
          {!quote.isStored && (
            <button
              onClick={onRemove}
              disabled={isBusy}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Discard quote"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default QuoteCardActions;
