/**
 * YoutubeTranscriptFetcher Component
 *
 * Purpose:
 * - A standalone component to input a YouTube URL and fetch its transcript.
 * - Consumed by `TranscriptMethodSelector` or used independently.
 *
 * Behavior:
 * - Validates YouTube URLs locally before attempting fetch.
 * - Displays loading states/spinners during fetch.
 * - Handles errors gracefully.
 *
 * Location: src/components/transcript/YoutubeTranscriptFetcher.tsx
 */
import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useI18n } from '../../i18n';

interface YoutubeTranscriptFetcherProps {
  onFetch: (url: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export const YoutubeTranscriptFetcher: React.FC<YoutubeTranscriptFetcherProps> = ({
  onFetch,
  isLoading,
  error,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useI18n();

  const handleFetch = async () => {
    setLocalError(null);

    if (!videoUrl.trim()) {
      setLocalError(t('pleaseEnterYoutubeUrl'));
      return;
    }

    // Basic validation for YouTube URL
    const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeUrlPattern.test(videoUrl)) {
      setLocalError(t('pleaseEnterValidYouTubeUrl'));
      return;
    }

    try {
      await onFetch(videoUrl);
      setVideoUrl(''); // Clear input after successful fetch
    } catch (err: any) {
      setLocalError(err.message || t('failedToFetchTranscript'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleFetch();
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <h2 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
        <Play size={20} />
        {t('youtubeTranscriptViewerTitle')}
      </h2>

      <p className="text-sm text-gray-400 mb-4">
        {t('pasteVideoUrlToViewTranscript')}
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setLocalError(null);
          }}
          onKeyPress={handleKeyPress}
          placeholder={t('youtubeUrlPlaceholder')}
          disabled={isLoading}
          className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:bg-gray-600 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleFetch}
          disabled={isLoading || !videoUrl.trim()}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-0"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('fetching')}
            </>
          ) : (
            <>
              <Play size={18} />
              {t('getTranscript')}
            </>
          )}
        </button>
      </div>

      {(error || localError) && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error || localError}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Supports YouTube URLs, auto-generated captions, and multiple languages
      </p>
    </div>
  );
};

export default YoutubeTranscriptFetcher;
