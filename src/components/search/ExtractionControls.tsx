import React from 'react';
import Spinner from '../Spinner';

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
const isValidUrl = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

interface ExtractionControlsProps {
  textToExtract: string;
  setTextToExtract: (text: string) => void;
  isExtracting: boolean;
  personName: string;
  onExtract: () => void;
  onAdd: () => void;
  onExtractFromUrl?: () => void;
  extractionStatus?: string;
}

export const ExtractionControls: React.FC<ExtractionControlsProps> = ({
  textToExtract,
  setTextToExtract,
  isExtracting,
  personName,
  onExtract,
  onAdd,
  onExtractFromUrl,
  extractionStatus,
}) => {
  const isUrl = isValidUrl(textToExtract);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-semibold text-cyan-400 mb-4">
        Extract from Text
      </h2>
      <textarea
        value={textToExtract}
        onChange={(e) => setTextToExtract(e.target.value)}
        rows={6}
        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
        placeholder={`Paste an article, a URL, or a single quote by ${
          personName || 'the person'
        } here...`}
      ></textarea>
      
      {/* Status indicator */}
      {isExtracting && extractionStatus && (
        <div className="mt-2 text-sm text-cyan-400 flex items-center gap-2">
          <Spinner />
          <span>{extractionStatus}</span>
        </div>
      )}
      
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {isUrl && onExtractFromUrl ? (
          // Show "Extract from Link" button when URL is detected
          <button
            onClick={onExtractFromUrl}
            disabled={isExtracting || !personName}
            title={
              !personName
                ? "Please enter a person's name"
                : 'Extract quotes from the article at this URL'
            }
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isExtracting ? (
              <Spinner />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                Extract from Link
              </>
            )}
          </button>
        ) : (
          // Show regular extraction buttons when not a URL
          <>
            <button
              onClick={onExtract}
              disabled={isExtracting || !textToExtract || !personName}
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
              onClick={onAdd}
              disabled={isExtracting || !textToExtract || !personName}
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
          </>
        )}
      </div>
    </div>
  );
};
