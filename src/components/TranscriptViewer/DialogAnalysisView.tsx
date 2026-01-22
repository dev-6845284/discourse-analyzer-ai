import React from 'react';
import { formatTimestamp, parseTimestamp } from '../../utils/transcriptHelpers';
import Spinner from '../Spinner';

interface DialogLine {
  speaker: string;
  text: string;
  timestamp: number;
}

interface SummaryItem {
  timestamp: string;
  text: string;
  importance?: number;
}

interface DialogAnalysis {
  summaryItems: SummaryItem[];
}

interface DialogGroup {
  id: string;
  title: string;
  analysis?: DialogAnalysis;
  dialogLines: DialogLine[];
}

interface DialogAnalysisViewProps {
  isDialogAnalyzing: boolean;
  dialogResults: DialogGroup[];
  speakerResults: any[];
  error: string | null;
  highlightedDialogLineId: string | null;
  dialogLineRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onSummaryItemClick: (groupId: string, timestamp: string, groupDialogLines: DialogLine[]) => void;
  onClearAnalysis: () => void;
  onAnalyzeDialog: (languageCode?: string) => void;
  isSelectionMode?: boolean;
  selectedStatements?: Map<string, number>;
  onToggleSelection?: (statementId: string, groupId: number) => void;
  onGroupChange?: (statementId: string, newGroupId: number) => void;
  onPromote?: () => void;
  onCancelSelection?: () => void;
  onStartSelection?: () => void;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;

}

export const DialogAnalysisView: React.FC<DialogAnalysisViewProps> = ({
  isDialogAnalyzing,
  dialogResults,
  speakerResults,
  error,
  highlightedDialogLineId,
  dialogLineRefs,
  onSummaryItemClick,
  onClearAnalysis,
  onAnalyzeDialog,
  isSelectionMode = false,
  selectedStatements,
  onToggleSelection,
  onGroupChange,
  onPromote,
  onCancelSelection,
  onStartSelection,
  selectedLanguage = 'en',
  onLanguageChange,

}) => {
  const [analysisLanguage, setAnalysisLanguage] = React.useState(selectedLanguage);

  // Debug log
  React.useEffect(() => {
    // console.log('[DialogAnalysisView] State:', {
    //   isSelectionMode,
    //   selectedStatementsSize: selectedStatements?.size,
    //   selectedStatements: Array.from(selectedStatements?.entries() || []),
    //   lockedGroupId,
    // });
  }, [isSelectionMode, selectedStatements]);

  if (isDialogAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-300">
            Analyzing dialog topics...
          </p>
          <p className="text-sm text-gray-400 mt-2">This may take a while.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center text-red-400">
          <p>Error analyzing dialog:</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (dialogResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center text-gray-400">
          <p className="mb-4">No dialog analysis data available.</p>

          <div className="mb-4 flex items-center justify-center gap-2">
            <label htmlFor="analysis-language-select" className="text-sm text-gray-400">Analysis Language:</label>
            <select
              id="analysis-language-select"
              value={analysisLanguage}
              onChange={(e) => setAnalysisLanguage(e.target.value)}
              className="bg-gray-800 text-gray-300 text-sm rounded border border-gray-600 px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="en">English</option>
              <option value="lt">Lithuanian</option>
              <option value="ru">Russian</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pl">Polish</option>
              <option value="uk">Ukrainian</option>
            </select>
          </div>

          <button
            onClick={() => onAnalyzeDialog(analysisLanguage)}
            disabled={speakerResults.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
          >
            Start Dialog Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/30 space-y-6">
      {isSelectionMode && (
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 -mx-6 -mt-6 mb-6 border-b border-cyan-200 dark:border-cyan-700/50 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
            <span className="text-cyan-700 dark:text-cyan-300 font-bold">
              Selected: {selectedStatements?.size || 0} statements
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Group items with the same number to merge them into one quote.
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="language-select" className="text-sm text-gray-500 dark:text-gray-400">Language:</label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => onLanguageChange?.(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 text-sm rounded border border-gray-300 dark:border-gray-600 px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="en">English</option>
                <option value="lt">Lithuanian</option>
                <option value="ru">Russian</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pl">Polish</option>
                <option value="uk">Ukrainian</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancelSelection}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onPromote}
                disabled={!selectedStatements || selectedStatements.size === 0}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-600/20 dark:shadow-cyan-900/20"
              >
                Promote to Quotes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 dark:text-gray-300">
          Identified <strong>{dialogResults.length}</strong> topic groups
        </p>
        <div className="flex gap-2 items-center">
          {!isSelectionMode && (
            <div className="flex items-center gap-2 mr-2">
              <label htmlFor="view-language-select" className="text-xs text-gray-500 dark:text-gray-400">Language:</label>
              <select
                id="view-language-select"
                value={selectedLanguage}
                onChange={(e) => onLanguageChange?.(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-600 px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="en">English</option>
                <option value="lt">Lithuanian</option>
                <option value="ru">Russian</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pl">Polish</option>
                <option value="uk">Ukrainian</option>
              </select>
            </div>
          )}
          {!isSelectionMode && (
            <button
              onClick={onStartSelection}
              className="text-xs px-3 py-1 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-600/50 rounded hover:bg-cyan-200 dark:hover:bg-cyan-600/30 transition-colors shadow-sm"
            >
              Select Quotes
            </button>
          )}
          <button
            onClick={onClearAnalysis}
            className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Clear Analysis
          </button>
        </div>
      </div>

      {dialogResults.map(group => (
        <div
          key={group.id}
          className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-400 mb-2">{group.title}</h3>
            {group.analysis && (
              <div className="bg-white dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700/50">
                <ul className="list-disc list-inside space-y-2">
                  {group.analysis.summaryItems.map((item, idx) => {
                    const statementId = `${group.id}:${idx}`;
                    const isSelected = selectedStatements?.has(statementId);
                    const groupId = selectedStatements?.get(statementId) || 1;

                    return (
                      <li
                        key={idx}
                        onClick={() => onSummaryItemClick(group.id, item.timestamp, group.dialogLines)}
                        className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer group hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded transition-colors flex items-start"
                      >
                        {isSelectionMode && (
                          <div className="mr-2 flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelection?.(statementId, groupId)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-white dark:bg-gray-700"
                            />
                            {isSelected && (
                              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded px-1 border border-gray-200 dark:border-gray-600">
                                <button
                                  onClick={() => onGroupChange?.(statementId, Math.max(1, groupId - 1))}
                                  className="px-1 hover:text-gray-900 dark:hover:text-white text-gray-500 dark:text-gray-400 text-xs"
                                >&lt;</button>
                                <span className="text-xs font-mono w-5 text-center text-cyan-700 dark:text-cyan-300 font-bold">{groupId}</span>
                                <button
                                  onClick={() => onGroupChange?.(statementId, groupId + 1)}
                                  className="px-1 hover:text-gray-900 dark:hover:text-white text-gray-500 dark:text-gray-400 text-xs"
                                >&gt;</button>
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-gray-400 dark:text-gray-400 font-mono text-xs mr-2 mt-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors shrink-0">[{item.timestamp}]</span>
                        {item.importance !== undefined && (
                          <div className="flex flex-col w-16 mr-3 mt-1 shrink-0" title={`Importance: ${item.importance}`}>
                            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.importance >= 0.8 ? 'bg-red-500' :
                                  item.importance >= 0.5 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                style={{ width: `${item.importance * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 text-right leading-none mt-0.5">{item.importance.toFixed(2)}</span>
                          </div>
                        )}
                        <span className="group-hover:underline">{item.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {group.dialogLines.map((line, idx) => {
              const lineId = `${group.id}-${idx}-${line.timestamp}`;
              const isHighlighted = highlightedDialogLineId === lineId;
              return (
                <div
                  key={idx}
                  ref={(el) => {
                    if (el) {
                      dialogLineRefs.current.set(lineId, el);
                    }
                  }}
                  className={`flex gap-4 text-sm p-2 rounded transition-all ${isHighlighted
                    ? 'bg-cyan-100 dark:bg-cyan-900/50 border border-cyan-300 dark:border-cyan-500/50 shadow-lg shadow-cyan-500/10 dark:shadow-cyan-500/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                >
                  <div className="w-24 flex-shrink-0 text-right">
                    <span className={`font-mono text-xs block ${isHighlighted ? 'text-cyan-700 dark:text-cyan-400 font-bold' : 'text-gray-500'
                      }`}>
                      {formatTimestamp(line.timestamp)}
                    </span>
                    <span className={`font-bold block truncate ${isHighlighted ? 'text-cyan-600 dark:text-cyan-300' : 'text-purple-600 dark:text-purple-400'
                      }`} title={line.speaker}>
                      {line.speaker}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={isHighlighted ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}>{line.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DialogAnalysisView;
