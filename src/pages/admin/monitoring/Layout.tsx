import { NavLink, Outlet } from 'react-router-dom';
import { 
  Activity, 
  Globe, 
  Server, 
  Bot, 
  Bug,
  Brain,
} from 'lucide-react';

const navItems = [
  { to: '', icon: Activity, label: 'Dashboard', end: true },
  { to: 'websites', icon: Globe, label: 'Websites' },
  { to: 'servers', icon: Server, label: 'Servers' },
  { to: 'agents', icon: Bot, label: 'AI Agents' },
  { to: 'ai', icon: Brain, label: 'AI Stats' },
  { to: 'errors', icon: Bug, label: 'Errors' },
];

const MonitoringLayout = () => {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-0 overflow-x-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-all ${
                isActive
                  ? 'border-primary text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
};

export default MonitoringLayout;
