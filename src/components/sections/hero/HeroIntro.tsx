import React, { useId, useRef, useState } from 'react';
import { Check, LayoutTemplate, MessageCircle, Smartphone, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, type TranslationKey } from '../../../hooks/useTranslation';
import { SplitText } from '../../ui/SplitText';
import { SmartLink } from '../../layout/SmartLink';
import type { HeroMode, ShowcaseItem } from './showcase';
import { HERO_TONE_CLASSES, type HeroTextLook } from './heroTone';
import { heroHeadline } from './heroHeadline';
import { useSiteSettings } from '../../../hooks/useSiteSettings';

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
  'block text-[24px] font-semibold leading-[1.18] tracking-[-0.02em] sm:text-[44px] sm:leading-[1.04] sm:tracking-[-0.035em] lg:text-[42px] xl:text-[52px] 2xl:text-[60px]';

/**
 * Sisi kiri hero (port HeroIntro BELAJAR CPNS): toggle mode berindikator meluncur
 * [Template siap pakai | Website & aplikasi custom] (bentuk & huruf sama dengan segmen alur di section Proses) yang
 * mengganti judul dua warna (muncul kata per kata), tiga poin checklist, dan tombol. Kedua panel ditumpuk di sel grid
 * yang sama, jadi tinggi hero tidak melompat saat mode berganti. State mode dipegang Hero agar visual kanan ikut
 * berganti alur. Warna mengikuti `look` (heroTone.ts): bawaan, atau teks terang / gelap di atas latar gambar/video
 * (nadanya dipilih Hero lewat useHeroLegibility). Datar: tanpa bayangan teks, pendar, atau bayangan kotak.
 *
 * SEO (heroHeadline.ts): judul mode Template SELALU elemen H1 yang sama (statis, juga saat mode Custom aktif), judul
 * mode Custom selalu <p>. Kedua judul ada sebagai teks di HTML prerender. Animasi masuk poin & tombol hanya diputar
 * setelah pengunjung mengganti mode, jadi isi hero langsung terlihat di HTML prerender (tanpa menunggu animasi).
 */
interface HeroIntroProps {
  mode: HeroMode;
  onModeChange: (mode: HeroMode) => void;
  /** Template yang sedang tampil di visual kanan (tujuan "Pilih Template" bila katalog disembunyikan). */
  current: ShowcaseItem | null;
  /** Section katalog #templates disembunyikan admin → tombol mode Template tidak boleh menuju ke sana. */
  templatesHidden: boolean;
  /** Warna teks: 'default' (latar bawaan), 'light' / 'dark' (di atas gambar/video). */
  look?: HeroTextLook;
}

export const HeroIntro: React.FC<HeroIntroProps> = ({
  mode: modeKey,
  onModeChange,
  current,
  templatesHidden,
  look = 'default',
}) => {
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const headline = heroHeadline(settings, { lead: t('home-hero-template-lead'), accent: t('home-hero-template-accent') });
  const tone = HERO_TONE_CLASSES[look];
  const secondaryBtn = `btn ${tone.secondary} ${SECONDARY_SIZE}`;
  const mode = Math.max(0, MODES.findIndex((item) => item.key === modeKey));
  // true setelah pengunjung mengganti mode: baru saat itu panel diberi animasi masuk
  const [switched, setSwitched] = useState(false);
  const setMode = (index: number) => {
    setSwitched(true);
    onModeChange(MODES[index].key);
  };
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
      {/* Judul admin tanpa kata kunci: H1 kata kunci tampil kecil di atas toggle (heroHeadline.ts) */}
      {headline.keywordH1 && (
        <h1 id="hero-title" className={`mb-4 text-[13px] font-semibold leading-snug sm:mb-6 sm:text-[15px] ${tone.point}`}>
          {headline.keywordH1}
        </h1>
      )}
      {/* Toggle mode */}
      <div
        role="tablist"
        aria-label="Pilih layanan"
        onKeyDown={onTabKey}
        className={`relative inline-grid grid-cols-2 rounded-full p-1 ${tone.toggle}`}
      >
        {/* Gaya Dribbble: pill putih bergaris tipis meluncur di jalur abu, label kapital kecil tanpa ikon */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 rounded-full bg-surface ring-1 ring-inset ring-line transition-transform duration-500 ease-calm motion-reduce:transition-none"
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
              className={`relative z-10 inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors duration-300 after:absolute after:inset-x-0 after:-inset-y-1.5 sm:h-10 sm:px-5 sm:text-xs sm:after:hidden ${
                selected ? tone.toggleActive : tone.toggleIdle
              }`}
            >
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
          const animate = active && switched;
          // Judul mode Template = H1 statis (atau <p> bila H1 kata kunci tampil di atas); mode Custom = <p>
          const isH1 = item.key === 'template' && headline.isH1;
          const titleParts =
            item.key === 'template'
              ? [{ text: headline.lead }, ...(headline.accent ? [{ text: headline.accent, className: tone.accent }] : [])]
              : [{ text: t(item.lead) }, { text: t(item.accent), className: tone.accent }];
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
                as={isH1 ? 'h1' : 'p'}
                id={isH1 ? 'hero-title' : undefined}
                delay={100}
                stagger={70}
                className={`${TITLE_CLASS} ${tone.title}`}
                parts={titleParts}
              />

              <ul className="mt-5 space-y-2.5 sm:mt-9 sm:space-y-4">
                {item.points.map((point, i) => (
                  <li
                    key={point}
                    className={`flex items-center gap-2 text-[14px] leading-snug sm:gap-3 sm:text-[17px] sm:leading-normal ${tone.point} ${
                      animate ? 'animate-fade-up motion-reduce:animate-none' : ''
                    }`}
                    style={animate ? { animationDelay: `${450 + i * 90}ms` } : undefined}
                  >
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full sm:h-6 sm:w-6 ${tone.check}`}>
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {t(point)}
                  </li>
                ))}
              </ul>

              <div
                className={`mt-7 flex flex-wrap items-center gap-3 sm:mt-11 ${animate ? 'animate-fade-up motion-reduce:animate-none' : ''}`}
                style={animate ? { animationDelay: '750ms' } : undefined}
              >
                {item.key === 'template' ? (
                  <TemplateCta current={current} templatesHidden={templatesHidden} />
                ) : (
                  <>
                    {/* Label & ikon seperti Dribbble (permintaan pemilik 2026-10-23) */}
                    <Link to="/pesan-custom" className={PRIMARY_BTN}>
                      <Sparkles className={ICON} aria-hidden />
                      Start Your Project Brief
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
 * Tombol hero tanpa panah: utama biru solid, kedua garis saja tanpa latar (ikon polos 16px); ukuran seperti Dribbble
 * (permintaan pemilik 2026-10-23): tinggi 48px, padding 24px, huruf 15px (HP 40px). HP: berbagi satu baris sama lebar, turun
 * ke baris baru (selebar kolom) bila tidak muat.
 */
const PRIMARY_BTN = 'btn btn-primary max-sm:flex-1 sm:h-12 sm:px-6 sm:text-[15px]';
/** Ukuran tombol kedua; warnanya (btn-outline-clear / btn-outline-on-media) mengikuti nada teks hero */
const SECONDARY_SIZE = 'max-sm:flex-1 sm:h-12 sm:px-6 sm:text-[15px]';
const ICON = 'h-4 w-4';
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

export default HeroIntro;
