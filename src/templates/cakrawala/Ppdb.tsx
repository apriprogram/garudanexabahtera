// PPDB (kunci `ppdb`): panel abu membulat (inset). Atas: label, H2, deskripsi, fakta singkat (gelombang, kuota,
// biaya formulir), tautan brosur, dan foto. Bawah kiri: tab Jalur · Jadwal (linimasa) · Syarat · Alur · Biaya
// (tablist dengan panah kiri/kanan, Home/End; panel tidak aktif `hidden` tetapi tetap di HTML untuk perayap). Bawah
// kanan: formulir pendaftaran singkat. JUJUR: formulir hanya MENYUSUN pesan WhatsApp untuk panitia — tidak ada data
// yang dikirim ke server atau disimpan, tidak ada pembayaran. Setelah lolos validasi, pesan ditampilkan apa adanya
// beserta tombol "Buka WhatsApp" (pratinjau: tautan tidak dibuka). Tanpa nomor WhatsApp → tombol ke Kontak.
import { Check, ChevronDown, CircleAlert, Download, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeUrl, text, whatsappHref } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  EMPTY_PPDB,
  parseSchoolDate,
  ppdbMessage,
  programNoun,
  programOption,
  validatePpdb,
  type CakrawalaModel,
  type PpdbErrors,
  type PpdbForm,
} from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, INPUT, PANEL, PANEL_OUTER, SECTION_PAD, TYPE_C } from './styles';
import { PillLink, SectionHead } from './ui';

type TabId = 'paths' | 'schedule' | 'requirements' | 'steps' | 'fees';

const TAB_LABELS: Record<TabId, string> = { paths: 'Jalur', schedule: 'Jadwal', requirements: 'Syarat', steps: 'Alur', fees: 'Biaya' };

function Tabs({ m }: { m: CakrawalaModel }) {
  const { ppdb } = m;
  const baseId = useId();
  const paths = list(ppdb, 'paths', 6).filter((item) => field(item, 'name'));
  const schedule = list(ppdb, 'schedule', 8).filter((item) => field(item, 'title') || field(item, 'date'));
  const requirements = list(ppdb, 'requirements', 10).filter((item) => field(item, 'text'));
  const steps = list(ppdb, 'steps', 6).filter((item) => field(item, 'title'));
  const fees = list(ppdb, 'fees', 8).filter((item) => field(item, 'item'));
  const feesNote = text(ppdb, 'fees_note');
  const available = (
    [
      ['paths', paths.length],
      ['schedule', schedule.length],
      ['requirements', requirements.length],
      ['steps', steps.length],
      ['fees', fees.length],
    ] as [TabId, number][]
  )
    .filter(([, n]) => n > 0)
    .map(([id]) => id);
  const [current, setCurrent] = useState<TabId | null>(null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  if (available.length === 0) return null;
  const selected = current && available.includes(current) ? current : available[0];

  const select = (id: TabId, focus = false) => {
    setCurrent(id);
    if (focus) tabRefs.current[id]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = available.indexOf(selected);
    const next: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: available.length - 1 };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(available[(next[e.key] + available.length) % available.length], true);
  };

  const panels: Record<TabId, ReactNode> = {
    paths: (
      <ul className="grid gap-3 @xl:grid-cols-2">
        {paths.map((item, i) => (
          <li key={`${field(item, 'name')}-${i}`} className="rounded-[18px] bg-[#F3F6FA] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`${C.ink} ${TYPE_C.h3}`}>{field(item, 'name')}</h3>
              {field(item, 'quota') && <span className="rounded-full bg-(--ck-tint) px-2.5 py-1 text-[12px] font-semibold text-(--ck-ink)">{field(item, 'quota')}</span>}
            </div>
            {field(item, 'text') && <p className={`mt-2 ${TYPE_C.small} ${C.muted}`}>{field(item, 'text')}</p>}
          </li>
        ))}
      </ul>
    ),
    schedule: (
      <ol className="relative ml-2 border-l-2 border-(--ck-line)">
        {schedule.map((item, i) => {
          const date = parseSchoolDate(field(item, 'date'));
          return (
            <li key={`${field(item, 'title')}-${i}`} className="relative pb-7 pl-7 last:pb-1">
              <span aria-hidden className={`absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-[3px] border-(--tpl-accent) ${i === 0 ? 'bg-(--tpl-accent)' : 'bg-white'}`} />
              {field(item, 'date') &&
                (date ? (
                  <time dateTime={date.iso} className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-(--ck-ink)">
                    {date.label}
                  </time>
                ) : (
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-(--ck-ink)">{field(item, 'date')}</p>
                ))}
              {field(item, 'title') && <h3 className={`mt-1 ${C.ink} ${TYPE_C.h3}`}>{field(item, 'title')}</h3>}
              {field(item, 'text') && <p className={`mt-1 ${TYPE_C.small} ${C.muted}`}>{field(item, 'text')}</p>}
            </li>
          );
        })}
      </ol>
    ),
    requirements: (
      <ul className="grid gap-3">
        {requirements.map((item, i) => (
          <li key={`${field(item, 'text')}-${i}`} className={`flex items-start gap-3 ${TYPE_C.body} ${C.ink}`}>
            <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--ck-tint) text-(--ck-ink)">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {field(item, 'text')}
          </li>
        ))}
      </ul>
    ),
    steps: (
      <ol className="grid gap-3 @xl:grid-cols-2">
        {steps.map((item, i) => (
          <li key={`${field(item, 'title')}-${i}`} className="flex gap-4 rounded-[18px] bg-[#F3F6FA] p-5">
            <span aria-hidden className={`${DISPLAY} flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-[15px] font-bold text-(--tpl-on-accent)`}>
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className={`${C.ink} ${TYPE_C.h3}`}>{field(item, 'title')}</h3>
              {field(item, 'text') && <p className={`mt-1 ${TYPE_C.small} ${C.muted}`}>{field(item, 'text')}</p>}
            </div>
          </li>
        ))}
      </ol>
    ),
    fees: (
      <div>
        <h3 className="sr-only">Rincian biaya</h3>
        <dl className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
          {fees.map((item, i) => (
            <div key={`${field(item, 'item')}-${i}`} className="flex items-start justify-between gap-4 py-4">
              <dt className="min-w-0">
                <span className={`block text-[15px] font-medium ${C.ink}`}>{field(item, 'item')}</span>
                {field(item, 'note') && <span className={`block text-[13px] ${C.muted}`}>{field(item, 'note')}</span>}
              </dt>
              <dd className={`${DISPLAY} shrink-0 text-right text-[16px] font-bold tabular-nums ${C.ink}`}>{field(item, 'amount')}</dd>
            </div>
          ))}
        </dl>
        {feesNote && <p className={`mt-4 text-[13px] ${C.muted}`}>{feesNote}</p>}
      </div>
    ),
  };

  return (
    <Reveal className={`min-w-0 p-4 @3xl:p-6 ${CARD.white}`}>
      <div role="tablist" aria-label="Informasi PPDB" onKeyDown={onKeyDown} className="ck-rail -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {available.map((id) => {
          const isSelected = id === selected;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(id)}
              className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                isSelected ? 'bg-[#0D1830] text-white' : `bg-[#F3F6FA] ${C.ink} hover:bg-[#E7ECF4]`
              }`}
            >
              {TAB_LABELS[id]}
            </button>
          );
        })}
      </div>
      {available.map((id) => (
        <div
          key={id}
          role="tabpanel"
          id={`${baseId}-panel-${id}`}
          aria-labelledby={`${baseId}-tab-${id}`}
          hidden={id !== selected}
          tabIndex={0}
          className="mt-5 rounded-[12px] @3xl:mt-6"
        >
          {panels[id]}
        </div>
      ))}
    </Reveal>
  );
}

function Field({
  id,
  label,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function RegistrationForm({ m }: { m: CakrawalaModel }) {
  const { ppdb } = m;
  const baseId = useId();
  const [form, setForm] = useState<PpdbForm>(EMPTY_PPDB);
  const [errors, setErrors] = useState<PpdbErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof PpdbForm, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const programs = list(m.programs, 'items', 9).map(programOption).filter(Boolean);
  const programChoices = m.shown('programs') ? programs : [];
  /** "program keahlian" (SMK) atau mis. "peminatan" (SMA), mengikuti label kecil section Program */
  const noun = programNoun(m.programs);
  const paths = list(ppdb, 'paths', 6)
    .map((item) => field(item, 'name'))
    .filter(Boolean);
  const title = text(ppdb, 'form_title');
  const intro = text(ppdb, 'form_text');
  const button = text(ppdb, 'form_button') || 'Kirim lewat WhatsApp';
  const canSend = !!whatsappHref(m.ppdbWhatsapp);
  const id = (key: keyof PpdbForm) => `${baseId}-${key}`;
  const set = (key: keyof PpdbForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof PpdbForm) =>
    errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {};
  const ring = (key: keyof PpdbForm) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validatePpdb(form, { programs: programChoices, paths, programNoun: noun });
    setErrors(found);
    const first = (['name', 'origin', 'program', 'path', 'phone'] as (keyof PpdbForm)[]).find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(ppdbMessage(m.companyName, form));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const card = `p-5 @3xl:p-7 ${CARD.white}`;
  if (!canSend) {
    return (
      <div className={card}>
        {title && <h3 className={`${C.ink} ${TYPE_C.h3}`}>{title}</h3>}
        <p className={`mt-2 ${TYPE_C.small} ${C.muted}`}>Hubungi panitia PPDB untuk mendaftar atau menanyakan kuota.</p>
        <PillLink action={m.contactAction} label="Hubungi panitia" dot="white" className={`${BTN.primary} ${BTN.md} mt-5`} />
      </div>
    );
  }

  if (sent) {
    const action = m.waWith(sent, m.ppdbWhatsapp);
    return (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2 ${C.ink} ${TYPE_C.h3} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 ${TYPE_C.small} ${C.muted}`}>Periksa isinya, lalu buka WhatsApp untuk mengirim ke panitia PPDB.</p>
        <pre className={`mt-4 whitespace-pre-wrap rounded-[14px] bg-[#F3F6FA] p-4 font-sans text-[13.5px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-5 flex flex-col gap-2.5 @xl:flex-row">
          {action && (
            <ActionLink action={action} className={`${BTN.primary} ${BTN.plain} h-12 justify-center gap-2.5 text-[15px]`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${BTN.outline} ${BTN.plain} h-12 gap-2`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Formulir pendaftaran'} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.ink} ${TYPE_C.h3}`}>
          {title}
        </h3>
      )}
      {intro && <p className={`mt-2 ${TYPE_C.small} ${C.muted}`}>{intro}</p>}
      <div className="mt-5 grid gap-4">
        <Field id={id('name')} label="Nama lengkap calon siswa" error={errors.name}>
          <input
            ref={(el) => {
              refs.current.name = el;
            }}
            id={id('name')}
            type="text"
            autoComplete="name"
            maxLength={80}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            className={`${INPUT} h-12 ${ring('name')}`}
            {...invalid('name')}
          />
        </Field>
        <Field id={id('origin')} label="Asal sekolah (SMP/MTs)" error={errors.origin}>
          <input
            ref={(el) => {
              refs.current.origin = el;
            }}
            id={id('origin')}
            type="text"
            autoComplete="off"
            maxLength={80}
            value={form.origin}
            onChange={(e) => set('origin')(e.target.value)}
            className={`${INPUT} h-12 ${ring('origin')}`}
            {...invalid('origin')}
          />
        </Field>
        {programChoices.length > 0 && (
          <Field id={id('program')} label={`Pilihan ${noun}`} error={errors.program}>
            <div className="relative">
            <select
              ref={(el) => {
                refs.current.program = el;
              }}
              id={id('program')}
              value={form.program}
              onChange={(e) => set('program')(e.target.value)}
              className={`${INPUT} h-12 appearance-none pr-10 ${ring('program')}`}
              {...invalid('program')}
            >
              <option value="">Pilih {noun}</option>
              {programChoices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
        )}
        {paths.length > 0 && (
          <Field id={id('path')} label="Jalur pendaftaran" error={errors.path}>
            <div className="relative">
            <select
              ref={(el) => {
                refs.current.path = el;
              }}
              id={id('path')}
              value={form.path}
              onChange={(e) => set('path')(e.target.value)}
              className={`${INPUT} h-12 appearance-none pr-10 ${ring('path')}`}
              {...invalid('path')}
            >
              <option value="">Pilih jalur</option>
              {paths.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
        )}
        <Field id={id('phone')} label="Nomor WhatsApp orang tua/siswa" error={errors.phone}>
          <input
            ref={(el) => {
              refs.current.phone = el;
            }}
            id={id('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="mis. 081234567890"
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
            className={`${INPUT} h-12 ${ring('phone')}`}
            {...invalid('phone')}
          />
        </Field>
        <Field id={id('note')} label="Catatan" optional>
          <textarea
            ref={(el) => {
              refs.current.note = el;
            }}
            id={id('note')}
            rows={3}
            maxLength={300}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            className={`${INPUT} min-h-24 py-3`}
          />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.plain} mt-6 h-12 w-full gap-2.5 text-[15px]`}>
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        {button}
      </button>
      <p className={`mt-3 flex items-start gap-2 text-[12.5px] leading-snug ${C.muted}`}>
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Data tidak disimpan di website ini dan tidak ada pembayaran online; formulir hanya menyusun pesan WhatsApp untuk panitia.
      </p>
    </form>
  );
}

export function Ppdb({ m }: { m: CakrawalaModel }) {
  const { ppdb } = m;
  const title = text(ppdb, 'title');
  const image = text(ppdb, 'image');
  const facts = list(ppdb, 'facts', 4).filter((item) => field(item, 'value'));
  const brochureLabel = text(ppdb, 'brochure_label');
  const brochureUrl = safeUrl(text(ppdb, 'brochure_url'));

  return (
    <TemplateSection sectionKey="ppdb" className="py-2">
      <div className={PANEL_OUTER}>
        <div className={`${PANEL.soft} ${SECTION_PAD}`}>
          <div className="grid items-center gap-10 @4xl:grid-cols-12 @5xl:gap-14">
            <div className={`min-w-0 ${hasImage(image) ? '@4xl:col-span-7' : '@4xl:col-span-12'}`}>
              <SectionHead layout="stack" eyebrow={text(ppdb, 'eyebrow')} title={title} subtitle={text(ppdb, 'subtitle')} />
              {facts.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 @3xl:flex @3xl:flex-wrap @3xl:gap-0 @3xl:divide-x @3xl:divide-black/[0.08]">
                  {facts.map((item, i) => (
                    <Reveal key={`${field(item, 'label')}-${i}`} delay={stagger(i, 60)} className="flex min-w-0 flex-col @3xl:px-6 @3xl:first:pl-0">
                      <dt className={`order-last mt-1 text-[13px] ${C.muted}`}>{field(item, 'label')}</dt>
                      <dd className={`${DISPLAY} text-[18px] font-bold leading-snug tracking-[-0.02em] ${C.ink} @3xl:text-[20px]`}>{field(item, 'value')}</dd>
                    </Reveal>
                  ))}
                </dl>
              )}
              {brochureLabel && brochureUrl && (
                <ActionLink action={{ kind: 'external', href: brochureUrl }} className="group mt-7 inline-flex min-h-10 items-center gap-2 text-[14px] font-semibold text-(--ck-ink)">
                  <Download aria-hidden className="h-4 w-4" />
                  <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{brochureLabel}</span>
                </ActionLink>
              )}
            </div>
            {hasImage(image) && (
              <Reveal variant="fade" className="@4xl:col-span-5">
                <KitPhoto
                  src={image}
                  alt={CAKRAWALA_PHOTOS.alt(image, `Pendaftaran siswa baru ${m.companyName}`)}
                  sizes="(min-width: 1280px) 560px, (min-width: 896px) 40vw, 92vw"
                  className="aspect-[4/3] rounded-[24px]"
                />
              </Reveal>
            )}
          </div>

          <div className="mt-10 grid items-start gap-4 @3xl:mt-14 @5xl:grid-cols-12">
            <div className="min-w-0 @5xl:col-span-7">
              <Tabs m={m} />
            </div>
            <div className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+96px)] @5xl:col-span-5">
              <RegistrationForm m={m} />
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
