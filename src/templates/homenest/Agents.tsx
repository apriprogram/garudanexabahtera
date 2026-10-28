// Agen & jadwal kunjungan (kunci `agents`), pita krem: kiri (1-5) kepala section + baris agen bergaris rambut —
// monogram persegi hijau tua dengan inisial Cormorant (tanpa foto: nama agen fiktif), nama, area, tombol garis "Chat
// {nama depan}" (WhatsApp agen sendiri, kalau kosong nomor kantor; HP: tombol ikon 44px) — dan kanan (7-12) panel putih "Jadwalkan kunjungan":
// nama, rumah yang diminati (dari daftar rumah), tanggal (tidak sebelum hari ini), waktu (pagi/siang/sore), agen,
// catatan. JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch, localStorage, atau <form action>; data tidak disimpan
// di website. Setelah lolos validasi, pesan ditampilkan apa adanya dengan "Buka WhatsApp" (tanpa nomor: email, tanpa
// keduanya: salin pesan) dan "Ubah data". Pratinjau: tautan tidak dibuka (ActionLink).
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { initials, text, whatsappHref, type LinkAction } from '../shared/utils';
import {
  ANY_AGENT,
  EMPTY_VISIT,
  NO_LISTING,
  VISIT_FIELDS,
  VISIT_LIMITS,
  VISIT_TIMES,
  agentMessage,
  messageMailHref,
  todayIso,
  validateVisit,
  visitMessage,
  type HomeNestModel,
  type VisitErrors,
  type VisitForm,
} from './model';
import { BTN, C, GRID_GAP, INPUT, LABEL_SM, SECTION_PAD, SERIF, TEXT_LINK, TYPE } from './styles';
import { SectionHead } from './ui';

type Key = keyof VisitForm;

function Field({ id, label, error, optional = false, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
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

function VisitPanel({ m }: { m: HomeNestModel }) {
  const { agents, contact } = m;
  const baseId = useId();
  const [today] = useState(() => todayIso());
  const [form, setForm] = useState<VisitForm>(EMPTY_VISIT);
  const [errors, setErrors] = useState<VisitErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const listingNames = Array.from(new Set(m.homes.map((h) => h.title)));
  const agentNames = m.agentList.map((a) => a.name);
  const title = text(agents, 'form_title') || 'Jadwalkan kunjungan';
  const note = text(agents, 'form_text') || 'Formulir ini hanya menyusun pesan WhatsApp; data tidak disimpan di website.';
  const chosen = m.agentList.find((a) => a.name === form.agent);
  const number = chosen?.whatsapp || m.whatsapp;
  const hasWhatsapp = !!whatsappHref(number);
  const button = hasWhatsapp ? text(agents, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      refs.current[key] = el;
    },
    value: form[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateVisit(form, listingNames, agentNames, todayIso());
    setErrors(found);
    const first = VISIT_FIELDS.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent(visitMessage(form, m.companyName));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = 'bg-white p-5 ring-1 ring-inset ring-[#1E2A24]/[0.12] @3xl:p-8 @5xl:p-10';
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent, number) : null;
    const mail = !wa ? messageMailHref(text(contact, 'email'), 'Jadwal kunjungan', sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={panel} aria-live="polite">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 ${TYPE.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className={`mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap border bg-[#FBF9F4] p-4 font-sans text-[14px] leading-relaxed ${C.line} ${C.ink} [overflow-wrap:anywhere]`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-6">
          {wa ? (
            <ActionLink action={wa} className={`${BTN.primary} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : mail ? (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.primary} ${BTN.lg}`}>
              Kirim lewat email
            </ActionLink>
          ) : (
            <button type="button" onClick={copy} className={`${BTN.primary} ${BTN.lg}`}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${TEXT_LINK} self-center`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
        {privacy}
      </div>
    );
  }

  const select = (key: 'listing' | 'agent', options: string[]) => (
    <div className="relative">
      <select {...bind(key)} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 appearance-none pr-10 ${ring(key)}`}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={`${baseId}-title`} className={panel}>
      <h3 id={`${baseId}-title`} className={`${TYPE.h3} ${C.ink}`}>
        {title}
      </h3>
      <div className="mt-6 grid gap-4">
        <Field id={id('name')} label="Nama" error={errors.name}>
          <input type="text" {...bind('name')} maxLength={VISIT_LIMITS.name} autoComplete="name" onChange={(e) => set('name')(e.target.value)} className={`${INPUT} h-12 ${ring('name')}`} />
        </Field>
        <Field id={id('listing')} label="Rumah yang diminati" error={errors.listing}>
          {select('listing', [NO_LISTING, ...listingNames])}
        </Field>
        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2">
          <Field id={id('date')} label="Tanggal kunjungan" error={errors.date}>
            <input type="date" {...bind('date')} min={today} onChange={(e) => set('date')(e.target.value)} className={`${INPUT} h-12 ${ring('date')}`} />
          </Field>
          <Field id={id('agent')} label="Agen" error={errors.agent}>
            {select('agent', [ANY_AGENT, ...agentNames])}
          </Field>
        </div>
        <fieldset className="min-w-0">
          <legend className={`mb-1.5 text-[14px] font-medium ${C.ink}`}>Waktu</legend>
          <div className="grid grid-cols-3 gap-2">
            {VISIT_TIMES.map((time) => (
              <label
                key={time}
                className={`relative flex min-h-12 cursor-pointer flex-col items-center justify-center bg-white px-1.5 py-1 text-center text-[14px] font-medium leading-tight ring-1 ring-inset ring-[#1E2A24]/50 transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--hn-ink) ${C.ink}`}
              >
                <input type="radio" name={`${baseId}-time`} value={time} checked={form.time === time} onChange={() => set('time')(time)} className="sr-only" />
                <span>{time.split(' ')[0]}</span>
                <span className="text-[11.5px] font-normal tabular-nums opacity-80">{time.replace(/^\S+\s*\(|\)$/g, '')}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id={id('note')} label="Catatan" optional>
          <textarea {...bind('note')} rows={3} maxLength={VISIT_LIMITS.note} onChange={(e) => set('note')(e.target.value)} className={`${INPUT} min-h-24 py-3`} />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-7 w-full`}>
        {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      {privacy}
    </form>
  );
}

export function Agents({ m }: { m: HomeNestModel }) {
  const { agents } = m;
  const list = m.agentList;
  const head = <SectionHead layout="stack" eyebrow={text(agents, 'eyebrow')} title={text(agents, 'title')} subtitle={text(agents, 'subtitle')} srTitle="Hubungi agen" />;
  return (
    <TemplateSection sectionKey="agents" className={`${SECTION_PAD} ${C.cream}`}>
      {/* Layar lebar: kiri (1-5) kepala section + daftar agen, kanan (7-12) formulir — dua kolom seimbang tingginya */}
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-12 @5xl:grid-cols-12 ${GRID_GAP}`}>
        <div className={`min-w-0 ${list.length > 0 ? '@5xl:col-span-5' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
          {head}
          {list.length > 0 && (
            <ul className={`mt-10 border-t @3xl:mt-12 ${C.line}`}>
              {list.map((agent, i) => (
                <Reveal as="li" key={`${agent.name}-${i}`} delay={stagger(i)} className={`flex items-center gap-x-4 border-b py-5 @xl:gap-x-5 @xl:py-6 ${C.line}`}>
                  <span
                    aria-hidden
                    className={`flex h-12 w-12 shrink-0 items-center justify-center bg-(--hn-deep) ${SERIF} text-[20px] font-semibold text-[#F4EFE4] @xl:h-14 @xl:w-14 @xl:text-[22px]`}
                  >
                    {initials(agent.name, '?')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block ${TYPE.h3sm} ${C.ink}`}>{agent.name}</span>
                    {agent.area && <span className={`mt-1 block ${LABEL_SM} ${C.muted}`}>{agent.area}</span>}
                  </span>
                  {/* HP: tombol persegi 44px hanya ikon (nama tautan tetap "Chat {nama}"); ≥ @xl: ikon + teks */}
                  <AgentChat action={m.waWith(agentMessage(agent), agent.whatsapp)} label={`Chat ${agent.firstName}`} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
        <Reveal delay={120} className={`min-w-0 ${list.length > 0 ? '@5xl:col-span-6 @5xl:col-start-7' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
          <VisitPanel m={m} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}

function AgentChat({ action, label }: { action: LinkAction | null; label: string }) {
  if (!action) return null;
  return (
    <ActionLink action={action} className={`${BTN.outline} h-11 w-11 shrink-0 px-0 @xl:w-auto @xl:px-5`}>
      <WhatsAppIcon className="h-[18px] w-[18px] shrink-0 @xl:h-4 @xl:w-4" />
      <span className="sr-only @xl:not-sr-only">{label}</span>
    </ActionLink>
  );
}
