// Kalender panen (kunci `season`, latar kertas). Kepala terbelah (label + H2 kiri; deskripsi + keterangan batang
// kanan), lalu satu baris per komoditas: ikon bulat kraft + nama (H3) + daerah + ringkasan teks "Musim panen Mei–Sep ·
// panen raya Jun–Agu" (awalannya = keterangan batang dari CMS; versi teks dari batang yang aria-hidden), dan lintasan 12
// bulan (aria-hidden): batang muda bergaris saffron = musim panen, batang saffron tegas = panen raya. Rentang yang
// melewati akhir tahun (Nov–Feb) jadi dua potong; teks bulan yang tidak
// dikenal → baris tanpa batang. Bulan berjalan ditandai di kepala kolom dan lajur tipis. Batang tumbuh sekali (scaleX)
// saat kalender masuk layar (CSS .sg-cal/.sg-bar di ./saudagar.css). HP: satu baris inisial bulan di atas daftar,
// lintasan selebar layar di bawah nama tiap komoditas.
import { Fragment, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { useCurrentMonth } from './hooks';
import { monthLabels, parseMonths, type SaudagarModel } from './model';
import { C, SECTION_PAD, SERIF } from './styles';
import { CommodityIcon, SectionHead } from './ui';

// Kolom nama ≥ 272px: nama komoditas & daerah muat satu baris di laptop kecil & tablet (ringkasan boleh dua baris)
const ROW = 'grid gap-3 @3xl:grid-cols-[minmax(272px,3fr)_9fr] @3xl:items-center @3xl:gap-8';

function Bars({ ranges, peak = false, index }: { ranges: [number, number][]; peak?: boolean; index: number }) {
  return (
    <>
      {ranges.map(([start, end], i) => (
        <span
          key={`${start}-${end}-${i}`}
          className={`sg-bar absolute inset-y-2 rounded-full ${peak ? 'sg-bar-peak bg-(--tpl-accent)' : 'bg-(--sg-tint) ring-1 ring-inset ring-(--tpl-accent)'}`}
          style={{ left: `${((start - 1) / 12) * 100}%`, width: `${((end - start + 1) / 12) * 100}%`, '--sg-i': Math.min(index, 5) } as CSSProperties}
        />
      ))}
    </>
  );
}

function Legend({ harvest, peak }: { harvest: string; peak: string }) {
  if (!harvest && !peak) return null;
  return (
    <ul className={`flex flex-wrap gap-x-6 gap-y-2 text-[13px] ${C.muted}`}>
      {harvest && (
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="h-3 w-8 rounded-full bg-(--sg-tint) ring-1 ring-inset ring-(--tpl-accent)" />
          {harvest}
        </li>
      )}
      {peak && (
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="h-3 w-8 rounded-full bg-(--tpl-accent)" />
          {peak}
        </li>
      )}
    </ul>
  );
}

export function Season({ m }: { m: SaudagarModel }) {
  const { season } = m;
  const rows = m.items('season');
  const month = useCurrentMonth();
  if (rows.length === 0) return null;
  const labels = monthLabels(text(season, 'month_labels'));
  const note = text(season, 'note');
  const legendHarvest = text(season, 'legend_harvest');
  const legendPeak = text(season, 'legend_peak');
  const legend = <Legend harvest={legendHarvest} peak={legendPeak} />;
  // Awalan ringkasan tiap baris = keterangan batang (bisa ditulis dalam bahasa lain); kosong → "Panen" / "puncak"
  const harvestWord = legendHarvest || 'Panen';
  const peakWord = legendPeak ? legendPeak.charAt(0).toLowerCase() + legendPeak.slice(1) : 'puncak';

  const lanes = (
    <span aria-hidden className="absolute inset-0 grid grid-cols-12">
      {labels.map((label, i) => (
        <span key={`${label}-${i}`} className={`border-l border-[#221A13]/[0.07] first:border-l-0 ${i === month ? 'bg-[#221A13]/[0.04]' : ''}`} />
      ))}
    </span>
  );

  return (
    <TemplateSection sectionKey="season" className={`bg-[#F7F2E8] ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead layout="split" eyebrow={text(season, 'eyebrow')} title={text(season, 'title') || 'Kalender panen'} subtitle={text(season, 'subtitle')} aside={legend} />

        <Reveal variant="fade" className="sg-cal mt-12 @3xl:mt-16">
          {month >= 0 && <p className="sr-only">Bulan berjalan: {labels[month]}.</p>}
          {/* Kepala kolom bulan: HP inisial, layar lebar nama pendek; bulan berjalan bergaris saffron lembut */}
          <div aria-hidden className={`${ROW} pb-3`}>
            <span className="hidden @3xl:block" />
            <span className="grid grid-cols-12">
              {labels.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className={`border-b-2 pb-2 text-center text-[12px] leading-none @3xl:text-[12.5px] ${
                    i === month ? `font-semibold [border-bottom-color:var(--sg-line)] ${C.ink}` : `border-transparent ${C.muted}`
                  }`}
                >
                  <span className="@3xl:hidden">{label.charAt(0)}</span>
                  <span className="hidden @3xl:inline">{label}</span>
                </span>
              ))}
            </span>
          </div>

          <ul className={`divide-y border-y ${C.line} ${C.divide}`}>
            {rows.map((item, i) => {
              const harvestRaw = field(item, 'harvest');
              const peakRaw = field(item, 'peak');
              const harvest = parseMonths(harvestRaw);
              const peak = parseMonths(peakRaw);
              const summary = [harvestRaw && `${harvestWord} ${harvestRaw}`, peakRaw && `${peakWord} ${peakRaw}`].filter(Boolean);
              return (
                <li key={`${field(item, 'name')}-${i}`} className={`${ROW} py-5`}>
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFE6D3] text-(--sg-ink)">
                      <CommodityIcon name={field(item, 'name')} />
                    </span>
                    <div className="min-w-0">
                      <h3 className={`${SERIF} text-[20px] font-normal leading-snug tracking-[-0.01em] ${C.ink}`}>{field(item, 'name')}</h3>
                      {field(item, 'origin') && <p className={`text-[13px] leading-snug ${C.muted}`}>{field(item, 'origin')}</p>}
                      {(summary.length > 0 || field(item, 'note')) && (
                        // Tiap bagian ("Musim panen Mei–Sep") satu blok sebaris: baris hanya patah di tanda " · ", bukan di
                        // tengah "panen raya"; bagian yang lebih panjang dari kolom tetap terlipat di dalam bloknya
                        <p className={`mt-1 text-pretty text-[13px] leading-snug ${C.muted}`}>
                          {summary.map((part, j) => (
                            <Fragment key={j}>
                              {j > 0 && ' '}
                              <span className="inline-block max-w-full">
                                {part}
                                {j < summary.length - 1 && ' ·'}
                              </span>
                            </Fragment>
                          ))}
                          {summary.length > 0 && field(item, 'note') ? '. ' : ''}
                          {field(item, 'note')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span aria-hidden className="relative block h-7">
                    {lanes}
                    <Bars ranges={harvest} index={i} />
                    <Bars ranges={peak} peak index={i} />
                  </span>
                </li>
              );
            })}
          </ul>
          {note && <p className={`mt-5 max-w-[80ch] text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
