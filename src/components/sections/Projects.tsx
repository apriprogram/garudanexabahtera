import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet, peekApiGet } from '../../lib/api';
import type { PublicProject } from '../../types/platform';
import { readList, useSiteSettings } from '../../hooks/useSiteSettings';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { LogoMark } from '../ui/LogoMark';
import { presentableProjects } from './projects/presentable';
import { shotGrid, TINT } from './templates/catalog';
import { TemplateShotSkeleton } from './templates/TemplateShot';

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

type LoadState = { status: 'loading' } | { status: 'done'; projects: PublicProject[] };

type ProjectsResponse = { projects?: PublicProject[] };

const doneState = (data: ProjectsResponse): LoadState => ({
  status: 'done',
  projects: Array.isArray(data.projects) ? data.projects.filter((p) => p && p.name) : [],
});

/** Data dari HTML prerender (src/lib/preload.ts): render pertama sama dengan server; effect lalu memuat yang terbaru. */
const initialState = (): LoadState => {
  const primed = peekApiGet<ProjectsResponse>('get_public_projects');
  return primed ? doneState(primed) : { status: 'loading' };
};

/**
 * Section "Projects" (#projects, tepat di bawah Pilih Template): kartu gaya kartu template (ProjectShot, permintaan
 * pemilik 2026-10-24) dengan grid & skeleton yang sama dengan katalog template; tanpa kartu sorotan.
 * Data: `get_public_projects` (project_client show_on_website = 1) yang lolos `isPresentableProject` (ada gambar,
 * deskripsi ≥ 40 karakter, bukan teks uji). Bila gagal atau kurang dari 2 proyek yang lolos → `portfolio_data` lama.
 */
const Projects: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '02' }) => {
  const { settings } = useSiteSettings();
  const [state, setState] = useState<LoadState>(initialState);

  useEffect(() => {
    let alive = true;
    apiGet<ProjectsResponse>('get_public_projects')
      .then((data) => {
        if (alive) setState(doneState(data));
      })
      .catch(() => {
        // Gagal memuat: tetap tampilkan data preload, atau portofolio cadangan, tanpa pesan error di beranda
        if (alive) setState((prev) => (prev.status === 'done' ? prev : { status: 'done', projects: [] }));
      });
    return () => {
      alive = false;
    };
  }, []);

  let items: ProjectCardData[] = [];
  if (state.status === 'done') {
    // Teks uji (Lorem ipsum, "Coba text") tidak boleh sampai ke beranda; satu proyek saja juga tampak sepi
    const presentable = presentableProjects(state.projects);
    items =
      presentable.length > 0
        ? presentable.map((project) => ({
            key: `p-${project.id}`,
            title: project.name,
            label: serviceLabel(project.service_type),
            description: (project.description || '').trim(),
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
          action={
            <Link to="/pesan-custom" className="btn btn-outline group">
              Pesan Custom
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </Link>
          }
        />

        <div className="mt-8 sm:mt-10 xl:mt-12" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' ? (
            <ProjectsSkeleton />
          ) : (
            <ul className={shotGrid(items.length)}>
              {items.map((item, index) => (
                <ProjectShot key={item.key} item={item} index={index} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Gambar proyek dengan cadangan logo bila gagal dimuat. Dekoratif (`alt=""`): judul proyek sudah dibacakan dari h3 di
 * bawahnya.
 */
const ProjectImage: React.FC<{ item: ProjectCardData }> = ({ item }) => {
  const [broken, setBroken] = useState(false);
  if (!item.image || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100" aria-hidden>
        <LogoMark className="h-10 text-brand-300" />
      </div>
    );
  }
  return (
    <img
      src={item.image}
      alt=""
      width={1600}
      height={1200}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover object-top transition-transform duration-500 ease-out motion-safe:group-hover/shot:scale-[1.04]"
    />
  );
};

/**
 * Kartu proyek gaya kartu template (TemplateShot): gambar 4:3 tanpa garis & shadow, sedikit membesar saat di-hover.
 * Lapisan hover (atau fokus keyboard) berisi judul + deskripsi singkat dan tombol "Pesan Serupa" ke form custom; di layar
 * sentuh tombolnya selalu terlihat. Di bawah gambar: judul, jenis proyek, lalu deskripsi (terlihat di layar sentuh,
 * sr-only di perangkat ber-mouse). Proyek tidak punya halaman detail, jadi deskripsi harus terbaca di setiap perangkat
 * dan dibacakan sesudah judul; salinan di lapisan hover hanya visual (aria-hidden).
 */
const ProjectShot: React.FC<{ item: ProjectCardData; index: number }> = ({ item, index }) => (
  <li className="min-w-0">
    <Reveal height="100%" delay={(index % 4) * 0.07}>
      <article className="group/shot relative flex h-full min-w-0 flex-col">
        <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
          <ProjectImage item={item} />

          {/* Lapisan hover: gradasi bawah (cukup gelap untuk teks putih di atas tangkapan layar terang) + judul &
              deskripsi (perangkat ber-mouse, hanya visual) + tombol Pesan Serupa */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-t from-fg/90 via-fg/55 to-transparent p-3 pt-16 transition-opacity duration-300 group-focus-within/shot:opacity-100 sm:p-4 sm:pt-20 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/shot:opacity-100">
            <div className="min-w-0 flex-1 [@media(hover:none)]:hidden" aria-hidden>
              <p className="truncate text-sm font-semibold text-white sm:text-[15px]">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/85 sm:text-[13px]">{item.description}</p>
              )}
            </div>
            <Link
              to="/pesan-custom"
              className="btn btn-primary btn-sm pointer-events-auto ml-auto h-9 shrink-0 px-3.5 focus-visible:outline-white"
              aria-label={`Pesan Serupa ${item.title}`}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Pesan Serupa
            </Link>
          </div>
        </div>

        <div className="mt-3 min-w-0">
          {/* Judul & jenis membungkus (bukan terpotong): tidak ada halaman detail untuk membaca versi lengkapnya */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg sm:text-[17px]">{item.title}</h3>
          {item.label && (
            <p className="mt-0.5 text-sm text-muted">
              <span className="sr-only">Jenis proyek </span>
              {item.label}
            </p>
          )}
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted [@media(hover:hover)]:sr-only">{item.description}</p>
          )}
        </div>
      </article>
    </Reveal>
  </li>
);

/** Skeleton = skeleton kartu template (gambar 4:3 berkilau + baris judul), jumlah kartu mengikuti lebar layar. */
const ProjectsSkeleton: React.FC = () => (
  <>
    <span className="sr-only" role="status">
      Memuat proyek...
    </span>
    <ul className={shotGrid(4)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <TemplateShotSkeleton key={i} className={i === 3 ? 'max-xl:hidden' : i === 2 ? 'max-lg:hidden' : i === 1 ? 'max-sm:hidden' : ''} />
      ))}
    </ul>
  </>
);

export default Projects;
