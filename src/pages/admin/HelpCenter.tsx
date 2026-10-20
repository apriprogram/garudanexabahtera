import React, { useState } from 'react';
import { Package, LayoutDashboard, Palette, Settings, Image, GripVertical, Zap, ChevronDown, Star, Bug, Sparkles } from 'lucide-react';
import { IconBox, PageHeader, Panel, cn } from '../../components/admin/ui';

const changelogData = [
  {
    version: '2.5.0',
    date: '4 Juni 2026',
    badge: 'Terbaru',
    badgeColor: 'bg-cobalt',
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
    <div className="mx-auto max-w-4xl pb-10">
      {/* Header */}
      <PageHeader title="Catatan perubahan" description="Riwayat pembaruan dan perbaikan pada platform Garuda Nexa." />

      {/* Timeline */}
      <div className="relative space-y-3 sm:space-y-4">
        {/* Timeline Line */}
        <div className="absolute bottom-3 left-[11px] top-3 w-px bg-adm-line sm:left-[15px]" aria-hidden />

        {changelogData.map((release) => {
          const isExpanded = expandedVersions.has(release.version);
          return (
            <div key={release.version} className="relative pl-9 sm:pl-12">
              {/* Timeline Dot */}
              <div
                className={cn(
                  'absolute left-1 top-5 z-10 h-4 w-4 rounded-full ring-4 ring-adm-surface sm:left-2 sm:top-[26px]',
                  release.badge ? 'bg-cobalt' : 'border-2 border-adm-line-strong bg-adm-surface',
                )}
                aria-hidden
              />

              {/* Card */}
              <Panel padding="none" className={cn('overflow-hidden', release.badge && 'ring-cobalt/40')}>
                {/* Header */}
                <button
                  type="button"
                  onClick={() => toggleVersion(release.version)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold tracking-tight text-adm-fg tabular-nums sm:text-lg">
                        v{release.version}
                      </span>
                      {release.badge && (
                        <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium text-white', release.badgeColor)}>
                          {release.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-adm-muted">{release.date}</p>
                  </div>
                  <ChevronDown
                    className={cn('h-5 w-5 shrink-0 text-adm-subtle transition-transform duration-300', isExpanded && 'rotate-180')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>

                {/* Body */}
                {isExpanded && (
                  <div className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
                    {release.changes.map((change, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl bg-adm-ghost p-3">
                        <IconBox icon={change.icon} tone={change.type === 'fix' ? 'danger' : 'cobalt'} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-[11px] font-semibold uppercase tracking-[0.08em]',
                              change.type === 'fix' ? 'text-adm-danger-fg' : 'text-adm-cobalt-fg',
                            )}
                          >
                            {change.type === 'fix' ? 'Perbaikan' : 'Peningkatan'}
                          </p>
                          <p className="mt-0.5 break-words text-[13px] leading-relaxed text-adm-fg sm:text-sm">{change.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-6 text-center sm:pt-8">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-adm-ghost px-4 py-2 text-xs text-adm-muted sm:text-[13px]">
          <Zap className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Ada saran fitur? Hubungi tim pengembang
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
