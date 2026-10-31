import React, { Suspense, lazy, useRef, useState } from 'react';
import { ArrowUp, CornerDownLeft, Mic, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import { useTranslation } from '../../../hooks/useTranslation';
import { useHydrated } from '../../../lib/preload';
import { SmartLink } from '../../layout/SmartLink';
import { askNexa, useNexaAvailable } from '../../layout/nexa/nexaBridge';
import { speechInputAvailable } from '../../layout/nexa/speech';
import { PromoBanner } from './PromoBanner';
import { customOrderWithBrief, parseHeroPrompt, promptHeadline } from './heroStyle';

// Hanya dimuat saat gaya Prompt AI aktif dan animasinya hidup (chunk terpisah; prerender mencatatnya untuk hidrasi)
const GarudaAscii = lazy(() => import('./prompt/GarudaAscii'));

/** Panjang pesan maksimal, = kolom pesan di panel Nexa. */
const HERO_PROMPT_MAX_LENGTH = 500;

/**
 * Hero beranda gaya "Prompt AI" (Pengaturan website → Hero → Gaya hero), mengikuti video rujukan pemilik 2026-10-29:
 * latar terang (gradasi biru brand sangat muda + cahaya biru lembut yang berkelana, pola titik tipis), judul besar di
 * tengah, kotak prompt lebar dengan placeholder, tombol kirim, dan chip rekomendasi; di belakangnya burung Garuda ASCII
 * terbang melintas dan singgah (prompt/GarudaAscii.tsx).
 * - Isi dari setting admin (heroStyle.ts): judul, placeholder, chip (label + tautan), saklar animasi.
 * - Kotak prompt TERHUBUNG ke chat Nexa (layout/nexa/nexaBridge.ts): Enter / tombol kirim membuka panel Nexa dan
 *   mengirim pesannya; Nexa menjawab dengan rekomendasi template (kartu), harga, atau tautan form pesan custom, dan
 *   tetap menjawab dari data situs bila AI mati. Shift+Enter = baris baru. Mikrofon (bila browser mendukung) membuka
 *   Nexa dengan input suara. Widget Nexa dimatikan admin → pesan dibawa ke /pesan-custom?brief=… (isian terisi).
 * - Chip mengarah ke halaman yang dipilih admin (/template, /pesan-custom, kategori, #kontak).
 * - SEO sama dengan hero klasik (heroHeadline.ts): judul admin = H1 bila memuat "template website"; kalau tidak, judul
 *   tetap besar (<p>) dan H1 kata kunci bawaan tampil kecil (pill putih) di atasnya. Semua teks ada di HTML prerender;
 *   keadaan yang hanya ada di klien (widget Nexa, input suara) dibaca setelah hidrasi (useHydrated), jadi HTML sama.
 * - Datar, token warna situs saja; teks di atas kanvas burung: judul besar (≥ 3:1), teks kecil di kartu/pill putih
 *   (≥ 4,5:1, dicek heroStyle.test.tsx).
 */
export const HeroPrompt: React.FC<{ settings: SiteSettings }> = ({ settings }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = parseHeroPrompt(settings);
  const headline = promptHeadline(prompt.title, `${t('home-hero-template-lead')} ${t('home-hero-template-accent')}`);
  const Title = headline.isH1 ? 'h1' : 'p';
  const hydrated = useHydrated();
  const nexa = useNexaAvailable();
  const canListen = hydrated && nexa && speechInputAvailable();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const canSend = draft.trim() !== '';

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (askNexa(text)) setDraft('');
    else navigate(customOrderWithBrief(text));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };
  const listen = () => {
    if (!askNexa('', { listen: true })) textareaRef.current?.focus();
  };

  return (
    <section id="beranda" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-canvas">
      {/* Latar (pemilik 2026-10-30: jangan putih saja): gradasi biru brand sangat muda dari atas + tiga cahaya biru lembut
          yang berkelana pelan (.hero-prompt-orb, index.css), lalu pola titik tipis yang memudar ke tepi, lalu burung
          Garuda ASCII. Semuanya dekoratif dan di belakang teks. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-30 overflow-hidden bg-gradient-to-b from-brand-50 via-canvas to-canvas">
        <span className="hero-prompt-orb hero-prompt-orb--a" />
        <span className="hero-prompt-orb hero-prompt-orb--b" />
        <span className="hero-prompt-orb hero-prompt-orb--c" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 grid-dots opacity-60 [mask-image:radial-gradient(75%_80%_at_50%_50%,#000_30%,transparent_100%)]"
      />
      {prompt.garuda && (
        <Suspense fallback={null}>
          <GarudaAscii className="absolute inset-0 -z-10" />
        </Suspense>
      )}
      {/* Pudar bawah: menyatu dengan strip layanan di bawah hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-canvas" />

      <div className="container-site relative pt-[calc(var(--nav-offset)+0.5rem)]">
        <PromoBanner />
      </div>

      <div className="container-site relative flex flex-col items-center pb-16 pt-10 text-center sm:min-h-[calc(100svh-var(--nav-offset)-4.5rem)] sm:justify-center sm:pb-24 sm:pt-6">
        {headline.keywordH1 && (
          // Pill putih: H1 kecil tetap terbaca saat burung lewat di belakangnya
          <h1
            id="hero-title"
            className="mb-5 inline-flex max-w-full items-center rounded-full bg-surface/90 px-3.5 py-1.5 text-[12px] font-semibold leading-snug text-muted ring-1 ring-inset ring-line sm:mb-6 sm:text-[13px]"
          >
            {headline.keywordH1}
          </h1>
        )}
        <Title
          id={headline.isH1 ? 'hero-title' : undefined}
          className="max-w-[18ch] text-[30px] font-medium leading-[1.12] tracking-[-0.03em] text-fg sm:text-[52px] sm:leading-[1.06] lg:text-[60px]"
        >
          {prompt.title}
        </Title>

        {/* Kotak prompt: kartu putih tembus (burung di belakangnya tampak buram), tanpa bayangan */}
        <div className="mt-7 w-full max-w-[720px] rounded-[24px] bg-surface/90 p-3.5 text-left ring-1 ring-inset ring-line backdrop-blur-sm transition-[box-shadow] focus-within:ring-2 focus-within:ring-primary sm:mt-10 sm:p-4">
          <label htmlFor="hero-prompt" className="sr-only">
            Ceritakan kebutuhan website atau aplikasi kamu untuk Nexa
          </label>
          <textarea
            ref={textareaRef}
            id="hero-prompt"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={prompt.placeholder}
            maxLength={HERO_PROMPT_MAX_LENGTH}
            enterKeyHint="send"
            autoComplete="off"
            aria-describedby="hero-prompt-note"
            className="block w-full resize-none bg-transparent px-1.5 py-1 text-[15px] leading-relaxed text-fg placeholder:text-muted focus:outline-none max-sm:text-[16px] sm:text-base"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p id="hero-prompt-note" className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{hydrated && !nexa ? 'Dikirim ke form pesan custom' : 'Dijawab Nexa AI'}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden items-center gap-1 text-xs text-muted sm:inline-flex" aria-hidden>
                <CornerDownLeft className="h-3.5 w-3.5" />
                kirim
              </span>
              {canListen && (
                <button
                  type="button"
                  onClick={listen}
                  aria-label="Bicara (isi pesan dengan suara lewat Nexa)"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-fg transition-colors hover:bg-fg/5"
                >
                  <Mic className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                aria-label="Kirim ke Nexa"
                aria-disabled={!canSend || undefined}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg text-white transition-colors hover:bg-fg/85 aria-disabled:cursor-not-allowed aria-disabled:bg-fg/[0.08] aria-disabled:text-muted aria-disabled:hover:bg-fg/[0.08]"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {prompt.chips.length > 0 && (
          <ul aria-label="Rekomendasi" className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-5">
            {prompt.chips.map((chip, index) => (
              <li key={`${chip.href}-${index}`}>
                <SmartLink href={chip.href} className="chip-site">
                  {chip.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default HeroPrompt;
