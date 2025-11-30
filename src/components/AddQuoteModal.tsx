import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { source: string; title: string; date: string; languageCode: string; languageName: string; }) => void;
  mode?: 'add' | 'extract';
  initialSource?: string;
}

const AddQuoteModal: React.FC<AddQuoteModalProps> = ({ isOpen, onClose, onSave, mode = 'add', initialSource = '' }) => {
  const [source, setSource] = useState(initialSource);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [languageCode, setLanguageCode] = useState('en');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!source.trim() || !date) {
      setError('Source URL and Date are required.');
      return;
    }
    setError('');
    const languageName = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode)?.name || 'English';
    onSave({ source, title, date, languageCode, languageName });
  };

  const titleText = mode === 'extract' ? 'Extract Quotes Details' : 'Add Quote Details';
  const buttonText = mode === 'extract' ? 'Extract & Analyze' : 'Save and Analyze';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <style>{`
          @keyframes fade-in-scale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in-scale {
            animation: fade-in-scale 0.3s forwards;
          }
        `}</style>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">{titleText}</h2>
        <p className="text-gray-400 mb-6">Please provide the source, date, and language for the quote.</p>
        
        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="quoteSource" className="block text-sm font-medium text-gray-300 mb-1">Source URL</label>
            <input
              type="text"
              id="quoteSource"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="https://example.com/article"
            />
          </div>
          <div>
            <label htmlFor="quoteTitle" className="block text-sm font-medium text-gray-300 mb-1">Source Title (Optional)</label>
            <input
              type="text"
              id="quoteTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Article Title"
            />
          </div>
          <div>
            <label htmlFor="quoteDate" className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              id="quoteDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="quoteLanguage" className="block text-sm font-medium text-gray-300 mb-1">Language</label>
            <select
              id="quoteLanguage"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuoteModal;