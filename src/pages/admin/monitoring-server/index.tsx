import { useState, useEffect } from 'react';
import { Server, Activity, Cpu, Monitor, HardDrive } from 'lucide-react';

const MonitoringServer = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch('/api.php?action=get_monitor_servers');
        const data = await res.json();
        setServers(data.data || data || []);
      } catch (err) {
        console.error('Failed to fetch servers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
    const interval = setInterval(fetchServers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (val: number) => {
    if (val > 80) return 'bg-rose-500';
    if (val > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Server className="text-primary" /> Monitoring Server
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Updates
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p>Memuat data server...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {servers.map((s: any) => (
            <div key={s.id} className="bg-slate-900/30 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-primary">
                    <Server size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">{s.name}</h4>
                    <p className="text-xs text-slate-500">{s.host} · {s.type}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                  s.status === 'online' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {s.status || 'unknown'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 px-1">
                    <span className="flex items-center gap-1"><Cpu size={10} /> CPU</span>
                    <span>{s.cpu_usage || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${getUsageColor(s.cpu_usage || 0)}`} style={{width:`${s.cpu_usage || 0}%`}}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 px-1">
                    <span className="flex items-center gap-1"><Monitor size={10} /> RAM</span>
                    <span>{s.ram_usage || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${getUsageColor(s.ram_usage || 0)}`} style={{width:`${s.ram_usage || 0}%`}}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 px-1">
                    <span className="flex items-center gap-1"><HardDrive size={10} /> Disk</span>
                    <span>{s.disk_usage || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${getUsageColor(s.disk_usage || 0)}`} style={{width:`${s.disk_usage || 0}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {servers.length === 0 && (
            <div className="col-span-full bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Activity className="mx-auto text-slate-700 mb-3" size={32} />
              <p className="text-slate-500 text-sm">No servers found. Add one from the admin panel to start monitoring.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonitoringServer;
