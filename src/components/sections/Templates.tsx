import React, { useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, LayoutTemplate, RotateCw, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, peekApiGet } from '../../lib/api';
import { preloadNow } from '../../lib/preload';
import { HUB_PATHS } from '../../seo/paths';
import type { Template } from '../../types/platform';
import { SectionHeading } from '../ui/SectionHeading';
import {
  buildPopularKeywords,
  findNewestSlug,
  indexTemplates,
  matchesQuery,
  normalize,
  shotGrid,
  SORT_OPTIONS,
  sortTemplates,
  TINT,
  type SortKey,
} from './templates/catalog';
import { IncludesStrip } from './templates/IncludesStrip';
import { SortMenu } from './templates/SortMenu';
import { TemplateSearchBox } from './templates/TemplateSearchBox';
import { TemplateShot, TemplateShotSkeleton } from './templates/TemplateShot';

interface TemplatesResponse {
  templates?: Template[];
  categories?: string[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: Template[]; categories: string[]; newestSlug: string | null };

const ALL = '__semua__';
const PAGE_SIZE = 12;
const NO_TEMPLATES: Template[] = [];
const NO_CATEGORIES: string[] = [];
/** Baris yang bisa digeser ke samping di HP tanpa scrollbar terlihat */
const NO_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
/**
 * Respons get_templates → status siap. Kategori dari API (urutannya dipertahankan) + kategori template, hanya yang
 * punya template. `now` menentukan lencana "Baru".
 */
const readyState = (data: TemplatesResponse, now: number): LoadState => {
  const templates = Array.isArray(data.templates) ? data.templates.filter((tpl) => tpl && tpl.slug) : [];
  const used = new Set(templates.map((tpl) => tpl.category).filter(Boolean));
  const categories = Array.from(
    new Set([...(Array.isArray(data.categories) ? data.categories : []), ...templates.map((tpl) => tpl.category)]),
  ).filter((name) => Boolean(name) && used.has(name));
  return { status: 'ready', templates, categories, newestSlug: findNewestSlug(templates, now) };
};

/**
 * Data dari HTML prerender (src/lib/preload.ts): render pertama langsung berisi katalog, sama dengan HTML server.
 * "Sekarang" = waktu data diambil, supaya lencana "Baru" di hidrasi sama dengan server; effect lalu memuat data terbaru.
 */
const initialState = (): LoadState => {
  const primed = peekApiGet<TemplatesResponse>('get_templates');
  return primed ? readyState(primed, preloadNow()) : { status: 'loading' };
};
/** Grid kartu bersama dengan #projects (templates/catalog). */
const gridFor = shotGrid;
/** Toolbar mengikuti besar katalog: kolom cari mulai 4 template, chip "Populer" + "Urutkan" mulai 6 template. */
const SEARCH_MIN = 4;
const EXTRAS_MIN = 6;
/** Tujuan "Pesan Custom" dari katalog template: layanan website langsung terpilih di form. */
const CUSTOM_HREF = '/pesan-custom?layanan=website';

/**
 * Section "Pilih Template" (#templates) bergaya galeri shot Dribbble:
 * tab kategori (≥ 2 kategori) → kolom cari besar (≥ 4 template) → chip "Populer:" + "Urutkan" (≥ 6 template) →
 * grid kartu (gambar 4:3, tanpa garis & shadow). Katalog kecil cukup menampilkan jumlah template di atas grid.
 * Data: `get_templates`. Klik gambar/nama → /template/:slug, demo → demo_url atau /demo/:slug, pesan → /pesan/:slug.
 * "Lihat Semua Template" (ikon tata letak) → /template sebaris dengan tab kategori; tab kategori = filter di tempat.
 * Halaman kategori tertaut dari footer di setiap halaman (SEO-PLAN §5.5 langkah 4).
 */
const Templates: React.FC<{ alt?: boolean; number?: string }> = ({ alt = false, number = '01' }) => {
  const [state, setState] = useState<LoadState>(initialState);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('rekomendasi');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const titleId = useId();

  useEffect(() => {
    let alive = true;
    apiGet<TemplatesResponse>('get_templates')
      .then((data) => {
        if (alive) setState(readyState(data, Date.now()));
      })
      .catch((err: unknown) => {
        if (!alive) return;
        // Pesan teknis server tidak ditampilkan ke pengunjung; koneksi putus diberi tahu apa adanya
        const message =
          err instanceof ApiError && err.code === 'NETWORK'
            ? err.message
            : 'Terjadi kendala saat memuat template. Silakan coba lagi beberapa saat lagi.';
        // Katalog dari preload sudah tampil: gagal menyegarkan tidak menggantinya dengan pesan error
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', message }));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const templates = state.status === 'ready' ? state.templates : NO_TEMPLATES;
  const categories = state.status === 'ready' ? state.categories : NO_CATEGORIES;
  const newestSlug = state.status === 'ready' ? state.newestSlug : null;

  const indexed = useMemo(() => indexTemplates(templates), [templates]);
  const popular = useMemo(() => buildPopularKeywords(indexed, categories), [indexed, categories]);
  const results = useMemo(
    () =>
      sortTemplates(
        indexed
          .filter(({ template, haystack }) => (category === ALL || template.category === category) && matchesQuery(haystack, deferredQuery))
          .map(({ template }) => template),
        sort,
      ),
    [indexed, category, deferredQuery, sort],
  );
  const shown = results.slice(0, limit);
  const filtered = category !== ALL || query.trim() !== '';
  const normalizedQuery = normalize(query);
  const showTabs = categories.length >= 2;
  const showSearch = templates.length >= SEARCH_MIN;
  const showExtras = templates.length >= EXTRAS_MIN;
  // Katalog kecil (tanpa tab & kolom cari): baris jumlah langsung menempel di atas grid
  const countOnly = state.status === 'ready' && templates.length > 0 && !showTabs && !showSearch;
  // Tidak ada yang cocok: tetap tawarkan template yang ada (urutan mengikuti pilihan "Urutkan")
  const available = useMemo(
    () => (results.length === 0 ? sortTemplates(templates, sort).slice(0, PAGE_SIZE) : NO_TEMPLATES),
    [results.length, templates, sort],
  );

  // Setiap perubahan filter mengembalikan daftar ke halaman pertama
  const changeCategory = (name: string) => {
    setCategory(name);
    setLimit(PAGE_SIZE);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setLimit(PAGE_SIZE);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setLimit(PAGE_SIZE);
  };
  const resetFilters = () => {
    setCategory(ALL);
    setQuery('');
    setLimit(PAGE_SIZE);
  };
  const togglePopular = (label: string) => changeQuery(normalizedQuery === normalize(label) ? '' : label);

  const countText = filtered
    ? `${results.length} dari ${templates.length} template`
    : `${templates.length} template`;
  // Panel datar (card-flat): putih + garis tipis, terlihat di latar section putih maupun abu
  const panel = 'flex flex-col items-center rounded-[24px] bg-surface px-6 py-12 text-center ring-1 ring-inset ring-line sm:py-16';
  const ready = state.status === 'ready';
  const availableTitleId = `${titleId}-tersedia`;

  return (
    <section
      id="templates"
      aria-labelledby={titleId}
      className={`section-screen ${alt ? 'bg-alt' : 'bg-canvas'}`}
    >
      <div className="container-site w-full">
        <SectionHeading
          index={number}
          label="Template"
          title="Pilih"
          accent="Template"
          titleId={titleId}
          // Biasanya tombol katalog duduk sejajar tab kategori; tanpa tab (katalog kecil) tetap di samping judul
          action={!showTabs && state.status !== 'loading' ? <CatalogLink /> : undefined}
        />

        {state.status === 'loading' && <ToolbarSkeleton />}

        {ready && templates.length > 0 && (
          <div className="mt-8 sm:mt-10 xl:mt-12">
            {/* Tab kategori (seperti Shots / Designers / Services di Dribbble), hanya bila ada pilihan nyata */}
            {showTabs && (
              // Tab di kiri, "Lihat Semua Template" di kanan pada baris yang sama (pemilik 2026-10-24)
              <div className="flex items-center gap-4">
                {/* Padding kiri (HP: selebar gutter, desktop: 4px) agar outline fokus tidak terpotong overflow */}
                <div className={`-ml-5 min-w-0 flex-1 overflow-x-auto pl-5 pr-1 sm:-ml-1 sm:pl-1 ${NO_SCROLLBAR}`}>
                  <div className="flex w-max gap-2 py-1.5" role="group" aria-label="Kategori template">
                    {[ALL, ...categories].map((name) => (
                      // chip-site: aktif = aria-pressed (biru solid), jelas beda dari chip kata kunci "Populer" (tonal)
                      <button
                        key={name}
                        type="button"
                        aria-pressed={category === name}
                        onClick={() => changeCategory(name)}
                        className="chip-site max-sm:h-8 max-sm:px-3 max-sm:text-xs max-sm:after:-inset-y-1.5"
                      >
                        {name === ALL ? 'Semua' : name}
                      </button>
                    ))}
                  </div>
                </div>
                <CatalogLink />
              </div>
            )}

            {/* Kolom cari besar, tombol bulat biru di kanan (sama dengan katalog /template) */}
            {showSearch && <TemplateSearchBox value={query} onChange={changeQuery} className={showTabs ? 'mt-3 sm:mt-4' : ''} />}

            {/* "Sudah termasuk" tepat di bawah kolom cari (pil penuh di desktop) */}
            <IncludesStrip className={showTabs || showSearch ? 'mt-3 sm:mt-4' : ''} />

            {/* Populer + jumlah hasil + Urutkan (katalog kecil: jumlah saja) */}
            <div className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6 ${showTabs || showSearch ? 'mt-2 sm:mt-3' : ''}`}>
              {showExtras && popular.length > 0 && (
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="shrink-0 text-[13px] font-semibold text-fg sm:text-sm">Populer:</span>
                  <div className={`-ml-1 -mr-5 min-w-0 flex-1 overflow-x-auto pl-1 pr-5 sm:-mr-1 sm:pr-1 ${NO_SCROLLBAR}`}>
                    <div className="flex w-max gap-1.5 py-2 sm:gap-2" role="group" aria-label="Kata kunci populer">
                      {popular.map((label) => {
                        const active = normalizedQuery === normalize(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={active}
                            onClick={() => togglePopular(label)}
                            className={`relative inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium ring-1 ring-inset transition-colors max-sm:h-7 max-sm:px-3 max-sm:text-xs max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-2 ${
                              active
                                ? 'bg-brand-50 text-brand-700 ring-brand-200'
                                : 'bg-surface text-muted ring-line hover:text-fg hover:ring-line-strong'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {/* Jumlah di kanan hanya bila ada kolom cari selebar penuh; katalog kecil: rata kiri, sejajar grid */}
              <div className={`flex items-center justify-between gap-3 sm:gap-4 ${showSearch ? 'sm:ml-auto sm:justify-end' : ''}`}>
                <p role="status" className="text-[13px] tabular-nums text-subtle sm:text-sm">
                  {countText}
                </p>
                {showExtras && <SortMenu value={sort} options={SORT_OPTIONS} onChange={changeSort} />}
              </div>
            </div>
          </div>
        )}

        <div className={countOnly ? 'mt-3 sm:mt-4' : 'mt-6 sm:mt-8'} aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && (
            <>
              <span className="sr-only" role="status">
                Memuat template…
              </span>
              <ul className={gridFor(8)} aria-hidden>
                {Array.from({ length: 8 }, (_, i) => (
                  <TemplateShotSkeleton
                    key={i}
                    className={i >= 6 ? 'max-xl:hidden' : i >= 4 ? 'max-lg:hidden' : i >= 2 ? 'max-sm:hidden' : ''}
                  />
                ))}
              </ul>
            </>
          )}

          {state.status === 'error' && (
            <div className={panel} role="alert">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
                <AlertCircle className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Daftar template belum bisa dimuat</h3>
              <p className="mt-1.5 max-w-md text-sm text-muted">{state.message}</p>
              <button type="button" onClick={retry} className="btn btn-outline mt-6">
                <RotateCw className="h-4 w-4" aria-hidden />
                Coba lagi
              </button>
            </div>
          )}

          {ready && templates.length === 0 && (
            <div className={panel}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
                <LayoutTemplate className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Template sedang kami siapkan</h3>
              <p className="mt-1.5 max-w-md text-sm text-muted">
                Belum ada template yang bisa dipesan saat ini. Sementara itu, kami bisa membuatkan website atau aplikasi mobile
                custom sesuai kebutuhan Anda.
              </p>
              <CustomLink primary className="mt-6" />
            </div>
          )}

          {ready && templates.length > 0 && results.length === 0 && (
            <>
              <div className={panel}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-primary">
                  <SearchX className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg sm:text-lg">Tidak ada template yang cocok</h3>
                <p className="mt-1.5 max-w-md text-sm text-muted">
                  {query.trim() ? (
                    <>
                      Belum ada hasil untuk “<span className="font-medium text-fg">{query.trim()}</span>”
                      {category !== ALL && ` di kategori ${category}`}.
                    </>
                  ) : (
                    'Belum ada template di kategori ini.'
                  )}{' '}
                  Coba kata kunci lain, atau ceritakan kebutuhan Anda dan kami buatkan desain custom.
                </p>
                {/* Pesan Custom = langkah berikutnya yang paling berguna, jadi tombol utama; reset = sekunder */}
                <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                  <CustomLink primary />
                  <button type="button" onClick={resetFilters} className="btn btn-outline">
                    Lihat Semua Template
                  </button>
                </div>
              </div>

              {/* Tidak pernah buntu: template yang tersedia tetap ditawarkan di bawah panel */}
              {available.length > 0 && (
                <div className="mt-10 sm:mt-14">
                  <h3 id={availableTitleId} className="text-base font-semibold text-fg sm:text-lg">
                    Template yang tersedia
                  </h3>
                  <ul className={`mt-4 sm:mt-6 ${gridFor(available.length)}`} aria-labelledby={availableTitleId}>
                    {available.map((tpl, index) => (
                      <TemplateShot
                        key={tpl.slug}
                        template={tpl}
                        index={index}
                        isNew={tpl.slug === newestSlug}
                        showCategory={showTabs}
                        headingLevel={4}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {shown.length > 0 && (
            <>
              <ul className={gridFor(shown.length)}>
                {shown.map((tpl, index) => (
                  <TemplateShot
                    key={tpl.slug}
                    template={tpl}
                    index={index}
                    isNew={tpl.slug === newestSlug}
                    showCategory={showTabs}
                  />
                ))}
              </ul>
              {results.length > shown.length && (
                <div className="mt-10 flex justify-center sm:mt-14">
                  <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="btn btn-outline">
                    Tampilkan lebih banyak
                    <span className="tabular-nums text-subtle">({results.length - shown.length})</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Tombol "Lihat Semua Template" & daftar "Per kategori:" di bawah grid dihapus (pemilik 2026-10-24): katalog
              lewat tombol di baris tab; halaman kategori tetap tertaut dari footer di setiap halaman dan dari /template */}

        </div>
      </div>
    </section>
  );
};

/** Tombol ke form pesanan custom (label glosarium "Pesan Custom"). */
const CustomLink: React.FC<{ primary?: boolean; className?: string }> = ({ primary = false, className = '' }) => (
  <Link to={CUSTOM_HREF} className={`btn group ${primary ? 'btn-primary' : 'btn-outline'} ${className}`}>
    Pesan Custom
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
  </Link>
);

/**
 * Ke katalog lengkap (pemilik 2026-10-24, menggantikan "Butuh desain custom? Pesan Custom"): satu-satunya tombol katalog
 * di section (yang di bawah grid dihapus), jadi tampil juga di HP. Ikon tata letak di kiri seperti tombol lama di bawah
 * grid; setinggi chip kategori (btn-sm) agar sebaris rapi.
 */
const CatalogLink: React.FC = () => (
  <Link to={HUB_PATHS.catalog} className="btn btn-sm btn-outline shrink-0">
    <LayoutTemplate className="h-4 w-4" aria-hidden />
    Lihat Semua Template
  </Link>
);

/** Placeholder toolbar saat memuat, agar tinggi section tidak meloncat. */
const ToolbarSkeleton: React.FC = () => {
  const block = TINT;
  return (
    <div className="mt-8 sm:mt-10 xl:mt-12" aria-hidden>
      <div className="flex gap-1.5 py-1.5">
        {['w-16', 'w-32', 'w-28'].map((width) => (
          <span key={width} className={`h-8 rounded-full sm:h-10 ${width} ${block}`} />
        ))}
        <span className={`ml-auto h-8 w-40 shrink-0 rounded-full sm:h-9 sm:w-48 ${block}`} />
      </div>
      <div className={`mt-3 h-12 rounded-full sm:mt-4 sm:h-14 ${block}`} />
      <div className="mt-2 flex items-center gap-2 py-2 sm:mt-3">
        {['w-16', 'w-24', 'w-20', 'w-28'].map((width) => (
          <span key={width} className={`h-7 rounded-full sm:h-8 ${width} ${block}`} />
        ))}
      </div>
    </div>
  );
};

export default Templates;
