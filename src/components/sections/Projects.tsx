import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import type { PublicProject } from '../../types/platform';
import { readList, useSiteSettings } from '../../hooks/useSiteSettings';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { LogoMark } from '../ui/LogoMark';

/** Satu entri `portfolio_data` lama (Pengaturan website > Portofolio), dipakai sebagai cadangan. */
interface PortfolioItem {
  title: string;
  desc?: string;
  image: string;
}

interface ProjectCardData {
  key: string;
  title: string;
  label: string;
  description: string;
  image: string | null;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: '/assets/portofolio/portfolio1.png' },
  { title: 'Mobile POS App', desc: 'RETAIL / ANDROID', image: '/assets/portofolio/portfolio2.png' },
  { title: 'E-Commerce System', desc: 'SHOPPING / WEB', image: '/assets/product/ischool.png' },
  { title: 'Corporate Website', desc: 'BRANDING / MODERN', image: '/assets/product/isantri.png' },
  { title: 'Sistem Informasi Desa', desc: 'GOVERNMENT / WEB', image: '/assets/product/pos.png' },
];

const SERVICE_LABEL: Record<string, string> = {
  website: 'Website',
  web: 'Website',
  mobile_app: 'Aplikasi Mobile',
  mobile: 'Aplikasi Mobile',
  android: 'Aplikasi Android',
  ios: 'Aplikasi iOS',
};

const serviceLabel = (value: string | null | undefined) => {
  const raw = (value || '').trim();
  return SERVICE_LABEL[raw.toLowerCase()] ?? raw.replace(/_/g, ' ');
};

/** Kolom grid kartu sesuai jumlah (pola CPNS): 2 → 2 kolom, kelipatan 4 → 2/4 kolom, lainnya → 2/3 kolom. */
const gridCols = (n: number) => {
  if (n <= 1) return '';
  if (n === 2) return 'sm:grid-cols-2';
  if (n % 4 === 0) return 'sm:grid-cols-2 xl:grid-cols-4';
  return 'sm:grid-cols-2 lg:grid-cols-3';
};

type LoadState = { status: 'loading' } | { status: 'done'; projects: PublicProject[] };

/**
 * Section "Projects" (#projects), gaya BELAJAR CPNS: kartu datar (garis tipis, tanpa shadow) — proyek pertama
 * jadi kartu sorotan lebar (gambar kiri, teks kanan), sisanya grid kartu bergambar.
 * Data: `get_public_projects` (project_client show_on_website = 1); bila gagal/kosong → `portfolio_data` lama.
 */
const Projects: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '02' }) => {
  const { settings } = useSiteSettings();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    apiGet<{ projects?: PublicProject[] }>('get_public_projects')
      .then((data) => {
        if (alive) setState({ status: 'done', projects: Array.isArray(data.projects) ? data.projects.filter((p) => p && p.name) : [] });
      })
      .catch(() => {
        // Gagal memuat: tetap tampilkan portofolio cadangan, tanpa pesan error di beranda
        if (alive) setState({ status: 'done', projects: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  let items: ProjectCardData[] = [];
  if (state.status === 'done') {
    items =
      state.projects.length > 0
        ? state.projects.map((project) => ({
            key: `p-${project.id}`,
            title: project.name,
            label: serviceLabel(project.service_type),
            description: project.description || '',
            image: project.image || null,
          }))
        : readList<PortfolioItem>(settings.portfolio_data, DEFAULT_PORTFOLIO)
            .filter((item) => item && item.title && item.image)
            .map((item, index) => ({
              key: `f-${index}-${item.title}`,
              title: item.title,
              label: item.desc || '',
              description: '',
              image: item.image,
            }));
  }

  // Tidak ada proyek maupun portofolio cadangan: section tidak ditampilkan
  if (state.status === 'done' && items.length === 0) return null;

  // ≥ 3 proyek: yang pertama jadi kartu sorotan
  const featured = items.length >= 3 ? items[0] : null;
  const rest = featured ? items.slice(1) : items;

  return (
    <section
      id="projects"
      aria-labelledby="projects-title"
      className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}
    >
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Projects"
          titleId="projects-title"
          title="Proyek yang sudah"
          accent="kami kerjakan"
          description="Website dan aplikasi untuk sekolah, pesantren, UMKM, hingga instansi pemerintahan."
          action={
            <Link to="/pesan-custom" className="btn btn-outline group">
              Diskusikan proyek Anda
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          }
        />

        <div className="mt-8 sm:mt-10 xl:mt-12" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' ? (
            <ProjectsSkeleton />
          ) : (
            <div className="space-y-4 sm:space-y-5 xl:space-y-6">
              {featured && <FeaturedProject item={featured} />}
              {rest.length > 0 && (
                <ul className={`grid grid-cols-1 gap-4 sm:gap-5 xl:gap-6 ${gridCols(rest.length)}`}>
                  {rest.map((item, index) => (
                    <li key={item.key} className="flex">
                      <Reveal delay={(index % 4) * 0.1} height="100%">
                        <ProjectCard item={item} />
                      </Reveal>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** Gambar proyek dengan cadangan logo bila gagal dimuat. */
const ProjectImage: React.FC<{ item: ProjectCardData; className?: string }> = ({ item, className = '' }) => {
  const [broken, setBroken] = useState(false);
  if (!item.image || broken) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 ${className}`} aria-hidden>
        <LogoMark className="h-10 text-brand-300" />
      </div>
    );
  }
  return (
    <img
      src={item.image}
      alt={item.title}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04] ${className}`}
    />
  );
};

const Tag: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`inline-flex h-6 w-fit max-w-full items-center truncate rounded-full bg-surface/90 px-2.5 text-xs font-medium text-fg ring-1 ring-inset ring-line backdrop-blur sm:h-7 sm:px-3 sm:text-[13px] ${className}`}
  >
    {children}
  </span>
);

/** Kartu sorotan (gaya artikel unggulan CPNS): gambar kiri, teks kanan. */
const FeaturedProject: React.FC<{ item: ProjectCardData }> = ({ item }) => (
  <Reveal variant="scale">
    <article className="card-flat lift group grid overflow-hidden p-1.5 md:grid-cols-2">
      <div className="relative h-48 overflow-hidden rounded-[19px] bg-alt sm:h-60 md:h-[clamp(260px,36svh,360px)]">
        <ProjectImage item={item} />
      </div>
      <div className="flex flex-col p-5 sm:p-9 lg:p-11">
        {item.label && <Tag>{item.label}</Tag>}
        <h3 className="mt-4 text-xl font-semibold leading-[1.25] tracking-[-0.02em] text-fg sm:mt-5 sm:text-3xl sm:leading-[1.1] sm:tracking-[-0.03em] lg:text-[40px]">
          {item.title}
        </h3>
        {item.description ? (
          <p className="mt-2.5 line-clamp-4 max-w-lg text-[14px] leading-relaxed text-muted sm:mt-4 sm:text-[17px]">{item.description}</p>
        ) : (
          <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-muted sm:mt-4 sm:text-[17px]">
            Punya kebutuhan serupa?{' '}
            <Link to="/pesan-custom" className="link-site">
              Ceritakan proyek Anda
            </Link>{' '}
            dan kami bantu menyusun solusinya.
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-6 text-[13px] sm:pt-8 sm:text-sm">
          <span className="flex items-center gap-2 font-medium text-fg">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            Proyek pilihan
          </span>
          <span className="text-muted">
            oleh <span className="font-semibold text-fg">Garuda Nexa</span>
          </span>
        </div>
      </div>
    </article>
  </Reveal>
);

/** Kartu proyek: gambar di atas (memudar ke putih) + tag, judul, deskripsi. */
const ProjectCard: React.FC<{ item: ProjectCardData }> = ({ item }) => (
  <article className="card-flat lift group flex h-full flex-col overflow-hidden p-1.5">
    <div className="relative h-44 overflow-hidden rounded-[19px] bg-alt sm:h-48 lg:h-[clamp(170px,22svh,230px)]">
      <ProjectImage item={item} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-surface/90" aria-hidden />
      {item.label && <Tag className="absolute right-3 top-3 max-w-[calc(100%-1.5rem)]">{item.label}</Tag>}
    </div>
    <div className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6 lg:px-6">
      <h3 className="text-base font-semibold leading-snug tracking-tight text-fg sm:text-xl sm:leading-snug">{item.title}</h3>
      {item.description && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted sm:mt-2 sm:text-[15px]">{item.description}</p>}
    </div>
  </article>
);

const ProjectsSkeleton: React.FC = () => (
  <>
    <span className="sr-only" role="status">
      Memuat proyek...
    </span>
    <div className="space-y-4 sm:space-y-5 xl:space-y-6" aria-hidden>
      <div className="card-flat grid overflow-hidden p-1.5 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-[19px] bg-alt sm:h-60 md:h-[300px]" />
        <div className="space-y-3 p-5 sm:p-9">
          <div className="h-6 w-24 animate-pulse rounded-full bg-alt" />
          <div className="h-8 w-3/4 animate-pulse rounded-full bg-line" />
          <div className="h-4 w-full animate-pulse rounded-full bg-alt" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-alt" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`card-flat overflow-hidden p-1.5 ${i === 2 ? 'max-lg:hidden' : ''} ${i === 1 ? 'max-sm:hidden' : ''}`}>
            <div className="h-44 animate-pulse rounded-[19px] bg-alt sm:h-48" />
            <div className="space-y-2.5 px-4 pb-5 pt-3">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-line" />
              <div className="h-3 w-full animate-pulse rounded-full bg-alt" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default Projects;
