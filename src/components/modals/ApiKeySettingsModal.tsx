import React, { useState, useEffect } from 'react';
import ModalWrapper from '../ui/ModalWrapper';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [overwriteGemini, setOverwriteGemini] = useState(false);
  const [overwriteOpenAi, setOverwriteOpenAi] = useState(false);
  const [overwriteGrok, setOverwriteGrok] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setGeminiKey('');
      setOpenAiKey('');
      setGrokKey('');
      setOverwriteGemini(false);
      setOverwriteOpenAi(false);
      setOverwriteGrok(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload: any = {};

      if (overwriteGemini) {
        payload.GEMINI_API_KEY = geminiKey || null;
      }
      if (overwriteOpenAi) {
        payload.CHATGPT_API_KEY = openAiKey || null;
      }
      if (overwriteGrok) {
        payload.GROK_API_KEY = grokKey || null;
      }

      await api.put('/users/me/keyset', payload);
      setGeminiKey('');
      setOpenAiKey('');
      setGrokKey('');
      setOverwriteGemini(false);
      setOverwriteOpenAi(false);
      setOverwriteGrok(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Save failed');
      console.error('Failed to save API keys', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalWrapper title={t('apiKeySettingsTitle')} onClose={onClose}>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{t('enterApiKeysNote')}</p>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('geminiApiKeyLabel')}</label>
            <label className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 form-checkbox h-3.5 w-3.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-cyan-500 rounded focus:ring-cyan-500 dark:focus:ring-offset-gray-900 transition-colors"
                checked={overwriteGemini}
                onChange={(e) => setOverwriteGemini(e.target.checked)}
              />
              {t('overwriteKey')}
            </label>
          </div>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            disabled={!overwriteGemini}
            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all ${!overwriteGemini ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
            placeholder={!overwriteGemini ? '' : t('enterGeminiApiKey')}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('chatGptApiKeyLabel')}</label>
            <label className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 form-checkbox h-3.5 w-3.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-cyan-500 rounded focus:ring-cyan-500 dark:focus:ring-offset-gray-900 transition-colors"
                checked={overwriteOpenAi}
                onChange={(e) => setOverwriteOpenAi(e.target.checked)}
              />
              {t('overwriteKey')}
            </label>
          </div>
          <input
            type="password"
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
            disabled={!overwriteOpenAi}
            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all ${!overwriteOpenAi ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
            placeholder={!overwriteOpenAi ? '' : t('enterChatGptApiKey')}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('grokApiKeyLabel')}</label>
            <label className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 form-checkbox h-3.5 w-3.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-cyan-500 rounded focus:ring-cyan-500 dark:focus:ring-offset-gray-900 transition-colors"
                checked={overwriteGrok}
                onChange={(e) => setOverwriteGrok(e.target.checked)}
              />
              {t('overwriteKey')}
            </label>
          </div>
          <input
            type="password"
            value={grokKey}
            onChange={(e) => setGrokKey(e.target.value)}
            disabled={!overwriteGrok}
            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition-all ${!overwriteGrok ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`}
            placeholder={!overwriteGrok ? '' : t('enterGrokApiKey')}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3 mt-8">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors font-semibold"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 text-white rounded font-semibold transition-all shadow-md active:scale-95 ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isSaving ? t('saving') : t('saveKeys')}
        </button>
      </div>
    </ModalWrapper>
  );
};

export default ApiKeySettingsModal;
