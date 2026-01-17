import React, { useEffect, useState } from 'react';
import { getAdminDashboardSummary } from '../../utils/api';

/**
 * AdminAlertBanner
 *
 * Purpose: Displays a compact, persistent banner for administrators that summarizes
 * key security/health metrics from the admin dashboard (alerts, rate limits, blocked IPs, etc.).
 *
 * Behavior:
 * - Fetches summary data via `getAdminDashboardSummary()` when the component mounts
 *   and refreshes it on a 2-minute interval.
 * - Renders a collapsible banner fixed to the top of the viewport. When collapsed,
 *   a small badge remains visible for quick access.
 * - Uses visual severity (colors and icons) to draw attention to critical issues.
 * - Honors `isAdmin` prop and renders nothing for non-admin users.
 *
 * Props:
 * - `isAdmin`: whether the current user is an admin (required to display the banner)
 * - `onViewDashboard`: optional callback to open the full dashboard
 * - `isCollapsed` / `onCollapsedChange`: optional controlled collapse state
 *
 * Note: This is a purely client-side UI helper; it relies on a backend endpoint
 * to supply the summary data.
 */

interface DashboardSummary {
  unacknowledgedAlerts: number;
  criticalAlerts: number;
  rateLimitHitsLastHour: number;
  blockedIPCount: number;
  requestsLastHour: number;
  publicQuotesCount: number;
  hasIssues: boolean;
}

interface AdminAlertBannerProps {
  isAdmin: boolean;
  onViewDashboard?: () => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const AdminAlertBanner: React.FC<AdminAlertBannerProps> = ({
  isAdmin,
  onViewDashboard,
  isCollapsed: externalCollapsed,
  onCollapsedChange,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = (collapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(collapsed);
    } else {
      setInternalCollapsed(collapsed);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const response = await getAdminDashboardSummary();
        setSummary(response.data);
        setError(null);
      } catch (err: unknown) {
        const axiosError = err as { response?: { status: number } };
        if (axiosError.response?.status !== 403) {
          console.error('Failed to fetch dashboard summary:', err);
          setError('Failed to load security summary');
        }
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
    // Show minimal indicator when collapsed - always visible for quick access
    return (
      <div
        className="fixed top-0 right-4 z-50 cursor-pointer"
        onClick={() => setIsCollapsed(false)}
        title="Click to expand security dashboard"
      >
        <div className={`px-3 py-1.5 rounded-b-lg shadow-lg ${summary.criticalAlerts > 0
          ? 'bg-red-600 hover:bg-red-500'
          : summary.hasIssues
            ? 'bg-yellow-600 hover:bg-yellow-500'
            : 'bg-blue-600 hover:bg-blue-500'
          } text-white text-sm flex items-center gap-2 transition-colors`}>
          {summary.criticalAlerts > 0 && <span className="animate-pulse">🚨</span>}
          {summary.criticalAlerts === 0 && summary.hasIssues && <span>⚠️</span>}
          {summary.criticalAlerts === 0 && !summary.hasIssues && <span>📊</span>}
          <span className="font-medium">{summary.unacknowledgedAlerts} alerts</span>
          <span className="opacity-75">|</span>
          <span className="opacity-75">{summary.requestsLastHour} req/h ({summary.publicQuotesCount} public)</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
              <div className="flex items-center gap-1.5 opacity-75 text-green-200">
                <span className="font-semibold">{summary.publicQuotesCount}</span>
                <span>public quotes</span>
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
