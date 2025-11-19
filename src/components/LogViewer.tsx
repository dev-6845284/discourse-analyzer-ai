import React, { useState } from 'react';
import { LogEntry } from '../types';
import { useLogs } from '../hooks/useLogs';
import Spinner from './Spinner';
import ErrorDisplay from './results/ErrorDisplay';

interface LogViewerProps {
  logsVisible: boolean;
}

const LogEntryCard: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    if (entry.error) return 'bg-red-200 dark:bg-red-800';
    if (entry.responsePayload) return 'bg-green-200 dark:bg-green-800';
    return 'bg-yellow-200 dark:bg-yellow-700';
  };

  const getInteractionStatus = (interaction: { responsePayload?: any; error?: any }) => {
    if (interaction.error) return { label: 'Error', color: 'bg-red-500 text-white' };
    if (interaction.responsePayload) return { label: 'Success', color: 'bg-green-500 text-white' };
    return { label: 'Pending', color: 'bg-yellow-500 text-white' };
  };

  const formatJson = (payload: any, fallback: string) =>
    payload ? JSON.stringify(payload, null, 2) : fallback;

  return (
    <div
      className={`mb-4 p-4 rounded-lg shadow-md transition-all duration-300 ${getStatusColor()}`}
    >
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{entry.command}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              entry.error
                ? 'bg-red-500 text-white'
                : entry.responsePayload
                ? 'bg-green-500 text-white'
                : 'bg-yellow-500 text-white'
            }`}
          >
            {entry.error ? 'Error' : entry.responsePayload ? 'Success' : 'Pending'}
          </span>
          <span className="ml-4 text-xl text-gray-700 dark:text-gray-300">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-md mb-2 text-gray-800 dark:text-gray-200">Request Payload</h4>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md text-xs overflow-auto max-h-60">
                {JSON.stringify(entry.requestPayload, null, 2)}
              </pre>
            </div>
            <div>
              {entry.responsePayload && (
                <>
                  <h4 className="font-semibold text-md mb-2 text-gray-800 dark:text-gray-200">Response Payload</h4>
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md text-xs overflow-auto max-h-60">
                    {JSON.stringify(entry.responsePayload, null, 2)}
                  </pre>
                </>
              )}
              {entry.error && (
                <>
                  <h4 className="font-semibold text-md mb-2 text-red-600 dark:text-red-400">Error</h4>
                  <pre className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-xs overflow-auto max-h-60">
                    {JSON.stringify(entry.error, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
          {entry.modelInteractions && entry.modelInteractions.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-md mb-3 text-gray-800 dark:text-gray-200">
                Model Calls ({entry.modelInteractions.length})
              </h4>
              <div className="space-y-3">
                {entry.modelInteractions.map((interaction) => {
                  const status = getInteractionStatus(interaction);
                  return (
                    <div key={interaction.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white/70 dark:bg-gray-900/50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {interaction.provider} · {interaction.model}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{interaction.operation}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(interaction.timestamp).toLocaleString()}
                            {interaction.completedAt ? ` → ${new Date(interaction.completedAt).toLocaleTimeString()}` : ''}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Model Request</p>
                          <pre className="bg-gray-100 dark:bg-gray-950 p-2 rounded text-[11px] overflow-auto max-h-48">
                            {formatJson(interaction.requestPayload, 'No request payload recorded.')}
                          </pre>
                        </div>
                        <div>
                          {interaction.responsePayload && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Model Response</p>
                              <pre className="bg-gray-100 dark:bg-gray-950 p-2 rounded text-[11px] overflow-auto max-h-48">
                                {formatJson(interaction.responsePayload, 'No response payload recorded.')}
                              </pre>
                            </div>
                          )}
                          {interaction.error && (
                            <div>
                              <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Model Error</p>
                              <pre className="bg-red-100 dark:bg-red-950 p-2 rounded text-[11px] overflow-auto max-h-48">
                                {formatJson(interaction.error, 'Error details unavailable.')}
                              </pre>
                            </div>
                          )}
                          {!interaction.responsePayload && !interaction.error && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">Awaiting model response...</p>
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
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">AI Interaction Logs</h2>
        <button
          onClick={refreshLogs}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorDisplay error={error} rawApiResponseError={null} />}

      {!isLoading && !error && (
        <>
          {logs.map((entry) => (
            <LogEntryCard key={entry.id} entry={entry} />
          ))}

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1 || isLoading}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages || isLoading}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LogViewer;
