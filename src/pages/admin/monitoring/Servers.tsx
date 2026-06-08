import React, { useState, useEffect } from 'react';
import { 
  Server, Cpu, Database, HardDrive, Activity, 
  AlertTriangle, CheckCircle, Clock, RefreshCw, 
  Terminal, Shield, Globe, Zap, BarChart3, Search
} from 'lucide-react';
import axios from 'axios';

const API = '/api.php';

const Servers = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`${API}?action=get_monitor_servers`);
      setServers(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal mengambil data server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'critical':
      case 'offline': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="text-primary w-6 h-6" /> Server Monitoring
          </h2>
          <p className="text-slate-500 text-sm">Real-time performance and resource monitoring for all nodes</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={refreshing}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Server Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers.map((srv) => (
          <div key={srv.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Server Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${getStatusColor(srv.status)} bg-opacity-10 border`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">{srv.name}</h3>
                  <p className="text-xs text-slate-500">{srv.ip_address || 'No IP'}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(srv.status)}`}>
                {srv.status || 'UNKNOWN'}
              </span>
            </div>

            {/* Resources */}
            <div className="p-5 grid grid-cols-3 gap-4">
              <ResourceStat 
                icon={<Cpu className="w-4 h-4" />} 
                label="CPU" 
                value={srv.cpu_usage || 0} 
                unit="%" 
                color={srv.cpu_usage > 80 ? 'rose' : srv.cpu_usage > 60 ? 'amber' : 'emerald'}
              />
              <ResourceStat 
                icon={<Activity className="w-4 h-4" />} 
                label="RAM" 
                value={srv.ram_usage || 0} 
                unit="%" 
                color={srv.ram_usage > 85 ? 'rose' : srv.ram_usage > 70 ? 'amber' : 'emerald'}
              />
              <ResourceStat 
                icon={<HardDrive className="w-4 h-4" />} 
                label="Disk" 
                value={srv.disk_usage || 0} 
                unit="%" 
                color={srv.disk_usage > 90 ? 'rose' : srv.disk_usage > 75 ? 'amber' : 'emerald'}
              />
            </div>

            {/* Services & Load */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Core Services
                </h4>
                <div className="space-y-2">
                  <ServiceBadge name="Nginx/Apache" status={srv.web_server_status || 'online'} />
                  <ServiceBadge name="MySQL/MariaDB" status={srv.db_status || 'online'} />
                  <ServiceBadge name="Docker Engine" status={srv.docker_status || 'online'} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Load Avg
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <LoadItem label="1m" value={srv.load_1 || '0.00'} />
                  <LoadItem label="5m" value={srv.load_5 || '0.00'} />
                  <LoadItem label="15m" value={srv.load_15 || '0.00'} />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-tight">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last Check:</span>
                  <span>{srv.last_updated ? new Date(srv.last_updated).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {servers.length === 0 && (
          <div className="lg:col-span-2 py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Server className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">No Servers Registered</h3>
            <p className="text-slate-500">Add a server via the API or database to start monitoring</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ResourceStat = ({ icon, label, value, unit, color }) => {
  const getColorClass = () => {
    if (color === 'rose') return 'bg-rose-500';
    if (color === 'amber') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="flex items-center gap-1.5 text-slate-500">{icon} {label}</span>
        <span className={value > 80 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>{value}{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColorClass()} transition-all duration-500`} 
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

const ServiceBadge = ({ name, status }) => {
  const isOnline = status?.toLowerCase() === 'online';
  return (
    <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
      <span className="text-slate-600 dark:text-slate-400">{name}</span>
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
    </div>
  );
};

const LoadItem = ({ label, value }) => (
  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
    <div className="text-[10px] text-slate-400 uppercase font-bold">{label}</div>
    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{value}</div>
  </div>
);

export default Servers;