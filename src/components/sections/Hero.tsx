import React, { Suspense, lazy } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { HeroPrompt } from './hero/HeroPrompt';
import { parseHeroStyle } from './hero/heroStyle';

// Gaya Klasik (kanvas/gambar/video, tayangan template, ukur keterbacaan teks) di chunk sendiri: prerender
// (prerenderToNodeStream) menunggu lazy, dan saat hidrasi React mempertahankan HTML server sampai chunk termuat.
const HeroClassic = lazy(() => import('./hero/HeroClassic'));

/**
 * Hero beranda: gaya dari setting admin `hero_style` (Pengaturan website → Hero → "Gaya hero", hero/heroStyle.ts):
 * - classic (bawaan, juga sebelum setting dimuat): hero/HeroClassic.tsx, tampilan yang ada selama ini, tidak diubah;
 * - prompt: HeroPrompt (judul + kotak prompt AI di tengah, latar putih dengan burung Garuda ASCII), hanya setelah
 *   setting dimuat. Di HTML prerender setting sudah ada dari preload, jadi gaya yang dipilih langsung dirender.
 */
const Hero: React.FC = () => {
  const { settings, loaded } = useSiteSettings();
  if (loaded && parseHeroStyle(settings.hero_style) === 'prompt') return <HeroPrompt settings={settings} />;
  return (
    <Suspense fallback={null}>
      <HeroClassic />
    </Suspense>
  );
};

export default Hero;
