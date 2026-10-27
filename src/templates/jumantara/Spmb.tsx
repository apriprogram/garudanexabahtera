// SPMB / PPDB (kunci `spmb`): pita kobalt-hitam selebar layar (data-tpl-tone="inverse"). Kiri (7 kolom): label, H2,
// deskripsi, tombol putih ke portal SPMB provinsi (tautan keluar), lencana singkat bertanda centang, lalu tab
// Jalur · Jadwal · Syarat (nama tab dari CMS; tablist dengan panah kiri/kanan, Home/End): kartu jalur + kuota, linimasa
// perkiraan jadwal, daftar dokumen. Kanan (5 kolom, sejajar label): kartu PUTIH "tanya panitia" (nama, asal SMP/MTs,
// jalur yang diminati, pertanyaan). HP: urutan sama, formulir paling bawah.
// JUJUR: formulir hanya MENYUSUN pesan WhatsApp untuk panitia — bukan pendaftaran (pendaftaran di portal provinsi),
// tidak ada data yang dikirim ke server atau disimpan, tidak ada unggah berkas atau pembayaran. Setelah lolos validasi,
// pesan ditampilkan apa adanya beserta tombol "Buka WhatsApp" (pratinjau CMS: tautan tidak dibuka). Tanpa nomor
// WhatsApp → tombol ke Kontak.
import { ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, safeUrl, text, whatsappHref } from '../shared/utils';
import {
  EMPTY_SPMB,
  SPMB_LIMITS,
  UNSURE,
  parseSchoolDate,
  pathChoices,
  spmbMessage,
  validateSpmb,
  type JumantaraModel,
  type SpmbErrors,
  type SpmbForm,
} from './model';
import { BTN, C, CARD, DISPLAY, INPUT, INPUT_ERROR, INPUT_LINE, SECTION_PAD, TYPE_J } from './styles';
import { SectionHead, TabSet, type TabDef } from './ui';

const NOTE = 'text-[12px] font-semibold uppercase tracking-[0.12em] text-white/64';

function SpmbTabs({ m }: { m: JumantaraModel }) {
  const { spmb } = m;
  const paths = list(spmb, 'paths', 6).filter((item) => field(item, 'name'));
  const schedule = list(spmb, 'schedule', 8).filter((item) => field(item, 'title') || field(item, 'date'));
  const requirements = list(spmb, 'requirements', 12).filter((item) => field(item, 'text'));
  const pathsNote = text(spmb, 'paths_note');
  const scheduleNote = text(spmb, 'schedule_note');
  const requirementsNote = text(spmb, 'requirements_note');
  const tabs: TabDef[] = [];

  if (paths.length > 0) {
    tabs.push({
      id: 'jalur',
      label: text(spmb, 'paths_label') || 'Jalur',
      panel: (
        <div>
          <ul className="grid gap-3 @xl:grid-cols-2">
            {paths.map((item, i) => (
              <li key={`${field(item, 'name')}-${i}`} className={`p-5 ${CARD.dark}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`${DISPLAY} text-[18px] font-semibold leading-snug tracking-[-0.01em] text-white`}>{field(item, 'name')}</h3>
                  {field(item, 'quota') && (
                    <span className="inline-flex h-7 items-center rounded-[6px] bg-(--jm-bright) px-2.5 text-[12px] font-semibold tabular-nums text-(--jm-night)">
                      {field(item, 'quota')}
                    </span>
                  )}
                </div>
                {field(item, 'text') && <p className="mt-2 text-[14.5px] leading-relaxed text-white/72">{field(item, 'text')}</p>}
              </li>
            ))}
          </ul>
          {pathsNote && <p className="mt-4 text-[13px] leading-relaxed text-white/64">{pathsNote}</p>}
        </div>
      ),
    });
  }

  if (schedule.length > 0) {
    tabs.push({
      id: 'jadwal',
      label: text(spmb, 'schedule_label') || 'Jadwal',
      panel: (
        <div>
          {scheduleNote && <p className={`mb-6 ${NOTE}`}>{scheduleNote}</p>}
          <ol className="relative ml-1 border-l border-white/15">
            {schedule.map((item, i) => {
              const raw = field(item, 'date');
              const date = parseSchoolDate(raw);
              return (
                <li key={`${field(item, 'title')}-${i}`} className="relative pb-7 pl-7 last:pb-1">
                  <span aria-hidden className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-(--jm-bright)" />
                  {raw &&
                    (date ? (
                      <time dateTime={date.iso} className="block text-[13px] font-semibold tabular-nums text-(--jm-bright)">
                        {date.label}
                      </time>
                    ) : (
                      <p className="text-[13px] font-semibold text-(--jm-bright)">{raw}</p>
                    ))}
                  {field(item, 'title') && <h3 className={`mt-1 ${DISPLAY} text-[16.5px] font-semibold leading-snug text-white`}>{field(item, 'title')}</h3>}
                  {field(item, 'text') && <p className="mt-1 max-w-[56ch] text-[14.5px] leading-relaxed text-white/72">{field(item, 'text')}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      ),
    });
  }

  if (requirements.length > 0) {
    tabs.push({
      id: 'syarat',
      label: text(spmb, 'requirements_label') || 'Syarat',
      panel: (
        <div>
          {requirementsNote && <p className={`mb-5 ${NOTE}`}>{requirementsNote}</p>}
          <ul className="grid gap-3.5">
            {requirements.map((item, i) => (
              <li key={`${field(item, 'text')}-${i}`} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/85">
                <CircleCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-(--jm-bright)" strokeWidth={1.8} />
                {field(item, 'text')}
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  if (tabs.length === 0) return null;
  return <TabSet tabs={tabs} label={text(spmb, 'eyebrow') || 'Informasi SPMB'} tone="dark" />;
}

function Field({ id, label, error, optional = false, children }: { id: string; label: string; error?: string; optional?: boolean; children: ReactNode }) {
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

const REQUIRED: (keyof SpmbForm)[] = ['name', 'question'];

function AskForm({ m }: { m: JumantaraModel }) {
  const { spmb } = m;
  const baseId = useId();
  const [form, setForm] = useState<SpmbForm>(EMPTY_SPMB);
  const [errors, setErrors] = useState<SpmbErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof SpmbForm, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const paths = pathChoices(list(spmb, 'paths', 6));
  const title = text(spmb, 'form_title');
  const intro = text(spmb, 'form_text');
  const button = text(spmb, 'form_button') || 'Kirim lewat WhatsApp';
  const canSend = !!whatsappHref(m.spmbWhatsapp);
  const id = (key: keyof SpmbForm) => `${baseId}-${key}`;
  const set = (key: keyof SpmbForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof SpmbForm) => (errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {});
  const line = (key: keyof SpmbForm) => (errors[key] ? INPUT_ERROR : INPUT_LINE);
  const card = 'jm-light rounded-[12px] bg-white p-6 text-[#0E1525] @3xl:p-8';
  const heading = `${C.ink} ${TYPE_J.h3}`;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateSpmb(form);
    setErrors(found);
    const first = REQUIRED.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(spmbMessage(m.companyName, form));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  if (!canSend) {
    // Tanpa nomor WhatsApp, tanpa teks, dan tanpa section Kontak → tidak ada kartu kosong
    if (!title && !intro && !m.contactAction) return null;
    return (
      <div className={card}>
        {title && <h3 className={heading}>{title}</h3>}
        {intro && <p className={`mt-2 ${TYPE_J.small} ${C.muted}`}>{intro}</p>}
        {m.contactAction && (
          <ActionLink action={m.contactAction} className={`${BTN.primary} ${BTN.lg} mt-6 w-full`}>
            Hubungi sekolah
          </ActionLink>
        )}
      </div>
    );
  }

  if (sent) {
    const action = m.waWith(sent, m.spmbWhatsapp);
    return (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${heading} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-(--jm-tint) text-(--jm-ink)">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 ${TYPE_J.small} ${C.muted}`}>Periksa isinya, lalu buka WhatsApp untuk mengirim pertanyaan ke panitia SPMB.</p>
        <pre className={`mt-4 whitespace-pre-wrap rounded-[10px] bg-(--jm-tint) p-4 font-sans text-[13.5px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-5 flex flex-col gap-2.5 @xl:flex-row @5xl:flex-col @6xl:flex-row">
          {action && (
            <ActionLink action={action} className={`${BTN.primary} ${BTN.lg}`}>
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
            className={`${BTN.outline} ${BTN.lg}`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah isian
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Formulir tanya panitia SPMB'} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={heading}>
          {title}
        </h3>
      )}
      {intro && <p className={`mt-2 ${TYPE_J.small} ${C.muted}`}>{intro}</p>}
      <div className="mt-6 grid gap-4">
        <Field id={id('name')} label="Nama" error={errors.name}>
          <input
            ref={(el) => {
              refs.current.name = el;
            }}
            id={id('name')}
            type="text"
            autoComplete="name"
            maxLength={SPMB_LIMITS.name}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            className={`${INPUT} h-12 ${line('name')}`}
            {...invalid('name')}
          />
        </Field>
        <Field id={id('origin')} label="Asal SMP/MTs" optional>
          <input
            id={id('origin')}
            type="text"
            autoComplete="off"
            maxLength={SPMB_LIMITS.origin}
            value={form.origin}
            onChange={(e) => set('origin')(e.target.value)}
            className={`${INPUT} h-12 ${INPUT_LINE}`}
          />
        </Field>
        {paths.length > 0 && (
          <Field id={id('path')} label="Jalur yang diminati">
            <div className="relative">
              <select
                id={id('path')}
                value={form.path}
                onChange={(e) => set('path')(e.target.value)}
                className={`${INPUT} h-12 appearance-none pr-10 ${INPUT_LINE}`}
              >
                {paths.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={UNSURE}>{UNSURE}</option>
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
        )}
        <Field id={id('question')} label="Pertanyaan" error={errors.question}>
          <textarea
            ref={(el) => {
              refs.current.question = el;
            }}
            id={id('question')}
            rows={4}
            maxLength={SPMB_LIMITS.question}
            value={form.question}
            onChange={(e) => set('question')(e.target.value)}
            className={`${INPUT} min-h-28 py-3 ${line('question')}`}
            {...invalid('question')}
          />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-6 w-full`}>
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        {button}
      </button>
      <p className={`mt-3 flex items-start gap-2 text-[12.5px] leading-snug ${C.muted}`}>
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Pesan dibuka di WhatsApp Anda; tidak ada data yang disimpan di website.
      </p>
    </form>
  );
}

export function Spmb({ m }: { m: JumantaraModel }) {
  const { spmb } = m;
  const badges = list(spmb, 'badges', 3).filter((item) => field(item, 'text'));
  const portalLabel = text(spmb, 'portal_label');
  const portalUrl = safeUrl(text(spmb, 'portal_url'));
  const portal =
    portalLabel && portalUrl ? (
      <ActionLink action={{ kind: 'external', href: portalUrl }} className={`group ${BTN.white} ${BTN.lg}`}>
        <span className="truncate">{portalLabel}</span>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </ActionLink>
    ) : undefined;

  return (
    <TemplateSection sectionKey="spmb" data-tpl-tone="inverse" className={`bg-(--jm-night) text-white ${SECTION_PAD}`}>
      {/* Layar lebar: kiri (7 kolom) label, H2, deskripsi, tombol portal, lencana, lalu tab; kanan (5 kolom) kartu formulir
          sejajar dengan label di atas. HP: urutan yang sama, formulir paling bawah. */}
      <div className={`${CONTAINER} grid items-start gap-12 @5xl:grid-cols-12 @5xl:gap-x-12`}>
        <div className="min-w-0 @5xl:col-span-7">
          <SectionHead layout="stack" tone="dark" eyebrow={text(spmb, 'eyebrow')} title={text(spmb, 'title')} fallback="Penerimaan murid baru" subtitle={text(spmb, 'subtitle')} aside={portal} />
          {badges.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {badges.map((item, i) => (
                <Reveal
                  as="li"
                  key={`${field(item, 'text')}-${i}`}
                  delay={stagger(i, 60)}
                  className="inline-flex min-h-8 items-center gap-2 rounded-[8px] border border-white/15 bg-white/[0.06] px-3 py-1 text-[13px] font-medium text-white"
                >
                  <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--jm-bright)" strokeWidth={2.6} />
                  {field(item, 'text')}
                </Reveal>
              ))}
            </ul>
          )}
          <Reveal delay={80} className="mt-12 min-w-0 @3xl:mt-14">
            <SpmbTabs m={m} />
          </Reveal>
        </div>
        <Reveal delay={160} className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
          <AskForm m={m} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
