import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { getHiddenSections, useSiteSettings } from '../../hooks/useSiteSettings';
import { HeroBackground } from './hero/HeroBackground';
import { heroBackgroundKey, parseHeroBackground, parseHeroText } from './hero/heroBgConfig';
import { HeroIntro } from './hero/HeroIntro';
import { HeroMedia } from './hero/HeroMedia';
import { HERO_NAV_DEFAULT, setHeroNavState } from './hero/heroNavState';
import { HeroPrompt } from './hero/HeroPrompt';
import { HeroShowcase } from './hero/HeroShowcase';
import { parseHeroStyle } from './hero/heroStyle';
import { PromoBanner } from './hero/PromoBanner';
import { loadShowcase, peekShowcase, type HeroMode, type ShowcaseData } from './hero/showcase';
import { useHeroLegibility } from './hero/useHeroLegibility';

/**
 * Hero beranda: gaya dari setting admin `hero_style` (Pengaturan website → Hero → "Gaya hero", hero/heroStyle.ts):
 * - classic (bawaan, juga sebelum setting dimuat): HeroClassic di bawah, tampilan yang ada selama ini, tidak diubah;
 * - prompt: HeroPrompt (judul + kotak prompt AI di tengah, latar putih dengan burung Garuda ASCII), hanya setelah
 *   setting dimuat. Di HTML prerender setting sudah ada dari preload, jadi gaya yang dipilih langsung dirender.
 */
const Hero: React.FC = () => {
  const { settings, loaded } = useSiteSettings();
  if (loaded && parseHeroStyle(settings.hero_style) === 'prompt') return <HeroPrompt settings={settings} />;
  return <HeroClassic />;
};

/**
 * Hero beranda gaya BELAJAR CPNS (terang), gaya "Klasik":
 * - latar dari setting admin `hero_bg_mode` (Pengaturan website → Hero → "Latar hero", lihat hero/heroBgConfig.ts):
 *   Bawaan = kanvas medan titik interaktif + cahaya biru brand yang mengikuti kursor; Gambar (1 statis / 2+ bergantian)
 *   atau Video = HeroMedia. Setting tidak lengkap/tidak aman → Bawaan. Sebelum setting dimuat tidak ada latar sama
 *   sekali, jadi kanvas tidak sempat berkedip berganti gambar/video;
 * - teks di atas gambar/video (useHeroLegibility): kecerahan latar di belakang blok teks diukur, lalu dipilih teks
 *   terang atau gelap yang paling terbaca. Lapisan di atas media = persis `hero_overlay` dari admin (0 = tanpa
 *   lapisan, gambar/video tampil penuh), website tidak pernah menebalkannya; `hero_text_tone` bisa memaksa nadanya.
 *   Selama mengukur (dan di HTML prerender): teks gelap seperti halaman tanpa media (terang bila dipaksa admin),
 *   lapisan admin; selama gambar/video dimuat di belakang teks masih halaman putih;
 * - navbar (heroNavState): di puncak beranda di atas gambar/video navbar transparan dengan teks terang / gelap sesuai
 *   strip latar di belakangnya (diukur terpisah dari blok teks); belum / tidak terukur → navbar putih kaca;
 * - datar: tanpa bayangan teks, pendar, atau bayangan kotak di seluruh hero (garis tipis ring-* boleh);
 * - kiri: toggle mode Template / Custom, judul dua warna kata per kata, checklist, tombol
 *   ("Pilih Template" → #templates, "Start Your Project Brief" → /pesan-custom);
 * - kanan (di HP: di bawah): bingkai browser yang menayangkan pratinjau template asli + rail langkah yang MENGIKUTI
 *   mode: alur pemesanan template, atau alur custom (konsultasi → penawaran → pengerjaan → rilis).
 * Bila admin menyembunyikan section katalog (`disabled_sections` berisi "templates"), hero mulai di mode Custom dan
 * tombol mode Template tidak lagi menuju #templates yang tidak ada.
 * Saat digulir, isi sedikit memudar & visual sedikit miring (desktop saja, tidak untuk reduced motion).
 */
const HeroClassic: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { settings, loaded } = useSiteSettings();
  const templatesHidden = getHiddenSections(settings).has('templates');
  // Dihitung sekali per setting: Hero render ulang tiap langkah tayangan, latar tidak perlu ikut berubah
  const background = useMemo(() => parseHeroBackground(settings), [settings]);
  const textSettings = useMemo(() => parseHeroText(settings), [settings]);
  const textRef = useRef<HTMLDivElement>(null);
  // Kunci latar yang medianya habis (semua gambar / video + poster gagal → kanvas bawaan): teks kembali bawaan
  const [exhaustedKey, setExhaustedKey] = useState<string | null>(null);
  const backgroundKey = heroBackgroundKey(background);
  const media = loaded && background.mode !== 'default' && exhaustedKey !== backgroundKey ? background : null;
  const onExhausted = useCallback(() => setExhaustedKey(backgroundKey), [backgroundKey]);
  // HTML prerender: template dari data preload, jadi slide pertama (kandidat LCP) sudah ada di HTML server
  const [showcase, setShowcase] = useState<ShowcaseData | null>(peekShowcase);
  const [slide, setSlide] = useState(0);
  // null = pengunjung belum memilih → bawaan Template, atau Custom bila katalog disembunyikan admin
  const [chosenMode, setChosenMode] = useState<HeroMode | null>(null);
  const mode: HeroMode = chosenMode ?? (templatesHidden ? 'custom' : 'template');
  // Mode ikut menentukan tinggi blok teks (di HP mode Custom lebih tinggi): ganti mode = ukur ulang
  const { legibility, navTone, onVideoFrame } = useHeroLegibility({ media, text: textSettings, sectionRef, textRef, layoutKey: mode });
  const hasMedia = media !== null;

  // Navbar transparan di atas media (nada dari strip di belakangnya); kembali bawaan saat hero dilepas (pindah halaman)
  useEffect(() => {
    setHeroNavState({ media: hasMedia, tone: hasMedia ? navTone : null });
  }, [hasMedia, navTone]);
  useEffect(() => () => setHeroNavState(HERO_NAV_DEFAULT), []);
  const [step, setStep] = useState(0);

  // Alur baru selalu mulai dari langkah pertama, baik karena dipilih pengunjung maupun karena setting admin dimuat
  // (pola "sesuaikan state saat render" React, tanpa efek tambahan)
  const [stepMode, setStepMode] = useState(mode);
  if (stepMode !== mode) {
    setStepMode(mode);
    setStep(0);
  }

  useEffect(() => {
    let alive = true;
    loadShowcase().then((data) => {
      if (alive) setShowcase(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Efek gulir: tulis --p (0..1) ke section, dipakai transform/opacity di bawah (dimatikan di HP lewat .hero-parallax)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight || 1)));
      el.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const items = showcase?.items ?? null;
  const current = items ? items[Math.min(slide, items.length - 1)] : null;
  const nextSlide = () => setSlide((value) => (items && items.length > 0 ? (value + 1) % items.length : 0));

  return (
    <section
      ref={sectionRef}
      id="beranda"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
      style={{ '--p': 0 } as React.CSSProperties}
    >
      {/* Hanya satu latar yang dipasang: loop kanvas (RAF + listener) tidak berjalan di mode gambar/video */}
      {loaded &&
        (background.mode === 'default' ? (
          <HeroBackground className="absolute inset-0 -z-10" />
        ) : (
          <HeroMedia
            key={backgroundKey}
            config={background}
            scrim={legibility && { tone: legibility.tone, alpha: legibility.overlayAlpha, end: legibility.scrimEnd }}
            fadeHeight={legibility?.fadeHeight}
            onVideoFrame={onVideoFrame}
            onExhausted={onExhausted}
          />
        ))}

      {/* Promo diskon pembelian pertama (gaya Dribbble): tepat di bawah navbar, selebar navbar */}
      <div className="container-site relative pt-[calc(var(--nav-offset)+0.5rem)]">
        <PromoBanner />
      </div>

      {/* Isi hero lebih sempit dari navbar (seperti Dribbble): ±1500px di tengah layar lebar. Tinggi minimum = layar
          dikurangi navbar + banner promo, jadi isi tetap di tengah layar pertama */}
      <div className="container-site max-w-[1584px] grid items-center gap-10 pb-12 pt-6 sm:min-h-[calc(100svh-var(--nav-offset)-4.5rem)] sm:gap-12 sm:pb-16 sm:pt-10 lg:grid-cols-2 lg:gap-12 lg:pb-20 lg:pt-8 xl:gap-16 2xl:gap-24">
        <div
          ref={textRef}
          className="hero-parallax lg:pl-[2%]"
          // Nada teks (cincin fokus putih untuk 'light', lihat index.css); tidak ada = latar bawaan
          data-hero-tone={legibility?.tone}
          style={{ opacity: 'calc(1 - var(--p) * 1.2)', transform: 'translate3d(0, calc(var(--p) * -70px), 0)' }}
        >
          <HeroIntro
            look={legibility?.tone ?? 'default'}
            mode={mode}
            onModeChange={setChosenMode}
            current={current}
            templatesHidden={templatesHidden}
          />
        </div>

        <Reveal variant="scale" delay={0.25}>
          <div
            className="hero-parallax relative"
            style={{
              transform: 'perspective(1800px) rotateX(calc(var(--p) * 8deg)) scale(calc(1 - var(--p) * 0.08))',
              transformOrigin: 'center top',
            }}
          >
            <HeroShowcase
              mode={mode}
              step={step}
              onStep={setStep}
              items={items}
              sample={showcase?.sample ?? false}
              slide={slide}
              onNext={nextSlide}
              templatesHidden={templatesHidden}
              // Latar gambar/video = kandidat LCP; tanpa itu slide pertama tayangan yang terbesar
              priority={!media}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Hero;
