import { useState, useEffect } from 'react';
import {
  AlertTriangle, AlertCircle, Bug, Server, Database, Globe, Cpu,
  Search, X, CheckCircle, RefreshCw, Filter
} from 'lucide-react';

interface ErrorEntry {
  id: number;
  source: string;
  severity: string;
  category: string;
  message: string;
  solution: string;
  is_resolved: number;
  created_at: string;
}

const ErrorCenter = () => {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);

  const fetchErrors = async () => {
    try {
      const res = await fetch('/api.php?action=get_error_center');
      const data = await res.json();
      setErrors(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchErrors(); const t = setInterval(fetchErrors, 30000); return () => clearInterval(t); }, []);

  const handleResolve = async (id: number) => {
    setResolving(id);
    try {
      await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_error', id })
      });
      fetchErrors();
    } catch { /* ignore */ }
    finally { setResolving(null); }
  };

  const sourceIcon = (s: string) => {
    switch (s) {
      case 'website': return <Globe className="w-3.5 h-3.5" />;
      case 'server': return <Server className="w-3.5 h-3.5" />;
      case 'ai': return <Cpu className="w-3.5 h-3.5" />;
      case 'database': return <Database className="w-3.5 h-3.5" />;
      case 'api': return <Bug className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const severityBadge = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const sourceBadge = (s: string) => {
    const colors: Record<string, string> = {
      website: 'bg-emerald-500/10 text-emerald-400',
      server: 'bg-violet-500/10 text-violet-400',
      ai: 'bg-cyan-500/10 text-cyan-400',
      database: 'bg-amber-500/10 text-amber-400',
      api: 'bg-rose-500/10 text-rose-400',
    };
    return colors[s] || 'bg-slate-500/10 text-slate-400';
  };

  const filtered = errors.filter(e => {
    if (!showResolved && e.is_resolved) return false;
    if (filterSource !== 'all' && e.source !== filterSource) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (search && !e.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <AlertTriangle className="text-amber-400 w-6 h-6" /> Error Center
          {errors.filter(e => !e.is_resolved).length > 0 && (
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">
              {errors.filter(e => !e.is_resolved).length} unresolved
            </span>
          )}
        </h2>
        <button onClick={fetchErrors}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
          <Filter className="w-3 h-3 text-slate-500" />
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-transparent text-slate-300 focus:outline-none">
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="server">Server</option>
            <option value="ai">AI Agent</option>
            <option value="database">Database</option>
            <option value="api">API</option>
          </select>
        </div>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
          <Search className="w-3 h-3 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search errors..."
            className="bg-transparent text-slate-300 placeholder:text-slate-600 focus:outline-none w-32" />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-slate-500" /></button>}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
            className="rounded bg-slate-800 border-slate-700" />
          Show resolved
        </label>
      </div>

      {/* Error List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-16 text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="text-slate-500 text-sm">No errors detected. Everything is running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <div key={e.id}
              className={`bg-slate-900/30 border rounded-xl p-4 transition-all ${
                e.is_resolved ? 'border-slate-800/50 opacity-60' :
                e.severity === 'critical' ? 'border-rose-500/30' :
                e.severity === 'warning' ? 'border-amber-500/30' : 'border-slate-800'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`p-1.5 rounded-lg shrink-0 ${sourceBadge(e.source)}`}>
                    {sourceIcon(e.source)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${severityBadge(e.severity)}`}>
                        {e.severity}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${sourceBadge(e.source)}`}>
                        {e.source}
                      </span>
                      {e.category && (
                        <span className="text-[10px] text-slate-500 font-mono">{e.category}</span>
                      )}
                      {e.is_resolved ? (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Resolved
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 break-words">{e.message}</p>
                    {e.solution && (
                      <p className="text-xs text-slate-500 mt-1 italic">💡 {e.solution}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-600 whitespace-nowrap">{timeAgo(e.created_at)}</span>
                  {!e.is_resolved && (
                    <button onClick={() => handleResolve(e.id)} disabled={resolving === e.id}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 transition-all disabled:opacity-50"
                      title="Mark resolved">
                      <CheckCircle className="w-3.5 h-3.5" className={resolving === e.id ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrorCenter;
