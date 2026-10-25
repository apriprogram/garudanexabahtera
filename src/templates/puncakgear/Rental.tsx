// Sewa alat (kunci `rental`) untuk pendaki pemula: bagian gelap hutan malam dengan garis kontur bercahaya. Kiri label,
// H2, deskripsi, syarat sewa bertanda centang, dan foto tegak (layar lebar). Kanan kartu putih "Hitung biaya sewa":
// daftar alat (checkbox + harga per hari), penghitung hari 1–14 (tombol − / +), ringkasan (biaya per hari × hari,
// diskon lama sewa bila ada, total), dan tombol WhatsApp yang mengirim daftar alat, lama sewa, dan perkiraan total.
// Demo sisi klien: tidak ada pemesanan/pembayaran sungguhan. Tiga alat pertama dan 2 hari terpilih saat dibuka.
import { Check, Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { MAX_DAYS, MIN_DAYS, clampDays, formatRupiah, lines, rentalDiscount, rentalItems, rentalMessage, rentalQuote, type PuncakModel } from './model';
import { PUNCAK_PHOTOS } from './photos';
import { BTN, C, DISPLAY, TYPE_P } from './styles';
import { SectionLabel, TitleIcon, Topo } from './ui';

// Batas hari: aria-disabled (bukan disabled) agar fokus keyboard tidak lepas ke <body> saat batas tercapai; clampDays menjaga nilainya
const STEP =
  'flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F2EE] text-[#0E1512] transition-colors hover:bg-[#E6E8E2] aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-[#F1F2EE]';

export function Rental({ m }: { m: PuncakModel }) {
  const { rental } = m;
  const items = rentalItems(rental);
  const [selected, setSelected] = useState<number[]>(() => items.map((_, i) => i).filter((i) => items[i].price != null).slice(0, 3));
  const [days, setDays] = useState(2);
  const daysId = useId();
  if (items.length === 0) return null;
  const eyebrow = text(rental, 'eyebrow');
  const title = text(rental, 'title');
  const subtitle = text(rental, 'subtitle');
  const image = text(rental, 'image');
  const terms = lines(text(rental, 'terms'), 8);
  const discount = rentalDiscount(rental);
  const quote = rentalQuote(items, selected, days, discount);
  const buttonLabel = text(rental, 'button_label') || 'Pesan Sewa';
  const action = quote.count > 0 ? m.askWith(rentalMessage(m.companyName, items, quote, selected)) : null;
  const toggle = (i: number) => setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)));

  return (
    // Tanpa data-tpl-tone="inverse": elemen yang bisa difokus hanya ada di kartu putih, jadi cincin fokus dasar (gelap) tetap terlihat
    <TemplateSection sectionKey="rental" className={`relative isolate overflow-hidden text-white ${SECTION_Y} ${C.night}`}>
      <Topo className="absolute -left-48 top-0 -z-10 h-[760px] w-[1100px] text-(--pg-glow) opacity-[0.12]" />
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {eyebrow && (
            <Reveal>
              <SectionLabel tone="dark">{eyebrow}</SectionLabel>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-white ${TYPE_P.h2}`}>
              {title}
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[44ch] text-white/80 ${TYPE_P.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {terms.length > 0 && (
            <Reveal as="ul" delay={220} aria-label="Syarat sewa" className="mt-8 space-y-3">
              {terms.map((term, i) => (
                <li key={`${term}-${i}`} className="flex items-start gap-3 text-[15px] leading-snug text-white/90">
                  <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {term}
                </li>
              ))}
            </Reveal>
          )}
          {hasImage(image) && (
            <Reveal variant="fade" delay={260} className="relative mt-10 hidden aspect-[4/5] max-w-[420px] overflow-hidden rounded-[24px] @5xl:block">
              <KitPhoto src={image} alt={PUNCAK_PHOTOS.alt(image, 'Pendaki membawa alat sewaan')} fallback="none" zoom sizes="34vw" className="absolute inset-0" />
            </Reveal>
          )}
        </div>

        <Reveal delay={120} className="min-w-0 @5xl:col-span-7">
          <div className="rounded-[28px] bg-white p-5 text-[#0E1512] @3xl:p-8">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h3 className={`text-[#0E1512] ${DISPLAY} text-[24px] leading-tight tracking-[-0.02em] @3xl:text-[28px]`}>Hitung biaya sewa</h3>
              {discount && (
                <p className="rounded-full bg-(--pg-tint) px-3 py-1.5 text-[13px] font-semibold text-[#0E1512]">
                  Hemat {discount.percent}% untuk sewa ≥ {discount.days} hari
                </p>
              )}
            </div>

            <fieldset className="mt-6">
              <legend className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>1. Pilih alat</legend>
              <ul className="mt-3 divide-y divide-black/[0.06] rounded-[20px] bg-[#F7F8F5] px-2">
                {items.map((item, i) => {
                  const checked = selected.includes(i);
                  const disabled = item.price == null;
                  return (
                    <li key={`${item.name}-${i}`}>
                      <label className={`flex min-h-14 items-center gap-3 px-2 py-2.5 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(i)} className="peer sr-only" />
                        <span
                          aria-hidden
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0E1512] ${
                            checked ? 'bg-[#0E1512] text-(--tpl-accent) ring-transparent' : 'bg-white ring-black/20'
                          }`}
                        >
                          {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                        <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0E1512] @xl:flex">
                          <TitleIcon title={item.name} index={i} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-snug">{item.name}</span>
                          {item.note && <span className={`block text-[13px] leading-snug ${C.muted}`}>{item.note}</span>}
                        </span>
                        <span className="shrink-0 text-right text-[14px] font-semibold tabular-nums">
                          {item.price != null ? formatRupiah(item.price) : item.priceLabel || '—'}
                          <span className={`block text-[12px] font-normal ${C.muted}`}>per hari</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p id={daysId} className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>
                2. Lama sewa
              </p>
              <div role="group" aria-labelledby={daysId} className="flex items-center gap-3">
                <button type="button" aria-label="Kurangi satu hari" aria-disabled={days <= MIN_DAYS} onClick={() => setDays((d) => clampDays(d - 1))} className={STEP}>
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <output aria-live="polite" className={`min-w-[84px] text-center text-[20px] tabular-nums ${DISPLAY}`}>
                  {quote.days} hari
                </output>
                <button type="button" aria-label="Tambah satu hari" aria-disabled={days >= MAX_DAYS} onClick={() => setDays((d) => clampDays(d + 1))} className={STEP}>
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>

            <dl className="mt-6 space-y-2.5 rounded-[20px] bg-[#0E1512] p-5 text-white @3xl:p-6">
              <div className="flex items-center justify-between gap-4 text-[14px] text-white/75">
                <dt>
                  {quote.count} alat × {quote.days} hari
                </dt>
                <dd className="tabular-nums">{formatRupiah(quote.perDay)}/hari</dd>
              </div>
              {quote.discount > 0 && discount && (
                <div className="flex items-center justify-between gap-4 text-[14px] text-(--pg-glow)">
                  <dt>Diskon {discount.percent}% lama sewa</dt>
                  <dd className="tabular-nums">−{formatRupiah(quote.discount)}</dd>
                </div>
              )}
              <div className="flex items-end justify-between gap-4 border-t border-white/15 pt-3">
                <dt className="text-[14px] text-white/75">Perkiraan total</dt>
                <dd aria-live="polite" className={`text-[28px] leading-none tabular-nums tracking-[-0.02em] text-white @3xl:text-[32px] ${DISPLAY}`}>
                  {formatRupiah(quote.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
              <p className={`max-w-[40ch] text-[13px] leading-snug ${C.muted}`}>Perkiraan biaya. Ketersediaan dan total akhir dikonfirmasi saat pemesanan.</p>
              {action ? (
                <ActionLink action={action} className={`${BTN.ink} ${BTN.lg} shrink-0`}>
                  {action.kind === 'external' && <WhatsAppIcon className="h-4 w-4 shrink-0 text-(--tpl-accent)" />}
                  {buttonLabel}
                </ActionLink>
              ) : (
                <button type="button" disabled className={`${BTN.ink} ${BTN.lg} shrink-0 cursor-not-allowed opacity-40`}>
                  {quote.count === 0 ? 'Pilih minimal satu alat' : buttonLabel}
                </button>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
