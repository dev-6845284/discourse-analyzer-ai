import React, { useState } from 'react';
import { LogEntry } from '../../types';
import { useLogs } from '../../hooks/useLogs';
import Spinner from '../ui/Spinner';
import ErrorDisplay from '../results/ErrorDisplay';

interface LogViewerProps {
    logsVisible: boolean;
}

const LogEntryCard: React.FC<{ entry: LogEntry }> = ({ entry }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusClasses = () => {
        if (entry.error) return 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20';
        if (entry.responsePayload) return 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20';
        return 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20';
    };

    const getBadgeClasses = () => {
        if (entry.error) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
        if (entry.responsePayload) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    };

    const getInteractionStatus = (interaction: { responsePayload?: any; error?: any }) => {
        if (interaction.error) return { label: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
        if (interaction.responsePayload) return { label: 'Success', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
    };

    const formatJson = (payload: any, fallback: string) =>
        payload ? JSON.stringify(payload, null, 2) : fallback;

    return (
        <div
            className={`mb-4 border-l-4 rounded-r-lg shadow-sm transition-all duration-300 ${getStatusClasses()}`}
        >
            <div
                className="flex justify-between items-center cursor-pointer p-4"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-base text-gray-900 dark:text-gray-100 truncate">{entry.command}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getBadgeClasses()}`}>
                        {entry.error ? 'Error' : entry.responsePayload ? 'Success' : 'Pending'}
                    </span>
                    <span className={`text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700/50 mt-1 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Request Payload</h4>
                            <pre className="bg-gray-900 dark:bg-black p-3 rounded-lg text-[11px] text-cyan-400/90 overflow-auto max-h-60 border border-gray-800">
                                {JSON.stringify(entry.requestPayload, null, 2)}
                            </pre>
                        </div>
                        <div>
                            {entry.responsePayload && (
                                <>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Response Payload</h4>
                                    <pre className="bg-gray-900 dark:bg-black p-3 rounded-lg text-[11px] text-green-400/90 overflow-auto max-h-60 border border-gray-800">
                                        {JSON.stringify(entry.responsePayload, null, 2)}
                                    </pre>
                                </>
                            )}
                            {entry.error && (
                                <>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 dark:text-red-400 mb-2">Error</h4>
                                    <pre className="bg-red-950/20 dark:bg-red-950/40 p-3 rounded-lg text-[11px] text-red-400 overflow-auto max-h-60 border border-red-900/30">
                                        {JSON.stringify(entry.error, null, 2)}
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                    {entry.modelInteractions && entry.modelInteractions.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                Model Calls ({entry.modelInteractions.length})
                            </h4>
                            <div className="space-y-4">
                                {entry.modelInteractions.map((interaction) => {
                                    const status = getInteractionStatus(interaction);
                                    return (
                                        <div key={interaction.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 overflow-hidden shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {interaction.provider} · <span className="text-cyan-600 dark:text-cyan-400">{interaction.model}</span>
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase">{interaction.operation}</span>
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                                            {new Date(interaction.timestamp).toLocaleTimeString()}
                                                            {interaction.completedAt ? ` → ${new Date(interaction.completedAt).toLocaleTimeString()}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                                                <div className="p-3 border-r border-gray-100 dark:border-gray-800">
                                                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Model Request</p>
                                                    <pre className="bg-gray-50 dark:bg-black/40 p-2 rounded text-[10px] text-gray-700 dark:text-gray-300 overflow-auto max-h-48 border border-gray-100 dark:border-gray-800">
                                                        {formatJson(interaction.requestPayload, 'No request payload recorded.')}
                                                    </pre>
                                                </div>
                                                <div className="p-3">
                                                    {interaction.responsePayload && (
                                                        <div className="mb-0">
                                                            <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Model Response</p>
                                                            <pre className="bg-gray-50 dark:bg-black/40 p-2 rounded text-[10px] text-gray-700 dark:text-gray-300 overflow-auto max-h-48 border border-gray-100 dark:border-gray-800">
                                                                {formatJson(interaction.responsePayload, 'No response payload recorded.')}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {interaction.error && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-red-400 mb-2">Model Error</p>
                                                            <pre className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-[10px] text-red-600 dark:text-red-400 overflow-auto max-h-48 border border-red-100 dark:border-red-900/30">
                                                                {formatJson(interaction.error, 'Error details unavailable.')}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {!interaction.responsePayload && !interaction.error && (
                                                        <div className="flex items-center justify-center h-20">
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 italic animate-pulse">Awaiting model response...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const LogViewer: React.FC<LogViewerProps> = ({ logsVisible }) => {
    const {
        logs,
        isLoading,
        error,
        page,
        totalPages,
        handleNextPage,
        handlePrevPage,
        refreshLogs,
    } = useLogs(logsVisible);

    if (!logsVisible) return null;

    return (
        <div className="bg-white dark:bg-gray-800/40 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
            <div className="flex flex-wrap justify-end items-center mb-6 gap-4">
                <button
                    onClick={refreshLogs}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Refreshing...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh</span>
                        </>
                    )}
                </button>
            </div>

            {isLoading && logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Spinner />
                    <p className="text-gray-400 mt-4 text-sm">Loading logs...</p>
                </div>
            )}

            {error && <div className="mb-6"><ErrorDisplay error={error} rawApiResponseError={null} /></div>}

            {(logs.length > 0 || !isLoading) && (
                <>
                    <div className="space-y-1">
                        {logs.map((entry) => (
                            <LogEntryCard key={entry.id} entry={entry} />
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handlePrevPage}
                            disabled={page <= 1 || isLoading}
                            className="px-4 py-2 text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page</span>
                            <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-md font-bold text-sm">
                                {page} <span className="text-gray-300 dark:text-gray-600 mx-1">/</span> {totalPages}
                            </span>
                        </div>
                        <button
                            onClick={handleNextPage}
                            disabled={page >= totalPages || isLoading}
                            className="px-4 py-2 text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {!isLoading && !error && logs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
                    <p>No interaction logs found.</p>
                </div>
            )}
        </div>
    );
};

export default LogViewer;
