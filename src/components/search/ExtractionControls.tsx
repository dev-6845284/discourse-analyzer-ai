import React from 'react';
import Spinner from '../Spinner';

interface ExtractionControlsProps {
  textToExtract: string;
  setTextToExtract: (text: string) => void;
  isExtracting: boolean;
  personName: string;
  onExtract: () => void;
  onAdd: () => void;
}

export const ExtractionControls: React.FC<ExtractionControlsProps> = ({
  textToExtract,
  setTextToExtract,
  isExtracting,
  personName,
  onExtract,
  onAdd,
}) => {
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
        placeholder={`Paste an article or a single quote by ${
          personName || 'the person'
        } here...`}
      ></textarea>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
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
      </div>
    </div>
  );
};
