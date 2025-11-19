import React, { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [chatGptKey, setChatGptKey] = useState('');
  const [grokKey, setGrokKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const keys = loadFromStorage<Record<string, string>>('apiKeys') || {};
      setGeminiKey(keys.gemini || '');
      setChatGptKey(keys.chatgpt || '');
      setGrokKey(keys.grok || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const keys = {
      gemini: geminiKey,
      chatgpt: chatGptKey,
      grok: grokKey,
    };
    saveToStorage('apiKeys', keys);
    onClose();
  };

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
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">API Key Settings</h2>
        <p className="text-gray-400 mb-6">Enter your API keys to use your own accounts.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter Gemini API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ChatGPT API Key</label>
            <input
              type="password"
              value={chatGptKey}
              onChange={(e) => setChatGptKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter ChatGPT API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Grok API Key</label>
            <input
              type="password"
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter Grok API Key"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettingsModal;
