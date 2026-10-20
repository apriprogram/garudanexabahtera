// Kerangka bersama template: variabel warna aksen, container query (tata letak mengikuti lebar wadah, bukan
// viewport, sehingga pratinjau CMS versi HP tetap akurat), navigasi antar section, dan tombol WhatsApp melayang.
import { useCallback, useEffect, useMemo, useRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import type { SiteContent } from '../types';
import { WhatsAppIcon } from './icons';
import { TemplateRuntimeContext, useTemplateRuntime } from './runtime';
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
  /** Warna aksen bawaan template bila brand.accent_color kosong/tidak valid */
  defaultAccent: string;
  className?: string;
  children: ReactNode;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TemplateShell({ content, preview = false, defaultAccent, className = '', children }: ShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const brand = getSection(content, 'brand');
  const contact = getSection(content, 'contact');
  const accent = text(brand, 'accent_color');
  const style = useMemo(() => accentVars(accent, defaultAccent), [accent, defaultAccent]);
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

  // Situs live: buka langsung ke #kontak dsb. bila URL membawa hash
  useEffect(() => {
    if (preview || typeof window === 'undefined' || !window.location.hash) return;
    const timer = window.setTimeout(() => goTo(decodeURIComponent(window.location.hash.slice(1))), 60);
    return () => window.clearTimeout(timer);
  }, [preview, goTo]);

  const runtime = useMemo(() => ({ preview, goTo }), [preview, goTo]);

  return (
    <TemplateRuntimeContext.Provider value={runtime}>
      <div
        ref={rootRef}
        style={style}
        className={`relative isolate w-full scroll-mt-(--tpl-sticky-top) bg-white font-sans text-fg antialiased ${className}`}
      >
        <div className="@container">{children}</div>
        {!preview && waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat WhatsApp"
            className="fixed bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] right-[max(16px,env(safe-area-inset-right))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-colors hover:bg-whatsapp-hover sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
          >
            <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </a>
        )}
      </div>
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
 * Tautan dari konten: gulir ke section, atau tautan keluar (tab baru untuk http/https).
 * Mode pratinjau: tautan keluar tidak dibuka.
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
  /** Dipanggil setelah klik (mis. menutup menu HP) */
  onNavigate?: () => void;
} & Omit<HTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'onClick'>) {
  const { preview, goTo } = useTemplateRuntime();
  if (!action) return null;

  if (action.kind === 'section') {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      goTo(action.target);
      onNavigate?.();
    };
    return (
      <a {...rest} href={`#${SECTION_ANCHOR[action.target] ?? action.target}`} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }

  if (preview) {
    return (
      <a
        {...rest}
        role="link"
        tabIndex={0}
        aria-disabled="true"
        title="Tautan tidak dibuka pada pratinjau"
        onClick={(e) => {
          e.preventDefault();
          onNavigate?.();
        }}
        className={`cursor-default ${className}`}
      >
        {children}
      </a>
    );
  }

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
