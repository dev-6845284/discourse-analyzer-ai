import React, { useState } from 'react';
import { Quote, AnalysisCategory, AnalysisResult, AuditCategory } from '../types';
import AnalysisReport from './AnalysisReport';
import { initializeLinksWithSelection, LinkData } from '../utils/linkUtils';
import { RATING_ORDER, SEVERITY_ORDER } from '../constants';
import QuoteTextDisplay from './QuoteCard/QuoteTextDisplay';
import AuditMetadata from './QuoteCard/AuditMetadata';
import QuoteLinksDisplay from './QuoteCard/QuoteLinksDisplay';
import AdvancedAnalysisSection from './QuoteCard/AdvancedAnalysisSection';
import QuoteCardActions from './QuoteCard/QuoteCardActions';
import { isYouTubeUrl } from '../utils/urlHelpers';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quote: Quote, model: string) => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  onAccept?: (quote: Quote) => void;
  onDiscard?: (quote: Quote) => void;
  onDelete?: (quote: Quote) => void;
  onRemove?: (quote: Quote) => void;
  onEditSource?: (quote: Quote) => void;
  isApiKeySet: boolean;
  hideSaveButton?: boolean;
  selectedAI: string;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ 
  quote, 
  onAnalyze, 
  onImprove, 
  onSave, 
  onLanguageChange, 
  onAccept,
  onDiscard,
  onDelete,
  onRemove,
  onEditSource,
  isApiKeySet, 
  hideSaveButton, 
  selectedAI 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analysisContext, setAnalysisContext] = useState(quote.analysisContext || '');
  
  const [links, setLinks] = useState<LinkData[]>(
    initializeLinksWithSelection(quote.links || quote.metadata?.links || [])
  );
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<'quote' | 'context'>('context');
  const [selectedCategories, setSelectedCategories] = useState<(AnalysisCategory | AuditCategory)[]>([]);

  // Sync state with props when quote updates
  React.useEffect(() => {
    setAnalysisContext(quote.analysisContext || '');
    setLinks(initializeLinksWithSelection(quote.links || quote.metadata?.links || []));
    
    // Only use audit format for selection
    if (quote.draft?.audit) {
      const initialSelection = (Object.entries(quote.draft.audit.categories) as [AuditCategory, any][])
        .filter(([_, detail]) => SEVERITY_ORDER[detail.severity] >= SEVERITY_ORDER['MEDIUM'])
        .map(([category]) => category);
      setSelectedCategories(initialSelection);
    }
  }, [quote.analysisContext, quote.links, quote.metadata, quote.draft]);

  const isBusy = quote.isAnalyzing || quote.isImproving;
  const hasDraft = !!quote.draft;
  const displayQuote = hasDraft ? (quote.draft as Quote) : quote;

  const handleSave = () => {
    let filteredAudit: any;
    if (quote.draft?.audit) {
      filteredAudit = {
        ...quote.draft.audit,
        categories: Object.fromEntries(
          Object.entries(quote.draft.audit.categories).filter(([category]) => selectedCategories.includes(category as AuditCategory))
        )
      };
    }
    const newDraft = quote.draft
      ? {
          ...quote.draft,
          ...(filteredAudit ? { audit: filteredAudit } : {}),
        }
      : undefined;
    onSave({ ...quote, analysisContext, links, ...(newDraft ? { draft: newDraft } : {}) });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddLink = () => {
    if (newLinkUrl) {
      // New links are selected by default (user explicitly added them)
      setLinks([...links, { url: newLinkUrl, type: newLinkType, selected: true }]);
      setNewLinkUrl('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleToggleLinkSelection = (index: number) => {
    setLinks(links.map((link, i) => 
      i === index ? { ...link, selected: link.selected === false ? true : false } : link
    ));
  };

  const handleSelectAllLinks = () => {
    setLinks(links.map(link => ({ ...link, selected: true })));
  };

  const handleDeselectAllLinks = () => {
    setLinks(links.map(link => ({ ...link, selected: false })));
  };

  const handleAnalyze = () => {
    // Only include selected links for analysis
    const selectedLinks = links.filter(link => link.selected !== false);
    onAnalyze({ ...quote, analysisContext, links: selectedLinks }, selectedAI);
  };

  const handleToggleCategory = (category: AnalysisCategory | AuditCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category as any) 
        ? prev.filter(c => c !== category as any)
        : [...prev, category as any]
    );
  };

  const handleAccept = () => {
    if (!onAccept || !quote.draft) return;
    let filteredAudit: any;
    if (quote.draft?.audit) {
      filteredAudit = {
        ...quote.draft.audit,
        categories: Object.fromEntries(
          Object.entries(quote.draft.audit.categories).filter(([category]) => selectedCategories.includes(category as AuditCategory))
        )
      };
    }
    const newDraft = quote.draft
      ? {
          ...quote.draft,
          ...(filteredAudit ? { audit: filteredAudit } : {}),
        }
      : undefined;
    onAccept({ ...quote, ...(newDraft ? { draft: newDraft } : {}) });
  };

  return (
    <div className={`relative bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-700/50 hover:shadow-cyan-500/10 ${isCollapsed ? 'py-4 px-6' : 'p-6'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl font-light leading-none z-10"
        aria-label={isCollapsed ? 'Expand quote' : 'Collapse quote'}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '+' : '-'}
      </button>

      {hasDraft && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <div className="text-yellow-500 text-xs font-bold uppercase mb-2">Original Content</div>
          <blockquote className="border-l-4 border-yellow-600 pl-4">
            <p className="text-gray-400 italic text-sm">"{quote.text}"</p>
          </blockquote>
          {quote.analysis && !quote.draft?.analysis && (
             <div className="mt-2 text-xs text-gray-500">Original analysis available</div>
          )}
        </div>
      )}

      <QuoteTextDisplay
        displayQuote={displayQuote}
        quote={quote}
        hasDraft={hasDraft}
        isCollapsed={isCollapsed}
        onLanguageChange={onLanguageChange}
        isBusy={isBusy}
      />
      
      {!isCollapsed && (
        <>
          {displayQuote.audit && (
            <AnalysisReport 
              audit={displayQuote.audit} 
              selectable={hasDraft}
              selectedCategories={selectedCategories as AuditCategory[]}
              onToggleCategory={handleToggleCategory as (category: AuditCategory) => void}
            />
          )}


          <AuditMetadata quote={quote} />

          {/* Display Context & Links (Read-only view) */}
          {!showAdvanced && (quote.analysisContext || (links && links.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-gray-700/30 text-xs">
              {quote.analysisContext && (
                <div className="mb-2">
                  <span className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Context: </span>
                  <span className="text-gray-400 italic">{quote.analysisContext}</span>
                </div>
              )}
              {links && links.length > 0 && <QuoteLinksDisplay links={links} />}
            </div>
          )}

          {/* Advanced Analysis Section */}
          {!hasDraft && (
            <AdvancedAnalysisSection
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
              analysisContext={analysisContext}
              onAnalysisContextChange={setAnalysisContext}
              links={links}
              newLinkUrl={newLinkUrl}
              onNewLinkUrlChange={setNewLinkUrl}
              newLinkType={newLinkType}
              onNewLinkTypeChange={setNewLinkType}
              onAddLink={handleAddLink}
              onRemoveLink={handleRemoveLink}
              onToggleLinkSelection={handleToggleLinkSelection}
              onSelectAllLinks={handleSelectAllLinks}
              onDeselectAllLinks={handleDeselectAllLinks}
            />
          )}

          <QuoteCardActions
            quote={quote}
            hasDraft={hasDraft}
            isApiKeySet={isApiKeySet}
            isBusy={isBusy}
            isSaved={isSaved}
            hideSaveButton={hideSaveButton}
            onAnalyze={handleAnalyze}
            onImprove={() => onImprove(quote)}
            onSave={handleSave}
            onAccept={handleAccept}
            onDiscard={() => onDiscard && onDiscard(quote)}
            onDelete={() => onDelete && onDelete(quote)}
            onRemove={() => onRemove && onRemove(quote)}
            onEditSource={onEditSource && quote.originIds && quote.originIds.length > 0 ? () => onEditSource(quote) : undefined}
          />
        </>
      )}
    </div>
  );
};

export default QuoteCard;