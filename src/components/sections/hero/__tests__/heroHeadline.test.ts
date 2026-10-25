// Jalankan: npx vitest run src/components/sections/hero/__tests__/heroHeadline.test.ts
// H1 beranda (SEO-PLAN §5.6 langkah 4): tepat satu H1 statis yang memuat "template website"; judul admin tetap dipakai.
import { describe, expect, it } from 'vitest';
import { translations } from '../../../../hooks/useTranslation';
import { HERO_H1_KEYWORD, heroHeadline, splitHeadline } from '../heroHeadline';

const FALLBACK = { lead: translations['home-hero-template-lead'], accent: translations['home-hero-template-accent'] };

describe('heroHeadline', () => {
  it('judul bawaan memuat kata kunci dan menjadi H1', () => {
    // Domain tidak termasuk harga template (pemilik 2026-10-25): judul tidak pernah menyebut "termasuk domain"
    expect(`${FALLBACK.lead} ${FALLBACK.accent}`).toBe('Template website siap pakai, termasuk hosting & SSL.');
    expect(Object.values(translations).join(' ')).not.toMatch(/termasuk domain/i);
    expect(HERO_H1_KEYWORD.test(FALLBACK.lead)).toBe(true);
    expect(heroHeadline({}, FALLBACK)).toEqual({ ...FALLBACK, isH1: true, keywordH1: null });
    expect(heroHeadline({ hero_title: '   ' }, FALLBACK).isH1).toBe(true);
  });

  it('nilai seed lama bahasa Inggris diabaikan', () => {
    expect(heroHeadline({ hero_title: 'Leading With Vision, Moving With Purpose' }, FALLBACK)).toEqual({ ...FALLBACK, isH1: true, keywordH1: null });
  });

  it('judul admin yang memuat "template website" menjadi H1', () => {
    expect(heroHeadline({ hero_title: 'Template Website UMKM,\nlangsung online.' }, FALLBACK)).toEqual({
      lead: 'Template Website UMKM,',
      accent: 'langsung online.',
      isH1: true,
      keywordH1: null,
    });
  });

  it('judul admin tanpa kata kunci: tetap tampil (<p>), H1 kata kunci bawaan di atasnya', () => {
    expect(heroHeadline({ hero_title: 'Website profesional, siap online tanpa ribet.' }, FALLBACK)).toEqual({
      lead: 'Website profesional,',
      accent: 'siap online tanpa ribet.',
      isH1: false,
      keywordH1: 'Template website siap pakai, termasuk hosting & SSL',
    });
  });

  it('splitHeadline: baris baru, lalu koma pertama, selain itu satu bagian', () => {
    expect(splitHeadline('Satu\r\nDua  tiga')).toEqual({ lead: 'Satu', accent: 'Dua tiga' });
    expect(splitHeadline('A, B, C')).toEqual({ lead: 'A,', accent: 'B, C' });
    expect(splitHeadline('Tanpa koma')).toEqual({ lead: 'Tanpa koma', accent: '' });
  });
});
