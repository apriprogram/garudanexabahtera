// Sewa harian (kunci `rental`): kepala terbelah, lalu foto tegak (chip "Mulai Rp…/hari" dari tarif termurah) di kiri
// dan kartu kalkulator di kanan: pilih unit (radio bergaris), tanggal mulai (input tanggal), lama sewa 1–30 hari
// (tombol −/+), ringkasan tanggal ambil → kembali, tarif × hari, potongan bila lama sewa ≥ minimal hari, total, catatan
// jaminan, dan tombol "Ajukan sewa" yang membuka WhatsApp berisi unit, tanggal, lama, dan estimasi biaya (tanpa nomor →
// tombol ke Kontak). Tanggal lampau tidak dipakai (petunjuk + aria-invalid); unit tanpa tarif terbaca tanpa rincian
// biaya. Hitungan hanya di peramban (./model rentalQuote). HP: foto 4:3 di atas kalkulator.
import { CalendarDays, Check, Minus, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  MAX_RENT_DAYS,
  addDaysIso,
  clampDays,
  formatDateId,
  formatRupiah,
  isoDate,
  parsePrice,
  rentalMessage,
  rentalQuote,
  toInt,
  validStartDate,
  type SkyNusaModel,
} from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { BTN, C, CARD, GLASS, MONO } from './styles';
import { ButtonLink, SectionHead } from './ui';

const STEP = 'flex h-11 w-11 items-center justify-center rounded-[10px] text-[#0E1A1C] transition-colors hover:bg-black/[0.05] disabled:opacity-35 disabled:hover:bg-transparent';

export function Rental({ m }: { m: SkyNusaModel }) {
  const { rental } = m;
  const units = list(rental, 'items', 6).filter((item) => field(item, 'name'));
  const [unitIndex, setUnitIndex] = useState(0);
  const [days, setDays] = useState(1);
  const [start, setStart] = useState('');
  // Tanggal minimal = hari ini di zona waktu pengunjung (dihitung setelah tampil agar hasil prerender sama)
  const [today, setToday] = useState('');
  const baseId = useId();
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(isoDate(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (units.length === 0) return null;

  const unit = units[Math.min(unitIndex, units.length - 1)];
  const unitName = field(unit, 'name');
  const minDays = toInt(text(rental, 'discount_days'));
  const percent = toInt(text(rental, 'discount_percent'));
  const quote = rentalQuote(parsePrice(field(unit, 'price')) ?? 0, days, minDays, percent);
  // Unit tanpa tarif yang terbaca (kosong / "Hubungi kami"): tanpa rincian biaya, bukan "Rp0"
  const priced = quote.rate > 0;
  const rates = units.map((item) => parsePrice(field(item, 'price'))).filter((n): n is number => n !== null);
  const cheapest = rates.length > 0 ? Math.min(...rates) : null;
  // Tanggal lampau yang diketik tetap sampai ke onChange: hanya tanggal hari ini/sesudahnya yang dipakai & dikirim
  const validStart = validStartDate(start, today);
  const pastStart = !!start && !validStart;
  const end = validStart ? addDaysIso(validStart, quote.days) : '';
  const wa = m.waWith(rentalMessage(m.companyName, unitName, validStart, quote));
  const action = wa ?? m.contactAction;
  const image = text(rental, 'image');
  const points = list(rental, 'points', 4).filter((item) => field(item, 'text'));
  const depositNote = text(rental, 'deposit_note');
  const buttonLabel = text(rental, 'button_label') || 'Ajukan Sewa';
  const discountHint = priced && minDays > 1 && percent > 0 && quote.percent === 0 ? `Sewa ${minDays} hari atau lebih hemat ${percent}%.` : '';

  return (
    <TemplateSection sectionKey="rental" className={`${SECTION_Y} bg-white`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(rental, 'eyebrow')} title={text(rental, 'title')} highlight={text(rental, 'highlight')} subtitle={text(rental, 'subtitle')} />

        <div className="mt-10 grid gap-5 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-6">
          {hasImage(image) && (
            <Reveal variant="scale" className="relative min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={SKYNUSA_PHOTOS.alt(image, `Sewa drone di ${m.companyName}`)}
                fallback="none"
                zoom
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/3] rounded-[20px] @xl:aspect-[16/10] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[560px]"
              />
              {cheapest !== null && (
                <p className={`absolute bottom-4 left-4 rounded-[12px] px-4 py-3 text-[#0E1A1C] ${GLASS}`}>
                  <span className={`block ${MONO} ${C.muted}`}>Mulai dari</span>
                  <span className="mt-1 block font-[family-name:var(--tpl-font-display)] text-[24px] leading-none tracking-[-0.03em] tabular-nums">
                    {formatRupiah(cheapest)}
                    <span className={`ml-1 text-[14px] tracking-normal ${C.muted}`}>/hari</span>
                  </span>
                </p>
              )}
            </Reveal>
          )}

          <Reveal delay={120} className={`min-w-0 p-5 @3xl:p-8 ${CARD.soft} ${hasImage(image) ? '@5xl:col-span-7' : '@5xl:col-span-10 @5xl:col-start-2'}`}>
            <fieldset>
              <legend className={`${MONO} ${C.muted}`}>1 · Pilih unit</legend>
              <div className="mt-3 grid gap-2 @2xl:grid-cols-2">
                {units.map((item, i) => {
                  const selected = i === Math.min(unitIndex, units.length - 1);
                  const id = `${baseId}-unit-${i}`;
                  return (
                    <label
                      key={`${field(item, 'name')}-${i}`}
                      htmlFor={id}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-[12px] bg-white p-4 ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--tpl-accent-ink) ${
                        selected ? 'ring-[#0E1A1C]' : 'ring-black/[0.08] hover:ring-black/20'
                      }`}
                    >
                      <input id={id} type="radio" name={`${baseId}-unit`} checked={selected} onChange={() => setUnitIndex(i)} className="sr-only" />
                      <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${selected ? 'bg-[#0E1A1C] text-white ring-[#0E1A1C]' : 'ring-black/25'}`}>
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium leading-snug text-[#0E1A1C]">{field(item, 'name')}</span>
                        {field(item, 'note') && <span className={`mt-0.5 block text-[13px] leading-snug ${C.muted}`}>{field(item, 'note')}</span>}
                        {field(item, 'price') && (
                          <span className="mt-2 block text-[14px] font-medium tabular-nums text-[#0E1A1C]">
                            {field(item, 'price')}
                            {parsePrice(field(item, 'price')) !== null && <span className={`font-normal ${C.muted}`}> /hari</span>}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 @2xl:grid-cols-2">
              <div>
                <label htmlFor={`${baseId}-start`} className={`${MONO} ${C.muted}`}>
                  2 · Tanggal mulai
                </label>
                <div className="relative mt-3">
                  <CalendarDays aria-hidden className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${C.muted}`} />
                  <input
                    id={`${baseId}-start`}
                    type="date"
                    value={start}
                    min={today || undefined}
                    onChange={(e) => setStart(e.target.value)}
                    aria-invalid={pastStart || undefined}
                    aria-describedby={pastStart ? `${baseId}-start-hint` : undefined}
                    className={`h-12 w-full rounded-[12px] bg-white pl-11 pr-3 text-[15px] text-[#0E1A1C] ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-(--tpl-accent-ink) ${
                      pastStart ? 'ring-[#B42318]' : 'ring-black/[0.1]'
                    }`}
                  />
                </div>
                {pastStart && (
                  <p id={`${baseId}-start-hint`} className="mt-2 text-[13px] text-[#B42318]">
                    Pilih tanggal mulai hari ini atau sesudahnya.
                  </p>
                )}
              </div>
              <div>
                <p id={`${baseId}-days-label`} className={`${MONO} ${C.muted}`}>
                  3 · Lama sewa
                </p>
                <div role="group" aria-labelledby={`${baseId}-days-label`} className="mt-3 flex h-12 items-center justify-between rounded-[12px] bg-white px-0.5 ring-1 ring-inset ring-black/[0.1]">
                  <button type="button" className={STEP} onClick={() => setDays((d) => clampDays(d - 1))} disabled={quote.days <= 1} aria-label="Kurangi satu hari">
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <output aria-live="polite" className="text-[15px] font-medium tabular-nums text-[#0E1A1C]">
                    {quote.days} hari
                  </output>
                  <button type="button" className={STEP} onClick={() => setDays((d) => clampDays(d + 1))} disabled={quote.days >= MAX_RENT_DAYS} aria-label="Tambah satu hari">
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[12px] bg-white p-4 ring-1 ring-inset ring-black/[0.06] @3xl:p-5" aria-label="Ringkasan biaya sewa" role="group">
              <p className="text-[14px] leading-snug text-[#0E1A1C]">
                {validStart ? (
                  <>
                    Ambil <strong className="font-medium">{formatDateId(validStart)}</strong> · kembali <strong className="font-medium">{formatDateId(end)}</strong>
                  </>
                ) : (
                  <span className={C.muted}>Pilih tanggal mulai untuk melihat tanggal kembali.</span>
                )}
              </p>
              {!priced ? (
                <p className={`mt-4 border-t border-black/[0.07] pt-4 text-[14px] ${C.muted}`}>Tarif unit ini dikonfirmasi lewat WhatsApp.</p>
              ) : (
                <dl className="mt-4 space-y-2 border-t border-black/[0.07] pt-4 text-[14px]">
                  <div className="flex justify-between gap-4">
                    <dt className={C.muted}>
                      {formatRupiah(quote.rate)} × {quote.days} hari
                    </dt>
                    <dd className="tabular-nums text-[#0E1A1C]">{formatRupiah(quote.subtotal)}</dd>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-(--tpl-accent-ink)">Potongan {quote.percent}%</dt>
                      <dd className="tabular-nums text-(--tpl-accent-ink)">−{formatRupiah(quote.discount)}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4 border-t border-black/[0.07] pt-3">
                    <dt className="font-medium text-[#0E1A1C]">Estimasi total</dt>
                    <dd className="font-[family-name:var(--tpl-font-display)] text-[26px] font-medium leading-none tracking-[-0.03em] tabular-nums text-[#0E1A1C]">{formatRupiah(quote.total)}</dd>
                  </div>
                </dl>
              )}
              {discountHint && <p className="mt-3 text-[13px] text-(--tpl-accent-ink)">{discountHint}</p>}
            </div>

            {depositNote && <p className={`mt-4 text-[13.5px] leading-relaxed ${C.muted}`}>{depositNote}</p>}

            <div className="mt-6">
              <ButtonLink
                action={action}
                label={wa ? buttonLabel : 'Hubungi Kami untuk Sewa'}
                variant="ink"
                icon={wa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                className={`${BTN.ink} ${BTN.lg} w-full justify-between @xl:w-auto`}
              />
            </div>

            {points.length > 0 && (
              <ul className="mt-7 grid gap-x-6 gap-y-3 border-t border-black/[0.07] pt-6 @3xl:grid-cols-2">
                {points.map((item, i) => (
                  <Reveal as="li" key={`${field(item, 'text')}-${i}`} delay={stagger(i, 60)} className="flex items-start gap-2.5 text-[14px] leading-snug text-[#0E1A1C]">
                    <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-(--sn-tint) text-(--tpl-accent-ink)">
                      <Check className="h-3 w-3" strokeWidth={2.75} />
                    </span>
                    {field(item, 'text')}
                  </Reveal>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
