import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function MonitoringCenter() {
  const { theme } = useStore();
  const isDark = theme === 'dark';

  useEffect(() => {
    // Auto redirect after 2 seconds
    const timer = setTimeout(() => {
      window.location.href = 'https://office.ischool.my.id';
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${
      isDark ? 'bg-[#0A0A0A]' : 'bg-slate-50'
    }`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-md w-full text-center p-10 rounded-2xl border ${
          isDark
            ? 'bg-[#0D0D0D] border-white/5'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className={`inline-flex p-4 rounded-full mb-6 ${
          isDark ? 'bg-blue-600/10' : 'bg-blue-50'
        }`}>
          <Activity className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>

        <h1 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Monitoring Pindah ke iSchool
        </h1>

        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Halaman monitoring website & server sudah dipindahkan ke portal iSchool.
          Anda akan dialihkan secara otomatis...
        </p>

        <a
          href="https://office.ischool.my.id"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            isDark
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Buka office.ischool.my.id
        </a>

        <p className={`text-xs mt-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Mengarahkan dalam 2 detik...
        </p>
      </motion.div>
    </div>
  );
}
