// Simulasi KPR (kunci `kpr`), pita krem: kepala section, lalu kolom isian (1-6) — Harga rumah (rupiah, pemisah ribuan
// otomatis), Uang muka (geser 0-60% langkah 5, nilai persen + rupiah), Tenor (pilihan tahun persegi), Bunga per tahun
// (desimal) — dipisah garis rambut; dan panel hasil HIJAU TUA (8-12): "Perkiraan angsuran per bulan" dengan angka besar
// Inter tipis yang bergerak ke nilai baru (± 450 ms, gerak menyala saja), baris pokok pinjaman / uang muka / total bunga,
// catatan jujur "simulasi, bukan penawaran bank", dan tombol krem "Tanya agen soal KPR" (WhatsApp berisi angka simulasi).
// Rumus anuitas & batas nilai di ./model (kprSimulation). Tidak ada data yang dikirim atau disimpan.
import { MessageCircle } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { useTween } from './hooks';
import {
  KPR_LIMITS,
  formatDecimal,
  formatPriceShort,
  formatRupiah,
  groupThousands,
  kprMessage,
  kprSimulation,
  parseDecimal,
  parsePrice,
  tenorOptions,
  type HomeNestModel,
} from './model';
import { C, GRID_GAP, INPUT, LABEL, LABEL_SM, NUM, SECTION_PAD } from './styles';
import { ButtonLink, SectionHead } from './ui';

const DP_MAX = 60;

export function Kpr({ m, price, onPrice }: { m: HomeNestModel; price: number | null; onPrice: (price: number) => void }) {
  const { kpr } = m;
  const baseId = useId();
  const defaults = m.kprInput;
  const [dp, setDp] = useState<number | null>(null);
  const [years, setYears] = useState<number | null>(null);
  const [rate, setRate] = useState<string | null>(null);
  const motion = useMotionEnabled();
  const finalRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);

  const result = kprSimulation({
    price: price ?? defaults.price,
    dpPercent: dp ?? Math.min(defaults.dpPercent, DP_MAX),
    years: years ?? defaults.years,
    ratePercent: rate === null ? defaults.ratePercent : parseDecimal(rate, 0),
  });
  useTween(finalRef, runRef, result.monthly, formatRupiah, motion);

  const id = (key: string) => `${baseId}-${key}`;
  const rateText = rate ?? formatDecimal(defaults.ratePercent, 2);
  const note = text(kpr, 'note') || 'Simulasi dengan bunga tetap, bukan penawaran bank.';
  const ask = text(kpr, 'cta_label') ? m.waWith(kprMessage(result, m.companyName)) : null;
  const row = `border-b py-6 ${C.line}`;
  const fieldLabel = `${LABEL_SM} ${C.muted}`;

  return (
    <TemplateSection sectionKey="kpr" className={`${SECTION_PAD} ${C.cream}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(kpr, 'eyebrow')} title={text(kpr, 'title')} subtitle={text(kpr, 'subtitle')} srTitle="Simulasi KPR" />

        <div className={`mt-12 grid grid-cols-1 gap-y-12 @3xl:mt-16 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <Reveal className="min-w-0 @5xl:col-span-6">
            <form aria-label="Isian simulasi KPR" onSubmit={(e) => e.preventDefault()} className={`border-t ${C.line}`}>
              <div className={row}>
                <label htmlFor={id('price')} className={fieldLabel}>
                  Harga rumah
                </label>
                <div className="relative mt-3">
                  <span aria-hidden className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-medium ${C.muted}`}>
                    Rp
                  </span>
                  <input
                    id={id('price')}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={22}
                    value={result.price > 0 ? groupThousands(result.price) : ''}
                    onChange={(e) => onPrice(Math.min(parsePrice(e.target.value.replace(/\D/g, '')), KPR_LIMITS.price))}
                    className={`${INPUT} h-14 pl-12 text-[18px]! font-medium ${NUM}`}
                  />
                </div>
              </div>

              <div className={row}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={id('dp')} className={fieldLabel}>
                    Uang muka
                  </label>
                  <p className={`text-[15px] font-medium ${NUM} ${C.ink}`} aria-hidden>
                    {formatDecimal(result.dpPercent, 1)}% <span className={C.muted}>· {formatPriceShort(result.downPayment) || 'Rp0'}</span>
                  </p>
                </div>
                <input
                  id={id('dp')}
                  type="range"
                  min={0}
                  max={DP_MAX}
                  step={5}
                  value={result.dpPercent}
                  aria-valuetext={`${formatDecimal(result.dpPercent, 1)} persen, ${formatRupiah(result.downPayment)}`}
                  onChange={(e) => setDp(Number(e.target.value))}
                  className="hn-range mt-4 h-11 w-full cursor-pointer"
                />
                <div aria-hidden className={`flex justify-between text-[12px] ${NUM} ${C.muted}`}>
                  <span>0%</span>
                  <span>{DP_MAX}%</span>
                </div>
              </div>

              <fieldset className={`${row} min-w-0`}>
                <legend className={`float-left w-full ${fieldLabel}`}>
                  Tenor<span className="@xl:hidden"> (tahun)</span>
                </legend>
                {/* HP: satu baris angka saja ("tahun" dibacakan pembaca layar); ≥ @xl: "15 tahun" */}
                <div className="clear-both grid gap-2 pt-3" style={{ gridTemplateColumns: `repeat(${tenorOptions(defaults.years).length}, minmax(0, 1fr))` }}>
                  {tenorOptions(defaults.years).map((y) => (
                    <label
                      key={y}
                      className={`relative flex h-12 cursor-pointer items-center justify-center bg-white px-1 text-[15px] font-medium ring-1 ring-inset ring-[#1E2A24]/30 transition-colors hover:ring-[#1E2A24]/60 has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--hn-ink) ${NUM} ${C.ink}`}
                    >
                      <input type="radio" name={id('tenor')} value={y} checked={result.years === y} onChange={() => setYears(y)} className="sr-only" />
                      {y}
                      <span className="sr-only @xl:not-sr-only @xl:whitespace-pre"> tahun</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={row}>
                <label htmlFor={id('rate')} className={fieldLabel}>
                  Bunga per tahun
                </label>
                <div className="relative mt-3 max-w-[220px]">
                  <input
                    id={id('rate')}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={6}
                    value={rateText}
                    onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))}
                    className={`${INPUT} h-14 pr-12 text-[18px]! font-medium ${NUM}`}
                  />
                  <span aria-hidden className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-medium ${C.muted}`}>
                    %
                  </span>
                </div>
                <p className={`mt-2 text-[13px] ${C.muted}`}>Bunga tetap selama tenor (contoh). Maks. {KPR_LIMITS.rate[1]}%.</p>
              </div>
            </form>
          </Reveal>

          <Reveal delay={120} className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
            <div data-tpl-tone="inverse" className={`${C.deep} px-6 py-8 text-[#F4EFE4] @3xl:px-10 @3xl:py-11`}>
              <p className={`${LABEL} ${C.onDeepMuted}`}>Perkiraan angsuran per bulan</p>
              <p className={`mt-5 grid font-light ${NUM} text-[40px] leading-none tracking-[-0.03em] text-[#FBF9F4] @3xl:text-[56px]`}>
                <span ref={finalRef} className="col-start-1 row-start-1">
                  {formatRupiah(result.monthly)}
                </span>
                <span ref={runRef} aria-hidden className="col-start-1 row-start-1" />
              </p>
              <p className="sr-only" aria-live="polite">
                {`Perkiraan angsuran ${formatRupiah(result.monthly)} per bulan selama ${result.years} tahun`}
              </p>
              <dl className="mt-8 divide-y divide-[#F4EFE4]/15 border-y border-[#F4EFE4]/15 text-[14px] @3xl:text-[15px]">
                {[
                  ['Pokok pinjaman', formatRupiah(result.principal)],
                  ['Uang muka', formatRupiah(result.downPayment)],
                  ['Total bunga (perkiraan)', formatRupiah(result.totalInterest)],
                  ['Jumlah angsuran', `${result.months} bulan`],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 @3xl:gap-x-6">
                    <dt className={C.onDeepMuted}>{label}</dt>
                    <dd className={`font-medium ${NUM}`}>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className={`mt-6 text-[13px] leading-relaxed ${C.onDeepMuted}`}>{note}</p>
              <ButtonLink
                action={ask}
                label={text(kpr, 'cta_label')}
                variant="cream"
                arrow={false}
                icon={<MessageCircle aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
                className="mt-7 w-full @xl:w-auto"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
