import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Contrast, Moon, Sun, Wand2 } from 'lucide-react';
import { Badge, Segmented, cn } from '../../../components/admin/ui';
import { HERO_OVERLAY_MAX, decideHeroLegibility, fallbackLegibility, formatRatio, scrimRgb } from '../../../components/sections/hero/heroContrast';
import type { BackgroundSample, HeroTextTone } from '../../../components/sections/hero/heroContrast';
import { combineResults, sampleImage, type SampleLayout } from '../../../components/sections/hero/heroSampling';
import { HERO_TONE_CLASSES } from '../../../components/sections/hero/heroTone';
import { translations } from '../../../hooks/useTranslation';

/* Pilihan warna teks + keterangan singkat tiap pilihan. */
const TONES: { value: HeroTextTone; label: string; icon: typeof Sun; hint: string }[] = [
  { value: 'auto', label: 'Otomatis', icon: Wand2, hint: 'Dipilih otomatis dari kecerahan latar di belakang teks.' },
  { value: 'light', label: 'Terang', icon: Sun, hint: 'Teks putih dengan lapisan gelap di belakangnya.' },
  { value: 'dark', label: 'Gelap', icon: Moon, hint: 'Teks gelap dengan lapisan putih di belakangnya.' },
];

/**
 * Tata letak desktop yang dipakai untuk mengukur di admin: kotak hero 1366×900 dan kolom teksnya (diukur dari
 * beranda di 1366×900: x 32-660 px, y 196-736 px). Website mengukur ulang dengan tata letak pengunjung sendiri.
 */
const PREVIEW_LAYOUT: SampleLayout = { box: { w: 1366, h: 900 }, region: { x: 32, y: 196, w: 628, h: 540 } };
/** Tepi kolom teks di pratinjau (sama dengan proporsi layout di atas) */
const PREVIEW_SCRIM_END = '49%';

/** Pemisah daftar sumber di `key` (tidak pernah ada di URL atau data URI). */
const SEPARATOR = '\n';

/** Hasil ukur untuk daftar sumber `key`; stats null = tidak bisa diukur (cadangan aman). */
type Measure = { key: string; samples: BackgroundSample[] | null };

interface HeroLegibilityFieldProps {
  /** Gambar latar (mode Gambar) atau sampul video (mode Video); kosong = belum ada yang bisa dipratinjau */
  sources: string[];
  /** true untuk video tanpa sampul: website mengukur frame pertama video */
  videoWithoutPoster?: boolean;
  tone: HeroTextTone;
  onToneChange: (tone: HeroTextTone) => void;
  overlay: number;
  onOverlayChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * "Teks di atas latar" (Pengaturan website → Hero → Latar hero, mode Gambar / Video): warna teks (hero_text_tone)
 * Otomatis / Terang / Gelap, lapisan minimum 0-80% (hero_overlay), dan pratinjau langsung: gambar pertama dengan
 * lapisan + contoh judul & poin dalam nada yang dipakai, serta lencana kontras yang dihitung heroContrast.ts dari
 * SEMUA gambar (kasus terburuk, sama dengan website). Disimpan lewat "Simpan semua perubahan".
 */
const HeroLegibilityField: React.FC<HeroLegibilityFieldProps> = ({
  sources,
  videoWithoutPoster = false,
  tone,
  onToneChange,
  overlay,
  onOverlayChange,
  disabled = false,
}) => {
  const key = sources.join(SEPARATOR);
  const [measure, setMeasure] = useState<Measure | null>(null);

  // Diukur ulang hanya bila daftar sumber berubah (bukan saat nada / lapisan digeser)
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    void Promise.all(key.split(SEPARATOR).map((src) => sampleImage(src, PREVIEW_LAYOUT))).then((results) => {
      if (alive) setMeasure({ key, samples: combineResults(results) });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const current = measure?.key === key ? measure : null;
  const pending = sources.length > 0 && !current;
  const decision = useMemo(
    () => (current?.samples ? decideHeroLegibility(current.samples, tone, overlay) : fallbackLegibility(tone, overlay)),
    [current, tone, overlay],
  );
  const look = HERO_TONE_CLASSES[decision.tone];
  const percent = Math.round(decision.overlayAlpha * 100);
  const toneName = decision.tone === 'light' ? 'terang' : 'gelap';

  let badge: React.ReactNode;
  let summary: string;
  if (sources.length === 0) {
    badge = <Badge tone="mist" icon={Contrast}>Belum ada pratinjau</Badge>;
    summary = videoWithoutPoster
      ? 'Video belum punya sampul. Website mengukur frame pertama video saat dibuka, dan memakai teks terang dengan lapisan aman sampai itu selesai.'
      : 'Tambahkan gambar dulu untuk melihat pratinjau.';
  } else if (pending) {
    badge = <Badge tone="mist" icon={Contrast}>Menghitung kontras...</Badge>;
    summary = 'Mengukur kecerahan latar di belakang teks...';
  } else if (!decision.contrast) {
    badge = <Badge tone="mist" icon={Contrast}>Kontras tidak terukur</Badge>;
    summary = `Latar tidak bisa diukur (mis. gambar dari domain lain), jadi website memakai teks ${toneName} dengan lapisan aman ${percent}%.`;
  } else {
    const ratio = formatRatio(decision.contrast.body);
    badge = decision.readable ? (
      <Badge tone="mint" icon={CheckCircle2}>Kontras {ratio} · Terbaca</Badge>
    ) : (
      <Badge tone="warning" icon={AlertTriangle}>Kontras {ratio} · Kurang terbaca</Badge>
    );
    const raised = percent > overlay ? ` (dinaikkan dari ${overlay}% agar tetap terbaca)` : '';
    summary = `Website memakai teks ${toneName} dengan lapisan ${percent}%${raised}.${
      sources.length > 1 ? ` Dihitung dari ${sources.length} gambar, yang paling sulit dibaca.` : ''
    }`;
  }

  return (
    <div className="space-y-4 border-t border-adm-line pt-4 sm:space-y-5 sm:pt-5">
      <div>
        <p className="text-[13px] font-medium text-adm-fg">Teks di atas latar</p>
        <p className="mt-0.5 text-xs leading-relaxed text-adm-muted">Atur supaya judul dan poin hero selalu terbaca di atas gambar atau video.</p>
      </div>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-adm-fg">Warna teks</p>
        <Segmented
          ariaLabel="Warna teks hero"
          fullWidth
          items={TONES.map((item) => ({ value: item.value, label: item.label, icon: item.icon, disabled }))}
          value={tone}
          onChange={onToneChange}
        />
        <p className="text-xs leading-relaxed text-adm-muted">{TONES.find((item) => item.value === tone)?.hint}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="hero_overlay" className="text-[13px] font-medium text-adm-fg">
            Lapisan
          </label>
          <span className="text-[13px] font-semibold tabular-nums text-adm-fg" aria-hidden>
            {overlay}%
          </span>
        </div>
        <input
          id="hero_overlay"
          type="range"
          min={0}
          max={HERO_OVERLAY_MAX}
          step={1}
          value={overlay}
          disabled={disabled}
          aria-valuetext={`${overlay}%`}
          aria-describedby="hero_overlay_hint"
          onChange={(event) => onOverlayChange(Number(event.target.value))}
          // HP: area sentuh 44px (trek tetap tipis di tengah)
          className="block h-6 w-full cursor-pointer accent-cobalt disabled:cursor-not-allowed disabled:opacity-40 max-sm:h-11"
        />
        <p id="hero_overlay_hint" className="text-xs leading-relaxed text-adm-muted">
          Ketebalan minimal lapisan di belakang teks. Kalau latar terlalu terang atau ramai, website menebalkannya otomatis
          (maks. 85%) supaya teks tetap terbaca.
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Warna website persis (bukan aksen admin mode gelap): primary = brand-600 di dalam pratinjau */}
        <div
          role="img"
          aria-label={`Pratinjau teks hero: teks ${toneName}, lapisan ${percent}%`}
          className="relative aspect-video overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-adm-line [--color-primary:var(--color-brand-600)]"
        >
          {sources[0] && <img src={sources[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div
            data-preview-scrim={decision.tone}
            className="hero-scrim hero-scrim-x absolute inset-0"
            style={
              {
                '--scrim-rgb': scrimRgb(decision.tone).join(' '),
                '--scrim-a': decision.overlayAlpha.toFixed(3),
                '--scrim-end': PREVIEW_SCRIM_END,
              } as React.CSSProperties
            }
          />
          <div className="relative flex h-full w-[58%] flex-col justify-center gap-2 px-[5%]" aria-hidden>
            <p className={cn('text-[15px] font-semibold leading-tight tracking-[-0.02em] sm:text-xl', look.title)}>
              {translations['home-hero-template-lead']} <span className={look.accent}>{translations['home-hero-template-accent']}</span>
            </p>
            <p className={cn('flex items-center gap-1.5 text-[11px] leading-snug sm:text-xs', look.point)}>
              <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', look.check)}>
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {translations['home-hero-template-point-1']}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-live="polite">
          {badge}
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-adm-muted">{summary}</p>
        </div>
      </div>
    </div>
  );
};

export default HeroLegibilityField;
