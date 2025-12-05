import React, { useEffect, useState } from 'react';
import { Play, FileText, AlertCircle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { AnalysisSession } from '../types';
import { getSessions, deleteSession } from '../utils/api';

interface AnalysisSessionsListProps {
  onResume: (session: AnalysisSession) => void;
  refreshTrigger?: number;
}

const ANALYSIS_STAGES = [
  { key: 'extracting_transcript', label: 'Transcript' },
  { key: 'analyzing_topics', label: 'Topics' },
  { key: 'identifying_speakers', label: 'Speakers' },
  { key: 'grouping_dialog', label: 'Statements' },
  { key: 'analyzing_statements', label: 'Analysis' },
];

const STAGE_ORDER: { [key: string]: number } = {
  'created': 0,
  'extracting_transcript': 1,
  'analyzing_topics': 2,
  'identifying_speakers': 3,
  'grouping_dialog': 4,
  'analyzing_statements': 5,
  'completed': 5,
  'failed': -1,
};

export const AnalysisSessionsList: React.FC<AnalysisSessionsListProps> = ({ onResume, refreshTrigger }) => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  const fetchSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteSession(sessionId);
      setSessions(sessions.filter(s => s._id !== sessionId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    }
  };

  const getProgressBar = (status: string) => {
    const currentStage = STAGE_ORDER[status] || 0;
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed';

    return (
      <div className="flex gap-2">
        {ANALYSIS_STAGES.map((stage, index) => {
          const stageNumber = index + 1;
          const isActive = stageNumber === currentStage && !isCompleted;
          const isCompleteStage = stageNumber <= currentStage && (isCompleted || isFailed === false);
          
          return (
            <div key={stage.key} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isFailed
                    ? 'bg-red-600/30 border border-red-500 text-red-300'
                    : isCompleted || (isCompleteStage && currentStage > stageNumber)
                    ? 'bg-green-600 border border-green-500 text-white'
                    : isActive
                    ? 'bg-cyan-600 border border-cyan-400 text-white animate-pulse'
                    : 'bg-gray-700 border border-gray-600 text-gray-400'
                }`}
              >
                {isFailed ? '✕' : isCompleted || (isCompleteStage && currentStage > stageNumber) ? '✓' : stageNumber}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{stage.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 border-t-cyan-500"></div>
        <span className="text-gray-400">Loading sessions...</span>
      </div>
    </div>;
  }

  if (error) {
    return <div className="text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-800">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Analysis Sessions</h2>
      
      {sessions.length === 0 ? (
        <div className="text-gray-400 text-center p-8 bg-gray-800/30 rounded-lg">
          No analysis sessions found. Start a new analysis by searching for a video.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
              {/* Source and Resume Button */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  {session.sourceType === 'youtube' ? <Play size={16} className="text-red-500 flex-shrink-0" /> : <FileText size={16} className="text-blue-500 flex-shrink-0" />}
                  <span className="text-cyan-400 font-medium truncate" title={session.sourceUrl}>
                    {session.sourceUrl}
                  </span>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onResume(session)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >X</button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4 pb-4 border-b border-gray-700">
                {getProgressBar(session.status)}
              </div>

              {/* Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{new Date(session.updatedAt).toLocaleString()}</span>
                </div>
                {session.status === 'failed' && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertCircle size={14} />
                    <span>Failed</span>
                  </div>
                )}
                {session.status === 'completed' && (
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle size={14} />
                    <span>Completed</span>
                  </div>
                )}
              </div>
              
              {session.error && (
                <div className="mt-3 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                  Error: {session.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
