import React from 'react';
import { 
  Settings, 
  Code, 
  Palette, 
  Megaphone, 
  Globe, 
  Smartphone,
  Plus,
  MoreVertical,
  ChevronRight
} from 'lucide-react';

const ServicesManager: React.FC = () => {
  const services = [
    { id: 1, title: 'Web Development', description: 'Custom websites built with modern technologies.', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 2, title: 'UI/UX Design', description: 'Beautiful and intuitive user interfaces.', icon: Palette, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 3, title: 'Mobile Apps', description: 'Cross-platform mobile applications.', icon: Smartphone, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 4, title: 'Digital Marketing', description: 'Grow your brand presence online.', icon: Megaphone, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Services Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Configure the services you offer on the landing page.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-[#0D0D0D] border border-white/5 p-6 rounded-3xl hover:border-blue-500/30 transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className={`p-4 rounded-2xl ${service.bg} ${service.color}`}>
                <service.icon className="w-6 h-6" />
              </div>
              <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{service.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {service.description}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Active Status</span>
              <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors group/btn">
                Edit Details
                <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats / Help Card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20">
          <Code className="w-10 h-10 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-white mb-2">Want to add custom logic?</h4>
          <p className="text-slate-300 text-sm">
            You can integrate these services with your backend API to dynamically update the front-end homepage. 
            All icons used here are from the Lucide React library.
          </p>
        </div>
        <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95">
          Documentation
        </button>
      </div>
    </div>
  );
};

export default ServicesManager;
