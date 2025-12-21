import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { 
  getAdminUsageStats, 
  getAdminSecurityAlerts, 
  getBlockedIPs as fetchBlockedIPs,
  acknowledgeSecurityAlert,
  blockIP,
  unblockIP,
} from '../../utils/api';

interface UsageStats {
  timeRange: {
    hours: number;
    since: string;
    until: string;
  };
  summary: {
    totalRequests: number;
    rateLimitHits: number;
    averageResponseTime: number;
    maxResponseTime: number;
    errorRate: string;
    errorCount: number;
  };
  requestsByEndpoint: Array<{ _id: string; count: number; avgTime: number }>;
  requestsByStatus: Array<{ _id: number; count: number }>;
  requestsByHour: Array<{ _id: string; count: number; errors: number }>;
  topIPs: Array<{ _id: string; count: number; errors: number; rateLimited: number }>;
}

interface SecurityAlert {
  _id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
  acknowledged: boolean;
}

interface BlockedIP {
  _id: string;
  ipAddress: string;
  reason: string;
  blockedAt: string;
  blockedByName?: string;
  expiresAt?: string;
  isAutoBlocked: boolean;
  hitCount: number;
  lastHitAt?: string;
}

interface UsageStatsDashboardProps {
  onClose?: () => void;
}

export const UsageStatsDashboard: React.FC<UsageStatsDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'blocked'>('overview');
  const [timeRange, setTimeRange] = useState<number>(24);
  const { t } = useI18n();
  const [newBlockIP, setNewBlockIP] = useState({ ip: '', reason: '', expiresMinutes: '' });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [statsRes, alertsRes, blockedRes] = await Promise.all([
        getAdminUsageStats(timeRange),
        getAdminSecurityAlerts(50),
        fetchBlockedIPs(),
      ]);

      setStats(statsRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setBlockedIPs(blockedRes.data);
    } catch (err) {
      setError(t('failedToLoadDashboardData'));
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeSecurityAlert(alertId);
      setAlerts(prev => prev.map(a => 
        a._id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await blockIP(
        newBlockIP.ip,
        newBlockIP.reason,
        newBlockIP.expiresMinutes ? parseInt(newBlockIP.expiresMinutes, 10) : undefined
      );
      setNewBlockIP({ ip: '', reason: '', expiresMinutes: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    if (!confirm(`Are you sure you want to unblock ${ip}?`)) return;
    
    try {
      await unblockIP(ip);
      setBlockedIPs(prev => prev.filter(b => b.ipAddress !== ip));
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (status: number) => {
    if (status < 300) return 'text-green-600';
    if (status < 400) return 'text-blue-600';
    if (status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-full md:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Security & Usage Dashboard</h2>
            <p className="text-blue-100 text-sm">Monitor API usage and security events</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-white/20 border border-white/30 rounded px-3 py-1.5 text-sm text-white cursor-pointer hover:bg-white/30 transition-colors [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2 hover:bg-white/20 rounded transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b flex">
          {(['overview', 'alerts', 'blocked'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'alerts' && `🔔 Alerts (${alerts.filter(a => !a.acknowledged).length})`}
              {tab === 'blocked' && `🚫 Blocked IPs (${blockedIPs.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-sm font-medium">Total Requests</div>
                  <div className="text-2xl font-bold text-blue-900">{stats.summary.totalRequests.toLocaleString()}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-yellow-600 text-sm font-medium">Rate Limit Hits</div>
                  <div className="text-2xl font-bold text-yellow-900">{stats.summary.rateLimitHits}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-red-600 text-sm font-medium">Error Rate</div>
                  <div className="text-2xl font-bold text-red-900">{stats.summary.errorRate}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-sm font-medium">Avg Response Time</div>
                  <div className="text-2xl font-bold text-green-900">{stats.summary.averageResponseTime}ms</div>
                </div>
              </div>

              {/* Top Endpoints */}
              <div className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Top Endpoints</h3>
                <div className="space-y-2">
                  {stats.requestsByEndpoint.map((ep) => (
                    <div key={ep._id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                      <span className="font-mono text-sm truncate flex-1 text-slate-700">{ep._id}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-600 font-medium">{ep.count.toLocaleString()} req</span>
                        <span className="text-slate-500">{ep.avgTime?.toFixed(0) || 0}ms avg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Codes & Top IPs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-100 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3">Status Codes</h3>
                  <div className="space-y-2">
                    {stats.requestsByStatus.map((s) => (
                      <div key={s._id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                        <span className={`font-mono font-medium ${getStatusColor(s._id)}`}>{s._id}</span>
                        <span className="text-slate-700 font-medium">{s.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-800 mb-3">Top IPs</h3>
                  <div className="space-y-2 text-sm">
                    {stats.topIPs.map((ip) => (
                      <div key={ip._id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                        <span className="font-mono truncate text-slate-700">{ip._id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-medium">{ip.count}</span>
                          {ip.errors > 0 && (
                            <span className="text-red-600 text-xs font-medium">({ip.errors} err)</span>
                          )}
                          {ip.rateLimited > 0 && (
                            <span className="text-amber-700 text-xs bg-amber-100 px-1.5 py-0.5 rounded font-medium">RL</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Requests Over Time */}
              <div className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Requests Over Time</h3>
                <div className="flex items-end gap-1 h-32">
                  {stats.requestsByHour.slice(-24).map((hour, i) => {
                    const maxCount = Math.max(...stats.requestsByHour.map(h => h.count));
                    const height = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={hour._id}
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${hour._id}: ${hour.count} requests, ${hour.errors} errors`}
                      >
                        {hour.errors > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-red-500 rounded-t"
                            style={{ height: `${(hour.errors / hour.count) * 100}%` }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Showing last {Math.min(24, stats.requestsByHour.length)} hours
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  No security alerts
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} ${
                      alert.acknowledged ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                            alert.severity === 'critical' ? 'bg-red-600 text-white' :
                            alert.severity === 'high' ? 'bg-orange-600 text-white' :
                            alert.severity === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-sm font-medium">{alert.type.replace(/_/g, ' ')}</span>
                          {alert.acknowledged && (
                            <span className="text-xs text-gray-500">{t('acknowledgedLabel')}</span>
                          )}
                        </div>
                        <p className="mt-1">{alert.message}</p>
                        {alert.ipAddress && (
                          <p className="text-sm mt-1">IP: <code className="bg-white/50 px-1 rounded">{alert.ipAddress}</code></p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert._id)}
                          className="ml-4 px-3 py-1 bg-white/50 hover:bg-white rounded text-sm"
                        >
                          {t('acknowledge')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'blocked' && (
            <div className="space-y-6">
              {/* Block IP Form */}
              <form onSubmit={handleBlockIP} className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">{t('blockIPTitle')}</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={t('ipAddressPlaceholder')}
                    value={newBlockIP.ip}
                    onChange={(e) => setNewBlockIP(prev => ({ ...prev, ip: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder={t('reasonPlaceholder')}
                    value={newBlockIP.reason}
                    onChange={(e) => setNewBlockIP(prev => ({ ...prev, reason: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder={t('expiresPlaceholder')}
                    value={newBlockIP.expiresMinutes}
                    onChange={(e) => setNewBlockIP(prev => ({ ...prev, expiresMinutes: e.target.value }))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium transition-colors"
                  >
                    {t('block')}
                  </button>
                </div>
              </form>

              {/* Blocked IPs List */}
              <div className="space-y-2">
                {blockedIPs.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    {t('noBlockedIPs')}
                  </div>
                ) : (
                  blockedIPs.map((ip) => (
                    <div key={ip._id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-lg text-slate-800">{ip.ipAddress}</code>
                          {ip.isAutoBlocked && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">Auto-blocked</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{ip.reason}</p>
                        <div className="text-xs text-slate-500 mt-1 flex gap-4">
                          <span>Blocked: {new Date(ip.blockedAt).toLocaleString()}</span>
                          {ip.blockedByName && <span>By: {ip.blockedByName}</span>}
                          {ip.expiresAt && <span>Expires: {new Date(ip.expiresAt).toLocaleString()}</span>}
                          <span>Hits: {ip.hitCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockIP(ip.ipAddress)}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded border border-red-300 font-medium transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageStatsDashboard;
