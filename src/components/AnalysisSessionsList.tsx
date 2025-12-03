import React, { useEffect, useState } from 'react';
import { Play, FileText, AlertCircle, Clock, CheckCircle, Loader } from 'lucide-react';
import { AnalysisSession } from '../types';
import { getSessions } from '../utils/api';

interface AnalysisSessionsListProps {
  onResume: (session: AnalysisSession) => void;
}

export const AnalysisSessionsList: React.FC<AnalysisSessionsListProps> = ({ onResume }) => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-500" size={20} />;
      case 'failed': return <AlertCircle className="text-red-500" size={20} />;
      default: return <Loader className="text-cyan-500 animate-spin" size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader className="animate-spin text-cyan-500" size={32} /></div>;
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
        <div className="grid gap-4">
          {sessions.map(session => (
            <div key={session._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {session.sourceType === 'youtube' ? <Play size={16} className="text-red-500" /> : <FileText size={16} className="text-blue-500" />}
                    <span className="text-cyan-400 font-medium truncate max-w-md" title={session.sourceUrl}>
                      {session.sourceUrl}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{new Date(session.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(session.status)}
                      <span className={session.status === 'failed' ? 'text-red-400' : 'text-gray-300'}>
                        {getStatusLabel(session.status)}
                      </span>
                    </div>
                  </div>
                  
                  {session.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      Error: {session.error}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onResume(session)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Resume
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
