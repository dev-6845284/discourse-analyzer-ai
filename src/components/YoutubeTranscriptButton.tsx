import React from 'react';
import { Youtube, Settings } from 'lucide-react';
import { useI18n } from '../i18n';

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
    <div className="p-4 bg-gradient-to-r from-red-900/30 to-gray-800/50 rounded-lg border border-red-700/50 hover:border-red-500/70 transition-colors">
      <h2 className="text-xl font-semibold text-red-400 mb-2 flex items-center gap-2">
        <Youtube size={20} />
        {t('youtubeTranscript')}
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        {t('youtubeTranscriptButtonNote')}
      </p>
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
