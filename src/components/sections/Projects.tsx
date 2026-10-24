import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Eye, Heart, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { apiGet, peekApiGet } from '../../lib/api';
import type { PublicProject } from '../../types/platform';
import { readList, useSiteSettings } from '../../hooks/useSiteSettings';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';
import { LogoMark } from '../ui/LogoMark';
import { presentableProjects } from './projects/presentable';
import { shotGrid, TINT } from './templates/catalog';
import { TemplateShotSkeleton } from './templates/TemplateShot';
import { compactCount, useEngagement } from './templates/useTemplateEngagement';

/** Satu entri `portfolio_data` lama (Pengaturan website > Portofolio), dipakai sebagai cadangan. */
interface PortfolioItem {
  title: string;
  desc?: string;
  image: string;
}

interface ProjectCardData {
  key: string;
  /** Kunci suka & dilihat di server (showcase_stats): p-{id} proyek, f-{slug judul} portofolio cadangan. */
  statsKey: string;
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

/**
 * Slug judul portofolio = showcaseSlug() di backend/modules/templates.js (pf_showcase_slug di templates.php). Huruf non-ASCII
 * dibuang SEBELUM huruf kecil: strtolower PHP hanya mengubah ASCII, sedangkan toLowerCase JS mengubah "İ" → "i̇" dan tanda
 * Kelvin → "k", jadi urutan sebaliknya membuat kunci beda antara backend.
 */
const showcaseSlug = (title: string) =>
  title.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '').slice(0, 100);

interface ShowcaseStat {
  likes: number;
  views: number;
}
type StatsResponse = { stats?: Record<string, ShowcaseStat> };

/** Chip kategori pertama (tanpa saringan). */
const ALL_CATEGORIES = 'Semua';

/** Ajakan brief desain custom di kepala section Projects. */
const CustomLink: React.FC<{ className: string }> = ({ className }) => (
  <Link to="/pesan-custom" className={className}>
    Pesan Custom
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
  </Link>
);

/** Data dari HTML prerender (src/lib/preload.ts): render pertama sama dengan server; effect lalu memuat yang terbaru. */
const initialState = (): LoadState => {
  const primed = peekApiGet<ProjectsResponse>('get_public_projects');
  return primed ? doneState(primed) : { status: 'loading' };
};

/**
 * Section "Projects" (#projects, tepat di bawah Pilih Template): kartu gaya kartu template (ProjectShot, permintaan
 * pemilik 2026-10-24) dengan grid & skeleton yang sama dengan katalog template; tanpa kartu sorotan. Di bawah judul: chip
 * kategori (jenis proyek, gaya tab kategori template) yang menyaring kartu di tempat, hanya bila ada ≥ 2 kategori.
 * HTML prerender = "Semua".
 * Data: `get_public_projects` (project_client show_on_website = 1) yang lolos `isPresentableProject` (ada gambar,
 * deskripsi ≥ 40 karakter, bukan teks uji). Bila gagal atau kurang dari 2 proyek yang lolos → `portfolio_data` lama.
 */
const Projects: React.FC<{ alt?: boolean; number?: string }> = ({ alt, number = '02' }) => {
  const { settings } = useSiteSettings();
  const [state, setState] = useState<LoadState>(initialState);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  // Angka suka & dilihat (get_showcase_stats) dimuat setelah tampil; sebelum itu 0, sama dengan HTML prerender
  const [stats, setStats] = useState<Record<string, ShowcaseStat>>({});

  useEffect(() => {
    let alive = true;
    apiGet<StatsResponse>('get_showcase_stats')
      .then((data) => {
        if (alive && data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)) setStats(data.stats);
      })
      .catch(() => {
        // angka informatif; gagal dimuat → tetap 0
      });
    return () => {
      alive = false;
    };
  }, []);

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
            statsKey: `p-${project.id}`,
            title: project.name,
            label: serviceLabel(project.service_type),
            description: (project.description || '').trim(),
            image: project.image || null,
          }))
        : readList<PortfolioItem>(settings.portfolio_data, DEFAULT_PORTFOLIO)
            .filter((item) => item && item.title && item.image)
            .map((item, index) => ({
              key: `f-${index}-${item.title}`,
              statsKey: `f-${showcaseSlug(item.title)}`,
              title: item.title,
              label: item.desc || '',
              description: '',
              image: item.image,
            }));
  }

  // Kategori = jenis proyek di kartu (urutan kemunculan); kategori yang hilang setelah data baru → kembali ke "Semua"
  const categories = [...new Set(items.map((item) => item.label).filter(Boolean))];
  const showCategories = categories.length >= 2;
  const active = showCategories && categories.includes(category) ? category : ALL_CATEGORIES;
  const shown = active === ALL_CATEGORIES ? items : items.filter((item) => item.label === active);
  // "Pesan Custom" sebaris dengan chip kategori (pemilik 2026-10-24); selagi memuat baris sudah ada agar tombol tidak
  // meloncat. Hanya satu kategori → tanpa chip, tombol kembali ke samping judul
  const chipRow = state.status !== 'done' || showCategories;

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
          // Judul satu kata "Projects" (pemilik 2026-10-24, sama dengan label menu & chip)
          title="Projects"
          action={chipRow ? undefined : <CustomLink className="btn btn-outline group" />}
        />

        {chipRow && (
          // Tinggi minimum = chip + py-1.5, jadi baris tidak berubah tinggi saat chip muncul setelah dimuat
          <div className="mt-8 flex min-h-11 items-center gap-3 sm:mt-10 sm:min-h-12 sm:gap-4 xl:mt-12">
            {/* Padding kiri (HP: selebar gutter, desktop: 4px) agar outline fokus tidak terpotong overflow */}
            <div className="-ml-5 min-w-0 flex-1 overflow-x-auto pl-5 pr-1 [scrollbar-width:none] sm:-ml-1 sm:pl-1 [&::-webkit-scrollbar]:hidden">
              {state.status === 'done' && (
                <div className="flex w-max gap-2 py-1.5" role="group" aria-label="Kategori proyek">
                  {[ALL_CATEGORIES, ...categories].map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active === name}
                      onClick={() => setCategory(name)}
                      className="chip-site max-sm:h-8 max-sm:px-3 max-sm:text-xs max-sm:after:-inset-y-1.5"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* btn-sm = setinggi chip kategori */}
            <CustomLink className="btn btn-sm btn-outline group shrink-0" />
          </div>
        )}

        <div
          className={chipRow ? 'mt-5 sm:mt-7' : 'mt-8 sm:mt-10 xl:mt-12'}
          aria-busy={state.status === 'loading'}
        >
          {state.status === 'loading' ? (
            <ProjectsSkeleton />
          ) : (
            // Kolom grid mengikuti jumlah semua proyek, jadi ukuran kartu tetap saat kategori diganti
            <ul className={shotGrid(items.length)}>
              {shown.map((item, index) => (
                <ProjectShot key={item.key} item={item} index={index} stat={stats[item.statsKey]} />
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
const ProjectImage: React.FC<{ item: ProjectCardData; zoom?: boolean }> = ({ item, zoom = true }) => {
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
      className={`h-full w-full object-cover object-top ${zoom ? 'transition-transform duration-500 ease-out motion-safe:group-hover/shot:scale-[1.04]' : ''}`}
    />
  );
};

type Engagement = ReturnType<typeof useEngagement>;

/** Tombol suka + jumlah dilihat (kartu & detail proyek), sama dengan kartu template. */
const EngagementStats: React.FC<{ title: string; engagement: Engagement; large?: boolean }> = ({ title, engagement, large = false }) => {
  const { liked, likes, views, toggleLike, busy } = engagement;
  const icon = large ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className={`flex shrink-0 items-center tabular-nums text-muted ${large ? 'gap-4 text-sm' : 'gap-3 text-[13px]'}`}>
      <button
        type="button"
        onClick={() => void toggleLike()}
        // aria-disabled, bukan disabled: tombol yang sedang difokus tetap memegang fokus (di dalam dialog modal juga)
        // selama permintaan berjalan; toggleLike sendiri mengabaikan klik saat busy
        aria-disabled={busy}
        aria-pressed={liked}
        aria-label={`${liked ? 'Batal suka' : 'Suka'} ${title}, ${likes} suka`}
        className={`relative inline-flex items-center gap-1 rounded-full transition-colors after:absolute after:-inset-2 hover:text-fg ${liked ? 'text-[#e8466f]' : ''}`}
      >
        <Heart className={`${icon} ${liked ? 'fill-current' : ''}`} aria-hidden />
        {compactCount(likes)}
      </button>
      <span className="inline-flex items-center gap-1" title={`${views} kali dilihat`}>
        <Eye className={icon} aria-hidden />
        {compactCount(views)}
        <span className="sr-only"> kali dilihat</span>
      </span>
    </div>
  );
};

/**
 * Kartu proyek gaya kartu template (TemplateShot): gambar 4:3 tanpa garis & shadow, sedikit membesar saat di-hover.
 * Lapisan hover (atau fokus keyboard) berisi judul + deskripsi singkat dan tombol "Pesan Serupa" ke form custom; di layar
 * sentuh tombolnya selalu terlihat. Di bawah gambar: judul | ♥ suka · 👁 dilihat (pemilik 2026-10-24), jenis proyek, lalu
 * deskripsi (terlihat di layar sentuh, sr-only di perangkat ber-mouse; salinan di lapisan hover hanya visual).
 * Gambar & judul membuka detail proyek (ProjectDialog); membuka detail dihitung "dilihat" sekali per sesi.
 */
const ProjectShot: React.FC<{ item: ProjectCardData; index: number; stat?: ShowcaseStat }> = ({ item, index, stat }) => {
  const engagement = useEngagement('project', item.statsKey, stat?.likes ?? 0, stat?.views ?? 0);
  const [open, setOpen] = useState(false);
  // Fokus kembali ke judul saat dialog ditutup, apa pun pemicunya (gambar di luar urutan Tab, atau Safari yang tidak
  // memfokus tombol saat diklik)
  const titleRef = useRef<HTMLButtonElement>(null);
  const openDetail = () => {
    setOpen(true);
    engagement.recordView();
  };

  return (
    <li className="min-w-0">
      <Reveal height="100%" delay={(index % 4) * 0.07}>
        <article className="group/shot relative flex h-full min-w-0 flex-col">
          <div className={`relative aspect-[4/3] overflow-hidden rounded-xl ${TINT}`}>
            {/* Gambar: pemicu duplikat dari judul, jadi di luar urutan Tab (judul tetap bisa difokus) */}
            <button type="button" onClick={openDetail} tabIndex={-1} aria-hidden className="block h-full w-full cursor-pointer">
              <ProjectImage item={item} />
            </button>

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
            <div className="flex min-w-0 items-start justify-between gap-3">
              {/* Judul & jenis membungkus (maks. 2 baris); judul membuka detail proyek. line-clamp di span dalam, bukan di
                  h3: overflow h3 akan memotong garis fokus tombol */}
              <h3 className="min-w-0 text-base font-semibold leading-snug text-fg sm:text-[17px]">
                <button
                  ref={titleRef}
                  type="button"
                  onClick={openDetail}
                  aria-haspopup="dialog"
                  className="block max-w-full rounded-sm text-left transition-colors hover:text-primary"
                >
                  <span className="line-clamp-2">{item.title}</span>
                </button>
              </h3>
              <div className="pt-0.5">
                <EngagementStats title={item.title} engagement={engagement} />
              </div>
            </div>
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
      {open && <ProjectDialog item={item} engagement={engagement} returnFocusRef={titleRef} onClose={() => setOpen(false)} />}
    </li>
  );
};

/**
 * Detail proyek (dialog modal, portal ke <body>): gambar besar, judul, jenis, deskripsi lengkap, suka & dilihat, dan
 * "Pesan Serupa". Fokus dijaga di dalam dialog dan kembali ke pemicu saat ditutup (Esc, tombol tutup, klik latar).
 */
const ProjectDialog: React.FC<{
  item: ProjectCardData;
  engagement: Engagement;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ item, engagement, returnFocusRef, onClose }) => {
  const titleId = useId();
  const ref = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose, returnFocusRef });

  // Halaman di belakang dialog tidak ikut bergulir
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-fg/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92svh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[28px] bg-surface sm:rounded-[28px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail proyek"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-fg ring-1 ring-inset ring-line backdrop-blur transition-colors hover:text-primary"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <div className={`aspect-[16/10] overflow-hidden ${TINT}`}>
          <ProjectImage item={item} zoom={false} />
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-semibold leading-snug tracking-[-0.02em] text-fg sm:text-2xl">
                {item.title}
              </h2>
              {item.label && <p className="mt-1 text-sm text-muted">{item.label}</p>}
            </div>
            <EngagementStats title={item.title} engagement={engagement} large />
          </div>
          {item.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted">{item.description}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/pesan-custom" className="btn btn-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
              Pesan Serupa
            </Link>
            <p className="text-sm text-muted">Ceritakan kebutuhan Anda, konsultasinya gratis.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

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
