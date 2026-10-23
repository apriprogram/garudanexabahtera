import React, { useEffect, useRef, useState } from 'react';
import {
  Check, CheckCircle2, ChevronRight, Code2, FileText, Globe2, LayoutTemplate, Lock, Pause, PenLine, Play, Rocket, Send,
} from 'lucide-react';
import { formatRupiah } from '../../../types/platform';
import { prefersReducedMotion } from '../../../hooks/useInView';
import { useHydrated } from '../../../lib/preload';
import { LogoBadge, LogoMark } from '../../ui/LogoMark';
import { SmartLink } from '../../layout/SmartLink';
import { HERO_FLOWS, STEP_MS, type HeroMode, type ShowcaseItem } from './showcase';

interface HeroShowcaseProps {
  /** Mode toggle hero: menentukan alur di rail + status di layar */
  mode: HeroMode;
  /** Langkah aktif (dipegang Hero agar kembali ke 0 saat mode berganti) */
  step: number;
  onStep: (step: number) => void;
  /** null = sedang memuat */
  items: ShowcaseItem[] | null;
  sample: boolean;
  slide: number;
  onNext: () => void;
  /** Katalog #templates disembunyikan admin → layar contoh tidak menautkan ke sana */
  templatesHidden: boolean;
  /** Berhenti sementara tanpa mengubah tombol jeda (mis. selama "Lihat Demo" di-hover / difokus) */
  hold?: boolean;
  /**
   * Slide pertama = gambar terbesar di atas lipatan → fetchpriority="high" (bawaan). false bila hero memakai latar
   * gambar/video: latar itu kandidat LCP-nya, jadi slide pertama tetap eager tanpa merebut bandwidth CSS & latar.
   */
  priority?: boolean;
}

const DOMAIN = 'bisnisanda.com';

/**
 * Visual produk di kanan hero (port HeroVideo BELAJAR CPNS): bingkai browser datar yang menayangkan pratinjau
 * template asli bergantian, dengan rail langkah di bawahnya yang MENGIKUTI mode hero:
 * - Template: Pilih template → Bayar via Midtrans → Domain aktif → Kelola lewat CMS;
 * - Custom: Konsultasi → Penawaran → Pengerjaan → Rilis (tanpa harga/pembayaran template).
 * Langkah aktif terisi perlahan; klik langkah untuk melompat; bisa dijeda (WCAG 2.2.2). Mulai 1280px label keempat
 * langkah terlihat sekaligus (di bawahnya hanya langkah aktif yang berlabel).
 * Berhenti saat tidak terlihat atau `hold`, tidak berputar otomatis bila reduced motion.
 * Mode Custom memakai pratinjau template sebagai contoh tampilan (diberi keterangan "Contoh tampilan") sampai ada
 * visual proyek custom asli.
 */
export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  mode,
  step,
  onStep,
  items,
  sample,
  slide,
  onNext,
  templatesHidden,
  hold = false,
  priority = true,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Preferensi browser baru dibaca setelah hidrasi (HTML prerender = berputar); null = belum dipilih pengunjung
  const hydrated = useHydrated();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !(hydrated && prefersReducedMotion());
  const [onScreen, setOnScreen] = useState(true);

  // Jeda otomatis saat tayangan tidak terlihat (digulir lewat / tab lain)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let intersecting = true;
    const io = new IntersectionObserver(([entry]) => {
      intersecting = Boolean(entry?.isIntersecting);
      setOnScreen(intersecting && !document.hidden);
    });
    const onVisibility = () => setOnScreen(intersecting && !document.hidden);
    io.observe(el);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const flow = HERO_FLOWS[mode];
  const steps = flow.steps;
  const custom = mode === 'custom';
  const ready = items !== null && items.length > 0;
  const running = ready && playing && onScreen && !hold;
  const current = ready ? items[Math.min(slide, items.length - 1)] : null;
  // Situs sudah online: template sejak domain aktif (langkah 3), custom saat rilis (langkah 4)
  const live = custom ? step >= 3 : step >= 2;
  const staging = custom && step === 2;

  const advance = () => {
    if (step >= steps.length - 1) {
      onStep(0);
      onNext();
    } else {
      onStep(step + 1);
    }
  };

  const nextSlide = () => {
    onStep(0);
    onNext();
  };

  // Seluruh layar = tautan: custom → form pesanan; template → detail (contoh → katalog, bila katalog tidak disembunyikan)
  const screenLink: { href: string; label: string } | null = custom
    ? { href: '/pesan-custom', label: 'Pesan website atau aplikasi mobile custom' }
    : current?.slug
      ? { href: `/template/${encodeURIComponent(current.slug)}`, label: `Lihat detail template ${current.name}` }
      : templatesHidden
        ? null
        : { href: '#templates', label: 'Lihat katalog template' };

  return (
    // is-paused: semua isian progres (rail + layar) ikut berhenti saat tayangan dijeda / tidak terlihat
    <div ref={wrapRef} className={`relative ${running ? '' : 'is-paused'}`}>
      {/* ---------- Bingkai browser ---------- */}
      <div className="rounded-[20px] bg-surface p-1.5 ring-1 ring-inset ring-line sm:rounded-[28px] sm:p-2">
        <div className="flex h-9 items-center gap-2 rounded-full bg-alt pl-1.5 pr-3 sm:h-11 sm:gap-3 sm:pl-2 sm:pr-4">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors duration-500 sm:h-7 sm:w-7 ${
              live ? 'bg-success-50 text-success-700 ring-success/20' : 'bg-surface text-subtle ring-line'
            }`}
            aria-hidden
          >
            {live ? <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} /> : <Globe2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] sm:text-sm" aria-hidden>
            {live ? (
              <span className="font-semibold text-fg">
                <span className="font-medium text-subtle">https://</span>
                {DOMAIN}
              </span>
            ) : staging ? (
              <span className="font-medium text-muted">
                <span className="text-subtle">staging.</span>
                {DOMAIN}
              </span>
            ) : (
              <span className="font-medium text-muted">
                garudanexa.com
                <span className="text-subtle">{custom ? '/pesan-custom' : `/template/${current?.slug ?? 'contoh'}`}</span>
              </span>
            )}
          </span>
          {live && (
            <span className="hidden h-6 shrink-0 animate-fade-up items-center gap-1.5 rounded-full bg-success-50 px-2.5 text-[11px] font-semibold text-success-700 motion-reduce:animate-none min-[420px]:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Online
            </span>
          )}
          {staging && (
            <span className="hidden h-6 shrink-0 animate-fade-up items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-primary motion-reduce:animate-none min-[420px]:inline-flex">
              Staging
            </span>
          )}
          <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
          </span>
        </div>

        {/* ---------- Layar ---------- */}
        <div className="group/layar relative mt-1.5 aspect-[16/10] overflow-hidden rounded-[14px] bg-alt sm:mt-2 sm:rounded-[20px]">
          {!ready ? (
            <div className="flex h-full w-full animate-pulse items-center justify-center bg-alt" role="status">
              <LogoMark className="h-8 text-brand-200 sm:h-10" />
              <span className="sr-only">Memuat pratinjau template...</span>
            </div>
          ) : (
            <>
              {items.map((item, index) => (
                <ShowcaseImage
                  key={item.key}
                  item={item}
                  first={index === 0}
                  priority={index === 0 && priority}
                  active={index === slide}
                  alt={custom ? `Contoh tampilan website (${item.name})` : `Pratinjau template ${item.name}`}
                />
              ))}

              {screenLink && (
                <SmartLink
                  href={screenLink.href}
                  className="group/screen absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-offset-[-4px]"
                >
                  <span className="sr-only">{screenLink.label}</span>
                  <span className="absolute inset-0 rounded-[inherit] bg-fg/0 transition-colors duration-300 group-hover/screen:bg-fg/[0.04]" aria-hidden />
                </SmartLink>
              )}

              {custom && (
                // HP: disembunyikan selama kartu tengah (langkah 1-2) tampil, agar tidak bertumpuk di layar yang pendek
                <span
                  className={`pointer-events-none absolute left-2.5 top-2.5 z-[3] inline-flex h-6 items-center rounded-full bg-surface/90 px-2.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line backdrop-blur sm:left-3 sm:top-3 sm:h-7 sm:px-3 sm:text-xs ${
                    step < 2 ? 'max-sm:hidden' : ''
                  }`}
                  aria-hidden
                >
                  Contoh tampilan
                </span>
              )}

              {current &&
                (custom ? (
                  <CustomOverlay key={`custom-${step}`} step={step} />
                ) : (
                  <TemplateOverlay key={`${current.key}-${step}`} step={step} item={current} sample={sample} />
                ))}
            </>
          )}

          {/* garis tipis di atas gambar */}
          <span className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-fg/[0.06]" aria-hidden />

          {ready && (
            // Tombol toggle: label tetap + aria-pressed (ditekan = dijeda); hanya ikonnya yang berganti. Perangkat ber-mouse:
            // tersembunyi sampai layar di-hover (permintaan pemilik 2026-10-23); fokus keyboard & layar sentuh tetap terlihat
            <button
              type="button"
              onClick={() => setUserPlaying(!playing)}
              className="absolute right-2.5 top-2.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-fg ring-1 ring-inset ring-line backdrop-blur transition-[background-color,opacity] duration-200 hover:bg-surface focus-visible:opacity-100 max-sm:after:absolute max-sm:after:-inset-1 sm:right-3 sm:top-3 sm:h-9 sm:w-9 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/layar:opacity-100"
              aria-label="Jeda tayangan"
              aria-pressed={!playing}
            >
              {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            </button>
          )}

          {ready && items.length > 1 && (
            <button
              type="button"
              onClick={nextSlide}
              className="absolute bottom-2.5 right-2.5 z-10 inline-flex h-7 items-center gap-1 rounded-full bg-fg/75 pl-2.5 pr-1.5 font-mono text-[11px] font-medium tabular-nums text-white backdrop-blur transition-colors hover:bg-fg after:absolute after:-inset-2 sm:bottom-3 sm:right-3"
              aria-label={custom ? 'Contoh tampilan berikutnya' : 'Template berikutnya'}
            >
              {String(slide + 1).padStart(2, '0')}/{String(items.length).padStart(2, '0')}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* ---------- Rail langkah ---------- */}
      <ol className="mt-3 flex items-center gap-2 sm:mt-4 xl:gap-1.5" aria-label={flow.label}>
        {steps.map((item, index) => {
          const on = index === step;
          const done = index < step;
          return (
            <li key={item.key} className={on ? 'min-w-0 flex-1 xl:flex-auto' : 'shrink-0 xl:min-w-0 xl:flex-auto xl:shrink'}>
              <button
                type="button"
                onClick={() => onStep(index)}
                disabled={!ready}
                aria-current={on ? 'step' : undefined}
                aria-label={`Langkah ${index + 1}: ${item.label}`}
                className={`relative flex h-9 w-full items-center rounded-full p-1 text-left ring-1 ring-inset transition-colors after:absolute after:inset-x-0 after:-inset-y-1 disabled:cursor-default sm:h-11 sm:p-1.5 sm:after:hidden xl:h-8 xl:p-1 ${
                  on ? 'bg-surface pr-3 ring-line sm:pr-4 xl:pr-2' : 'bg-alt ring-transparent hover:bg-line/70 xl:pr-2'
                }`}
              >
                {/* Progres langkah = isian biru muda di belakang label. Baru dipasang setelah hidrasi: animationend
                    yang selesai sebelum React siap tidak menggerakkan tayangan, jadi animasinya mulai dari awal di sini. */}
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
                  {on && ready && hydrated && (
                    <span
                      key={`${mode}-${slide}-${step}`}
                      className="step-progress absolute inset-0 bg-brand-50"
                      style={{ '--dur': `${STEP_MS}ms` } as React.CSSProperties}
                      onAnimationEnd={advance}
                    />
                  )}
                </span>
                <span className="relative flex min-w-0 items-center gap-2 xl:gap-1.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition-colors sm:h-8 sm:w-8 xl:h-6 xl:w-6 ${
                      on ? 'bg-fg text-white' : done ? 'bg-primary text-white' : 'bg-surface text-muted ring-1 ring-inset ring-line'
                    }`}
                    aria-hidden
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    className={`truncate text-[11px] font-semibold leading-tight sm:text-[13px] xl:text-[12px] ${
                      on ? 'text-fg' : 'hidden text-muted xl:inline'
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** Ukuran intrinsik pratinjau template (16:10, sama dengan bingkai layar); tampilannya diatur CSS. */
const SHOT_WIDTH = 1600;
const SHOT_HEIGHT = 1000;

/**
 * Gambar pratinjau dengan cadangan: preview_image → SVG bawaan template → logo. Berganti dengan crossfade.
 * Slide pertama ada di HTML prerender dan dimuat segera (eager); dengan `priority` (hero tanpa latar gambar/video) juga
 * fetchpriority="high" dan dipreload head beranda (src/components/sections/hero/heroPreload.ts). Slide lain lazy dan
 * baru segera dimuat saat tampil.
 */
const ShowcaseImage: React.FC<{ item: ShowcaseItem; first: boolean; priority?: boolean; active: boolean; alt: string }> = ({
  item,
  first,
  priority = false,
  active,
  alt,
}) => {
  const [stage, setStage] = useState(0); // 0 = utama, 1 = cadangan, 2 = gagal semua
  const src = stage === 0 ? item.image : stage === 1 ? item.fallbackImage : null;
  const layer = `absolute inset-0 h-full w-full transition-[opacity,transform] duration-700 ease-calm ${
    active ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0'
  }`;

  if (!src) {
    return (
      <div className={`${layer} flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100`} aria-hidden>
        <LogoMark className="h-10 text-brand-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={active ? alt : ''}
      aria-hidden={!active}
      width={SHOT_WIDTH}
      height={SHOT_HEIGHT}
      loading={first || active ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={first ? undefined : 'async'}
      onError={() => setStage((value) => (value === 0 && item.fallbackImage ? 1 : 2))}
      className={`${layer} object-cover object-top`}
    />
  );
};

const ICON = 'h-3.5 w-3.5 sm:h-4 sm:w-4';

/** Chip status kecil di kiri bawah layar (datar: garis tipis, tanpa shadow). */
const StatusChip: React.FC<{ icon: React.ReactNode; tone?: 'brand' | 'success'; children: React.ReactNode }> = ({
  icon,
  tone = 'brand',
  children,
}) => (
  <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] inline-flex max-w-[calc(100%-6rem)] animate-fade-up items-center gap-2 rounded-full bg-surface/95 py-1 pl-1 pr-3 ring-1 ring-inset ring-line backdrop-blur motion-reduce:animate-none sm:bottom-3 sm:left-3 sm:py-1.5 sm:pl-1.5 sm:pr-4">
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
        tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-primary'
      }`}
      aria-hidden
    >
      {icon}
    </span>
    <span className="truncate text-[11px] font-semibold text-fg sm:text-[13px]">{children}</span>
  </span>
);

/**
 * Kartu di tengah layar dengan layar sedikit diredupkan (pembayaran, konsultasi, penawaran).
 * HP: lebar = layar − 7rem dan isinya dipadatkan (detail tambahan `max-sm:hidden`), jadi kartu tidak tertimpa tombol
 * jeda (kanan atas) maupun penghitung slide (kanan bawah).
 */
const CenterCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <span className="pointer-events-none absolute inset-0 z-[2] animate-fade-in bg-fg/[0.08] motion-reduce:animate-none" aria-hidden />
    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center p-4">
      <div className="w-[min(80%,300px)] animate-scale-in rounded-[16px] bg-surface p-3 ring-1 ring-inset ring-line motion-reduce:animate-none max-sm:w-[calc(100%-7rem)] sm:rounded-[20px] sm:p-4">
        {children}
      </div>
    </div>
  </>
);

/** Status layar untuk alur TEMPLATE: nama & harga → pembayaran Midtrans → domain online → edit lewat CMS. */
const TemplateOverlay: React.FC<{ step: number; item: ShowcaseItem; sample: boolean }> = ({ step, item, sample }) => {
  if (step === 0) {
    return (
      <StatusChip icon={<LayoutTemplate className={ICON} />}>
        {item.name}
        <span className="font-medium text-subtle">
          {' · '}
          {sample ? 'contoh tampilan' : item.price !== null ? formatRupiah(item.price) : item.category}
        </span>
      </StatusChip>
    );
  }

  if (step === 1) {
    return (
      <CenterCard>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Midtrans</span>
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-success-50 px-2 text-[10px] font-semibold text-success-700 sm:h-6 sm:text-[11px]">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Lunas
          </span>
        </div>
        <p className="mt-1.5 truncate text-[15px] font-semibold tabular-nums tracking-tight text-fg sm:mt-2 sm:text-xl">
          {!sample && item.price !== null ? formatRupiah(item.price) : 'Pembayaran diterima'}
        </p>
        <p className="truncate text-[11px] text-muted sm:text-xs">Template {item.name}</p>
        {/* Metode pembayaran sengaja tidak dirinci (mengikuti yang tersedia di Midtrans) */}
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-alt px-2 py-0.5 text-[10px] font-medium text-muted max-sm:hidden sm:mt-3 sm:text-[11px]">
          <Lock className="h-3 w-3" aria-hidden />
          Pembayaran aman via Midtrans
        </p>
      </CenterCard>
    );
  }

  if (step === 2) {
    return (
      <StatusChip icon={<Globe2 className={ICON} />} tone="success">
        {DOMAIN} sudah online
      </StatusChip>
    );
  }

  return (
    <>
      {/* Area yang bisa diedit lewat CMS */}
      <span
        className="pointer-events-none absolute left-[6%] top-[14%] z-[2] h-[36%] w-[46%] animate-scale-in rounded-xl border-2 border-dashed border-primary/70 bg-primary/[0.06] motion-reduce:animate-none"
        aria-hidden
      >
        <span className="absolute -top-3 left-2 inline-flex h-6 items-center gap-1 rounded-full bg-primary px-2 text-[10px] font-semibold text-white sm:text-[11px]">
          <PenLine className="h-3 w-3" />
          Edit teks
        </span>
      </span>
      <StatusChip icon={<PenLine className={ICON} />}>Konten diperbarui lewat CMS</StatusChip>
    </>
  );
};

/** Status layar untuk alur CUSTOM: chat konsultasi → penawaran → progres pengerjaan → rilis (tanpa harga template). */
const CustomOverlay: React.FC<{ step: number }> = ({ step }) => {
  if (step === 0) {
    return (
      <CenterCard>
        <div className="flex items-center gap-2">
          <LogoBadge className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-fg sm:text-[13px]">Konsultasi gratis</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-700 max-sm:hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Online
          </span>
        </div>
        <div className="mt-2 space-y-1.5 text-[11px] leading-snug sm:mt-3 sm:space-y-2 sm:text-[13px]">
          <p className="ml-auto w-fit max-w-[88%] rounded-[14px] rounded-br-md bg-alt px-2.5 py-1.5 text-fg sm:px-3 sm:py-2">
            Saya butuh website & aplikasi untuk bisnis saya.
          </p>
          <p className="w-fit max-w-[88%] rounded-[14px] rounded-bl-md bg-brand-50 px-2.5 py-1.5 text-fg max-sm:hidden sm:px-3 sm:py-2">
            Siap! Kami bantu susun kebutuhannya.
          </p>
        </div>
      </CenterCard>
    );
  }

  if (step === 1) {
    return (
      <CenterCard>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Penawaran
          </span>
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-brand-50 px-2 text-[10px] font-semibold text-primary sm:h-6 sm:text-[11px]">
            <Send className="h-3 w-3" aria-hidden />
            Terkirim
          </span>
        </div>
        <p className="mt-1.5 text-[14px] font-semibold leading-snug tracking-tight text-fg sm:mt-2 sm:truncate sm:text-lg">
          Website + aplikasi mobile
        </p>
        <p className="truncate text-[11px] text-muted sm:hidden">Solusi, jadwal & biaya</p>
        <p className="truncate text-xs text-muted max-sm:hidden">Disusun dari hasil konsultasi Anda</p>
        <ul className="mt-2 flex flex-wrap gap-1 max-sm:hidden sm:mt-3 sm:gap-1.5" aria-hidden>
          {['Rancangan solusi', 'Jadwal kerja', 'Rincian biaya'].map((part) => (
            <li
              key={part}
              className="inline-flex items-center gap-1 rounded-full bg-alt px-2 py-0.5 text-[10px] font-medium text-muted sm:text-[11px]"
            >
              <Check className="h-3 w-3 text-primary" strokeWidth={3} />
              {part}
            </li>
          ))}
        </ul>
      </CenterCard>
    );
  }

  if (step === 2) {
    return (
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] w-[min(calc(100%-6rem),260px)] animate-fade-up rounded-[14px] bg-surface/95 p-2 ring-1 ring-inset ring-line backdrop-blur motion-reduce:animate-none sm:bottom-3 sm:left-3 sm:rounded-[16px] sm:p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary sm:h-7 sm:w-7" aria-hidden>
            <Code2 className={ICON} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold text-fg sm:text-[13px]">Pengerjaan berjalan</span>
            <span className="block truncate text-[10px] text-muted sm:text-[11px]">Desain selesai · pengembangan</span>
          </span>
        </div>
        {/* Empat tahap: 2 selesai, 1 berjalan (terisi selama langkah ini), 1 menunggu */}
        <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="relative h-1.5 overflow-hidden rounded-full bg-alt">
              {index < 2 && <span className="absolute inset-0 bg-primary" />}
              {index === 2 && (
                <span className="step-progress absolute inset-0 bg-primary" style={{ '--dur': `${STEP_MS}ms` } as React.CSSProperties} />
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <StatusChip icon={<Rocket className={ICON} />} tone="success">
      Website & aplikasi Anda sudah rilis
    </StatusChip>
  );
};

export default HeroShowcase;
