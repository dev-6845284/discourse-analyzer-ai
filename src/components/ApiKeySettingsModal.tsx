import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';

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

  // Do not load keys from storage or server. Reset inputs when modal opens.
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

  const { t } = useI18n();

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

      // Use /users/me/keyset endpoint which gets userId from authenticated session
      await api.put('/users/me/keyset', payload);
      // Clear form after successful save
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
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">{t('apiKeySettingsTitle')}</h2>
        <p className="text-gray-400 mb-6">{t('enterApiKeysNote')}</p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-300">{t('geminiApiKeyLabel')}</label>
              <label className="inline-flex items-center text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 form-checkbox bg-gray-700 border-gray-600 text-cyan-500 rounded focus:ring-offset-gray-800"
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
              className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 ${!overwriteGemini ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={!overwriteGemini ? '' : t('enterGeminiApiKey')}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-300">{t('chatGptApiKeyLabel')}</label>
              <label className="inline-flex items-center text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 form-checkbox bg-gray-700 border-gray-600 text-cyan-500 rounded focus:ring-offset-gray-800"
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
              className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 ${!overwriteOpenAi ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={!overwriteOpenAi ? '' : t('enterChatGptApiKey')}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-300">{t('grokApiKeyLabel')}</label>
              <label className="inline-flex items-center text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2 form-checkbox bg-gray-700 border-gray-600 text-cyan-500 rounded focus:ring-offset-gray-800"
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
              className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 ${!overwriteGrok ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={!overwriteGrok ? '' : t('enterGrokApiKey')}
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isSaving ? t('saving') : t('saveKeys')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettingsModal;
