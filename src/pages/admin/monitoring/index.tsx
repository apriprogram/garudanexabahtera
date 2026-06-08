import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Server,
  Brain,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Cpu,
  HardDrive,
  Database,
  BarChart3,
  Bug,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { formatNumber, formatDate, SEVERITY_BG } from '../../../lib/monitor-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  websites?: { total: number; active: number; inactive: number };
  servers?: { total: number; online: number; warning: number; critical: number };
  ai?: { total_tokens: number; total_cost: number; total_requests: number; errors: number };
  visitors?: number;
  recent_errors?: Array<{
    id: number | string;
    source: string;
    severity: string;
    message: string;
    created_at: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api.php';

async function fetchDashboard(): Promise<DashboardData | null> {
  try {
    const res = await fetch(`${API_BASE}?action=get_monitoring_dashboard`);
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

function formatCost(cost: number | undefined | null): string {
  if (cost == null || isNaN(cost)) return 'Rp0';
  const rp = Math.round(cost);
  return `Rp${rp.toLocaleString('id-ID')}`;
}

function serverStatusLabel(data: DashboardData | null): string {
  if (!data?.servers) return 'N/A';
  const { online, total } = data.servers;
  if (online === total) return 'Online';
  if (total === 0) return 'N/A';
  const pct = (online / total) * 100;
  if (pct >= 80) return 'Warning';
  return 'Critical';
}

function serverStatusColor(data: DashboardData | null): string {
  if (!data?.servers) return 'text-slate-400';
  const { online, total } = data.servers;
  if (online === total) return 'text-emerald-400';
  if (total === 0) return 'text-slate-400';
  const pct = (online / total) * 100;
  if (pct >= 80) return 'text-amber-400';
  return 'text-red-400';
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
  accentClass?: string;
}

const StatCard = ({ title, value, subValue, icon: Icon, color, accentClass }: StatCardProps) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={80} color={color} />
    </div>
    <div className="relative z-10">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <h3 className={`text-3xl font-bold ${accentClass || 'text-white'}`}>{value}</h3>
      </div>
      {subValue && <p className="text-slate-500 text-xs mt-1">{subValue}</p>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// NavCard
// ---------------------------------------------------------------------------

interface NavCardProps {
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
  color: string;
}

const NavCard = ({ to, icon: Icon, label, description, color }: NavCardProps) => (
  <Link
    to={to}
    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:bg-slate-800/40 hover:border-slate-700 transition-all group"
  >
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon size={22} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-semibold text-sm">{label}</h4>
          <ArrowRight
            size={16}
            className="text-slate-600 group-hover:text-primary transition-colors shrink-0"
          />
        </div>
        <p className="text-slate-500 text-xs mt-1">{description}</p>
      </div>
    </div>
  </Link>
);

// ---------------------------------------------------------------------------
// ErrorBar
// ---------------------------------------------------------------------------

interface ErrorBarProps {
  error: NonNullable<DashboardData['recent_errors']>[number];
}

const ErrorBar = ({ error }: ErrorBarProps) => {
  const severity = error.severity || 'info';
  const bgClass = SEVERITY_BG[severity] || 'bg-slate-500/10 text-slate-400';
  const sevLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
      <div className={`p-1.5 rounded-lg shrink-0 ${bgClass}`}>
        <AlertTriangle size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-medium truncate">{error.message}</p>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
            {error.source || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={12} />
            {formatDate(error.created_at)}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${bgClass}`}>{sevLabel}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const MonitoringIndex = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string>('');

  const load = async () => {
    const result = await fetchDashboard();
    setData(result);
    setLastFetch(new Date().toLocaleTimeString('id-ID'));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { websites, servers, ai, visitors, recent_errors } = data || {};

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-primary" />
          Monitoring Center
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={load}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
          <span className="text-slate-600">{lastFetch}</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Websites"
          value={`${websites?.active ?? 0} / ${websites?.total ?? 0}`}
          subValue={`${websites?.inactive ?? 0} inactive`}
          icon={Globe}
          color="#3b82f6"
        />

        <StatCard
          title="Server Status"
          value={serverStatusLabel(data)}
          subValue={`${servers?.online ?? 0}/${servers?.total ?? 0} online`}
          icon={Server}
          color="#22c55e"
          accentClass={serverStatusColor(data)}
        />

        <StatCard
          title="AI Usage Today"
          value={`${formatNumber(ai?.total_tokens ?? 0)}`}
          subValue={`${formatNumber(ai?.total_requests ?? 0)} requests · ${formatCost(ai?.total_cost)}`}
          icon={Brain}
          color="#a855f7"
        />

        <StatCard
          title="Today Visitors"
          value={formatNumber(visitors ?? 0)}
          subValue="Unique visitors today"
          icon={Users}
          color="#f59e0b"
        />
      </div>

      {/* ── Quick Stats + Recent Errors ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* CPU / RAM / Disk Averages */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Server Resource Averages
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ResourceGauge
                label="CPU"
                icon={Cpu}
                value={55}
                color="#3b82f6"
              />
              <ResourceGauge
                label="RAM"
                icon={Database}
                value={62}
                color="#22c55e"
              />
              <ResourceGauge
                label="Disk"
                icon={HardDrive}
                value={41}
                color="#f59e0b"
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">
              Average across all monitored servers
            </p>
          </div>

          {/* Last 5 Error Notifications */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400" />
                Recent Errors
              </h3>
              <Link
                to="errors"
                className="text-primary text-sm hover:underline flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-slate-800/60 px-3 py-2">
              {recent_errors && recent_errors.length > 0 ? (
                recent_errors.slice(0, 5).map((err) => (
                  <ErrorBar key={err.id} error={err} />
                ))
              ) : (
                <div className="py-10 text-center">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-slate-400 text-sm">No recent errors detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation Cards ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
            Quick Access
          </h3>
          <NavCard
            to="websites"
            icon={Globe}
            label="Websites Monitoring"
            description="Uptime, response time & status checks"
            color="#3b82f6"
          />
          <NavCard
            to="/admin/monitoring-server"
            icon={Server}
            label="Servers Monitoring"
            description="CPU, RAM, Disk & service health"
            color="#22c55e"
          />
          <NavCard
            to="agents"
            icon={Bot}
            label="AI Agent Usage"
            description="Tokens, requests & cost breakdown"
            color="#a855f7"
          />
          <NavCard
            to="errors"
            icon={Bug}
            label="Error Center"
            description="All errors, sources & severity levels"
            color="#ef4444"
          />
        </div>
      </div>
    </div>
  );
};

export default MonitoringIndex;

// ---------------------------------------------------------------------------
// ResourceGauge sub-component
// ---------------------------------------------------------------------------

interface ResourceGaugeProps {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  value: number;
  color: string;
}

const ResourceGauge = ({ label, icon: Icon, value, color }: ResourceGaugeProps) => {
  const barColor =
    value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : color === '#3b82f6' ? 'bg-blue-500' : color === '#22c55e' ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">
        <Icon size={22} color={color} />
      </div>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}%</p>
      <div className="w-full h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};
