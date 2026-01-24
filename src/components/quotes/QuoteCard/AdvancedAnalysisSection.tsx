/**
 * AdvancedAnalysisSection Component
 *
 * Purpose:
 * - A collapsible section within the QuoteCard for managing "Analysis Context" and "Fact Checking Links".
 * - Allows users to provide additional context for the AI or manual analysis.
 *
 * Behavior:
 * - Toggles visibility via "Advanced Analysis" button.
 * - Supports adding/removing/selecting URLs for context or quote sources.
 *
 * Location: src/components/quotes/QuoteCard/AdvancedAnalysisSection.tsx
 */
import React from 'react';
import { useI18n } from '../../../i18n';

interface LinkData {
  url: string;
  title?: string;
  type: 'quote' | 'context';
  selected?: boolean;
}

interface AdvancedAnalysisSectionProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  analysisContext: string;
  onAnalysisContextChange: (value: string) => void;
  links: LinkData[];
  newLinkUrl: string;
  onNewLinkUrlChange: (value: string) => void;
  newLinkType: 'quote' | 'context';
  onNewLinkTypeChange: (value: 'quote' | 'context') => void;
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
  onToggleLinkSelection: (index: number) => void;
  onSelectAllLinks: () => void;
  onDeselectAllLinks: () => void;
}

const AdvancedAnalysisSection: React.FC<AdvancedAnalysisSectionProps> = ({
  showAdvanced,
  onToggleAdvanced,
  analysisContext,
  onAnalysisContextChange,
  links,
  newLinkUrl,
  onNewLinkUrlChange,
  newLinkType,
  onNewLinkTypeChange,
  onAddLink,
  onRemoveLink,
  onToggleLinkSelection,
  onSelectAllLinks,
  onDeselectAllLinks,
}) => {
  const { t } = useI18n();
  const selectedCount = links.filter(l => l.selected !== false).length;
  const allSelected = selectedCount === links.length;
  const noneSelected = selectedCount === 0;

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50 pt-2">
      <button
        onClick={onToggleAdvanced}
        className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 flex items-center gap-1 mb-2"
      >
        {showAdvanced ? t('hideAdvancedAnalysis') : t('advancedAnalysis')}
      </button>

      {showAdvanced && (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg space-y-3 border border-gray-100 dark:border-transparent">
          <div>
            <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">{t('contextForAnalysis')}</label>
            <textarea
              value={analysisContext}
              onChange={(e) => onAnalysisContextChange(e.target.value)}
              placeholder={t('contextPlaceholder')}
              className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-700 p-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-400 dark:text-gray-500">{t('factCheckingLinks')}</label>
              {links.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={onSelectAllLinks}
                    disabled={allSelected}
                    className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('selectAll')}
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={onDeselectAllLinks}
                    disabled={noneSelected}
                    className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('deselectAll')}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {links.map((link, index) => {
                const isSelected = link.selected !== false;
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-xs bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-700 ${!isSelected ? 'opacity-50' : ''
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleLinkSelection(index)}
                      className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${link.type === 'quote'
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-transparent'
                        : 'bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-transparent'
                        }`}
                    >
                      {link.type === 'quote' ? t('quoteSource') : t('contextLabelShort')}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-cyan-600 dark:text-cyan-400 truncate flex-1 hover:underline ${!isSelected ? 'line-through text-gray-400 dark:text-gray-500' : ''
                        }`}
                    >
                      {link.url}
                    </a>
                    <button onClick={() => onRemoveLink(index)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 px-1 font-bold">
                      ×
                    </button>
                  </div>
                );
              })}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => onNewLinkUrlChange(e.target.value)}
                  placeholder={t('linkPlaceholder')}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-700 p-1.5 focus:border-cyan-500"
                />
                <select
                  value={newLinkType}
                  onChange={(e) => onNewLinkTypeChange(e.target.value as 'quote' | 'context')}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-700 p-1.5"
                >
                  <option value="context">{t('contextLabelShort')}</option>
                  <option value="quote">{t('quoteSource')}</option>
                </select>
                <button
                  onClick={onAddLink}
                  disabled={!newLinkUrl}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-xs rounded border border-gray-300 dark:border-transparent disabled:opacity-50"
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalysisSection;
