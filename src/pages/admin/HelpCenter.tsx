import React, { useState } from 'react';
import { History, Package, LayoutDashboard, Palette, Settings, Image, GripVertical, Zap, ChevronDown, Star, Bug, Sparkles } from 'lucide-react';

const changelogData = [
  {
    version: '2.5.0',
    date: '4 Juni 2026',
    badge: 'Terbaru',
    badgeColor: 'bg-blue-600',
    changes: [
      { type: 'improvement', icon: GripVertical, text: 'Drag & Drop — Tambah icon handle di bawah card List Product, animasi smooth spring, auto-simpan urutan ke database.' },
      { type: 'fix', icon: Bug, text: 'Perbaiki urutan gagal simpan saat drag and drop List Product.' },
      { type: 'improvement', icon: LayoutDashboard, text: 'Modal Visitor Dashboard — ubah border-radius ke rounded-xl (lebih proporsional).' },
      { type: 'fix', icon: LayoutDashboard, text: 'Sidebar admin — munculin kembali menu List Product yang menghilang.' },
    ]
  },
  {
    version: '2.4.0',
    date: '4 Juni 2026',
    changes: [
      { type: 'improvement', icon: Package, text: 'Tambah menu List Product di sidebar admin dengan routing dan CRUD lengkap.' },
      { type: 'improvement', icon: LayoutDashboard, text: 'Upgrade Dashboard admin — tambah tampilan visitor stats dengan tabel detail, grafik. Modal slide-in smooth dari kanan.' },
      { type: 'improvement', icon: Palette, text: 'Upgrade UI Help Center jadi halaman Catatan Perubahan dengan timeline.' },
      { type: 'fix', icon: Bug, text: 'Perbaiki endpoint visitor detail via Node.js (server.js).' },
      { type: 'improvement', icon: Settings, text: 'Nginx proxy routing diperbaiki — semua request /api.php dialihkan ke Node.js.' },
    ]
  },
  {
    version: '2.3.0',
    date: '16 Mei 2026',
    changes: [
      { type: 'improvement', icon: Settings, text: 'Update Admin Panel — perbaikan menu settings dan users management.' },
      { type: 'improvement', icon: Image, text: 'Logo sidebar diperkecil ukurannya, floating WhatsApp widget disembunyikan di halaman admin.' },
    ]
  },
  {
    version: '2.2.0',
    date: '15 Mei 2026',
    changes: [
      { type: 'improvement', icon: Image, text: 'Optimasi mobile responsiveness — hero section typography, navbar icons distandarisasi.' },
      { type: 'improvement', icon: Sparkles, text: 'Modernisasi tampilan UI — logo ticker, pricing hover effects diperhalus.' },
      { type: 'improvement', icon: Image, text: 'Penambahan carousel interaktif pada landing page.' },
    ]
  },
  {
    version: '2.1.0',
    date: '13 Mei 2026',
    changes: [
      { type: 'improvement', icon: Settings, text: 'Autodeploy via GitHub Actions ke FTP cPanel — push otomatis deploy.' },
      { type: 'improvement', icon: Sparkles, text: 'Finalisasi modern SaaS landing page UI dengan fitur lengkap.' },
    ]
  },
  {
    version: '2.0.0',
    date: '12 Mei 2026',
    changes: [
      { type: 'improvement', icon: Star, text: 'Peluncuran awal Garuda Nexa — landing page modern, admin panel, sistem manajemen produk & layanan.' },
    ]
  }
];

const HelpCenter: React.FC = () => {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([changelogData[0].version]));

  const toggleVersion = (version: string) => {
    const newSet = new Set(expandedVersions);
    if (newSet.has(version)) {
      newSet.delete(version);
    } else {
      newSet.add(version);
    }
    setExpandedVersions(newSet);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-10 md:pb-20">
      {/* Header */}
      <div className="text-center space-y-2.5 md:space-y-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto border border-blue-600/20 mb-1 md:mb-2">
          <History className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Catatan Perubahan</h1>
        <p className="text-[10px] md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Riwayat pembaruan dan perbaikan pada platform Garuda Nexa.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4 md:space-y-6">
        {/* Timeline Line */}
        <div className="absolute left-[18px] md:left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/50 via-purple-500/20 to-transparent" />

        {changelogData.map((release) => {
          const isExpanded = expandedVersions.has(release.version);
          return (
            <div key={release.version} className="relative pl-12 md:pl-14">
              {/* Timeline Dot */}
              <div className={`absolute left-[10px] md:left-[15px] top-[18px] w-[18px] h-[18px] rounded-full border-[3px] z-10 transition-colors ${
                release.badge 
                  ? 'bg-blue-600 border-blue-900 shadow-lg shadow-blue-600/30' 
                  : 'bg-[#0D0D0D] border-slate-600'
              }`} />

              {/* Card */}
              <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                release.badge
                  ? 'border-blue-500/30 bg-blue-950/20'
                  : 'border-white/5 bg-[#0D0D0D]'
              }`}>
                {/* Header */}
                <button
                  onClick={() => toggleVersion(release.version)}
                  className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-lg md:text-xl font-bold text-white tracking-tight">
                          v{release.version}
                        </span>
                        {release.badge && (
                          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${release.badgeColor}`}>
                            {release.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">{release.date}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Body */}
                {isExpanded && (
                  <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-2 md:space-y-3">
                    {release.changes.map((change, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl text-sm transition-colors ${
                        change.type === 'fix'
                          ? 'bg-red-500/5 border border-red-500/10'
                          : 'bg-white/[0.02] border border-white/5'
                      }`}>
                        <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                          change.type === 'fix'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          <change.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              change.type === 'fix' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                              {change.type === 'fix' ? 'Perbaikan' : 'Peningkatan'}
                            </span>
                          </div>
                          <p className="text-[12px] md:text-sm text-slate-300 leading-relaxed">{change.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 md:pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs md:text-sm text-slate-500">
          <Zap className="w-3.5 h-3.5" />
          Ada saran fitur? Hubungi tim pengembang
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
