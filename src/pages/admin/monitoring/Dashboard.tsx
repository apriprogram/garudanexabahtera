import { useState, useEffect } from 'react';
import { 
  Activity, 
  Globe, 
  Server, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { monitorAPI, formatNumber, SEVERITY_BG, formatDate } from '../../../lib/monitor-api';

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon size={80} color={color} />
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

const MonitoringDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await monitorAPI('get_monitor_dashboard');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-primary" /> Monitoring Center
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live Updates Every 30s
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Websites" 
          value={`${data?.websites?.online || 0}/${data?.websites?.total || 0}`}
          subValue={`${data?.websites?.offline || 0} Offline detected`}
          icon={Globe}
          color="#3b82f6"
        />
        <StatCard 
          title="Server Health" 
          value={data?.servers?.online === data?.servers?.total ? 'Healthy' : 'Warning'}
          subValue={`${data?.servers?.total || 0} Nodes monitored`}
          icon={Server}
          color="#22c55e"
        />
        <StatCard 
          title="Total Visitors" 
          value={formatNumber(data?.visitors?.today || 0)}
          subValue={`+${formatNumber(data?.visitors?.month || 0)} this month`}
          icon={Users}
          color="#a855f7"
        />
        <StatCard 
          title="System Errors" 
          value={data?.errors?.total || 0}
          subValue={`${data?.errors?.critical || 0} Critical issues`}
          icon={AlertTriangle}
          color="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Traffic & Performance</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.visitor_chart || []}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisits)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Latest Issues</h3>
              <button className="text-primary text-sm hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {data?.latest_errors?.map((err: any) => (
                <div key={err.id} className="p-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className={`p-2 rounded-lg ${SEVERITY_BG[err.severity]}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-sm">{err.message}</p>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{err.source}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {formatDate(err.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.latest_errors || data.latest_errors.length === 0) && (
                <div className="p-10 text-center">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-slate-400">All systems operational. No active issues.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">AI Usage (Tokens)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Today's Request</span>
                <span className="text-white font-medium">{formatNumber(data?.ai?.today_requests || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Tokens Used</span>
                <span className="text-white font-medium">{formatNumber(data?.ai?.total_tokens || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Est. Cost</span>
                <span className="text-emerald-400 font-bold">${data?.ai?.total_cost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Error Rate: {((data?.ai?.error_count / (data?.ai?.today_requests || 1)) * 100).toFixed(1)}%</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min(100, (data?.ai?.today_requests / 1000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Server Resources</h3>
            <div className="space-y-6">
              {data?.server_usage?.map((srv: any) => (
                <div key={srv.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{srv.name}</span>
                    <span className="text-slate-500">{srv.cpu_usage}% CPU</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${srv.cpu_usage > 80 ? 'bg-rose-500' : srv.cpu_usage > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${srv.cpu_usage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{srv.ram_usage}% RAM</span>
                    <span>{srv.disk_usage}% Disk</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
