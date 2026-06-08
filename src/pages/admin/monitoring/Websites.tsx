import { useState, useEffect } from 'react';
import { 
  Globe, Plus, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Search, Activity
} from 'lucide-react';
import { monitorAPI, formatMs, formatDate } from '../../../lib/monitor-api';

const Websites = () => {
  const [websites, setWebsites] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', url: '' });
  const [search, setSearch] = useState('');

  const fetchWebsites = async () => {
    try {
      const res = await monitorAPI('get_monitor_websites');
      setWebsites(res.data || res || []);
    } catch (err) { console.error(err); }

  };

  const fetchDetail = async (id: number) => {
    try {
      const res = await monitorAPI('get_monitor_website_detail', { id });
      setDetail(res);
      await fetchWebsites();
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchWebsites(); const i = setInterval(fetchWebsites, 30000); return () => clearInterval(i); }, []);

  const addWebsite = async () => {
    await monitorAPI('add_monitor_website', form, 'POST');
    setShowAdd(false); setForm({ name: '', url: '' }); fetchWebsites();
  };

  const deleteWebsite = async (id: number) => {
    await monitorAPI('delete_monitor_website', { id }, 'POST');
    fetchWebsites();
  };

  const checkNow = async (website: any) => {
    try {
      const res = await fetch(`/api.php?action=check_website&url=${encodeURIComponent(website.url)}`);
      const data = await res.json();
      await monitorAPI('record_website_log', {
        website_id: website.id,
        status: data.status,
        response_time_ms: data.responseTime,
        http_status: data.httpStatus
      }, 'POST');
      fetchWebsites();
    } catch (err) { console.error(err); }
  };

  const filtered = websites?.filter((w: any) =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.url?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusIcon = (status: string) => {
    if (status === 'online') return <CheckCircle2 size={18} className="text-emerald-500" />;
    if (status === 'warning') return <AlertTriangle size={18} className="text-amber-500" />;
    return <XCircle size={18} className="text-rose-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Globe className="text-primary" /> Websites
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all">
          <Plus size={16} /> Add Website
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Add Website</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input placeholder="Website Name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <input placeholder="https://example.com" value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <div className="flex gap-2">
              <button onClick={addWebsite} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium">Save</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input placeholder="Search websites..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-primary" />
      </div>

      {detail && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-500 hover:text-white">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Status</p>
              <p className={`text-sm font-semibold mt-1 ${detail.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {detail.status?.toUpperCase()}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Response</p>
              <p className="text-sm font-semibold text-white mt-1">{formatMs(detail.response_time_ms)}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">SSL Expiry</p>
              <p className="text-sm font-semibold text-white mt-1">{detail.ssl_days_left ?? '-'} days</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500">Uptime</p>
              <p className="text-sm font-semibold text-emerald-400 mt-1">{detail.uptime_percent ?? '-'}%</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 mb-3">Recent checks (last 50)</div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {detail.logs?.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg text-xs">
                <span>{formatDate(log.checked_at)}</span>
                <span className={`flex items-center gap-1 ${log.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {statusIcon(log.status)} {log.status}
                </span>
                <span className="text-slate-500">{formatMs(log.response_time_ms)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((w: any) => (
          <div key={w.id} className="bg-slate-900/30 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${w.status === 'online' ? 'bg-emerald-500/10' : w.status === 'warning' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
                  {statusIcon(w.status)}
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">
                    {w.name}
                    {w.latest_response_time && <span className="text-[10px] text-slate-500">{formatMs(w.latest_response_time)}</span>}
                  </h4>
                  <a href={w.url} target="_blank" className="text-xs text-slate-500 hover:text-primary flex items-center gap-1">
                    {w.url} <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              <button onClick={() => checkNow(w)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-800 rounded-lg transition-all">
                <RefreshCw size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Activity size={12} /> HTTP {w.latest_http_status || '-'}</span>
              <button onClick={() => fetchDetail(w.id)} className="text-primary hover:underline">Details</button>
              <button onClick={() => deleteWebsite(w.id)} className="text-rose-500 hover:underline ml-auto">Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">No websites found. Add one to start monitoring.</div>
        )}
      </div>
    </div>
  );
};

export default Websites;
