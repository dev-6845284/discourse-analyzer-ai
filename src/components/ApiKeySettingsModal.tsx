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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Do not load keys from storage or server. Reset inputs when modal opens.
  useEffect(() => {
    if (isOpen) {
      setGeminiKey('');
      setOpenAiKey('');
      setGrokKey('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { t } = useI18n();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        GEMINI_API_KEY: geminiKey || null,
        GROK_API_KEY: grokKey || null,
        CHATGPT_API_KEY: openAiKey || null,
      };
      // Use /users/me/keyset endpoint which gets userId from authenticated session
      await api.put('/users/me/keyset', payload);
      // Clear form after successful save
      setGeminiKey('');
      setOpenAiKey('');
      setGrokKey('');
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
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('geminiApiKeyLabel')}</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder={t('enterGeminiApiKey')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('chatGptApiKeyLabel')}</label>
            <input
              type="password"
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder={t('enterChatGptApiKey')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('grokApiKeyLabel')}</label>
            <input
              type="password"
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder={t('enterGrokApiKey')}
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
