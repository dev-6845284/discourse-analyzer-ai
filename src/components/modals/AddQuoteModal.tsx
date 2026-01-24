import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../constants';
import { useI18n } from '../../i18n';

interface AddQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { source: string; title: string; date: string; languageCode: string; languageName: string; }, model: string, analysisType: 'audit' | 'flaws', analyzeImmediately: boolean) => void;
  mode?: 'add' | 'extract';
  initialSource?: string;
  initialAnalysisType?: 'audit' | 'flaws';
  initialSelectedAI?: string;
  initialAnalyzeImmediately?: boolean;
}

const AddQuoteModal: React.FC<AddQuoteModalProps> = ({ isOpen, onClose, onSave, mode = 'add', initialSource = '', initialAnalysisType = 'audit', initialSelectedAI = 'gemini', initialAnalyzeImmediately = true }) => {
  const [source, setSource] = useState(initialSource);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [languageCode, setLanguageCode] = useState('lt');
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [analysisType, setAnalysisType] = useState<'audit' | 'flaws'>(initialAnalysisType);
  const [selectedAI, setSelectedAI] = useState<string>(initialSelectedAI);
  const [analyzeImmediately, setAnalyzeImmediately] = useState<boolean>(initialAnalyzeImmediately);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!source.trim() || !date) {
      setError(t('sourceUrlAndDateRequired'));
      return;
    }
    setError('');
    const languageName = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode)?.name || 'English';
    onSave({ source, title, date, languageCode, languageName }, selectedAI, analysisType, analyzeImmediately);
  };

  const titleText = mode === 'extract' ? t('extractQuotesDetails') : t('addQuoteDetails');
  const buttonText = mode === 'extract' ? t('extractAndAnalyze') : t('saveAndAnalyze');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md mx-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
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
        <p className="text-gray-400 mb-6">{t('addQuoteInstructions')}</p>

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <div className="space-y-4">
          <div>
            <label htmlFor="quoteSource" className="block text-sm font-medium text-gray-300 mb-1">{t('sourceUrlLabel')}</label>
            <input
              type="text"
              id="quoteSource"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder={t('linkPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="quoteTitle" className="block text-sm font-medium text-gray-300 mb-1">{t('sourceTitleLabelOptional')}</label>
            <input
              type="text"
              id="quoteTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
              placeholder={t('sourceTitlePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="quoteDate" className="block text-sm font-medium text-gray-300 mb-1">{t('dateLabel')}</label>
            <input
              type="date"
              id="quoteDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="quoteLanguage" className="block text-sm font-medium text-gray-300 mb-1">{t('languageLabel')}</label>
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

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
          <div className="flex rounded-md bg-gray-700 p-0.5">
            {['gemini', 'grok', 'openai'].map((model, idx, arr) => (
              <button
                key={model}
                type="button"
                onClick={() => setSelectedAI(model)}
                className={`flex-1 px-3 py-1 text-xs font-medium transition-colors ${selectedAI === model
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-gray-600'
                  } ${idx === 0 ? 'rounded-l-md' : ''} ${idx === arr.length - 1 ? 'rounded-r-md' : ''}`}
              >
                {model === 'gemini' ? 'Gemini' : model === 'grok' ? 'Grok' : 'OpenAI'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('analysisTypeLabel')}</label>
          <div className="flex rounded-md bg-gray-700 p-0.5">
            {(['audit', 'flaws'] as const).map((type, idx, arr) => (
              <button
                key={type}
                type="button"
                onClick={() => setAnalysisType(type)}
                className={`flex-1 px-4 py-1 text-xs font-medium transition-colors ${analysisType === type
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-gray-600'
                  } ${idx === 0 ? 'rounded-l-md' : ''} ${idx === arr.length - 1 ? 'rounded-r-md' : ''}`}
              >
                {t(`analysisType_${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={analyzeImmediately}
              onChange={(e) => setAnalyzeImmediately(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600 accent-cyan-600 focus:ring-cyan-500"
            />
            {t('analyzeImmediately')}
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => handleSave()}
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