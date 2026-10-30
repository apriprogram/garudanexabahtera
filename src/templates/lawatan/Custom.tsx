// Hitung & rancang trip (kunci `custom`), pita krem: satu <form> — kiri (1-7) panel putih "Data rombongan": Paket (daftar
// paket + "Rancang sendiri"), Jenis trip (chip radiogroup), Jumlah peserta (− angka +, 1–500), Rencana berangkat (12 bulan
// ke depan + "Belum ditentukan"), Hotel, Kamar, Catatan; kanan (8-12, menempel saat digulir) panel TIKET hijau tua
// (inverse): "Perkiraan total" Bricolage besar yang bergerak ke nilai baru (± 450 ms), rumus "45 peserta × Rp875.000",
// garis sobek bertakik, ringkasan pilihan, catatan jujur (estimasi; harga final, kuota hotel & jadwal dikonfirmasi admin;
// tanpa pembayaran online) dan tombol krem "Susun pesan WhatsApp". JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch,
// localStorage, atau <form action>; data tidak disimpan di website. Lolos validasi → pesan ditampilkan apa adanya dengan
// "Buka WhatsApp" (tanpa nomor: email, tanpa keduanya: salin pesan) dan "Ubah data". Pesan terikat pada isian saat
// disusun: begitu isian berubah (di formulir, chip jenis trip di hero, atau "Hitung biaya" di kartu paket) panel kembali
// ke ringkasan + tombol susun, jadi pesan yang dikirim tidak pernah berisi data lama.
import { Check, ChevronDown, CircleAlert, Copy, Minus, PencilLine, Plus } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import { useTween } from './hooks';
import {
  CUSTOM_PACKAGE,
  HOTELS,
  PEOPLE_LIMITS,
  PLAN_FIELDS,
  PLAN_LIMITS,
  ROOMS,
  UNSET,
  UNSURE_MONTH,
  estimateFormula,
  formatRupiah,
  messageMailHref,
  monthOptions,
  peopleOf,
  planEstimate,
  planMessage,
  todayIso,
  validatePlan,
  type LawatanModel,
  type PlanErrors,
  type PlanForm,
} from './model';
import { BTN, C, GRID_GAP, INPUT, LABEL, SECTION_PAD, TEXT_LINK_INV, TYPE, WRAP } from './styles';
import { ChoiceChips, SectionHead } from './ui';

type Key = keyof PlanForm;

function Field({ id, label, error, optional = false, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-semibold ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
      <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

export function Custom({
  m,
  plan,
  onPlan,
  pkgRef,
}: {
  m: LawatanModel;
  plan: PlanForm;
  onPlan: (patch: Partial<PlanForm>) => void;
  /** Isian Paket (<select>): tujuan fokus dari tombol "Hitung biaya" di kartu paket */
  pkgRef?: RefObject<HTMLSelectElement | null>;
}) {
  const { custom, contact } = m;
  const baseId = useId();
  const motion = useMotionEnabled();
  const [today] = useState(() => todayIso());
  const [errors, setErrors] = useState<PlanErrors>({});
  // Pesan tersusun + tanda tangan isian saat itu; isian berubah → `message` null (tanpa setState di efek)
  const [sent, setSent] = useState<{ sig: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const finalRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);

  const months = monthOptions(today, 12);
  const titles = m.tours.map((t) => t.title);
  const customLabel = text(custom, 'custom_label') || CUSTOM_PACKAGE;
  const pkg = m.tours.find((t) => t.title === plan.pkg) ?? null;
  const people = peopleOf(plan.people);
  const estimate = planEstimate(pkg, people);
  const total = estimate?.total ?? 0;
  useTween(finalRef, runRef, total, formatRupiah, motion);
  // Total panjang dikecilkan agar SELALU satu baris di dalam panel. @3xl ke atas: langkah kelas (kolom 5/12 di 1024px
  // sudah pas). HP (panel selebar layar): ukuran langkah (38/30/26px) dibatasi lebar isi panel = 100cqi − 5,5rem (tepi
  // WRAP 1,25rem + padding panel 1,5rem, dua sisi) ÷ ±0,6em per karakter angka Bricolage — dulu total ≥ Rp100 juta
  // ("Rp437.500.000", 500 peserta) patah di tengah angka ("Rp437.500.00" / "0") di HP 320px bila ukuran huruf bawaan
  // browser 20px (rem membesar, isi panel tinggal 210px); total 11 karakter 38px nyaris selebar panel 232px.
  const totalChars = formatRupiah(total).length;
  const totalStep = totalChars > 13 ? 26 : totalChars > 11 ? 30 : 38;
  const totalSize = totalChars > 13 ? '@3xl:text-[36px]' : totalChars > 11 ? '@3xl:text-[40px]' : '@3xl:text-[48px]';
  const totalFit = { '--lw-total': `min(${totalStep}px, calc((100cqi - 5.5rem) / ${(totalChars * 0.6).toFixed(1)}))` } as CSSProperties;
  const below = pkg && pkg.minPeople > 0 && people > 0 && people < pkg.minPeople;
  const note = text(custom, 'note') || 'Estimasi saja. Harga final, kuota hotel, dan jadwal dikonfirmasi admin lewat WhatsApp; tidak ada pembayaran online.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(custom, 'button_label') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;

  const set = (key: Key) => (value: string) => {
    onPlan({ [key]: value } as Partial<PlanForm>);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: HTMLElement | null) => {
      refs.current[key] = el;
      if (key === 'pkg' && pkgRef) pkgRef.current = el as HTMLSelectElement | null;
    },
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  // − / +: dari angka yang diketik (juga di luar 1–500, mis. "600" → 500), kosong → 1
  const step = (delta: number) => {
    const raw = Number(plan.people.replace(/\D/g, '')) || 0;
    set('people')(String(Math.min(PEOPLE_LIMITS[1], Math.max(PEOPLE_LIMITS[0], (raw || (delta > 0 ? 0 : 2)) + delta))));
  };

  const signature = JSON.stringify(plan);
  const message = sent && sent.sig === signature ? sent.text : null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validatePlan(plan, titles, m.types, months);
    setErrors(found);
    const first = PLAN_FIELDS.find((key) => found[key]);
    if (first) {
      const el = refs.current[first];
      (el?.matches('input, select, textarea') ? el : el?.querySelector<HTMLElement>('input'))?.focus();
      return;
    }
    setCopied(false);
    setSent({ sig: signature, text: planMessage(plan, estimate, m.companyName, customLabel) });
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const select = (key: 'pkg' | 'month' | 'hotel' | 'room', options: readonly (readonly [string, string])[]) => (
    <div className="relative">
      <select {...bind(key)} value={plan[key]} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 appearance-none pr-10 ${ring(key)}`}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );

  const summary: [string, string][] = [
    ['Paket', plan.pkg === CUSTOM_PACKAGE ? customLabel : plan.pkg],
    ['Jenis trip', plan.type || '—'],
    ['Berangkat', plan.month],
    ['Hotel · kamar', [plan.hotel, plan.room].filter((v) => v !== UNSET).join(' · ') || UNSET],
  ];

  const wa = message && hasWhatsapp ? m.waWith(message) : null;
  const mail = message && !wa ? messageMailHref(text(contact, 'email'), 'Konsultasi paket wisata', message) : '';
  const copy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <TemplateSection sectionKey="custom" className={`${SECTION_PAD} ${C.cream}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(custom, 'eyebrow')} number={m.number('custom')} title={text(custom, 'title')} subtitle={text(custom, 'subtitle')} srTitle="Hitung biaya trip" />

        <form noValidate onSubmit={onSubmit} aria-label="Hitung & rancang trip" className={`mt-10 grid grid-cols-1 items-start gap-y-6 @3xl:mt-14 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <Reveal className="min-w-0 @5xl:col-span-7">
            <div className="rounded-[18px] bg-white p-5 ring-1 ring-inset ring-[#1D2320]/10 @3xl:p-8">
              <h3 className={`${TYPE.h3} ${C.ink}`}>Data rombongan</h3>
              <div className="mt-6 grid gap-5">
                <Field id={id('pkg')} label="Paket" error={errors.pkg}>
                  {select('pkg', [...titles.map((t) => [t, t] as const), [CUSTOM_PACKAGE, customLabel] as const])}
                </Field>
                {m.types.length > 0 && (
                  <div ref={(el) => void (refs.current.type = el)} className="min-w-0">
                    <p id={`${id('type')}-label`} className={`mb-2 text-[14px] font-semibold ${C.ink}`}>
                      Jenis trip
                    </p>
                    <ChoiceChips
                      name={id('type')}
                      label="Jenis trip"
                      labelledBy={`${id('type')}-label`}
                      errorId={errors.type ? `${id('type')}-error` : undefined}
                      options={m.types.map((t) => [t, t] as const)}
                      value={plan.type}
                      onChange={set('type')}
                    />
                    {errors.type && <ErrorText id={`${id('type')}-error`}>{errors.type}</ErrorText>}
                  </div>
                )}
                <div className="grid gap-5 @xl:grid-cols-2">
                  <Field id={id('people')} label="Jumlah peserta" error={errors.people}>
                    <div className={`flex h-12 items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-[#1D2320]/55 focus-within:ring-2 focus-within:ring-(--lw-ink) ${ring('people')}`}>
                      <button type="button" onClick={() => step(-1)} aria-label="Kurangi peserta" className={`flex w-12 shrink-0 items-center justify-center transition-colors hover:bg-[#FBF6EE] ${C.ink}`}>
                        <Minus aria-hidden className="h-4 w-4" />
                      </button>
                      <input
                        {...bind('people')}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={PLAN_LIMITS.people}
                        value={plan.people}
                        onChange={(e) => set('people')(e.target.value.replace(/\D/g, '').slice(0, PLAN_LIMITS.people))}
                        className={`w-full min-w-0 bg-transparent text-center text-[17px] font-semibold tabular-nums focus:outline-none ${C.ink}`}
                      />
                      <button type="button" onClick={() => step(1)} aria-label="Tambah peserta" className={`flex w-12 shrink-0 items-center justify-center transition-colors hover:bg-[#FBF6EE] ${C.ink}`}>
                        <Plus aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  </Field>
                  <Field id={id('month')} label="Rencana berangkat" error={errors.month}>
                    {select('month', [[UNSURE_MONTH, UNSURE_MONTH] as const, ...months.map((mo) => [mo, mo] as const)])}
                  </Field>
                  <Field id={id('hotel')} label="Hotel" error={errors.hotel}>
                    {select(
                      'hotel',
                      HOTELS.map((h) => [h, h] as const),
                    )}
                  </Field>
                  <Field id={id('room')} label="Kamar" error={errors.room}>
                    {select(
                      'room',
                      ROOMS.map((r) => [r, r] as const),
                    )}
                  </Field>
                </div>
                <Field id={id('note')} label="Catatan" optional>
                  <textarea
                    {...bind('note')}
                    rows={3}
                    maxLength={PLAN_LIMITS.note}
                    value={plan.note}
                    placeholder="mis. Tujuan tambahan, kebutuhan khusus peserta"
                    onChange={(e) => set('note')(e.target.value)}
                    className={`${INPUT} min-h-24 py-3`}
                  />
                </Field>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+104px)] @5xl:col-span-5">
            <div data-tpl-tone="inverse" className={`relative rounded-[18px] ${C.deep} ${C.onDark}`}>
              <div className="px-6 pb-6 pt-7 @3xl:px-8 @3xl:pt-8">
                <p className={`${LABEL} ${C.onDarkMuted}`}>Perkiraan total</p>
                {estimate ? (
                  <p className={`mt-3 grid ${TYPE.money} text-(length:--lw-total) ${totalSize} leading-none text-white [overflow-wrap:anywhere]`} style={totalFit}>
                    <span ref={finalRef} className="col-start-1 row-start-1">
                      {formatRupiah(estimate.total)}
                    </span>
                    <span ref={runRef} aria-hidden className="col-start-1 row-start-1" />
                  </p>
                ) : (
                  <p className={`mt-3 ${TYPE.money} text-[30px] leading-tight text-white @3xl:text-[36px]`}>Dihitung admin</p>
                )}
                <p className={`mt-3 text-[15px] tabular-nums ${C.onDarkMuted}`}>
                  {estimate
                    ? `${estimate.people} peserta × ${formatRupiah(estimate.unit)} per orang`
                    : pkg
                      ? 'Isi jumlah peserta 1–500 untuk melihat estimasi.'
                      : 'Harga rancangan sendiri dihitung admin setelah rute disepakati.'}
                </p>
                {below && <p className={`mt-2 text-[13.5px] leading-snug ${C.onDarkMuted}`}>Paket ini mulai {pkg.minPeople} orang; harga untuk rombongan lebih kecil dihitung ulang admin.</p>}
                <p className="sr-only" aria-live="polite">
                  {estimate ? `Perkiraan total ${formatRupiah(estimate.total)} untuk ${estimateFormula(estimate)}` : 'Perkiraan total dihitung admin'}
                </p>
              </div>
              {/* Garis sobek tiket: garis putus-putus + takik setengah lingkaran (warna pita krem) di kedua tepi */}
              <div aria-hidden className="relative h-0 border-t-2 border-dashed border-[#FBF6EE]/25">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#FBF6EE]" />
                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#FBF6EE]" />
              </div>
              <div className="px-6 pb-7 pt-6 @3xl:px-8 @3xl:pb-8">
                {message ? (
                  <div aria-live="polite">
                    <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 ${TYPE.h3} text-white focus:outline-none`}>
                      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FBF6EE] text-(--lw-deep)">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      Pesan siap dikirim
                    </h3>
                    <p className={`mt-2 text-[14px] leading-snug ${C.onDarkMuted}`}>Periksa isinya, lalu kirim. Pesan belum terkirim sebelum Anda menekan kirim.</p>
                    <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#FBF6EE]/[0.08] p-4 font-sans text-[13.5px] leading-relaxed text-[#FBF6EE] [overflow-wrap:anywhere]">{message}</pre>
                    <div className="mt-5 flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-6">
                      {wa ? (
                        <ActionLink action={wa} className={`${BTN.cream} ${BTN.lg}`}>
                          <WhatsAppIcon className="h-5 w-5 shrink-0" />
                          Buka WhatsApp
                        </ActionLink>
                      ) : mail ? (
                        <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.cream} ${BTN.lg}`}>
                          Kirim lewat email
                        </ActionLink>
                      ) : (
                        <button type="button" onClick={copy} className={`${BTN.cream} ${BTN.lg}`}>
                          {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                          {copied ? 'Tersalin' : 'Salin pesan'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSent(null);
                          window.setTimeout(() => (refs.current.pkg as HTMLElement | null | undefined)?.focus(), 0);
                        }}
                        className={`${TEXT_LINK_INV} self-center`}
                      >
                        <PencilLine aria-hidden className="h-4 w-4" />
                        Ubah data
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <dl className="grid gap-2.5 text-[14.5px]">
                      {summary.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-4">
                          <dt className={C.onDarkMuted}>{label}</dt>
                          <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className={`mt-5 text-[13px] leading-relaxed ${C.onDarkMuted}`}>{note}</p>
                    <button type="submit" className={`${BTN.cream} ${BTN.lg} mt-6 w-full`}>
                      {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
                      {button}
                    </button>
                  </>
                )}
              </div>
            </div>
          </Reveal>
        </form>
      </div>
    </TemplateSection>
  );
}
