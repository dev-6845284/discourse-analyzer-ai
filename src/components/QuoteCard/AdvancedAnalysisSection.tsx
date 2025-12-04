import React from 'react';

interface LinkData {
  url: string;
  title?: string;
  type: 'quote' | 'context';
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
}) => {
  return (
    <div className="mt-4 border-t border-gray-700/50 pt-2">
      <button
        onClick={onToggleAdvanced}
        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-2"
      >
        {showAdvanced ? '▼ Hide Advanced Analysis' : '▶ Advanced Analysis'}
      </button>

      {showAdvanced && (
        <div className="bg-gray-900/50 p-3 rounded-lg space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Context for Analysis</label>
            <textarea
              value={analysisContext}
              onChange={(e) => onAnalysisContextChange(e.target.value)}
              placeholder="Provide context to help the AI determine truthfulness (e.g., 'This was said during a debate about tax reform...')"
              className="w-full bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Fact-Checking Links</label>
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2 text-xs bg-gray-800 p-1.5 rounded border border-gray-700">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      link.type === 'quote' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
                    }`}
                  >
                    {link.type}
                  </span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 truncate flex-1 hover:underline">
                    {link.url}
                  </a>
                  <button onClick={() => onRemoveLink(index)} className="text-red-400 hover:text-red-300 px-1">
                    ×
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => onNewLinkUrlChange(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-1.5 focus:border-cyan-500"
                />
                <select
                  value={newLinkType}
                  onChange={(e) => onNewLinkTypeChange(e.target.value as 'quote' | 'context')}
                  className="bg-gray-800 text-gray-300 text-xs rounded border border-gray-700 p-1.5"
                >
                  <option value="context">Context</option>
                  <option value="quote">Quote Source</option>
                </select>
                <button
                  onClick={onAddLink}
                  disabled={!newLinkUrl}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50"
                >
                  Add
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
