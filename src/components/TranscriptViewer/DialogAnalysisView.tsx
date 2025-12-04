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
  onAnalyzeDialog: () => void;
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
}) => {
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
          <button
            onClick={onAnalyzeDialog}
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
    <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-300">
          Identified <strong>{dialogResults.length}</strong> topic groups
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClearAnalysis}
            className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Clear Analysis
          </button>
        </div>
      </div>

      {dialogResults.map(group => (
        <div
          key={group.id}
          className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden"
        >
          <div className="p-4 bg-gray-900/50 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">{group.title}</h3>
            {group.analysis && (
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700/50">
                <ul className="list-disc list-inside space-y-2">
                  {group.analysis.summaryItems.map((item, idx) => (
                    <li
                      key={idx}
                      onClick={() => onSummaryItemClick(group.id, item.timestamp, group.dialogLines)}
                      className="text-sm text-gray-300 cursor-pointer group hover:text-white hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded transition-colors flex items-start"
                    >
                      <span className="text-gray-400 font-mono text-xs mr-2 mt-0.5 group-hover:text-cyan-400 transition-colors shrink-0">[{item.timestamp}]</span>
                      {item.importance !== undefined && (
                        <div className="flex flex-col w-16 mr-3 mt-1 shrink-0" title={`Importance: ${item.importance}`}>
                          <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.importance >= 0.8 ? 'bg-red-500' :
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
                  ))}
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
                  className={`flex gap-4 text-sm p-2 rounded transition-all ${
                    isHighlighted
                      ? 'bg-cyan-900/50 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  <div className="w-24 flex-shrink-0 text-right">
                    <span className={`font-mono text-xs block ${
                      isHighlighted ? 'text-cyan-400 font-bold' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(line.timestamp)}
                    </span>
                    <span className={`font-bold block truncate ${
                      isHighlighted ? 'text-cyan-300' : 'text-purple-400'
                    }`} title={line.speaker}>
                      {line.speaker}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={isHighlighted ? 'text-white' : 'text-gray-300'}>{line.text}</p>
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
