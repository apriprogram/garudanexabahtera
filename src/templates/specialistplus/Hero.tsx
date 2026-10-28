// Hero SpecialistPlus — "Console" (data-hero-layout="console"): foto ruang pencitraan sebagai LATAR selebar hero di
// bawah lapisan navy (kiri lebih gelap untuk teks). Layar lebar: label kaca, H1 putih, deskripsi, dua tombol di kolom
// kiri; di kanan PANEL KONSOL DATA navy 94%: pilih spesialis (select, terhubung dengan tab di bagian Spesialis) →
// jumlah dokter, hari praktik gabungan, jadwal terdekat; tombol "Lihat jadwal dokter"; tiga angka bersatuan (CountUp);
// catatan "jadwal contoh". HP & tablet: foto di pita atas (360px) yang memudar ke navy, teks di atasnya, konsol
// selebar layar di bawahnya. Gerak khas (./specialistplus.css): garis pindai teal menyapu konsol SEKALI; nilai konsol
// berkedip lembut saat spesialis diganti. Foto hero (LCP) TIDAK pernah disembunyikan atau dianimasikan.
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SpxModel } from './model';
import { SPECIALISTPLUS_PHOTOS } from './photos';
import { MONO_LABEL, TYPE_S } from './styles';
import { ButtonLink, Highlighted } from './ui';

const ROW = 'flex items-baseline justify-between gap-4 py-2.5';
const ROW_DT = `${MONO_LABEL} text-white/64`;
const ROW_DD = 'spx-flash -mr-1 min-w-0 rounded-[4px] px-1 text-right font-mono text-[14px] font-medium tabular-nums';

/** Panel konsol data. Tanpa klinik & tanpa angka → tidak dirender. */
function Console({ m, active, onSelect }: { m: SpxModel; active: number; onSelect: (index: number) => void }) {
  const baseId = useId();
  const { hero } = m;
  // Bagian Spesialis disembunyikan → konsol hanya menampilkan angka (data klinik tidak muncul di tempat lain)
  const list = m.shown('specialists') ? m.specialties : [];
  const current = list.length > 0 ? list[Math.min(Math.max(0, active), list.length - 1)] : null;
  const stats = m.stats;
  if (!current && stats.length === 0) return null;
  const title = text(hero, 'console_title') || 'Cari jadwal spesialis';
  const note = text(hero, 'console_note');
  const button = text(hero, 'console_button');
  const target = m.sectionAction('specialists');

  return (
    <div
      role="group"
      aria-labelledby={`${baseId}-title`}
      data-spx-console=""
      className="spx-console relative isolate overflow-hidden rounded-[8px] bg-[color-mix(in_srgb,var(--spx-navy)_94%,transparent)] ring-1 ring-inset ring-white/[0.14] backdrop-blur-md"
    >
      <span aria-hidden className="spx-scan" />
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
        <p id={`${baseId}-title`} className={`flex min-w-0 items-center gap-2.5 ${MONO_LABEL} text-white/85`}>
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--spx-bright)" />
          <span className="min-w-0 truncate">{title}</span>
        </p>
        {current && list.length > 1 && (
          <p aria-hidden className={`shrink-0 ${MONO_LABEL} text-white/64`}>
            {current.code ? `${current.code} · ` : ''}
            {String(current.index + 1).padStart(2, '0')}/{String(list.length).padStart(2, '0')}
          </p>
        )}
      </div>

      {current && (
        <div className="px-5 pb-5 pt-4">
          <label htmlFor={`${baseId}-select`} className={`block ${MONO_LABEL} text-white/70`}>
            Spesialis
          </label>
          <div className="relative mt-2">
            <select
              id={`${baseId}-select`}
              value={current.index}
              onChange={(e) => onSelect(Number(e.target.value))}
              className="block h-12 w-full cursor-pointer appearance-none rounded-[6px] bg-white/[0.06] pl-3.5 pr-10 text-[16px] font-medium text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-(--spx-bright)"
            >
              {list.map((s) => (
                <option key={s.index} value={s.index} className="bg-white text-[#0D1B2A]">
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
          </div>
          <dl aria-live="polite" data-spx-readout="" className="mt-3 divide-y divide-white/10">
            <div className={ROW}>
              <dt className={ROW_DT}>Dokter</dt>
              <dd key={`d-${current.index}`} className={`${ROW_DD} text-white`}>
                {current.doctors.length > 0 ? `${current.doctors.length} dokter` : '–'}
              </dd>
            </div>
            <div className={ROW}>
              <dt className={ROW_DT}>Hari praktik</dt>
              <dd key={`h-${current.index}`} className={`${ROW_DD} text-white`}>
                {current.days || '–'}
              </dd>
            </div>
            {current.nextSlot && (
              <div className={ROW}>
                <dt className={ROW_DT}>Jadwal terdekat</dt>
                <dd key={`s-${current.index}`} className={`${ROW_DD} text-(--spx-bright)`}>
                  {current.nextSlot}
                </dd>
              </div>
            )}
          </dl>
          <ButtonLink action={target} label={button} size="md" className="mt-4 flex w-full" />
        </div>
      )}

      {stats.length > 0 && (
        <dl className={`grid ${stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} divide-x divide-white/10 border-t border-white/10`}>
          {stats.map((item, i) => (
            <div key={`${field(item, 'label')}-${i}`} className="flex min-w-0 flex-col px-4 py-4">
              {/* dt lebih dulu di DOM (urutan dl yang benar), tampil di bawah angka */}
              <dt className="order-last mt-2 text-[12.5px] leading-snug text-white/70">{field(item, 'label')}</dt>
              <dd className="flex min-w-0 items-baseline gap-x-1.5 whitespace-nowrap">
                <span className={`${TYPE_S.metric} text-white`}>{field(item, 'value') ? <CountUp value={field(item, 'value')} /> : '–'}</span>
                {field(item, 'unit') && <span className="font-mono text-[12px] text-(--spx-bright)">{field(item, 'unit')}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {note && <p className="border-t border-white/10 px-5 py-3 font-mono text-[11.5px] leading-snug text-white/64">{note}</p>}
    </div>
  );
}

export function Hero({ m, active, onSelect }: { m: SpxModel; active: number; onSelect: (index: number) => void }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primaryLabel = m.primaryAction ? text(hero, 'primary_label') : '';
  const secondaryLabel = m.secondaryAction ? text(hero, 'secondary_label') : '';
  const photo = hasImage(image);

  return (
    <TemplateSection
      sectionKey="hero"
      data-hero-layout="console"
      data-tpl-tone="inverse"
      className={`relative isolate overflow-hidden bg-(--spx-navy) text-white ${photo ? '' : 'spx-hero-fallback'}`}
    >
      {/* HP/tablet: foto di pita atas yang memudar ke navy; layar lebar: latar penuh */}
      <div className="spx-hero-media absolute inset-x-0 top-0 -z-10 h-[330px] @3xl:h-[440px] @5xl:inset-0 @5xl:h-auto">
        <KitPhoto
          src={image}
          alt={SPECIALISTPLUS_PHOTOS.alt(image, `Ruang pemeriksaan di ${m.companyName}`)}
          priority
          fallback="none"
          sizes="(min-width: 1024px) 100vw, 780px"
          position="50% 48%"
          className="absolute inset-0"
        />
        <div aria-hidden className="spx-hero-scrim absolute inset-0" />
      </div>

      <div
        className={`${CONTAINER} relative grid min-h-[max(600px,min(84svh,780px))] grid-cols-1 content-end gap-y-10 pb-8 pt-[262px] @3xl:pt-[340px] @5xl:grid-cols-12 @5xl:content-center @5xl:items-center @5xl:gap-x-8 @5xl:pb-16 @5xl:pt-16 @7xl:gap-x-10`}
      >
        <div className="min-w-0 @5xl:col-span-6 @6xl:col-span-7">
          {eyebrow && (
            <Reveal
              as="p"
              className={`inline-flex min-h-8 max-w-full items-center gap-2.5 rounded-[4px] bg-[color-mix(in_srgb,var(--spx-navy)_55%,transparent)] px-3 py-1.5 ${MONO_LABEL} text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur-md`}
            >
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--spx-bright)" />
              <span className="min-w-0 text-balance">{eyebrow}</span>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @5xl:mt-6' : ''} max-w-[15ch] text-white ${TYPE_S.h1}`}>
            <Highlighted title={title} highlight={text(hero, 'highlight')} tone="dark" />
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty text-white/85 ${TYPE_S.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {(primaryLabel || secondaryLabel) && (
            <Reveal delay={240} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
              <ButtonLink action={m.primaryAction} label={primaryLabel} className="w-full @xl:w-auto" />
              <ButtonLink action={m.secondaryAction} label={secondaryLabel} variant="ghost" arrow={false} className="w-full @xl:w-auto" />
            </Reveal>
          )}
        </div>

        <Reveal
          variant="right"
          delay={320}
          className="min-w-0 @3xl:max-w-[520px] @5xl:col-span-6 @5xl:col-start-7 @5xl:max-w-none @6xl:col-span-5 @6xl:col-start-8 @min-[88rem]:col-span-4 @min-[88rem]:col-start-9"
        >
          <Console m={m} active={active} onSelect={onSelect} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
