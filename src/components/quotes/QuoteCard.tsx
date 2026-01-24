import React, { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Quote, AnalysisCategory, AnalysisResult, AuditCategory } from '../../types';
import { useI18n } from '../../i18n';
import AnalysisReport from '../analysis/AnalysisReport';
import { initializeLinksWithSelection, LinkData } from '../../utils/linkUtils';
import { RATING_ORDER, SEVERITY_ORDER } from '../../constants';
import QuoteTextDisplay from './QuoteCard/QuoteTextDisplay';
import AuditMetadata from './QuoteCard/AuditMetadata';
import QuoteLinksDisplay from './QuoteCard/QuoteLinksDisplay';
import AdvancedAnalysisSection from './QuoteCard/AdvancedAnalysisSection';
import QuoteCardActions from './QuoteCard/QuoteCardActions';
import { isYouTubeUrl } from '../../utils/urlHelpers';

interface QuoteCardProps {
  quote: Quote;
  onAnalyze: (quote: Quote, model: string, analysisType?: 'audit' | 'flaws') => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  onAccept?: (quote: Quote) => void;
  onDiscard?: (quote: Quote) => void;
  onDelete?: (quote: Quote) => void;
  onRemove?: (quote: Quote) => void;
  onEdit?: (quote: Quote) => void;

  isApiKeySet: boolean;
  hideSaveButton?: boolean;
  selectedAI: string;
  userRole?: string;
  onVisibilityChange?: (quoteId: string, visibility: 'public' | 'private') => void;
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
  onEdit,
  isApiKeySet,
  hideSaveButton,
  selectedAI,
  userRole,
  onVisibilityChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [analysisContext, setAnalysisContext] = useState(quote.analysisContext || '');

  const [links, setLinks] = useState<LinkData[]>(
    initializeLinksWithSelection(quote.links || quote.metadata?.links || [])
  );
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<'quote' | 'context'>('context');
  const { t } = useI18n();
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

  const handleAnalyze = (model: string, analysisType: 'audit' | 'flaws' = 'audit') => {
    // Only include selected links for analysis
    const selectedLinks = links.filter(link => link.selected !== false);
    onAnalyze({ ...quote, analysisContext, links: selectedLinks }, model, analysisType || 'audit');
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
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-cyan-500/10 border border-gray-100 dark:border-transparent ${isCollapsed ? 'py-4 px-6' : 'p-6'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-3 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-light leading-none z-10"
        aria-label={isCollapsed ? t('expandQuote') : t('collapseQuote')}
        title={isCollapsed ? t('expand') : t('collapse')}
      >
        {isCollapsed ? '+' : '-'}
      </button>



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
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
              <button
                onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                className="w-full flex items-center justify-between group bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all mb-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${isAnalysisExpanded ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} transition-colors`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                    {t('auditReport')}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-gray-400 group-hover:text-cyan-500 transition-colors">
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAnalysisExpanded ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                  </span>
                  {isAnalysisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isAnalysisExpanded && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <AnalysisReport
                    audit={displayQuote.audit}
                    selectable={hasDraft}
                    selectedCategories={selectedCategories as AuditCategory[]}
                    onToggleCategory={handleToggleCategory as (category: AuditCategory) => void}
                  />
                </div>
              )}
            </div>
          )}


          <AuditMetadata quote={quote} />

          {/* Display Context & Links (Read-only view) */}
          {!showAdvanced && (quote.analysisContext || (links && links.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/30 text-xs">
              {quote.analysisContext && (
                <div className="mb-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700/30">
                  <button
                    onClick={() => setIsContextExpanded(!isContextExpanded)}
                    className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group gap-3"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider text-[10px] shrink-0">
                        {t('contextLabel') || 'Context'}
                      </span>
                      {!isContextExpanded && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs italic truncate">
                          {quote.analysisContext}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-500 transition-colors shrink-0">
                      {isContextExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </button>
                  {isContextExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700/50">
                      <span className="text-gray-600 dark:text-gray-400 text-xs italic block mt-1">
                        {quote.analysisContext}
                      </span>
                    </div>
                  )}
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
            selectedAI={selectedAI}
            userRole={userRole}
            onAnalyze={handleAnalyze}
            onImprove={() => onImprove(quote)}
            onSave={handleSave}
            onAccept={handleAccept}
            onDiscard={() => onDiscard && onDiscard(quote)}
            onDelete={() => onDelete && onDelete(quote)}
            onRemove={() => onRemove && onRemove(quote)}
            onEdit={() => onEdit && onEdit(quote)}

            onVisibilityChange={onVisibilityChange}
          />
        </>
      )}
    </div>
  );
};

export default QuoteCard;