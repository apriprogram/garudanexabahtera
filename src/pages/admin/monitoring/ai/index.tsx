import { useState, useEffect } from 'react';
import {
  Brain,
  Database,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { monitorAPI, formatNumber, formatDate } from '../../../../lib/monitor-api';

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon className="w-20 h-20" color={color} />
    </div>
    <div className="relative z-10">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <p className="text-slate-500 text-xs mt-1">{subValue}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isSuccess = status === 'success' || status === 'completed';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isSuccess
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-rose-500/10 text-rose-400'
      }`}
    >
      {isSuccess ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
};

const emptyState = (icon: any, message: string) => (
  <div className="p-10 text-center">
    <div className="inline-flex p-3 rounded-full bg-slate-800/50 text-slate-500 mb-2">
      {icon}
    </div>
    <p className="text-slate-500">{message}</p>
  </div>
);

const AiMonitoring = () => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        monitorAPI('get_monitor_ai_stats'),
        monitorAPI('get_monitor_ai_logs'),
      ]);
      setStats(statsRes);
      setLogs(Array.isArray(logsRes) ? logsRes : logsRes?.data || []);
    } catch (err) {
      console.error('AI monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const usage = stats?.usage || [];
  const byWebsite = stats?.byWebsite || [];

  // Aggregate totals from usage array
  const totalTokens = usage.reduce((sum: number, m: any) => sum + (m.tokens || 0), 0);
  const totalCost = usage.reduce((sum: number, m: any) => sum + (m.cost || 0), 0);
  const totalRequests = usage.reduce((sum: number, m: any) => sum + (m.count || 0), 0);
  // Error count — either from stats itself or sum over usage
  const errorCount = stats?.error_count || (stats?.errors ?? 0);
  const websiteTokens = byWebsite.reduce((sum: number, w: any) => sum + (w.tokens || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="text-primary" /> AI Monitoring
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Updates Every 30s
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tokens (Today)"
          value={formatNumber(totalTokens)}
          subValue={`Across ${usage.length} model(s)`}
          icon={Database}
          color="#3b82f6"
        />
        <StatCard
          title="Total Cost"
          value={`Rp ${totalCost.toLocaleString('id-ID')}`}
          subValue="Estimated today"
          icon={DollarSign}
          color="#22c55e"
        />
        <StatCard
          title="Total Requests"
          value={formatNumber(totalRequests)}
          subValue="Today"
          icon={Activity}
          color="#a855f7"
        />
        <StatCard
          title="Error Count"
          value={formatNumber(errorCount)}
          subValue={
            totalRequests > 0
              ? `${((errorCount / totalRequests) * 100).toFixed(1)}% error rate`
              : 'No requests'
          }
          icon={XCircle}
          color="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Model Table */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="w-4.5 h-4.5 text-primary" /> Usage by Model
            </h3>
          </div>
          {usage.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left p-4 font-medium">Model</th>
                    <th className="text-right p-4 font-medium">Tokens</th>
                    <th className="text-right p-4 font-medium">Cost (Rp)</th>
                    <th className="text-right p-4 font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((m: any, i: number) => (
                    <tr
                      key={m.model || i}
                      className={`border-b border-slate-800/50 ${
                        i % 2 === 0 ? 'bg-slate-800/10' : ''
                      } hover:bg-slate-700/20 transition-colors`}
                    >
                      <td className="p-4 text-white font-medium">{m.model}</td>
                      <td className="p-4 text-right text-slate-300">
                        {formatNumber(m.tokens || 0)}
                      </td>
                      <td className="p-4 text-right text-emerald-400">
                        {((m.cost || 0) * 1).toLocaleString('id-ID', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="p-4 text-right text-slate-300">
                        {formatNumber(m.count || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            emptyState(<Database className="w-6 h-6" />, 'No usage data available')
          )}
        </div>

        {/* Usage by Website Table */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-primary" /> Usage by Website
            </h3>
          </div>
          {byWebsite.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left p-4 font-medium">Website</th>
                    <th className="text-right p-4 font-medium">Tokens</th>
                    <th className="text-right p-4 font-medium">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byWebsite.map((w: any, i: number) => (
                    <tr
                      key={w.website || i}
                      className={`border-b border-slate-800/50 ${
                        i % 2 === 0 ? 'bg-slate-800/10' : ''
                      } hover:bg-slate-700/20 transition-colors`}
                    >
                      <td className="p-4 text-white font-medium">{w.website}</td>
                      <td className="p-4 text-right text-slate-300">
                        {formatNumber(w.tokens || 0)}
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        {websiteTokens > 0
                          ? `${((w.tokens / websiteTokens) * 100).toFixed(1)}%`
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            emptyState(<Activity className="w-6 h-6" />, 'No website usage data available')
          )}
        </div>
      </div>

      {/* Recent AI Logs */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-primary" /> Recent AI Logs
          </h3>
          {logs.length > 0 && (
            <span className="text-xs text-slate-500">{logs.length} entries</span>
          )}
        </div>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Time</th>
                  <th className="text-left p-4 font-medium">Model</th>
                  <th className="text-right p-4 font-medium">Tokens</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => (
                  <tr
                    key={log.id || i}
                    className={`border-b border-slate-800/50 ${
                      i % 2 === 0 ? 'bg-slate-800/10' : ''
                    } hover:bg-slate-700/20 transition-colors`}
                  >
                    <td className="p-4 text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(log.created_at || log.time)}
                    </td>
                    <td className="p-4 text-white font-medium">
                      {log.model || '-'}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {formatNumber(log.total_tokens || log.tokens || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={log.status || 'unknown'} />
                    </td>
                    <td className="p-4 text-right text-slate-400">
                      {log.duration || log.response_time_ms
                        ? log.duration
                          ? `${(log.duration / 1000).toFixed(1)}s`
                          : `${log.response_time_ms}ms`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          emptyState(<Clock className="w-6 h-6" />, 'No AI logs recorded yet')
        )}
      </div>
    </div>
  );
};

export default AiMonitoring;
