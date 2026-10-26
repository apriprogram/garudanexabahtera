// Kerangka bersama template: variabel warna aksen, container query (tata letak mengikuti lebar wadah, bukan
// viewport, sehingga pratinjau CMS versi HP tetap akurat), navigasi antar section, tombol WhatsApp melayang, dan tombol
// "kembali ke atas" yang muncul setelah layar pertama.
// Mode pratinjau (demo & CMS): tautan keluar tidak dibuka, tetapi memunculkan keterangan singkat di dekat tautan.
// Halaman selain beranda (daftar/tulisan berita, lihat ./siteData): tautan section menuju beranda "basePath/#anchor".
import { ArrowUp, Info } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';
import type { SiteContent } from '../types';
import { TEMPLATE_FONTS, useTemplateFont, type TemplateFont } from './fonts';
import { WhatsAppIcon } from './icons';
import './template.css';
import { TemplateRuntimeContext, useTemplateRuntime } from './runtime';
import { useSiteData } from './siteData';
import { SiteLink } from './SiteLink';
import {
  SECTION_ANCHOR,
  accentVars,
  getSection,
  isExternalHref,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from './utils';

interface ShellProps {
  content: SiteContent;
  preview?: boolean;
  /**
   * Teruskan prop `motion` template apa adanya. Bawaan `!preview`: pratinjau CMS diam, situs live bergerak;
   * SiteRenderer mengirim true untuk demo & situs live. prefers-reduced-motion selalu menang.
   */
  motion?: boolean;
  /** Huruf judul (FONT_DISPLAY di ./layout); bawaan Inter */
  displayFont?: TemplateFont;
  /** Warna aksen bawaan template bila brand.accent_color kosong/tidak valid */
  defaultAccent: string;
  className?: string;
  children: ReactNode;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Keterangan pratinjau ────────────────────────────────────────────────────

interface PreviewNotice {
  id: number;
  message: string;
  /** Posisi tautan yang diklik (koordinat layar saat diklik) */
  anchor: { top: number; bottom: number; left: number; width: number };
}

/** Pratinjau: munculkan keterangan di dekat tautan yang tidak dibuka. */
const PreviewNoticeContext = createContext<((anchor: HTMLElement, message: string) => void) | null>(null);

const NOTICE_MS = 4500;

/** Tujuan tautan keluar untuk kalimat "Di situs asli, tautan ini membuka …". */
function previewTarget(href: string): string {
  const value = href.trim().toLowerCase();
  if (value.startsWith('tel:')) return 'panggilan telepon';
  if (value.startsWith('mailto:')) return 'aplikasi email';
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)(\/|$)/.test(value)) return 'WhatsApp';
  if (/google\.[a-z.]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/.test(value)) return 'Google Maps';
  const social: [RegExp, string][] = [
    [/instagram\.com/, 'Instagram'],
    [/(facebook|fb)\.com/, 'Facebook'],
    [/linkedin\.com/, 'LinkedIn'],
    [/(youtube\.com|youtu\.be)/, 'YouTube'],
    [/tiktok\.com/, 'TikTok'],
  ];
  return social.find(([pattern]) => pattern.test(value))?.[1] ?? 'halaman tujuan';
}

const previewMessage = (href: string) => `Ini pratinjau. Di situs asli, tautan ini membuka ${previewTarget(href)}.`;

/** Tanpa warna hover: tautan pratinjau tidak dibuka, jadi tidak boleh tampak seperti tombol aktif. */
const withoutHover = (className: string) =>
  className
    .split(/\s+/)
    .filter((cls) => cls && !/(^|:)hover:/.test(cls))
    .join(' ');

/**
 * Kotak keterangan di lapisan melayang pratinjau. Posisi dihitung dari tautan yang diklik: di bawahnya, atau di
 * atasnya bila tidak muat di area yang terlihat; selalu di dalam lebar template. Lapisan menempel di tepi bawah
 * area yang terlihat, jadi semua posisi relatif ke tepi itu (dibagi skala bila pratinjau CMS diperkecil).
 */
function NoticeBubble({ notice, layerRef }: { notice: PreviewNotice; layerRef: RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const el = ref.current;
    if (!layer || !el) return;
    const box = layer.getBoundingClientRect();
    const scale = layer.offsetWidth > 0 && box.width > 0 ? box.width / layer.offsetWidth : 1;
    const { anchor } = notice;
    const gap = 8;
    const margin = 12;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const below = (anchor.bottom - box.top) / scale + gap;
    const top = below + height <= -margin ? below : (anchor.top - box.top) / scale - gap - height;
    const center = (anchor.left + anchor.width / 2 - box.left) / scale;
    const left = Math.max(margin, Math.min(center - width / 2, layer.offsetWidth - width - margin));
    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.style.visibility = 'visible';
  }, [notice, layerRef]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ visibility: 'hidden' }}
      className="absolute flex w-max max-w-[min(300px,calc(100%-24px))] items-start gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[13px] leading-snug text-fg shadow-float ring-1 ring-line motion-safe:animate-fade-in"
    >
      <Info className="mt-px h-4 w-4 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
      <span>{notice.message}</span>
    </div>
  );
}

// ─── Kerangka ────────────────────────────────────────────────────────────────

const WA_FLOAT =
  'flex items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-colors hover:bg-whatsapp-hover';
const TOP_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-full bg-white text-fg shadow-float ring-1 ring-line transition-colors hover:bg-alt motion-safe:animate-fade-in';

/**
 * true setelah penanda setinggi layar pertama (0–720 px dari awal situs) seluruhnya lewat ke atas. Penanda dibuat tinggi
 * agar gulir cepat tidak bisa melompatinya. Juga di bingkai HP demo yang punya gulir sendiri: penanda tidak terlihat dan
 * tepi bawahnya di separuh atas layar = sudah dilewati. Tanpa IntersectionObserver → false.
 */
function usePastFirstScreen(sentinel: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom < viewport / 2);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinel]);
  return past;
}

export function TemplateShell({ content, preview = false, motion, displayFont = 'inter', defaultAccent, className = '', children }: ShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const showTop = usePastFirstScreen(topSentinel);
  const [notice, setNotice] = useState<PreviewNotice | null>(null);
  const brand = getSection(content, 'brand');
  const contact = getSection(content, 'contact');
  const accent = text(brand, 'accent_color');
  const motionAllowed = motion ?? !preview;
  const fontFamily = (TEMPLATE_FONTS[displayFont] ?? TEMPLATE_FONTS.inter).family;
  const style = useMemo(
    () => ({ ...accentVars(accent, defaultAccent), '--tpl-font-display': fontFamily }) as CSSProperties,
    [accent, defaultAccent, fontFamily],
  );
  useTemplateFont(displayFont);
  // Nomor WhatsApp tetap dipakai walau section Kontak disembunyikan (nomor diisi = ingin dihubungi)
  const waHref = whatsappHref(text(contact, 'whatsapp'), text(contact, 'whatsapp_message'));

  const goTo = useCallback((target: string) => {
    const root = rootRef.current;
    if (!root) return;
    const key = sectionFromAnchor(target);
    const selector = `[data-tpl-section="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key.replace(/[^\w-]/g, '')}"]`;
    const el = key === 'hero' || key === 'top' ? root : root.querySelector<HTMLElement>(selector);
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const notify = useCallback((anchor: HTMLElement, message: string) => {
    const { top, bottom, left, width } = anchor.getBoundingClientRect();
    setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, message, anchor: { top, bottom, left, width } }));
  }, []);

  // Keterangan pratinjau hilang sendiri; klik berikutnya menggantinya
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Situs live: buka langsung ke #kontak dsb. bila URL membawa hash, juga saat kembali ke beranda dari halaman tulisan
  // ("/#berita") tanpa memuat ulang halaman
  const onHome = useSiteData().route.kind === 'home';
  useEffect(() => {
    if (preview || !onHome || typeof window === 'undefined' || !window.location.hash) return;
    const timer = window.setTimeout(() => {
      let target = window.location.hash.slice(1);
      try {
        target = decodeURIComponent(target);
      } catch {
        // hash rusak (mis. "%E0") → apa adanya
      }
      goTo(target);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [preview, onHome, goTo]);

  const runtime = useMemo(() => ({ preview, motion: motionAllowed, goTo }), [preview, motionAllowed, goTo]);
  const waIcon = <WhatsAppIcon className={preview ? 'h-6 w-6' : 'h-6 w-6 sm:h-7 sm:w-7'} />;
  // Kembali ke atas: di atas tombol WhatsApp (sejajar tengah), atau di pojok bila tanpa WhatsApp
  const topButton = showTop && (
    <button
      type="button"
      onClick={() => goTo('top')}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className={`${TOP_BUTTON} ${
        preview
          ? `pointer-events-auto absolute ${waHref ? 'bottom-[76px] right-[18px]' : 'bottom-4 right-4'}`
          : `fixed z-40 ${
              waHref
                ? 'bottom-[calc(max(16px,calc(env(safe-area-inset-bottom)+8px))+60px)] right-[max(18px,calc(env(safe-area-inset-right)+2px))] sm:bottom-[104px] sm:right-[38px]'
                : 'bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] sm:bottom-8 sm:right-8'
            }`
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </button>
  );

  return (
    <TemplateRuntimeContext.Provider value={runtime}>
      <PreviewNoticeContext.Provider value={preview ? notify : null}>
        <div
          ref={rootRef}
          style={style}
          data-tpl-root=""
          data-tpl-motion={motionAllowed ? 'on' : 'off'}
          className={`relative isolate w-full scroll-mt-(--tpl-sticky-top) bg-white font-sans text-fg antialiased ${className}`}
        >
          {/* Penanda "sudah lewat layar pertama" untuk tombol kembali ke atas */}
          <div ref={topSentinel} data-tpl-top-sentinel="" aria-hidden className="pointer-events-none absolute left-0 top-0 h-[720px] w-px" />
          <div className="@container">{children}</div>
          {preview ? (
            // Lapisan melayang pratinjau: menempel di tepi bawah area yang terlihat (jendela demo, bingkai HP, atau
            // panel CMS), jadi tombol WhatsApp & keterangan tetap di dalam pratinjau dan tidak menutupi bar demo.
            <div ref={layerRef} className="pointer-events-none sticky bottom-0 z-40 h-0">
              {waHref && (
                <ActionLink
                  action={{ kind: 'external', href: waHref }}
                  aria-label="Chat WhatsApp"
                  className={`pointer-events-auto absolute bottom-4 right-4 h-12 w-12 ${WA_FLOAT}`}
                >
                  {waIcon}
                </ActionLink>
              )}
              {topButton}
              <p className="sr-only" role="status" aria-live="polite">
                {notice?.message ?? ''}
              </p>
              {notice && <NoticeBubble key={notice.id} notice={notice} layerRef={layerRef} />}
            </div>
          ) : (
            <>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat WhatsApp"
                  className={`fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 h-12 w-12 sm:bottom-8 sm:right-8 sm:h-14 sm:w-14 ${WA_FLOAT}`}
                >
                  {waIcon}
                </a>
              )}
              {topButton}
            </>
          )}
        </div>
      </PreviewNoticeContext.Provider>
    </TemplateRuntimeContext.Provider>
  );
}

/** Wadah section: atribut untuk navigasi, id anchor (situs live saja), dan jarak gulir di bawah header lengket. */
export function TemplateSection({
  sectionKey,
  className = '',
  children,
  ...rest
}: { sectionKey: string; className?: string; children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const { preview } = useTemplateRuntime();
  return (
    <section
      {...rest}
      data-tpl-section={sectionKey}
      id={preview ? undefined : SECTION_ANCHOR[sectionKey] ?? sectionKey}
      className={`scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Tautan dari konten: gulir ke section, halaman lain di situs (`site`), atau tautan keluar (tab baru untuk http/https).
 * Di halaman selain beranda, tautan section menuju "basePath/#anchor" (logo/hero → beranda).
 * Mode pratinjau: tautan keluar tidak dibuka; klik/Enter memunculkan keterangan "Di situs asli, tautan ini membuka …".
 */
export function ActionLink({
  action,
  className = '',
  children,
  onNavigate,
  ...rest
}: {
  action: LinkAction | null;
  className?: string;
  children: ReactNode;
  /** Dipanggil saat diklik (mis. menutup menu HP) */
  onNavigate?: () => void;
} & Omit<HTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'onClick'>) {
  const { preview, goTo } = useTemplateRuntime();
  const notify = useContext(PreviewNoticeContext);
  const onHome = useSiteData().route.kind === 'home';
  if (!action) return null;

  if (!preview && (action.kind === 'site' || (action.kind === 'section' && !onHome))) {
    const path =
      action.kind === 'site'
        ? action.path
        : action.target === 'hero' || action.target === 'top'
          ? '/'
          : `/#${SECTION_ANCHOR[action.target] ?? action.target}`;
    return (
      <SiteLink {...rest} path={path} onNavigate={onNavigate} className={className}>
        {children}
      </SiteLink>
    );
  }

  if (action.kind === 'section') {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      // Tutup menu HP dulu (DOM diperbarui sinkron), baru gulir: menu ada di dalam alur halaman, jadi gulir yang
      // dihitung saat menu masih terbuka kelewatan setinggi menu dan judul section tertutup di atas layar.
      if (onNavigate) flushSync(onNavigate);
      goTo(action.target);
    };
    return (
      <a {...rest} href={`#${SECTION_ANCHOR[action.target] ?? action.target}`} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }

  if (preview) {
    const explain = (el: HTMLElement) => {
      notify?.(el, previewMessage(action.kind === 'site' ? action.path : action.href));
      onNavigate?.();
    };
    return (
      <a
        {...rest}
        role="link"
        tabIndex={0}
        aria-disabled="true"
        title="Tautan tidak dibuka pada pratinjau"
        onClick={(e) => {
          e.preventDefault();
          explain(e.currentTarget);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLAnchorElement>) => {
          rest.onKeyDown?.(e);
          if (e.key !== 'Enter') return;
          e.preventDefault();
          explain(e.currentTarget);
        }}
        className={`cursor-default ${withoutHover(className)}`}
      >
        {children}
      </a>
    );
  }

  if (action.kind === 'site') return null; // tidak terjangkau: `site` di luar pratinjau sudah dirender <SiteLink>
  const external = isExternalHref(action.href);
  return (
    <a
      {...rest}
      href={action.href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={() => onNavigate?.()}
      className={className}
    >
      {children}
    </a>
  );
}
