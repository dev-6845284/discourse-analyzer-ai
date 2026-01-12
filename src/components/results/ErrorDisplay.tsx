import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  rawApiResponseError: string | null;
  clearError?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, rawApiResponseError, clearError }) => {
  if (!error && !rawApiResponseError) return null;

  return (
    <>
      {error && (
        <div className="fixed top-24 right-4 z-50 w-full max-w-md bg-red-900/90 text-red-200 p-4 rounded-lg shadow-2xl backdrop-blur-sm border border-red-500 animate-slide-in-right">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            {clearError && (
              <button
                onClick={clearError}
                className="ml-4 text-red-300 hover:text-white transition-colors"
                aria-label="Close error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <style>{`
            @keyframes slide-in-right {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-in-right {
              animation: slide-in-right 0.3s ease-out forwards;
            }
          `}</style>
        </div>
      )}

      {rawApiResponseError && (
        <div className="bg-yellow-600/20 text-yellow-300 p-4 rounded-lg mb-6 ring-1 ring-inset ring-yellow-500/30 mt-4">
          <h3 className="font-bold mb-2">Raw AI Response for Examination</h3>
          <pre className="whitespace-pre-wrap break-words text-sm bg-gray-900 p-2 rounded-md max-h-96 overflow-auto">
            <code>{rawApiResponseError}</code>
          </pre>
        </div>
      )}
    </>
  );
};

export default ErrorDisplay;
