import { useState, useEffect } from 'react';
import { 
  Server, Plus, Monitor, Cpu,
  HardDrive, Wifi, Clock
} from 'lucide-react';
import { monitorAPI, formatDate } from '../../../lib/monitor-api';

const Servers = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', type: 'vps' });

  const fetchServers = async () => {
    try {
      const res = await monitorAPI('get_monitor_servers');
      setServers(res.data || res || []);
    } catch (err) { console.error(err); }

  };

  const fetchDetail = async (id: number) => {
    try {
      const res = await monitorAPI('get_monitor_server_detail', { id });
      setDetail(res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchServers(); const i = setInterval(fetchServers, 30000); return () => clearInterval(i); }, []);

  const addServer = async () => {
    await monitorAPI('add_monitor_server', form, 'POST');
    setShowAdd(false); setForm({ name: '', host: '', type: 'vps' }); fetchServers();
  };

  const deleteServer = async (id: number) => {
    await monitorAPI('delete_monitor_server', { id }, 'POST');
    if (detail?.id === id) setDetail(null);
    fetchServers();
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'online': return 'text-emerald-400 bg-emerald-500/10';
      case 'warning': return 'text-amber-400 bg-amber-500/10';
      case 'critical': return 'text-rose-400 bg-rose-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getUsageColor = (val: number) => {
    if (val > 80) return 'bg-rose-500';
    if (val > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Server className="text-primary" /> Servers
        </h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all">
          <Plus size={16} /> Add Server
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Add Server</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input placeholder="Server Name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <input placeholder="IP or Hostname" value={form.host} onChange={e => setForm(p => ({...p, host: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary" />
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary">
              <option value="vps">VPS</option>
              <option value="dedicated">Dedicated</option>
              <option value="docker">Docker</option>
            </select>
            <div className="flex gap-2">
              <button onClick={addServer} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium">Save</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-500 hover:text-white">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Cpu size={12} /> CPU</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.cpu_usage ?? '-'}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Monitor size={12} /> RAM</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.ram_usage ?? '-'}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 flex items-center gap-1"><HardDrive size={12} /> Disk</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.disk_usage ?? '-'}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Wifi size={12} /> Network</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.net_traffic || '-'}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} /> Load</p>
              <p className="text-lg font-bold mt-1 text-white">{detail.load_1min ?? '-'}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 mb-3">Recent metrics</div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {detail.logs?.map((log: any) => (
              <div key={log.id} className="flex items-center gap-4 p-2 bg-slate-800/30 rounded-lg text-xs">
                <span className="text-slate-500 w-32">{formatDate(log.checked_at)}</span>
                <span className={`px-2 py-0.5 rounded-full ${getStatusColor(log.status)}`}>{log.status}</span>
                <span className="text-slate-400">CPU: {log.cpu_usage}%</span>
                <span className="text-slate-400">RAM: {log.ram_usage}%</span>
                <span className="text-slate-400">Disk: {log.disk_usage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {servers.map((s: any) => (
          <div key={s.id} className="bg-slate-900/30 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(s.status)}`}>
                  <Server size={18} />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">{s.name}</h4>
                  <p className="text-xs text-slate-500">{s.host} · {s.type}</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(s.status)}`}>
                {s.status}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>CPU</span><span>{s.cpu_usage}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${getUsageColor(s.cpu_usage)}`} style={{width:`${s.cpu_usage}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>RAM</span><span>{s.ram_usage}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${getUsageColor(s.ram_usage)}`} style={{width:`${s.ram_usage}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Disk</span><span>{s.disk_usage}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${getUsageColor(s.disk_usage)}`} style={{width:`${s.disk_usage}%`}}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
              <button onClick={() => fetchDetail(s.id)} className="text-xs text-primary hover:underline">Details</button>
              <button onClick={() => deleteServer(s.id)} className="text-xs text-rose-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Servers;
