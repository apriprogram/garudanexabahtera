import React, { useId, useRef } from 'react';
import { ArrowRight, ArrowUpRight, Check, LayoutTemplate, MessageCircle, Play, Smartphone, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, type TranslationKey } from '../../../hooks/useTranslation';
import { SplitText } from '../../ui/SplitText';
import { SmartLink } from '../../layout/SmartLink';
import type { HeroMode, ShowcaseItem } from './showcase';

interface Mode {
  key: HeroMode;
  /** Ikon segmen, sama dengan segmen alur di section Proses */
  icon: LucideIcon;
  tab: TranslationKey;
  tabShort: TranslationKey;
  lead: TranslationKey;
  accent: TranslationKey;
  points: TranslationKey[];
}

const MODES: Mode[] = [
  {
    key: 'template',
    icon: LayoutTemplate,
    tab: 'home-hero-mode-template',
    tabShort: 'home-hero-mode-template-short',
    lead: 'home-hero-template-lead',
    accent: 'home-hero-template-accent',
    points: ['home-hero-template-point-1', 'home-hero-template-point-2', 'home-hero-template-point-3'],
  },
  {
    key: 'custom',
    icon: Smartphone,
    tab: 'home-hero-mode-custom',
    tabShort: 'home-hero-mode-custom-short',
    lead: 'home-hero-custom-lead',
    accent: 'home-hero-custom-accent',
    points: ['home-hero-custom-point-1', 'home-hero-custom-point-2', 'home-hero-custom-point-3'],
  },
];

const TITLE_CLASS =
  'block text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-fg sm:text-[52px] sm:leading-[1.02] sm:tracking-[-0.04em] lg:text-[48px] xl:text-[60px] 2xl:text-[72px]';

/**
 * Sisi kiri hero (port HeroIntro BELAJAR CPNS): toggle mode berindikator meluncur
 * [Template siap pakai | Website & aplikasi custom] (bentuk & huruf sama dengan segmen alur di section Proses) yang
 * mengganti judul dua warna (muncul kata per kata), tiga poin checklist, dan tombol. Kedua panel ditumpuk di sel grid
 * yang sama, jadi tinggi hero tidak melompat saat mode berganti. State mode dipegang Hero agar visual kanan ikut
 * berganti alur.
 */
interface HeroIntroProps {
  mode: HeroMode;
  onModeChange: (mode: HeroMode) => void;
  /** Template yang sedang tampil di visual kanan (untuk "Lihat Demo"). */
  current: ShowcaseItem | null;
  /** Section katalog #templates disembunyikan admin → tombol mode Template tidak boleh menuju ke sana. */
  templatesHidden: boolean;
  /** true selama "Lihat Demo" di-hover / difokus: tayangan berhenti agar template yang dibuka tidak berganti. */
  onHoldChange?: (hold: boolean) => void;
}

export const HeroIntro: React.FC<HeroIntroProps> = ({ mode: modeKey, onModeChange, current, templatesHidden, onHoldChange }) => {
  const { t } = useTranslation();
  const mode = Math.max(0, MODES.findIndex((item) => item.key === modeKey));
  const setMode = (index: number) => onModeChange(MODES[index].key);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  // Pola tab ARIA: panah kiri/kanan, Home, End memindah mode + fokus
  const onTabKey = (event: React.KeyboardEvent) => {
    const last = MODES.length - 1;
    const next =
      event.key === 'ArrowRight' ? (mode === last ? 0 : mode + 1)
        : event.key === 'ArrowLeft' ? (mode === 0 ? last : mode - 1)
          : event.key === 'Home' ? 0
            : event.key === 'End' ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="max-w-[640px]">
      {/* Toggle mode */}
      <div
        role="tablist"
        aria-label="Pilih layanan"
        onKeyDown={onTabKey}
        className="relative inline-grid animate-fade-up grid-cols-2 rounded-full bg-surface p-1 ring-1 ring-inset ring-line motion-reduce:animate-none"
      >
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-500 ease-calm motion-reduce:transition-none"
          style={{ width: 'calc((100% - 8px) / 2)', transform: `translateX(${mode * 100}%)` }}
        />
        {MODES.map((item, index) => {
          const selected = mode === index;
          return (
            <button
              key={item.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${baseId}-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMode(index)}
              className={`relative z-10 inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors duration-300 after:absolute after:inset-x-0 after:-inset-y-1.5 sm:h-10 sm:px-5 sm:text-sm sm:after:hidden ${
                selected ? 'text-white' : 'text-muted hover:text-fg'
              }`}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              {/* Label pendek di layar sempit & 1024-1279px (kolom hero sempit), panjang di tempat lain */}
              <span className="sm:hidden lg:inline xl:hidden">{t(item.tabShort)}</span>
              <span className="hidden sm:inline lg:hidden xl:inline">{t(item.tab)}</span>
            </button>
          );
        })}
      </div>

      {/* Panel per mode, ditumpuk; yang tidak aktif tak terlihat & tidak bisa difokus */}
      <div className="mt-4 grid sm:mt-8">
        {MODES.map((item, index) => {
          const active = index === mode;
          return (
            <div
              // Kunci berubah saat aktif → isi dipasang ulang dan animasinya diputar lagi
              key={`${item.key}-${active ? 'on' : 'off'}`}
              id={`${baseId}-panel-${item.key}`}
              role={active ? 'tabpanel' : undefined}
              aria-labelledby={active ? `${baseId}-tab-${item.key}` : undefined}
              aria-hidden={active ? undefined : true}
              inert={!active}
              // HP: panel tidak aktif dilepas dari tata letak (hemat tinggi); ≥ 640px tetap ditumpuk agar tidak melompat
              className={`col-start-1 row-start-1 ${active ? '' : 'invisible max-sm:hidden'}`}
            >
              <SplitText
                as={active ? 'h1' : 'p'}
                id={active ? 'hero-title' : undefined}
                delay={100}
                stagger={70}
                className={TITLE_CLASS}
                parts={[{ text: t(item.lead) }, { text: t(item.accent), className: 'text-primary' }]}
              />

              <ul className="mt-5 space-y-2.5 sm:mt-9 sm:space-y-4">
                {item.points.map((point, i) => (
                  <li
                    key={point}
                    className={`flex items-center gap-2 text-[14px] leading-snug text-muted sm:gap-3 sm:text-[17px] sm:leading-normal ${
                      active ? 'animate-fade-up motion-reduce:animate-none' : ''
                    }`}
                    style={{ animationDelay: `${450 + i * 90}ms` }}
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-primary sm:h-6 sm:w-6">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {t(point)}
                  </li>
                ))}
              </ul>

              <div
                className={`mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-11 ${active ? 'animate-fade-up motion-reduce:animate-none' : ''}`}
                style={{ animationDelay: '750ms' }}
              >
                {item.key === 'template' ? (
                  <>
                    <TemplateCta current={current} templatesHidden={templatesHidden} />
                    <DemoLink current={current} label={t('home-hero-demo')} templatesHidden={templatesHidden} onHoldChange={onHoldChange} />
                  </>
                ) : (
                  <>
                    <Link
                      to="/pesan-custom"
                      className="btn btn-primary btn-xl group max-sm:h-auto max-sm:min-h-10 max-sm:w-full max-sm:whitespace-normal max-sm:py-2 max-sm:text-center max-sm:leading-snug"
                    >
                      {t('home-hero-btn-custom')}
                      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 max-sm:h-4 max-sm:w-4" aria-hidden />
                    </Link>
                    <SmartLink href="#kontak" className={TEXT_LINK}>
                      <span className={TEXT_LINK_ICON}>
                        <MessageCircle className="h-4 w-4" aria-hidden />
                      </span>
                      {t('nav-consult')}
                    </SmartLink>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TEXT_LINK =
  'group/link relative inline-flex min-h-11 items-center gap-2.5 rounded-full text-[14px] font-semibold text-fg transition-colors hover:text-primary sm:text-[15px]';
const TEXT_LINK_ICON =
  'flex h-9 w-9 items-center justify-center rounded-full bg-surface text-fg ring-1 ring-inset ring-line transition-colors group-hover/link:bg-brand-50 group-hover/link:text-primary group-hover/link:ring-brand-200 sm:h-10 sm:w-10';

/**
 * Tombol utama mode Template: "Pilih Template" → katalog #templates. Bila katalog disembunyikan admin, ke halaman
 * detail template yang sedang tampil (berisi template lain juga); tanpa template asli → "Konsultasi Gratis" (#kontak).
 */
const TemplateCta: React.FC<{ current: ShowcaseItem | null; templatesHidden: boolean }> = ({ current, templatesHidden }) => {
  const { t } = useTranslation();
  const icon = 'h-5 w-5 max-sm:h-4 max-sm:w-4';

  if (templatesHidden && !current?.slug) {
    return (
      <SmartLink href="#kontak" className="btn btn-primary btn-xl group">
        <MessageCircle className={icon} aria-hidden />
        {t('nav-consult')}
        <ArrowRight className={`${icon} transition-transform group-hover:translate-x-0.5`} aria-hidden />
      </SmartLink>
    );
  }
  const href = templatesHidden && current?.slug ? `/template/${encodeURIComponent(current.slug)}` : '#templates';
  return (
    <SmartLink href={href} className="btn btn-primary btn-xl group">
      <LayoutTemplate className={icon} aria-hidden />
      {t('home-hero-btn-templates')}
      <ArrowRight className={`${icon} transition-transform group-hover:translate-x-0.5`} aria-hidden />
    </SmartLink>
  );
};

/**
 * "Lihat Demo · {nama template}" untuk template yang sedang tampil di visual (nama terlihat, jadi pengunjung tahu demo
 * mana yang dibuka); tanpa template → ke katalog (tidak tampil bila katalog disembunyikan). Selama di-hover (mouse)
 * atau difokus, tayangan hero berhenti (`onHoldChange`) agar template tidak berganti tepat sebelum diklik.
 */
const DemoLink: React.FC<{
  current: ShowcaseItem | null;
  label: string;
  templatesHidden: boolean;
  onHoldChange?: (hold: boolean) => void;
}> = ({ current, label, templatesHidden, onHoldChange }) => {
  // Nama aksesibel lengkap (diawali label yang terlihat): "Lihat Demo template Corporate Nexa (tab baru)"
  const linkProps = {
    'aria-label': current?.demoHref ? `${label} template ${current.name} (tab baru)` : undefined,
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') onHoldChange?.(true);
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') onHoldChange?.(false);
    },
    onFocus: () => onHoldChange?.(true),
    onBlur: () => onHoldChange?.(false),
  };
  const content = (
    <>
      <span className={TEXT_LINK_ICON}>
        <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" aria-hidden />
      </span>
      <span className="flex min-w-0 items-baseline">
        <span className="shrink-0">{label}</span>
        {current?.demoHref && <span className="ml-1 max-w-[9rem] truncate font-medium text-subtle">· {current.name}</span>}
      </span>
      {current?.demoHref && <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover/link:text-primary" aria-hidden />}
    </>
  );

  if (!current?.demoHref) {
    if (templatesHidden) return null;
    return (
      <SmartLink href="#templates" className={TEXT_LINK}>
        {content}
      </SmartLink>
    );
  }
  if (current.demoExternal) {
    return (
      <a href={current.demoHref} target="_blank" rel="noopener noreferrer" className={TEXT_LINK} {...linkProps}>
        {content}
      </a>
    );
  }
  return (
    <Link to={current.demoHref} target="_blank" rel="noopener" className={TEXT_LINK} {...linkProps}>
      {content}
    </Link>
  );
};

export default HeroIntro;
