// Bilah minta penawaran Lajur (di tepi bawah foto hero): Jumlah peserta (− angka + , 1–500) · Tanggal berangkat (tidak
// sebelum hari ini) · Tujuan (teks + saran dari daftar tujuan) · Lama sewa (1–7 hari) · tombol amber. Baris bawah:
// rekomendasi armada langsung dari jumlah peserta (recommendConvoy, ikon bus kecil muncul bergiliran saat susunannya
// berubah) + catatan jujur. JUJUR: formulir hanya MENYUSUN pesan — tanpa fetch, localStorage, atau <form action>; data
// tidak disimpan di website. Lolos validasi → pesan ditampilkan apa adanya + "Buka WhatsApp" (tanpa nomor: email, tanpa
// keduanya: salin pesan) dan "Ubah data". Garis lajur amber putus-putus tergambar sekali di tepi atasnya.
import { Check, ChevronDown, CircleAlert, Copy, Minus, PencilLine, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import {
  DESTINATION_MAX,
  PEOPLE_LIMITS,
  QUOTE_DAYS,
  QUOTE_FIELDS,
  convoyLabel,
  convoySlots,
  messageMailHref,
  peopleStepBase,
  quoteMessage,
  quotePeople,
  recommendConvoy,
  todayIso,
  unitLabel,
  validateQuote,
  type LajurModel,
  type QuoteErrors,
  type QuoteForm,
} from './model';
import { BTN, C, LABEL_SM, TEXT_LINK } from './styles';
import { BusGlyph } from './vehicles';

type Key = keyof QuoteForm;

// Satu kolom di HP sangat sempit (< 360px), 2 × 2 sampai @5xl, satu baris di layar lebar. Label satu baris di semua
// lebar (jarak tepi sel & spasi huruf menyesuaikan, lebar minimum kolom di FORM_GRID), jadi semua isian sejajar.
// Isian tanpa padding kiri (sejajar label), jadi penanda fokus keyboard berupa cincin tinta di sel, bukan di isian
const CELL =
  'relative min-w-0 border-[#14161A]/10 px-3 pb-3 pt-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[#14161A] @sm:px-4 @5xl:pt-4 @7xl:px-5';
const CELL_LABEL = 'block text-[11px] font-semibold uppercase tracking-[0.06em] @sm:tracking-[0.08em] @5xl:whitespace-nowrap @6xl:tracking-[0.12em]';
const CONTROL =
  'block h-11 w-full min-w-0 rounded-[6px] bg-transparent text-[16px] font-medium text-[#14161A] transition-colors focus:outline-none focus-visible:bg-[#F3F2EE]';
/** Kolom bilah: peserta (stepper 44px + angka) dan tanggal tidak menyempit di bawah lebar labelnya. */
const FORM_GRID = 'grid grid-cols-1 @min-[22.5rem]:grid-cols-2 @5xl:grid-cols-[minmax(172px,1fr)_minmax(168px,1.15fr)_minmax(0,1.25fr)_minmax(132px,0.85fr)_auto]';
const STEP_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-[#14161A] ring-1 ring-inset ring-[#14161A]/20 transition-colors hover:bg-[#F3F2EE] disabled:opacity-35';

function Cell({ id, label, error, className = '', children }: { id: string; label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`${CELL} ${className}`}>
      <label htmlFor={id} className={`${CELL_LABEL} ${C.muted}`}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function QuoteBar({
  m,
  form,
  setForm,
  preferred,
  setPreferred,
  focusSignal,
}: {
  m: LajurModel;
  form: QuoteForm;
  setForm: (next: QuoteForm) => void;
  preferred: number | null;
  setPreferred: (index: number | null) => void;
  /** Berubah (> 0) → fokus ke isian jumlah peserta (tombol "Pilih bus ini" di Armada) */
  focusSignal: number;
}) {
  const baseId = useId();
  const [today] = useState(() => todayIso());
  const [errors, setErrors] = useState<QuoteErrors>({});
  // Pesan tersusun + data yang dipakai: bila jenis bus pilihan atau isian berubah ("Pilih bus ini", chip, ubah data),
  // pesan lama tidak berlaku lagi dan formulir tampil kembali dengan isian yang sama (tidak pernah mengirim pesan basi)
  const [sent, setSent] = useState<{ text: string; preferred: number | null; form: QuoteForm } | null>(null);
  const [copied, setCopied] = useState(false);
  const peopleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);
  const daysRef = useRef<HTMLSelectElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  // "Pilih bus ini" di Armada: gulir BILAH ini ke tengah layar (di HP bilah ada di bawah teks hero, bukan di awal
  // halaman), lalu fokus ke jumlah peserta. Pesan yang sudah tersusun untuk jenis bus yang sama tetap → fokus ke sana.
  useEffect(() => {
    if (focusSignal <= 0) return;
    const timer = window.setTimeout(() => {
      const target = peopleRef.current ?? resultRef.current;
      if (!target) return;
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      target.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [focusSignal]);

  const hero = m.hero;
  const chosen = preferred === null ? null : (m.fleet.find((u) => u.index === preferred) ?? null);
  const message = sent && sent.preferred === preferred && sent.form === form ? sent.text : null;
  const people = quotePeople(form.people);
  const convoy = m.fleet.length > 0 && people !== null ? recommendConvoy(m.fleet, people, chosen ? chosen.index : null) : null;
  const signature = convoy ? convoy.picks.map((p) => `${p.unit.index}x${p.count}`).join('-') : 'none';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = text(hero, 'quote_button') || 'Minta penawaran';
  const note = text(hero, 'quote_note');
  const id = (key: Key) => `${baseId}-${key}`;
  // Tombol −/+ dari isian yang dibatasi 1–500 (mis. "600" → 500): − tetap aktif, + tidak mereset ke 1
  const base = peopleStepBase(form.people);

  const set = (key: Key, value: string) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const step = (delta: number) => set('people', String(Math.min(PEOPLE_LIMITS[1], Math.max(PEOPLE_LIMITS[0], base + delta))));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateQuote(form, todayIso());
    setErrors(found);
    const first = QUOTE_FIELDS.find((key) => found[key]);
    if (first) {
      ({ people: peopleRef, date: dateRef, destination: destinationRef, days: daysRef })[first].current?.focus();
      return;
    }
    setCopied(false);
    setSent({ text: quoteMessage(form, convoy, m.companyName, chosen), preferred, form });
    window.setTimeout(() => resultRef.current?.focus(), 0);
  };

  // Satu live region yang tetap (hanya teksnya berganti): region yang baru dipasang biasanya tidak dibacakan pembaca
  // layar. Ikon bus & chip di luar region itu.
  const recommendation =
    m.fleet.length > 0 ? (
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className={`${LABEL_SM} ${C.muted}`}>Rekomendasi</span>
        {convoy && (
          <span key={signature} aria-hidden className="flex items-end gap-1">
            {convoySlots(convoy).map((slot, i) => (
              <span key={slot.key} className="lj-pop flex" style={{ '--lj-delay': `${Math.min(i, 7) * 40}ms` } as CSSProperties}>
                <BusGlyph size={slot.unit.size} />
              </span>
            ))}
          </span>
        )}
        <span className={`text-[14px] ${convoy ? `font-semibold ${C.ink}` : C.muted}`} aria-live="polite">
          {convoy ? convoyLabel(convoy, true) : people === null ? 'Isi jumlah peserta untuk melihat rekomendasi.' : 'Susunan armada untuk rombongan ini dibantu admin.'}
        </span>
        {chosen && (
          <button
            type="button"
            onClick={() => {
              setPreferred(null);
              // Chip hilang setelah diklik: fokus pindah ke jumlah peserta (formulir tampil lagi bila pesan sudah tersusun)
              window.setTimeout(() => peopleRef.current?.focus(), 0);
            }}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-[6px] bg-[#F3F2EE] px-2.5 text-[13px] font-medium text-[#14161A] ring-1 ring-inset ring-[#14161A]/15 transition-colors hover:bg-white"
            aria-label={`Hapus pilihan ${unitLabel(chosen)}, pakai semua jenis bus`}
          >
            Hanya {chosen.name}
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ) : null;

  const footer = (recommendation || note) && (
    <div className={`flex flex-col gap-3 border-t px-3 py-3.5 @sm:px-4 @5xl:flex-row @5xl:items-center @5xl:justify-between @5xl:gap-8 @7xl:px-5 ${C.line}`}>
      {recommendation}
      {/* Layar lebar: catatan rata kanan berhenti 32px sebelum tepi bilah, jadi ujung kalimatnya tidak di bawah tombol WhatsApp
          melayang situs (56px @ 32px dari tepi layar) saat baris ini jatuh di dasar layar pertama */}
      {note && <p className={`text-[12.5px] leading-snug @5xl:mr-8 @5xl:max-w-[60ch] @5xl:text-right ${C.muted}`}>{note}</p>}
    </div>
  );

  let body: ReactNode;
  if (message) {
    const wa = hasWhatsapp ? m.waWith(message) : null;
    const mail = !wa ? messageMailHref(text(m.contact, 'email'), 'Permintaan penawaran sewa bus', message) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    body = (
      <div className="grid gap-4 p-4 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] @5xl:items-center @5xl:gap-8 @5xl:p-5" aria-live="polite">
        <div className="min-w-0">
          <p ref={resultRef} tabIndex={-1} className={`flex items-center gap-2.5 text-[17px] font-semibold focus:outline-none ${C.ink}`}>
            <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-(--tpl-accent) text-(--tpl-on-accent)">
              <Check className="h-4 w-4" strokeWidth={2.6} />
            </span>
            Pesan WhatsApp siap
          </p>
          <p className={`mt-1.5 text-[13px] leading-snug ${C.muted}`}>Periksa isinya; pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.</p>
        </div>
        {/* Tinggi cukup untuk pesan lengkap (± 10 baris) tanpa gulir di dalam kotak */}
        <pre className={`max-h-80 min-w-0 overflow-auto whitespace-pre-wrap rounded-[6px] bg-[#F3F2EE] p-3 font-sans text-[13px] leading-relaxed [overflow-wrap:anywhere] ${C.ink}`}>{message}</pre>
        <div className="flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-4 @5xl:flex-col @5xl:items-stretch @5xl:gap-1">
          {wa ? (
            <ActionLink action={wa} className={`${BTN.primary} ${BTN.md}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : mail ? (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.primary} ${BTN.md}`}>
              Kirim lewat email
            </ActionLink>
          ) : (
            <button type="button" onClick={copy} className={`${BTN.primary} ${BTN.md}`}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => peopleRef.current?.focus(), 0);
            }}
            className={`${TEXT_LINK} justify-center text-[14px]`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
      </div>
    );
  } else {
    const ring = (key: Key) => (errors[key] ? 'bg-[#B42318]/[0.04]' : '');
    body = (
      <form noValidate onSubmit={onSubmit} aria-label="Minta penawaran sewa bus" className={FORM_GRID}>
        <Cell id={id('people')} label="Jumlah peserta" error={errors.people} className={`border-b @5xl:border-b-0 ${ring('people')}`}>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={base <= PEOPLE_LIMITS[0]}
              aria-label="Kurangi peserta"
              aria-controls={id('people')}
              className={STEP_BUTTON}
            >
              <Minus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              ref={peopleRef}
              {...bind('people')}
              value={form.people}
              onChange={(e) => set('people', e.target.value.replace(/\D/g, '').slice(0, 3))}
              className={`${CONTROL} text-center font-[family-name:var(--tpl-font-display)] text-[18px]! tabular-nums`}
            />
            <button
              type="button"
              onClick={() => step(1)}
              disabled={base >= PEOPLE_LIMITS[1]}
              aria-label="Tambah peserta"
              aria-controls={id('people')}
              className={STEP_BUTTON}
            >
              <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </Cell>
        <Cell id={id('date')} label="Tanggal berangkat" error={errors.date} className={`border-b @min-[22.5rem]:border-l @5xl:border-b-0 ${ring('date')}`}>
          <input type="date" ref={dateRef} {...bind('date')} min={today} value={form.date} onChange={(e) => set('date', e.target.value)} className={`${CONTROL} pr-1`} />
        </Cell>
        <Cell id={id('destination')} label="Tujuan" error={errors.destination} className={`border-b @min-[22.5rem]:border-b-0 @5xl:border-l ${ring('destination')}`}>
          <input
            type="text"
            ref={destinationRef}
            {...bind('destination')}
            list={m.routes.length > 0 ? `${baseId}-routes` : undefined}
            maxLength={DESTINATION_MAX}
            autoComplete="off"
            placeholder="mis. Dieng"
            value={form.destination}
            onChange={(e) => set('destination', e.target.value)}
            className={`${CONTROL} placeholder:font-normal placeholder:text-[#6B7077]`}
          />
          {m.routes.length > 0 && (
            <datalist id={`${baseId}-routes`}>
              {m.routes.map((r) => (
                <option key={r.index} value={r.name} />
              ))}
            </datalist>
          )}
        </Cell>
        <Cell id={id('days')} label="Lama sewa" error={errors.days} className={`@min-[22.5rem]:border-l ${ring('days')}`}>
          <div className="relative">
            <select ref={daysRef} {...bind('days')} value={form.days} onChange={(e) => set('days', e.target.value)} className={`${CONTROL} cursor-pointer appearance-none pr-7`}>
              {QUOTE_DAYS.map((d) => (
                <option key={d} value={String(d)}>
                  {d} hari
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={`pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
          </div>
        </Cell>
        <div className={`col-span-full border-t p-3 @5xl:col-span-1 @5xl:border-l @5xl:border-t-0 ${C.line}`}>
          <button type="submit" className={`${BTN.primary} h-14 w-full px-6 @5xl:h-full @5xl:min-h-[60px]`}>
            {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
            {button}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[10px] bg-white ring-1 ring-inset ring-[#14161A]/10">
      {/* Marka lajur amber di tepi atas: tergambar sekali saat bilah muncul */}
      <Reveal variant="fade" className="lj-lane-draw pointer-events-none absolute inset-x-0 top-0 z-10 h-1" aria-hidden>
        <span className="lj-lane-dash block h-full" />
      </Reveal>
      {body}
      {footer}
    </div>
  );
}
