import { useState, useEffect } from 'react';
import { 
  Bug, Clock, CheckCircle2, ExternalLink
} from 'lucide-react';
import { monitorAPI, formatDate, SEVERITY_BG } from '../../../lib/monitor-api';

const Errors = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [total, setTotal] = useState(0);

  const fetchErrors = async () => {
    try {
      const res = await monitorAPI('get_monitor_errors', {
        page,
        limit: 20,
        source: sourceFilter === 'all' ? '' : sourceFilter,
        severity: severityFilter === 'all' ? '' : severityFilter,
      });
      setErrors(res.data || res || []);
      setTotal(res.total || 0);
    } catch (err) { console.error(err); }

  };

  useEffect(() => { fetchErrors(); }, [page, sourceFilter, severityFilter]);

  const resolveError = async (id: number) => {
    await monitorAPI('resolve_monitor_error', { id }, 'POST');
    fetchErrors();
  };

  const sources = ['all', 'website', 'server', 'database', 'api', 'ai_agent', 'system'];
  const severities = ['all', 'critical', 'warning', 'info'];
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Bug className="text-primary" /> Error Center
        </h2>
        <div className="flex items-center gap-3">
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-primary">
            {sources.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Sources' : s.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
          <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-primary">
            {severities.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Severity' : s.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/50">
          <div className="col-span-1">Severity</div>
          <div className="col-span-1">Source</div>
          <div className="col-span-4">Message</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Action</div>
        </div>

        <div className="divide-y divide-slate-800">
          {errors.map((err: any) => (
            <div key={err.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-slate-800/20 transition-colors items-center">
              <div className="md:col-span-1">
                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-medium ${SEVERITY_BG[err.severity]}`}>
                  {err.severity}
                </span>
              </div>
              <div className="md:col-span-1 text-xs text-slate-400 capitalize">{err.source?.replace('_', ' ')}</div>
              <div className="md:col-span-4 text-sm text-white font-medium">{err.message}</div>
              <div className="md:col-span-2 text-xs text-slate-500">{err.code || '-'}</div>
              <div className="md:col-span-2 text-xs text-slate-500 flex items-center gap-1">
                <Clock size={12} /> {formatDate(err.created_at)}
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                {!err.is_resolved ? (
                  <button onClick={() => resolveError(err.id)}
                    className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    Resolve
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Resolved
                  </span>
                )}
                {err.recommendation && (
                  <button className="text-xs text-slate-500 hover:text-white" title={err.recommendation}>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {errors.length === 0 && (
            <div className="p-16 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">No errors found. Everything is running smoothly!</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white text-sm disabled:opacity-30">Prev</button>
          {Array.from({length: Math.min(totalPages, 5)}, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`px-3 py-2 rounded-xl text-sm ${
                page === i + 1 ? 'bg-primary text-white' : 'bg-slate-900/50 border border-slate-800 text-slate-400'
              }`}>
              {i + 1}
            </button>
          ))}
          {totalPages > 5 && <span className="text-slate-500">···</span>}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-white text-sm disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
};

export default Errors;
