import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  rawApiResponseError: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, rawApiResponseError }) => {
  if (!error && !rawApiResponseError) return null;

  return (
    <>
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
    </>
  );
};

export default ErrorDisplay;
