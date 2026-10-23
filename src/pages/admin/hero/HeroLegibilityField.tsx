import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Contrast, Moon, Sun, Wand2 } from 'lucide-react';
import { Badge, Notice, Segmented, cn } from '../../../components/admin/ui';
import {
  HERO_OVERLAY_MAX,
  decideHeroLegibility,
  fallbackLegibility,
  formatRatio,
  readableOverlay,
  scrimRgb,
} from '../../../components/sections/hero/heroContrast';
import type { BackgroundSample, HeroTextTone, HeroTone } from '../../../components/sections/hero/heroContrast';
import { combineResults, sampleImage, type SampleLayout } from '../../../components/sections/hero/heroSampling';
import { HERO_TONE_CLASSES } from '../../../components/sections/hero/heroTone';
import { translations } from '../../../hooks/useTranslation';

/* Pilihan warna teks + keterangan singkat tiap pilihan. */
const TONES: { value: HeroTextTone; label: string; icon: typeof Sun; hint: string }[] = [
  { value: 'auto', label: 'Otomatis', icon: Wand2, hint: 'Dipilih otomatis dari kecerahan latar di belakang teks.' },
  { value: 'light', label: 'Terang', icon: Sun, hint: 'Teks putih, cocok untuk latar gelap.' },
  { value: 'dark', label: 'Gelap', icon: Moon, hint: 'Teks gelap, cocok untuk latar terang.' },
];

/** Nama pilihan warna teks untuk saran ("pilih warna teks Gelap"). */
const TONE_LABEL: Record<HeroTone, string> = { light: 'Terang', dark: 'Gelap' };

/** Lapisan dalam kalimat: 0% = tanpa lapisan (media tampil penuh). */
const layerText = (percent: number) => (percent === 0 ? 'tanpa lapisan (gambar/video tampil penuh)' : `dengan lapisan ${percent}%`);

/**
 * Saran bila teks kurang terbaca di lapisan yang dipilih (website tidak menebalkan lapisan sendiri): lapisan paling
 * tipis yang membuat nada ini terbaca, dan/atau nada lain bila nada itu butuh lapisan lebih tipis.
 */
function suggestion(samples: BackgroundSample[], tone: HeroTone, overlay: number): string {
  const other: HeroTone = tone === 'light' ? 'dark' : 'light';
  const own = readableOverlay(samples, tone);
  const alt = readableOverlay(samples, other);
  const parts: string[] = [];
  if (own !== null) parts.push(`naikkan lapisan ke ${own}%`);
  if (alt !== null && (own === null || alt < own)) {
    parts.push(`pilih warna teks ${TONE_LABEL[other]}${alt > overlay ? ` dengan lapisan ${alt}%` : ''}`);
  }
  return parts.length > 0 ? `Coba ${parts.join(' atau ')}.` : 'Coba gambar yang lebih tenang di area teks.';
}

/**
 * Tata letak desktop yang dipakai untuk mengukur di admin: kotak hero 1366×900 dan kolom teksnya (diukur dari
 * beranda di 1366×900: x 32-660 px, y 196-736 px). Website mengukur ulang dengan tata letak pengunjung sendiri.
 */
const PREVIEW_LAYOUT: SampleLayout = { box: { w: 1366, h: 900 }, region: { x: 32, y: 196, w: 628, h: 540 } };
/** Tepi kolom teks di pratinjau (sama dengan proporsi layout di atas) */
const PREVIEW_SCRIM_END = '49%';

/** Pemisah daftar sumber di `key` (tidak pernah ada di URL atau data URI). */
const SEPARATOR = '\n';

/** Hasil ukur untuk daftar sumber `key`; samples null = tidak bisa diukur (cadangan: lapisan admin persis). */
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
 * Otomatis / Terang / Gelap, lapisan 0-80% (hero_overlay, dipakai PERSIS di website; 0 = tanpa lapisan), dan pratinjau
 * langsung yang sama dengan website: gambar pertama + lapisan (hanya bila > 0%) + contoh judul & poin dalam nada yang
 * dipakai, datar tanpa bayangan, serta lencana kontras yang dihitung heroContrast.ts dari SEMUA gambar (kasus terburuk,
 * sama dengan website). Kurang terbaca → peringatan + saran lapisan / warna teks; lapisan tidak pernah ditebalkan
 * otomatis. Disimpan lewat "Simpan semua perubahan".
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
  // = lapisan admin persis (dibatasi 0..80)
  const percent = Math.round(decision.overlayAlpha * 100);
  const toneName = decision.tone === 'light' ? 'terang' : 'gelap';
  const usage = `Website memakai teks ${toneName} ${layerText(percent)}.`;

  let badge: React.ReactNode;
  let summary: string;
  let warning: string | null = null;
  if (sources.length === 0) {
    badge = <Badge tone="mist" icon={Contrast}>Belum ada pratinjau</Badge>;
    summary = videoWithoutPoster
      ? `Video belum punya sampul. Website mengukur frame pertama video saat dibuka untuk memilih warna teks, ${layerText(percent)}.`
      : 'Tambahkan gambar dulu untuk melihat pratinjau.';
  } else if (pending) {
    badge = <Badge tone="mist" icon={Contrast}>Menghitung kontras...</Badge>;
    summary = 'Mengukur kecerahan latar di belakang teks...';
  } else if (!decision.contrast || !current?.samples) {
    badge = <Badge tone="mist" icon={Contrast}>Kontras tidak terukur</Badge>;
    summary = `Latar tidak bisa diukur (mis. gambar dari domain lain). ${usage}`;
  } else {
    const ratio = formatRatio(decision.contrast.body);
    badge = decision.readable ? (
      <Badge tone="mint" icon={CheckCircle2}>Kontras {ratio} · Terbaca</Badge>
    ) : (
      <Badge tone="warning" icon={AlertTriangle}>Kontras {ratio} · Kurang terbaca</Badge>
    );
    summary = `${usage}${sources.length > 1 ? ` Dihitung dari ${sources.length} gambar, yang paling sulit dibaca.` : ''}`;
    if (!decision.readable) warning = suggestion(current.samples, decision.tone, percent);
  }

  return (
    <div className="space-y-4 border-t border-adm-line pt-4 sm:space-y-5 sm:pt-5">
      <div>
        <p className="text-[13px] font-medium text-adm-fg">Teks di atas latar</p>
        <p className="mt-0.5 text-xs leading-relaxed text-adm-muted">
          Pilih warna teks hero dan, bila perlu, lapisan di belakangnya. Website memakai pilihan ini apa adanya.
        </p>
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
          Lapisan di belakang teks, dipakai persis seperti ini di website. 0% = tanpa lapisan, video/gambar tampil penuh.
        </p>
      </div>

      <div className="space-y-2.5">
        {/*
         * Sama dengan website: gambar pertama (atau sampul video), lapisan hanya bila lebih dari 0% (HeroMedia), teks
         * datar tanpa bayangan. Tanpa gambar tidak ada yang bisa dipratinjau (latar putih kosong bukan gambaran website).
         * Warna website persis (bukan aksen admin mode gelap): primary = brand-600 di dalam pratinjau.
         */}
        {sources[0] && (
          <div
            role="img"
            aria-label={`Pratinjau teks hero: teks ${toneName}, ${percent === 0 ? 'tanpa lapisan' : `lapisan ${percent}%`}`}
            className="relative aspect-video overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-adm-line [--color-primary:var(--color-brand-600)]"
          >
            <img src={sources[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {decision.overlayAlpha > 0 && (
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
            )}
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
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-live="polite">
          {badge}
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-adm-muted">{summary}</p>
        </div>
        {warning && (
          <Notice tone="warning" title="Teks mungkin sulit dibaca">
            {warning}
          </Notice>
        )}
      </div>
    </div>
  );
};

export default HeroLegibilityField;
