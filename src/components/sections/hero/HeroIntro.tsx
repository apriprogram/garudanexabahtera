import React, { useId, useRef } from 'react';
import { Check, LayoutTemplate, MessageCircle, Play, Smartphone, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, type TranslationKey } from '../../../hooks/useTranslation';
import { SplitText } from '../../ui/SplitText';
import { SmartLink } from '../../layout/SmartLink';
import type { HeroMode, ShowcaseItem } from './showcase';
import { HERO_TONE_CLASSES, type HeroTextLook } from './heroTone';

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
  'block text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] sm:text-[52px] sm:leading-[1.02] sm:tracking-[-0.04em] lg:text-[48px] xl:text-[60px] 2xl:text-[72px]';

/**
 * Sisi kiri hero (port HeroIntro BELAJAR CPNS): toggle mode berindikator meluncur
 * [Template siap pakai | Website & aplikasi custom] (bentuk & huruf sama dengan segmen alur di section Proses) yang
 * mengganti judul dua warna (muncul kata per kata), tiga poin checklist, dan tombol. Kedua panel ditumpuk di sel grid
 * yang sama, jadi tinggi hero tidak melompat saat mode berganti. State mode dipegang Hero agar visual kanan ikut
 * berganti alur. Warna mengikuti `look` (heroTone.ts): bawaan, atau teks terang / gelap di atas lapisan latar
 * gambar/video (nadanya dipilih Hero lewat useHeroLegibility).
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
  /** Warna teks: 'default' (latar bawaan), 'light' / 'dark' (di atas lapisan gambar/video). */
  look?: HeroTextLook;
}

export const HeroIntro: React.FC<HeroIntroProps> = ({
  mode: modeKey,
  onModeChange,
  current,
  templatesHidden,
  onHoldChange,
  look = 'default',
}) => {
  const { t } = useTranslation();
  const tone = HERO_TONE_CLASSES[look];
  const secondaryBtn = `btn ${tone.secondary} ${SECONDARY_SIZE}`;
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
        className={`relative inline-grid animate-fade-up grid-cols-2 rounded-full p-1 ring-1 ring-inset motion-reduce:animate-none ${tone.toggle}`}
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
                selected ? 'text-white' : tone.toggleIdle
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
                className={`${TITLE_CLASS} ${tone.title}`}
                parts={[{ text: t(item.lead) }, { text: t(item.accent), className: tone.accent }]}
              />

              <ul className="mt-5 space-y-2.5 sm:mt-9 sm:space-y-4">
                {item.points.map((point, i) => (
                  <li
                    key={point}
                    className={`flex items-center gap-2 text-[14px] leading-snug sm:gap-3 sm:text-[17px] sm:leading-normal ${tone.point} ${
                      active ? 'animate-fade-up motion-reduce:animate-none' : ''
                    }`}
                    style={{ animationDelay: `${450 + i * 90}ms` }}
                  >
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full sm:h-6 sm:w-6 ${tone.check}`}>
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {t(point)}
                  </li>
                ))}
              </ul>

              <div
                className={`mt-7 flex flex-wrap items-center gap-3 sm:mt-11 ${active ? 'animate-fade-up motion-reduce:animate-none' : ''}`}
                style={{ animationDelay: '750ms' }}
              >
                {item.key === 'template' ? (
                  <>
                    <TemplateCta current={current} templatesHidden={templatesHidden} />
                    <DemoLink
                      current={current}
                      label={t('home-hero-demo')}
                      templatesHidden={templatesHidden}
                      onHoldChange={onHoldChange}
                      className={secondaryBtn}
                      noteClassName={tone.note}
                    />
                  </>
                ) : (
                  <>
                    <Link
                      to="/pesan-custom"
                      className="btn btn-primary btn-xl max-sm:h-auto max-sm:min-h-10 sm:px-6 max-sm:w-full max-sm:whitespace-normal max-sm:py-2 max-sm:text-center max-sm:leading-snug"
                    >
                      {t('home-hero-btn-custom')}
                    </Link>
                    <SmartLink href="#kontak" className={secondaryBtn}>
                      <MessageCircle className={SECONDARY_ICON} aria-hidden />
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

/**
 * Tombol hero tanpa panah: utama biru solid, kedua garis saja tanpa latar (ikon polos 16px); tinggi sama (btn-xl: 56px,
 * HP 40px), padding 24px agar pasangan mode Custom tetap satu baris di 1366px. HP: berbagi satu baris sama lebar, turun
 * ke baris baru (selebar kolom) bila tidak muat.
 */
const PRIMARY_BTN = 'btn btn-primary btn-xl max-sm:flex-1 sm:px-6';
/** Ukuran tombol kedua; warnanya (btn-outline-clear / btn-outline-on-media) mengikuti nada teks hero */
const SECONDARY_SIZE = 'btn-xl max-sm:flex-1 sm:px-6';
const ICON = 'h-5 w-5 max-sm:h-4 max-sm:w-4';
const SECONDARY_ICON = 'h-4 w-4';

/**
 * Tombol utama mode Template: "Pilih Template" → katalog #templates. Bila katalog disembunyikan admin, ke halaman
 * detail template yang sedang tampil (berisi template lain juga); tanpa template asli → "Konsultasi Gratis" (#kontak).
 */
const TemplateCta: React.FC<{ current: ShowcaseItem | null; templatesHidden: boolean }> = ({ current, templatesHidden }) => {
  const { t } = useTranslation();

  if (templatesHidden && !current?.slug) {
    return (
      <SmartLink href="#kontak" className={PRIMARY_BTN}>
        <MessageCircle className={ICON} aria-hidden />
        {t('nav-consult')}
      </SmartLink>
    );
  }
  const href = templatesHidden && current?.slug ? `/template/${encodeURIComponent(current.slug)}` : '#templates';
  return (
    <SmartLink href={href} className={PRIMARY_BTN}>
      <LayoutTemplate className={ICON} aria-hidden />
      {t('home-hero-btn-templates')}
    </SmartLink>
  );
};

/**
 * "Lihat Demo · {nama template}" untuk template yang sedang tampil di visual: tombol garis tanpa latar dengan ikon play
 * polos (tanpa lingkaran, tanpa panah ↗). Nama template terlihat mulai 640px; di HP cukup "Lihat Demo" agar tetap
 * sebaris dengan tombol utama (nama lengkap & "(tab baru)" tetap ada di nama aksesibel). Tanpa template → ke katalog
 * (tidak tampil bila katalog disembunyikan). Selama di-hover (mouse) atau difokus, tayangan hero berhenti
 * (`onHoldChange`) agar template tidak berganti tepat sebelum diklik. `className` = kelas tombol kedua, `noteClassName`
 * = warna nama template (keduanya mengikuti nada teks hero).
 */
const DemoLink: React.FC<{
  current: ShowcaseItem | null;
  label: string;
  templatesHidden: boolean;
  onHoldChange?: (hold: boolean) => void;
  className: string;
  noteClassName: string;
}> = ({ current, label, templatesHidden, onHoldChange, className, noteClassName }) => {
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
      <Play className={`${SECONDARY_ICON} shrink-0 max-sm:h-3.5 max-sm:w-3.5`} fill="currentColor" aria-hidden />
      <span className="flex min-w-0 items-baseline">
        <span className="shrink-0">{label}</span>
        {current?.demoHref && (
          <span className={`ml-1 max-w-[9rem] truncate font-medium max-sm:hidden ${noteClassName}`}>· {current.name}</span>
        )}
      </span>
    </>
  );

  if (!current?.demoHref) {
    if (templatesHidden) return null;
    return (
      <SmartLink href="#templates" className={className}>
        {content}
      </SmartLink>
    );
  }
  if (current.demoExternal) {
    return (
      <a href={current.demoHref} target="_blank" rel="noopener noreferrer" className={className} {...linkProps}>
        {content}
      </a>
    );
  }
  return (
    <Link to={current.demoHref} target="_blank" rel="noopener" className={className} {...linkProps}>
      {content}
    </Link>
  );
};

export default HeroIntro;
