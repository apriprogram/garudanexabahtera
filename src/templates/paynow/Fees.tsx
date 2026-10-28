// Simulasi biaya (kunci `fees`): section lavender. Kiri: label, H2, deskripsi, lalu daftar "Contoh tarif" (metode ·
// tarif, garis rambut). Kanan: kartu "struk" putih radius 24: nominal (Rp, hanya angka, pemisah ribuan), metode bayar
// (select dari daftar tarif), "Biaya ditanggung" Merchant/Pelanggan (radio pil), garis putus-putus, lalu hasil: biaya
// layanan, dibayar pelanggan, diterima merchant (besar, warna tema). Angka hasil bergulir ≤ 360 ms bila gerak menyala;
// wilayah live mengumumkan hasil. Tarif = contoh dari CMS, label "Contoh tarif" selalu tampil. Tidak ada transaksi.
import { ChevronDown, Info } from 'lucide-react';
import { useId, useState, type ChangeEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { useTween } from './hooks';
import { feeRates, formatRupiah, formatThousands, parseAmount, rateLabel, simulateFee, type FeeBearer, type PaynowModel } from './model';
import { C, CARD, DISPLAY, GRID_GAP, SECTION_PAD } from './styles';
import { SectionHead } from './ui';

function Money({ value, motion, className }: { value: number; motion: boolean; className: string }) {
  const shown = useTween(value, motion);
  return <span className={`tabular-nums ${className}`}>{formatRupiah(shown)}</span>;
}

const BEARERS: { key: FeeBearer; label: string }[] = [
  { key: 'merchant', label: 'Merchant' },
  { key: 'customer', label: 'Pelanggan' },
];

export function Fees({ m }: { m: PaynowModel }) {
  const { fees } = m;
  const rates = feeRates(fees);
  const baseId = useId();
  const motion = useMotionEnabled();
  const [digits, setDigits] = useState(() => String(parseAmount(text(fees, 'default_amount')) || 100000));
  const [method, setMethod] = useState(0);
  const [bearer, setBearer] = useState<FeeBearer>('merchant');
  if (rates.length === 0) return null;
  const rate = rates[Math.min(method, rates.length - 1)];
  const amount = parseAmount(digits);
  const result = simulateFee(amount, rate, bearer);
  const tableLabel = text(fees, 'table_label') || 'Contoh tarif';
  const note = text(fees, 'note');
  const onAmount = (e: ChangeEvent<HTMLInputElement>) => setDigits(String(parseAmount(e.target.value) || ''));

  const label = `mb-2 block text-[14px] font-semibold ${C.ink}`;

  return (
    <TemplateSection sectionKey="fees" className={`${SECTION_PAD} ${C.mist}`}>
      {/* HP: kepala → kartu simulasi → daftar tarif; layar lebar: kepala + daftar tarif di kiri, kartu di kanan */}
      <div className={`${CONTAINER} grid gap-y-12 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-y-10 ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead eyebrow={text(fees, 'eyebrow')} title={text(fees, 'title')} subtitle={text(fees, 'subtitle')} srTitle={text(fees, 'eyebrow') || 'Simulasi biaya'} />
        </div>

        <Reveal variant="fade" className="min-w-0 @5xl:col-span-6 @5xl:col-start-7 @5xl:row-span-2 @5xl:row-start-1 @5xl:self-start">
          <div className={`${CARD} p-5 @3xl:p-8`}>
            <div className="grid gap-5 @2xl:grid-cols-2">
              <div className="@2xl:col-span-2">
                <label htmlFor={`${baseId}-amount`} className={label}>
                  Nominal transaksi
                </label>
                <div className="relative">
                  <span aria-hidden className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold ${C.muted}`}>
                    Rp
                  </span>
                  <input
                    id={`${baseId}-amount`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={13}
                    value={digits ? formatThousands(Number(digits)) : ''}
                    onChange={onAmount}
                    className={`block h-14 w-full rounded-[16px] bg-(--pn-mist) pl-12 pr-4 text-[20px] font-semibold tabular-nums ring-1 ring-inset ring-[#0E0F2C]/45 transition-colors focus:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) ${C.ink} ${DISPLAY}`}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor={`${baseId}-method`} className={label}>
                  Metode bayar
                </label>
                <div className="relative">
                <select
                  id={`${baseId}-method`}
                  value={String(Math.min(method, rates.length - 1))}
                  onChange={(e) => setMethod(Number(e.target.value))}
                  className={`block h-12 w-full appearance-none rounded-[14px] bg-white pl-4 pr-10 text-[16px] ring-1 ring-inset ring-[#0E0F2C]/45 focus:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) @3xl:text-[15px] ${C.ink}`}
                >
                  {rates.map((r, i) => (
                    <option key={`${r.name}-${i}`} value={i}>
                      {r.name} — {rateLabel(r)}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
                </div>
              </div>
              <fieldset className="min-w-0">
                <legend className={label}>Biaya ditanggung</legend>
                <div className="grid h-12 grid-cols-2 gap-1 rounded-full bg-(--pn-mist) p-1 ring-1 ring-inset ring-[#0E0F2C]/[0.08]">
                  {BEARERS.map((b) => {
                    const checked = bearer === b.key;
                    return (
                      <label
                        key={b.key}
                        className={`relative flex cursor-pointer items-center justify-center rounded-full text-[14px] font-semibold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent) ${
                          checked ? 'bg-white text-(--pn-ink) ring-1 ring-inset ring-[#0E0F2C]/[0.1]' : `${C.muted} hover:text-[#0E0F2C]`
                        }`}
                      >
                        <input type="radio" name={`${baseId}-bearer`} value={b.key} checked={checked} onChange={() => setBearer(b.key)} className="sr-only" />
                        {b.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div aria-hidden className="my-7 border-t-2 border-dashed border-[#0E0F2C]/[0.12]" />

            {/* Pembaca layar: nilai akhir saja (angka yang bergulir tidak diumumkan berulang) */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {`Biaya layanan ${formatRupiah(result.fee)}, dibayar pelanggan ${formatRupiah(result.paid)}, diterima merchant ${formatRupiah(result.received)}.`}
            </p>
            <dl className="grid gap-3.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className={`text-[15px] ${C.muted}`}>
                  Biaya layanan <span className="whitespace-nowrap">({rateLabel(rate)})</span>
                </dt>
                <dd data-pn-fee="fee">
                  <Money value={result.fee} motion={motion} className={`text-[16px] font-semibold ${C.ink}`} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className={`text-[15px] ${C.muted}`}>Dibayar pelanggan</dt>
                <dd data-pn-fee="paid">
                  <Money value={result.paid} motion={motion} className={`text-[16px] font-semibold ${C.ink}`} />
                </dd>
              </div>
              <div className={`mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 rounded-[18px] bg-(--pn-mist) px-5 py-4`}>
                <dt className={`text-[15px] font-semibold ${C.ink}`}>Diterima merchant</dt>
                <dd data-pn-fee="received">
                  <Money value={result.received} motion={motion} className={`${DISPLAY} text-[28px] font-bold leading-none tracking-[-0.02em] text-(--pn-ink) @3xl:text-[34px]`} />
                </dd>
              </div>
            </dl>
            {note && (
              <p className={`mt-5 flex items-start gap-2 text-[13.5px] leading-snug ${C.muted}`}>
                <Info aria-hidden className="mt-px h-4 w-4 shrink-0" />
                {note}
              </p>
            )}
          </div>
        </Reveal>

        <Reveal delay={120} className="min-w-0 @5xl:col-span-5 @5xl:row-start-2">
          <RateTable id={`${baseId}-rates`} label={tableLabel} rates={rates} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function RateTable({ id, label, rates }: { id: string; label: string; rates: ReturnType<typeof feeRates> }) {
  return (
    <div>
      <h3 id={id} className="inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-(--pn-ink) ring-1 ring-inset ring-[#0E0F2C]/[0.08]">
        {label}
      </h3>
      <dl aria-labelledby={id} className={`mt-4 divide-y border-y ${C.line} divide-[#0E0F2C]/[0.1]`}>
        {rates.map((r, i) => (
          <div key={`${r.name}-${i}`} className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className={`text-[15px] ${C.ink}`}>{r.name}</dt>
            <dd className={`shrink-0 text-[15px] font-semibold tabular-nums ${C.ink} ${DISPLAY}`}>{rateLabel(r)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
