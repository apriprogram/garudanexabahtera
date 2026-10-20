import React from 'react';
import { 
  Code, 
  Palette, 
  Megaphone, 
  Globe, 
  Smartphone,
  Plus,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { Button, Eyebrow, IconBox, IconButton, PageHeader, Panel, cn } from '../../components/admin/ui';

const ServicesManager: React.FC = () => {
  const services = [
    { id: 1, title: 'Pengembangan web', description: 'Website kustom yang dibangun dengan teknologi modern.', icon: Globe, color: 'text-adm-cobalt-fg', bg: 'bg-adm-cobalt-soft' },
    { id: 2, title: 'Desain UI/UX', description: 'Tampilan yang menarik dan mudah dipakai.', icon: Palette, color: 'text-adm-fg', bg: 'bg-adm-ghost' },
    { id: 3, title: 'Aplikasi mobile', description: 'Aplikasi mobile lintas platform (Android & iOS).', icon: Smartphone, color: 'text-adm-mint-fg', bg: 'bg-adm-mint-soft' },
    { id: 4, title: 'Pemasaran digital', description: 'Bantu brand kamu makin dikenal secara online.', icon: Megaphone, color: 'text-adm-warning-fg', bg: 'bg-adm-warning-soft' },
  ];

  return (
    <div className="pb-10">
      <PageHeader
        title="Layanan"
        description="Atur layanan yang kamu tawarkan di halaman utama website."
        actions={
          <Button icon={<Plus />}>
            Tambah layanan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Panel key={service.id} padding="lg" className="group transition-colors duration-150 hover:ring-adm-line-strong">
            <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', service.bg, service.color)}>
                <service.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <IconButton icon={<MoreVertical />} label={`Opsi ${service.title}`} size="sm" />
            </div>

            <h3 className="mb-1.5 text-base font-semibold tracking-[-0.01em] text-adm-fg sm:text-lg">{service.title}</h3>
            <p className="mb-4 text-sm leading-relaxed text-adm-muted sm:mb-5">
              {service.description}
            </p>

            <div className="flex items-center justify-between gap-3 border-t border-adm-line pt-4">
              <Eyebrow>Status aktif</Eyebrow>
              <Button variant="link" size="sm" iconRight={<ChevronRight />}>
                Edit detail
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      {/* Stats / Help Card */}
      <Panel tone="cobalt" padding="lg" className="mt-4 flex flex-col items-center gap-4 sm:mt-6 md:flex-row md:gap-6">
        <IconBox icon={<Code />} tone="solid" size="lg" />
        <div className="min-w-0 flex-1 text-center md:text-left">
          <h4 className="mb-1.5 text-base font-semibold tracking-[-0.01em] text-adm-fg sm:text-lg">Mau menambah logika kustom?</h4>
          <p className="text-sm leading-relaxed text-adm-muted">
            Kamu bisa menghubungkan layanan ini ke API backend supaya halaman utama website ikut diperbarui otomatis.
            Semua ikon di sini berasal dari library Lucide React.
          </p>
        </div>
        <Button variant="dark" className="w-full md:w-auto">
          Dokumentasi
        </Button>
      </Panel>
    </div>
  );
};

export default ServicesManager;
