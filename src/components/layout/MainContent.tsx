import React from 'react';
import StoredQuotes from '../quotes/StoredQuotes';
import TranscriptViewer from '../transcript/TranscriptViewer';
import { useI18n } from '../../i18n';
import { SearchResults } from '../results/SearchResults';
import { UserManager } from '../users/UserManager';
import LogViewer from '../admin/LogViewer';
import AccessControlManagement from '../admin/AccessControlManagement';
import AdminCategories from '../admin/AdminCategories';
import KeysetManagement from '../admin/KeysetManagement';
import { Globe } from 'lucide-react';

interface MainContentProps {
    activeTab: 'search' | 'people' | 'users' | 'sessions' | 'admin';
    setActiveTab: (tab: 'search' | 'people' | 'users' | 'sessions' | 'admin') => void;
    resultsTab: 'new' | 'stored' | 'transcript';
    setResultsTab: (tab: 'new' | 'stored' | 'transcript') => void;
    adminView?: 'users' | 'categories' | 'logs' | 'management' | 'keysets' | null;
    setAdminView?: (v: 'users' | 'categories' | 'logs' | 'management' | 'keysets' | null) => void;
    statusFilters: {
        isAnalyzed: 'all' | 'true' | 'false';
        setIsAnalyzed: (value: 'all' | 'true' | 'false') => void;
        isImproved: 'all' | 'true' | 'false';
        setIsImproved: (value: 'all' | 'true' | 'false') => void;
    };
    transcriptData: any | null;
    selectedPerson: any | null;
    setSelectedPerson: (p: any | null) => void;

    // Quote state
    quotes: any[];
    articles: any[];
    isLoading: boolean;
    error: string | null;
    rawApiResponseError: any;
    filteredAndSortedQuotes: any[];
    sortOrder: any;
    setSortOrder: (s: any) => void;

    // handlers
    onClearQuotes: () => void;
    onAnalyze: (q: any, model: string, analysisType?: 'audit' | 'flaws') => Promise<void> | void;
    onImprove: (q: any) => void;
    onSave: (q: any) => void;
    onLanguageChange: (q: any, code: string) => void;
    onAccept: (q: any) => void;
    onDiscard: (q: any) => void;
    onRemove: (q: any) => void;
    clearError: () => void;

    onResumeSession: (session: any) => void;
    onStoredPromoteSuccess: () => void;
    onExport?: () => void;
    onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    openAdminCategories?: () => void;
    logsVisible?: boolean;
    setLogsVisible?: (v: boolean) => void;
    onPublicView?: () => void;
    selectedAI: string;
    userRole?: string;
    storedQuotesRefreshTrigger?: number;
}

export const MainContent: React.FC<MainContentProps> = ({
    activeTab,
    setActiveTab,
    resultsTab,
    setResultsTab,
    adminView,
    setAdminView,
    statusFilters,
    transcriptData,
    selectedPerson,
    setSelectedPerson,
    articles,
    error,
    rawApiResponseError,
    filteredAndSortedQuotes,
    sortOrder,
    setSortOrder,
    onClearQuotes,
    onAnalyze,
    onImprove,
    onSave,
    onLanguageChange,
    onAccept,
    onDiscard,
    onRemove,
    clearError,

    onStoredPromoteSuccess,
    onExport,
    onImport,
    selectedAI,
    openAdminCategories,
    logsVisible,
    setLogsVisible,
    userRole,
    onPublicView,
    storedQuotesRefreshTrigger,
}) => {
    const { t } = useI18n();

    return (
        <div className="md:col-span-2 space-y-6 min-w-0 w-full mobile:w-[100vw] mobile:max-w-[100vw] mobile:box-border">
            <>
                <div className="flex items-center justify-between mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <div className="flex space-x-1 flex-1">
                        {activeTab !== 'admin' ? (
                            <>
                                {userRole !== 'viewer' && (
                                    <button
                                        onClick={() => setResultsTab('new')}
                                        className={`py-2 px-1 text-sm font-medium rounded-md transition-colors ${resultsTab === 'new'
                                            ? 'bg-cyan-600 text-white shadow'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {t('searchResultsTab')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setResultsTab('stored')}
                                    className={`py-2 px-1 text-sm font-medium rounded-md transition-colors ${resultsTab === 'stored'
                                        ? 'bg-cyan-600 text-white shadow'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {t('storedQuotesTab')}
                                </button>
                                {transcriptData && (
                                    <button
                                        onClick={() => setResultsTab('transcript')}
                                        className={`py-2 px-1 text-sm font-medium rounded-md transition-colors ${resultsTab === 'transcript'
                                            ? 'bg-cyan-600 text-white shadow'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {t('transcriptTab')}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex-1">
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className="py-2 px-3 text-sm font-medium rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    {t('backToQuotes') || 'Back to Quotes'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                        {onPublicView && (
                            <button
                                onClick={onPublicView}
                                className="p-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-md transition-colors border border-gray-200 dark:border-transparent"
                                title={t('public_landing_title')}
                            >
                                <Globe className="w-5 h-5" />
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => setActiveTab(activeTab === 'admin' ? 'search' : 'admin')}
                                className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'admin' ? 'bg-cyan-600 text-white shadow' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-transparent'
                                    }`}
                            >
                                {t('adminActions') || 'Admin Actions'}
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'admin' ? (
                    <div>
                        {adminView === 'users' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-between items-center border border-gray-100 dark:border-transparent">
                                    <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('userManagement')}</h3>
                                </div>
                                <UserManager />
                            </div>
                        ) : adminView === 'logs' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-between items-center border border-gray-100 dark:border-transparent">
                                    <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('analysis_logs')}</h3>
                                </div>
                                <LogViewer logsVisible={true} />
                            </div>
                        ) : adminView === 'management' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center border border-gray-100 dark:border-transparent">
                                    <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('api_management')}</h3>
                                </div>
                                <AccessControlManagement onClose={() => setAdminView && setAdminView(null)} inline />
                            </div>
                        ) : adminView === 'categories' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center border border-gray-100 dark:border-transparent">
                                    <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('analysisCategories')}</h3>
                                </div>
                                <AdminCategories />
                            </div>
                        ) : adminView === 'keysets' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center border border-gray-100 dark:border-transparent">
                                    <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('keyset_title')}</h3>
                                </div>
                                <KeysetManagement />
                            </div>
                        ) : (
                            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300">
                                <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{t('adminActions') || 'Admin actions'}</h3>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('adminPlaceholder') || 'Admin tools and management will be available here.'}</div>
                            </div>
                        )}
                    </div>
                ) : resultsTab === 'transcript' ? (
                    transcriptData && (
                        <TranscriptViewer
                            segments={transcriptData.segments}
                            videoId={transcriptData.videoId}
                            languageCode={transcriptData.languageCode}
                            isAutoGenerated={transcriptData.isAutoGenerated}
                            sessionId={transcriptData.sessionId}
                            initialSessionData={transcriptData.initialSessionData}
                            onSessionCreated={transcriptData.onSessionCreated}
                            onPromoteSuccess={onStoredPromoteSuccess}
                        />
                    )
                ) : resultsTab === 'stored' ? (
                    <div className="space-y-4">
                        {selectedPerson && (
                            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg flex justify-between items-center border border-gray-200 dark:border-transparent">
                                <span className="text-gray-600 dark:text-gray-300">
                                    {t('filteredBy', { name: selectedPerson.name })}
                                </span>
                                <button
                                    onClick={() => setSelectedPerson(null)}
                                    className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline"
                                >
                                    {t('clearFilter')}
                                </button>
                            </div>
                        )}
                        <StoredQuotes
                            selectedPerson={selectedPerson}
                            selectedAI={selectedAI}
                            isApiKeySet={true}

                            userRole={userRole}
                            refreshTrigger={storedQuotesRefreshTrigger}
                            onImport={onImport}
                            onExport={onExport}
                        />
                    </div>
                ) : (
                    articles.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-cyan-400">{t('foundArticles', { count: articles.length })}</h3>
                                <button
                                    onClick={() => onClearQuotes()} // Reusing clear quotes to clear results
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    {t('clearResults')}
                                </button>
                            </div>
                            {articles.map((article, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-cyan-500/50 transition-colors">
                                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium text-lg block mb-2">
                                        {article.title}
                                    </a>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{article.summary}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {article.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full border border-gray-200 dark:border-gray-600">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                                        <span>{t('relevance')}: {(article.relevanceScore * 100).toFixed(0)}%</span>
                                        {article.publishedDate && <span>{article.publishedDate}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : userRole === 'viewer' ? (
                        <div className="space-y-4">
                            <StoredQuotes
                                selectedPerson={selectedPerson}
                                selectedAI={selectedAI}
                                isApiKeySet={true}

                                userRole={userRole}
                                refreshTrigger={storedQuotesRefreshTrigger}
                                onImport={onImport}
                                onExport={onExport}
                            />
                        </div>
                    ) : (
                        <SearchResults
                            results={filteredAndSortedQuotes}
                            error={error}
                            rawApiResponseError={rawApiResponseError}
                            personName={''}
                            sortOrder={sortOrder}
                            setSortOrder={setSortOrder}
                            onClear={onClearQuotes}
                            onAnalyze={onAnalyze}
                            onImprove={onImprove}
                            onSave={onSave}
                            onLanguageChange={onLanguageChange}
                            onAccept={onAccept}
                            onDiscard={onDiscard}
                            onRemove={onRemove}
                            clearError={clearError}
                            selectedAI={selectedAI}
                            statusFilters={statusFilters}
                            onExport={onExport}
                            onImport={onImport}
                            userRole={userRole}
                        />
                    )
                )}
            </>
        </div>
    );
};

export default MainContent;
