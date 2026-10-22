import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { getHiddenSections, useSiteSettings } from '../../hooks/useSiteSettings';
import { HeroBackground } from './hero/HeroBackground';
import { heroBackgroundKey, parseHeroBackground, parseHeroText } from './hero/heroBgConfig';
import { HeroIntro } from './hero/HeroIntro';
import { HeroMedia } from './hero/HeroMedia';
import { HeroShowcase } from './hero/HeroShowcase';
import { loadShowcase, type HeroMode, type ShowcaseData } from './hero/showcase';
import { useHeroLegibility } from './hero/useHeroLegibility';

/**
 * Hero beranda gaya BELAJAR CPNS (terang):
 * - latar dari setting admin `hero_bg_mode` (Pengaturan website → Hero → "Latar hero", lihat hero/heroBgConfig.ts):
 *   Bawaan = kanvas medan titik interaktif + cahaya biru brand yang mengikuti kursor; Gambar (1 statis / 2+ bergantian)
 *   atau Video = HeroMedia. Setting tidak lengkap/tidak aman → Bawaan. Sebelum setting dimuat tidak ada latar sama
 *   sekali, jadi kanvas tidak sempat berkedip berganti gambar/video;
 * - teks di atas gambar/video selalu terbaca (useHeroLegibility): kecerahan latar di belakang blok teks diukur, lalu
 *   dipilih teks terang (lapisan obsidian) atau gelap (lapisan putih) dengan lapisan setebal yang diperlukan, minimal
 *   `hero_overlay` dari admin; `hero_text_tone` bisa memaksa nadanya. Selama mengukur: teks terang + lapisan aman;
 * - kiri: toggle mode Template / Custom, judul dua warna kata per kata, checklist, tombol
 *   ("Pilih Template" → #templates, "Pesan Website / Aplikasi Mobile Custom" → /pesan-custom);
 * - kanan (di HP: di bawah): bingkai browser yang menayangkan pratinjau template asli + rail langkah yang MENGIKUTI
 *   mode: alur pemesanan template, atau alur custom (konsultasi → penawaran → pengerjaan → rilis). Tayangan berhenti
 *   selama "Lihat Demo" di-hover / difokus (`hold`), jadi demo yang dibuka sama dengan nama template yang terlihat.
 * Bila admin menyembunyikan section katalog (`disabled_sections` berisi "templates"), hero mulai di mode Custom dan
 * tombol mode Template tidak lagi menuju #templates yang tidak ada.
 * Saat digulir, isi sedikit memudar & visual sedikit miring (desktop saja, tidak untuk reduced motion).
 */
const Hero: React.FC = () => {
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
  const [showcase, setShowcase] = useState<ShowcaseData | null>(null);
  const [slide, setSlide] = useState(0);
  // null = pengunjung belum memilih → bawaan Template, atau Custom bila katalog disembunyikan admin
  const [chosenMode, setChosenMode] = useState<HeroMode | null>(null);
  const mode: HeroMode = chosenMode ?? (templatesHidden ? 'custom' : 'template');
  // Mode ikut menentukan tinggi blok teks (di HP mode Custom lebih tinggi): ganti mode = ukur ulang
  const { legibility, onVideoFrame } = useHeroLegibility({ media, text: textSettings, sectionRef, textRef, layoutKey: mode });
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState(false);

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

      <div className="container-site grid items-center gap-8 pb-12 pt-20 sm:min-h-[100svh] sm:gap-12 sm:pb-16 sm:pt-28 lg:grid-cols-2 lg:gap-12 lg:pb-20 lg:pt-28 xl:gap-16 2xl:gap-24">
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
            onHoldChange={setHold}
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
              hold={hold}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Hero;
