// Hero Kemudi — "Drive" (data-hero-layout="drive"): foto udara mobil di jalan hutan SELEBAR LAYAR sebagai latar di bawah
// header putih, lapisan grafit radial di belakang kolom teks (kiri atas), lalu kolom 1-6: pil label kaca gelap, H1 Hanken
// 700 dengan garis biru di bawah "harga jelas." (boleh terbungkus ke baris berikut; garis ikut tiap baris), kalimat
// singkat, tautan "Lihat semua mobil". Kolom 8-12: KARTU PESAN putih radius 24, ringkas (CTA tetap di layar pertama laptop
// 1280×720): Layanan (bersegmen Lepas kunci | Dengan sopir), Mobil, Ambil (tanggal + jam), Kembali (tanggal + jam), trek
// mini (blok 24/12 jam; mobil mungil melaju dari titik Ambil ke Kembali tiap jadwal berubah), rincian + hari ambil →
// kembali, perkiraan harga (angka bergerak ± 450 ms), tombol "Pesan via WhatsApp" (pesan tersusun), catatan jujur. Mobil
// tanpa harga di CMS = "harga via admin" (pesan tetap tersusun, tanpa perkiraan). HP: teks di atas
// foto, kartu menumpuk menutup tepi bawah foto. Foto hero (LCP) tidak pernah disembunyikan: Ken Burns skala 1 → 1,05
// sekali di WADAH foto. Formulir hanya menyusun pesan WhatsApp — tidak ada pembayaran online, tidak ada data yang disimpan.
import { ArrowDown, MessageCircle } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { splitHighlight, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useTween } from './hooks';
import {
  BOOKING_FIELDS,
  HOURS,
  MODES,
  NBSP,
  bookingMessage,
  bookingMinutes,
  formatRupiah,
  formatShortDate,
  isoDate,
  pricedFor,
  quoteRental,
  seatsLabel,
  supports,
  validateBooking,
  withMode,
  type Booking,
  type BookingErrors,
  type KemudiModel,
  type Quote,
  type RentalMode,
} from './model';
import { KEMUDI_PHOTOS } from './photos';
import { BTN, C, DISPLAY, FIELD_LABEL, INPUT, MONO, TYPE, WRAP } from './styles';
import { Segmented } from './ui';
import { CarGlyph } from './vehicles';

/** Segmen trek mini: blok 24 jam (lebar 2) / 12 jam (lebar 1); lebih dari 14 blok → satu batang utuh. */
function blocksOf(quote: Quote | null): number[] {
  if (!quote) return [];
  const list = quote.mode === 'driver' ? Array.from({ length: quote.blocks }, () => 1) : [...Array.from({ length: quote.full }, () => 2), ...(quote.half ? [1] : [])];
  return list.length > 14 ? [list.reduce((a, b) => a + b, 0)] : list;
}

/** Trek mini dekoratif: titik Ambil → titik Kembali, blok 24/12 jam, mobil mungil melaju tiap jadwal berubah. */
function Track({ booking, quote, motion }: { booking: Booking; quote: Quote | null; motion: boolean }) {
  const blocks = blocksOf(quote);
  const signature = `${booking.mode}|${booking.car}|${booking.pickupDate}|${booking.pickupTime}|${booking.returnDate}|${booking.returnTime}`;
  return (
    <div aria-hidden className="relative mt-3 h-9">
      <div className="absolute inset-x-[7px] top-[26px] flex h-[3px] gap-[3px]">
        {blocks.length > 0 ? (
          blocks.map((w, i) => <span key={i} className={`h-full rounded-full ${w === 1 ? 'bg-(--tpl-accent-300)' : 'bg-(--tpl-accent)'}`} style={{ flexGrow: w, flexBasis: 0 }} />)
        ) : (
          <span className="h-full flex-1 rounded-full bg-[#D5DBE3]" />
        )}
      </div>
      <span className="absolute left-0 top-[21px] h-[13px] w-[13px] rounded-full border-[3px] border-(--tpl-accent) bg-white" />
      <span className="absolute right-0 top-[21px] h-[13px] w-[13px] rounded-full bg-(--tpl-accent)" />
      <div key={motion ? signature : 'static'} className="km-drive absolute inset-x-[7px] top-0">
        <CarGlyph className="-ml-5 h-5 w-10" />
      </div>
    </div>
  );
}

/**
 * "Jum, 30 Okt → Min, 1 Nov" (hari disebut sekali di kartu; jam ada di isian). Spasi tak terputus di dalam tiap tanggal:
 * di HP sempit baris hanya patah sesudah panah ("Jum, 30 Okt →" / "Min, 1 Nov"), bukan "Min, 1 / Nov".
 */
const keep = (s: string) => s.split(' ').join(NBSP);
const dateRange = (b: Booking): string => `${keep(formatShortDate(b.pickupDate) || '—')}${NBSP}→ ${keep(formatShortDate(b.returnDate) || '—')}`;

/**
 * Baris rincian harga: tinggi dicadangkan di HP (2 baris; 3 baris di bawah 352px, tempat "4 blok 12 jam × Rp650.000"
 * patah tiga) supaya tinggi kartu tidak ikut layanan — kontrol "Harga untuk layanan" di section armada tersinkron dengan
 * kartu ini, jadi mengganti layanan dari sana tidak boleh menggeser halaman di bawah jempol. Dari @md semua rincian
 * satu baris.
 */
const BREAKDOWN = 'block min-h-[2lh] @max-[22rem]:min-h-[3lh] @md:min-h-0';

function BookingCard({ m, booking, setBooking, formRef }: { m: KemudiModel; booking: Booking; setBooking: (b: Booking) => void; formRef: RefObject<HTMLFormElement | null> }) {
  const { hero } = m;
  const id = useId();
  const motion = useMotionEnabled();
  const [touched, setTouched] = useState<Partial<Record<keyof BookingErrors, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const finalRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);
  const cars = m.cars;
  const car = cars.find((c) => c.index === booking.car);
  const errors = validateBooking(booking, cars);
  const minutes = bookingMinutes(booking);
  const quote = !errors.car && !errors.pickup && !errors.return && minutes !== null ? quoteRental(car, booking.mode, minutes) : null;
  useTween(finalRef, runRef, quote?.total ?? 0, formatRupiah, motion);
  const valid = BOOKING_FIELDS.every((key) => !errors[key]);
  // Mobil "harga via admin" (kolom harga dikosongkan di CMS): jadwal valid, pesan tetap terkirim, tanpa perkiraan
  const askPrice = valid && !!car && !pricedFor(car, booking.mode);
  const shown = (key: keyof BookingErrors) => (attempted || touched[key] ? errors[key] : undefined);
  const fieldId = (key: string) => `${id}-${key}`;
  const today = isoDate(new Date());
  const title = text(hero, 'card_title') || 'Pesan mobil';
  const buttonLabel = text(hero, 'button_label') || 'Pesan via WhatsApp';
  const note = text(hero, 'card_note');
  const wa = valid && car ? m.waWith(bookingMessage(booking, car, quote, m.companyName)) : null;
  const fallback = valid && !wa ? (m.sectionAction('contact') ?? null) : null;
  const update = (patch: Partial<Booking>, key?: keyof BookingErrors) => {
    setBooking({ ...booking, ...patch });
    if (key) setTouched((t) => ({ ...t, [key]: true }));
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttempted(true);
    const first = BOOKING_FIELDS.find((key) => errors[key]);
    if (first) window.setTimeout(() => document.getElementById(fieldId(first === 'car' ? 'car' : `${first}-date`))?.focus(), 0);
  };
  const modeOptions = MODES.map((mode) => ({ value: mode.key, label: mode.label, disabled: !cars.some((c) => supports(c, mode.key)) }));
  const describe = (key: keyof BookingErrors) => (shown(key) ? `${fieldId(key)}-error` : undefined);
  const errorText = (key: keyof BookingErrors) =>
    shown(key) ? (
      <p id={`${fieldId(key)}-error`} className="mt-1.5 text-[13px] font-medium text-[#C42B1C]">
        {errors[key]}
      </p>
    ) : null;
  const schedule = (key: 'pickup' | 'return', legend: string) => {
    const date = key === 'pickup' ? 'pickupDate' : 'returnDate';
    const time = key === 'pickup' ? 'pickupTime' : 'returnTime';
    return (
      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{legend}</legend>
        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_96px] gap-2">
          <label htmlFor={fieldId(`${key}-date`)} className="sr-only">
            {`Tanggal ${legend.toLowerCase()}`}
          </label>
          <input
            id={fieldId(`${key}-date`)}
            type="date"
            min={today}
            value={booking[date]}
            onChange={(e) => update({ [date]: e.target.value } as Partial<Booking>, key)}
            aria-invalid={shown(key) ? true : undefined}
            aria-describedby={describe(key)}
            className={`${INPUT} ${MONO} tabular-nums`}
          />
          <label htmlFor={fieldId(`${key}-time`)} className="sr-only">
            {`Jam ${legend.toLowerCase()}`}
          </label>
          <select
            id={fieldId(`${key}-time`)}
            value={booking[time]}
            onChange={(e) => update({ [time]: e.target.value } as Partial<Booking>, key)}
            className={`${INPUT} km-select cursor-pointer appearance-none pr-8 ${MONO}`}
          >
            {(HOURS.includes(booking[time]) ? HOURS : [booking[time], ...HOURS]).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        {errorText(key)}
      </fieldset>
    );
  };

  return (
    <form
      ref={formRef}
      aria-label={title}
      noValidate
      onSubmit={submit}
      className={`scroll-mt-[calc(var(--tpl-sticky-top,0px)+84px)] rounded-[24px] bg-white p-5 ring-1 ring-inset ring-[#0D1117]/[0.06] @xl:p-6 @7xl:p-7 ${C.ink}`}
    >
      <p className={`${DISPLAY} text-[19px] font-semibold leading-tight tracking-[-0.02em]`}>{title}</p>
      <Segmented
        name={fieldId('mode')}
        label="Layanan"
        options={modeOptions}
        value={booking.mode}
        onChange={(mode: RentalMode) => setBooking(withMode(booking, mode, cars))}
        className="mt-3"
      />
      <div className="mt-3">
        <label htmlFor={fieldId('car')} className={FIELD_LABEL}>
          Mobil
        </label>
        <select
          id={fieldId('car')}
          value={booking.car}
          onChange={(e) => update({ car: Number(e.target.value) }, 'car')}
          aria-invalid={shown('car') ? true : undefined}
          aria-describedby={describe('car')}
          className={`${INPUT} km-select mt-1.5 cursor-pointer appearance-none pr-10`}
        >
          {cars.length === 0 && <option value={-1}>Belum ada mobil</option>}
          {cars.map((c) => {
            const ok = supports(c, booking.mode);
            const seats = seatsLabel(c.seats);
            return (
              <option key={c.index} value={c.index} disabled={!ok}>
                {`${c.name}${seats ? ` · ${seats}` : ''}${ok ? '' : booking.mode === 'self' ? ' (khusus dengan sopir)' : ' (lepas kunci saja)'}`}
              </option>
            );
          })}
        </select>
        {errorText('car')}
      </div>
      <div className="mt-3 grid gap-3">
        {schedule('pickup', 'Ambil')}
        {schedule('return', 'Kembali')}
      </div>

      <Track booking={booking} quote={quote} motion={motion} />

      {/* Hasil: rincian + hari ambil → kembali (sekali), total perkiraan di kanan */}
      <div className="mt-3 flex items-end justify-between gap-4 border-t border-[#0D1117]/10 pt-3">
        <p className={`min-w-0 text-[13px] leading-snug ${C.muted}`}>
          {quote ? (
            <>
              <span className={`${BREAKDOWN} ${C.ink}`}>{quote.breakdown}</span>
              <span className={`mt-0.5 block text-[12px] ${MONO}`}>{dateRange(booking)}</span>
            </>
          ) : askPrice ? (
            <>
              <span className={`${BREAKDOWN} ${C.ink}`}>Harga mobil ini via admin</span>
              <span className={`mt-0.5 block text-[12px] ${MONO}`}>{dateRange(booking)}</span>
            </>
          ) : (
            'Lengkapi jadwal untuk melihat perkiraan harga.'
          )}
        </p>
        <p className="shrink-0 text-right">
          <span className={`grid text-[28px] leading-none ${TYPE.price}`}>
            <span ref={finalRef} className="col-start-1 row-start-1">
              {quote ? formatRupiah(quote.total) : '—'}
            </span>
            <span ref={runRef} aria-hidden className="col-start-1 row-start-1" />
          </span>
          {quote && <span className={`mt-1 block text-[12.5px] ${C.muted}`}>perkiraan</span>}
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {quote ? `Perkiraan ${formatRupiah(quote.total)} untuk ${quote.duration}` : askPrice ? 'Harga mobil ini dikonfirmasi admin lewat WhatsApp' : ''}
      </p>

      {wa || fallback ? (
        <ActionLink action={wa ?? fallback} className={`${BTN.primary} ${BTN.lg} mt-4 flex w-full`}>
          <MessageCircle aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          <span className="truncate">{wa ? buttonLabel : 'Lihat kontak'}</span>
        </ActionLink>
      ) : (
        <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-4 flex w-full`}>
          <MessageCircle aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          <span className="truncate">{buttonLabel}</span>
        </button>
      )}
      {note && <p className={`mt-3 text-center text-[12.5px] leading-snug ${C.muted}`}>{note}</p>}
    </form>
  );
}

export function Hero({ m, booking, setBooking, formRef }: { m: KemudiModel; booking: Booking; setBooking: (b: Booking) => void; formRef: RefObject<HTMLFormElement | null> }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const linkLabel = text(hero, 'link_label');
  const fleetAction = m.sectionAction('fleet');
  const bookable = m.cars.length > 0;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="drive" className="relative isolate overflow-x-clip bg-white">
      {/* Foto latar: HP = ±560px teratas (di belakang teks; kartu menutup tepi bawahnya), ≥ @5xl = seluruh hero */}
      <div className="absolute inset-x-0 top-[72px] h-[560px] overflow-hidden bg-[#161B22] @3xl:h-[640px] @5xl:bottom-0 @5xl:h-auto">
        <div className="km-kenburns absolute inset-0">
          <KitPhoto
            src={image}
            alt={KEMUDI_PHOTOS.alt(image, `Mobil sewaan ${m.companyName} di jalan`)}
            priority
            fallback="none"
            sizes="(max-width: 767px) 260vw, 100vw"
            className="absolute inset-0"
            imgClassName="object-[54%_50%] @5xl:object-[50%_50%]"
          />
        </div>
        <div aria-hidden className="km-hero-scrim absolute inset-0" />
      </div>

      <div
        className={`${WRAP} relative grid grid-cols-1 gap-y-10 pb-14 pt-[112px] @3xl:pb-16 @5xl:min-h-[max(680px,min(calc(92svh-var(--tpl-sticky-top,0px)),960px))] @5xl:grid-cols-12 @5xl:items-center @5xl:gap-x-8 @5xl:pb-20 @5xl:pt-[108px]`}
      >
        <div data-tpl-tone="inverse" className="min-w-0 text-white @5xl:col-span-6 @5xl:pb-6">
          {eyebrow && (
            <Reveal variant="fade">
              <p className="inline-flex h-8 max-w-full items-center gap-2 rounded-full bg-white/[0.12] pl-3 pr-3.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--km-bright)" />
                <span className="truncate">{eyebrow}</span>
              </p>
            </Reveal>
          )}
          <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[7.4em] text-white ${TYPE.h1}`}>
            {parts ? (
              <>
                {parts[0]}
                <span className="km-hl">{parts[1]}</span>
                {parts[2]}
              </>
            ) : (
              title
            )}
          </Reveal>
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-5 max-w-[46ch] text-pretty text-white/[0.88] ${TYPE.lead}`}>
              {subtitle}
            </Reveal>
          )}
          {linkLabel && fleetAction && (
            <Reveal delay={240} className="mt-5">
              <ActionLink action={fleetAction} className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-white underline decoration-white/40 underline-offset-[6px] transition-colors hover:decoration-white">
                {linkLabel}
                <ArrowDown aria-hidden className="h-4 w-4" />
              </ActionLink>
            </Reveal>
          )}
        </div>

        {bookable && (
          <Reveal delay={320} className="min-w-0 @5xl:col-span-5 @5xl:col-start-8 @min-[96rem]:col-span-4 @min-[96rem]:col-start-9">
            <BookingCard m={m} booking={booking} setBooking={setBooking} formRef={formRef} />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

