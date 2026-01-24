import React from 'react';
import { Youtube, Settings } from 'lucide-react';
import { useI18n } from '../../i18n';

interface YoutubeTranscriptButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export const YoutubeTranscriptButton: React.FC<YoutubeTranscriptButtonProps> = ({
  onClick,
  isLoading = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="bg-red-50 dark:bg-gradient-to-r dark:from-red-900/30 dark:to-gray-800/50 rounded-lg border border-red-200 dark:border-red-700/50 hover:border-red-300 dark:hover:border-red-500/70 transition-colors p-3">
      <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
        <Youtube size={20} />
        {t('youtubeTranscript')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('youtubeTranscriptButtonNote')}
      </p>
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Youtube size={18} />
        {t('getYouTubeTranscript')}
      </button>
      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
        <Settings size={12} />
        {t('chooseFromMethods')}
      </p>
    </div>
  );
};

export default YoutubeTranscriptButton;
