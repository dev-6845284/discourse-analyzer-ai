import React, { useEffect, useState } from 'react';

interface DashboardSummary {
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  rateLimitHitsLastHour: number;
  blockedIPCount: number;
  requestsLastHour: number;
  hasIssues: boolean;
}

interface AdminAlertBannerProps {
  isAdmin: boolean;
  onViewDashboard?: () => void;
}

export const AdminAlertBanner: React.FC<AdminAlertBannerProps> = ({ 
  isAdmin, 
  onViewDashboard 
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/dashboard-summary', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
          setError(null);
        } else if (response.status !== 403) {
          setError('Failed to load security summary');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard summary:', err);
        setError('Failed to load security summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
    // Refresh every 2 minutes
    const interval = setInterval(fetchSummary, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin || !summary) return null;
  if (isCollapsed) {
    // Show minimal indicator when collapsed
    if (!summary.hasIssues && summary.unacknowledgedAlerts === 0) return null;
    
    return (
      <div 
        className="fixed top-0 right-4 z-50 cursor-pointer"
        onClick={() => setIsCollapsed(false)}
      >
        <div className={`px-3 py-1 rounded-b-lg shadow-lg ${
          summary.criticalAlerts > 0 
            ? 'bg-red-600' 
            : summary.hasIssues 
              ? 'bg-yellow-600' 
              : 'bg-blue-600'
        } text-white text-sm flex items-center gap-2`}>
          <span className="animate-pulse">●</span>
          <span>{summary.unacknowledgedAlerts} alerts</span>
        </div>
      </div>
    );
  }

  const getSeverityStyle = () => {
    if (summary.criticalAlerts > 0) {
      return 'bg-red-600 border-red-700';
    }
    if (summary.hasIssues) {
      return 'bg-yellow-600 border-yellow-700';
    }
    return 'bg-blue-600 border-blue-700';
  };

  const getSeverityIcon = () => {
    if (summary.criticalAlerts > 0) {
      return '🚨';
    }
    if (summary.hasIssues) {
      return '⚠️';
    }
    return '📊';
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getSeverityStyle()} text-white shadow-lg border-b-2`}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl">{getSeverityIcon()}</span>
            <div className="flex items-center gap-6 text-sm">
              {summary.criticalAlerts > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-red-200">
                    {summary.criticalAlerts}
                  </span>
                  <span>critical alerts</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{summary.unacknowledgedAlerts}</span>
                <span>unacknowledged alerts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{summary.rateLimitHitsLastHour}</span>
                <span>rate limits hit (1h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{summary.blockedIPCount}</span>
                <span>blocked IPs</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-75">
                <span className="font-semibold">{summary.requestsLastHour}</span>
                <span>requests (1h)</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onViewDashboard && (
              <button
                onClick={onViewDashboard}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
              >
                View Dashboard
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-1 text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAlertBanner;
