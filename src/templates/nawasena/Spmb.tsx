// SPMB / PPDB (kunci `spmb`), pita abu kertas. Atas: kiri label "/11 — SPMB 2027/2028", H2, deskripsi, lencana bercentang
// ("Tanpa biaya pendaftaran"); kanan kartu portal resmi (tombol ke portal SPMB provinsi di tab baru + tautan ke formulir
// tanya). Tengah: kartu jalur (nomor mono, nama serif, kuota besar warna tema, keterangan) + catatan juknis. Bawah: kiri
// tabel perkiraan jadwal (<table> + <caption>; di HP baris menjadi blok) dan daftar syarat dokumen bercentang; kanan
// formulir tanya panitia.
// JUJUR: pendaftaran hanya lewat portal provinsi. Formulir tanya hanya MENYUSUN pesan WhatsApp untuk panitia — bukan
// pendaftaran, tidak ada data yang dikirim ke server atau disimpan, tidak ada unggah berkas, tidak ada pembayaran.
// Setelah lolos validasi, pesan ditampilkan apa adanya beserta tombol "Buka WhatsApp" (pratinjau: tautan tidak dibuka).
// Tanpa nomor WhatsApp (panitia maupun sekolah) → formulir diganti tombol ke Kontak.
import { Check, ChevronDown, CircleAlert, ExternalLink, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger, useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, safeUrl, text, whatsappHref } from '../shared/utils';
import {
  ASKER_ROLES,
  EMPTY_QUESTION,
  pathOptions,
  spmbMessage,
  validateSpmbQuestion,
  type NawasenaModel,
  type SpmbErrors,
  type SpmbQuestion,
} from './model';
import { BTN, C, CARD, DISPLAY, INPUT, SECTION_PAD, TYPE_N } from './styles';
import { ButtonLink, SectionHead } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');
const LABEL = `mb-1.5 block text-[13.5px] font-semibold ${C.navy}`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
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

const ORDER: (keyof SpmbQuestion)[] = ['name', 'role', 'origin', 'path', 'question'];

function QuestionForm({ m, registerFirst }: { m: NawasenaModel; registerFirst: (el: HTMLInputElement | null) => void }) {
  const { spmb } = m;
  const baseId = useId();
  const [form, setForm] = useState<SpmbQuestion>(EMPTY_QUESTION);
  const [errors, setErrors] = useState<SpmbErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof SpmbQuestion, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const paths = pathOptions(spmb);
  const title = text(spmb, 'form_title');
  const note = text(spmb, 'form_text');
  const button = text(spmb, 'form_button') || 'Susun pesan WhatsApp';
  const canSend = !!whatsappHref(m.spmbWhatsapp);
  const id = (key: keyof SpmbQuestion) => `${baseId}-${key}`;
  const set = (key: keyof SpmbQuestion) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof SpmbQuestion) => (errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {});
  const ring = (key: keyof SpmbQuestion) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateSpmbQuestion(form, paths);
    setErrors(found);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(spmbMessage(m.companyName, text(spmb, 'eyebrow'), form));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const card = `p-5 @3xl:p-7 ${CARD.white}`;
  if (!canSend) {
    return (
      <div className={card}>
        {title && <h3 className={`${C.navy} ${TYPE_N.h3}`}>{title}</h3>}
        {note && <p className={`mt-2 ${TYPE_N.small} ${C.muted}`}>{note}</p>}
        <ButtonLink action={m.contactAction} label="Hubungi panitia" variant="outline" className="mt-5" />
      </div>
    );
  }

  if (sent) {
    const action = m.waWith(sent, m.spmbWhatsapp);
    return (
      <div role="status" className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${C.navy} ${TYPE_N.h3} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-(--nw-tint) text-(--nw-ink)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 ${TYPE_N.small} ${C.muted}`}>Periksa isinya, lalu buka WhatsApp untuk mengirim ke panitia SPMB.</p>
        <pre className={`mt-4 whitespace-pre-wrap p-4 font-sans text-[13.5px] leading-relaxed ${C.navy} ${CARD.surface} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-5 flex flex-col gap-2.5 @xl:flex-row">
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
            Ubah pertanyaan
          </button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Formulir tanya SPMB'} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.navy} ${TYPE_N.h3}`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-5' : ''}`}>
        <Field id={id('name')} label="Nama" error={errors.name}>
          <input
            ref={(el) => {
              refs.current.name = el;
              registerFirst(el);
            }}
            id={id('name')}
            type="text"
            autoComplete="name"
            maxLength={60}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            className={`${INPUT} h-12 ${ring('name')}`}
            {...invalid('name')}
          />
        </Field>
        <fieldset aria-describedby={errors.role ? `${id('role')}-error` : undefined}>
          <legend className={LABEL}>Saya</legend>
          {/* HP: bertumpuk agar "Orang tua/wali" tidak terpotong; kolom formulir lebar → berdampingan */}
          <div className="grid gap-2 @lg:grid-cols-2">
            {ASKER_ROLES.map((role, i) => {
              const on = form.role === role;
              return (
                <label
                  key={role}
                  className={`flex h-12 cursor-pointer items-center gap-2.5 rounded-[6px] px-3.5 text-[15px] ring-inset transition-colors ${C.navy} ${
                    on ? 'bg-(--nw-soft) ring-2 ring-(--tpl-accent-ink)' : 'bg-white ring-1 ring-[#858FA1] hover:bg-[#F5F7FB]'
                  }`}
                >
                  <input
                    ref={(el) => {
                      if (i === 0) refs.current.role = el;
                    }}
                    type="radio"
                    name={id('role')}
                    value={role}
                    checked={on}
                    onChange={() => set('role')(role)}
                    className="h-4 w-4 shrink-0 accent-(--tpl-accent)"
                  />
                  <span className="min-w-0 truncate">{role}</span>
                </label>
              );
            })}
          </div>
          {errors.role && (
            <p id={`${id('role')}-error`} className="mt-1.5 text-[13px] font-medium text-[#B42318]">
              {errors.role}
            </p>
          )}
        </fieldset>
        <Field id={id('origin')} label="Asal SMP/MTs" error={errors.origin}>
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
        <Field id={id('path')} label="Jalur yang diminati" error={errors.path}>
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
              {paths.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
          </div>
        </Field>
        <Field id={id('question')} label="Pertanyaan" error={errors.question}>
          <textarea
            ref={(el) => {
              refs.current.question = el;
            }}
            id={id('question')}
            rows={4}
            maxLength={500}
            value={form.question}
            onChange={(e) => set('question')(e.target.value)}
            className={`${INPUT} min-h-28 py-3 ${ring('question')}`}
            {...invalid('question')}
          />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-6 w-full`}>
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        {button}
      </button>
      {note && <p className={`mt-3 text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
    </form>
  );
}

export function Spmb({ m }: { m: NawasenaModel }) {
  const { spmb } = m;
  const firstField = useRef<HTMLInputElement | null>(null);
  const formBox = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const badges = list(spmb, 'badges', 4)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const portalHref = safeUrl(text(spmb, 'portal_url'));
  const portalLabel = text(spmb, 'portal_label');
  const portal = portalHref && portalLabel ? portalHref : null;
  const portalTitle = text(spmb, 'portal_title') || 'Portal resmi';
  const formTitle = text(spmb, 'form_title');
  const canAsk = !!whatsappHref(m.spmbWhatsapp);
  const pathsTitle = text(spmb, 'paths_title');
  const paths = list(spmb, 'paths', 6).filter((item) => field(item, 'name'));
  const pathsNote = text(spmb, 'paths_note');
  const scheduleTitle = text(spmb, 'schedule_title');
  const schedule = list(spmb, 'schedule', 8).filter((item) => field(item, 'title') || field(item, 'date'));
  const requirementsTitle = text(spmb, 'requirements_title');
  const requirements = list(spmb, 'requirements', 12)
    .map((item) => field(item, 'text'))
    .filter(Boolean);

  const registerFirst = (el: HTMLInputElement | null) => {
    firstField.current = el;
  };
  /** Ke formulir tanya: isian pertama; bila pesan sudah disusun (formulir diganti hasil) → judul hasil. */
  const focusForm = () => {
    const behavior = motion ? 'smooth' : 'auto';
    const el = firstField.current?.isConnected ? firstField.current : null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior });
      el.focus({ preventScroll: true });
      return;
    }
    const box = formBox.current;
    if (!box) return;
    box.scrollIntoView({ block: 'center', behavior });
    box.querySelector<HTMLElement>('h3[tabindex="-1"]')?.focus({ preventScroll: true });
  };

  return (
    <TemplateSection sectionKey="spmb" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="grid gap-8 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-7">
            <SectionHead
              layout="stack"
              eyebrow={text(spmb, 'eyebrow')}
              number={m.number('spmb')}
              title={text(spmb, 'title') || 'Penerimaan murid baru'}
              subtitle={text(spmb, 'subtitle')}
            />
            {badges.length > 0 && (
              <Reveal as="ul" delay={200} className="mt-6 flex flex-wrap gap-2">
                {badges.map((badge, i) => (
                  <li key={`${badge}-${i}`} className={`inline-flex min-h-9 items-center gap-2 rounded-[4px] bg-white px-3 py-1 text-[13.5px] font-medium ring-1 ring-inset ring-black/[0.08] ${C.navy}`}>
                    <Check aria-hidden className="h-4 w-4 shrink-0 text-(--nw-ink)" strokeWidth={2.2} />
                    {badge}
                  </li>
                ))}
              </Reveal>
            )}
          </div>
          {/* Kartu portal hanya bila tautan portal diisi (formulir tanya di bawah punya judulnya sendiri) */}
          {portal && (
            <Reveal delay={160} className={`min-w-0 p-6 @3xl:p-7 @5xl:col-span-5 ${CARD.white}`}>
              <p className={`${TYPE_N.mono} ${C.muted}`}>{portalTitle}</p>
              <ButtonLink
                action={{ kind: 'external', href: portal }}
                label={portalLabel}
                variant="primary"
                size="lg"
                trailing={<ExternalLink aria-hidden className="h-4 w-4 shrink-0" />}
                className="mt-4 w-full"
              />
              {canAsk && formTitle && (
                <button type="button" onClick={focusForm} className="nw-link group mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold text-(--nw-ink)">
                  <span className="nw-underline">{formTitle}</span>
                  <ChevronDown aria-hidden className="h-4 w-4 shrink-0" />
                </button>
              )}
            </Reveal>
          )}
        </div>

        {paths.length > 0 && (
          <div className="mt-14 @3xl:mt-16">
            {pathsTitle && <h3 className={`${C.navy} ${TYPE_N.h3}`}>{pathsTitle}</h3>}
            <ul className={`grid gap-3 @2xl:grid-cols-2 @3xl:gap-4 @6xl:grid-cols-4 ${pathsTitle ? 'mt-6' : ''}`}>
              {paths.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 70)} className={`flex min-w-0 flex-col p-6 ${CARD.white}`}>
                  <p className={`${TYPE_N.mono} text-(--nw-ink)`}>Jalur {pad(i + 1)}</p>
                  <h3 className={`mt-3 text-[24px] leading-tight ${C.navy} ${DISPLAY} font-normal`}>{field(item, 'name')}</h3>
                  {field(item, 'quota') && <p className={`mt-3 text-[34px] leading-none text-(--nw-ink) ${DISPLAY} font-normal`}>{field(item, 'quota')}</p>}
                  {field(item, 'text') && <p className={`mt-3 text-[14.5px] leading-relaxed ${C.body}`}>{field(item, 'text')}</p>}
                </Reveal>
              ))}
            </ul>
            {pathsNote && <p className={`mt-4 max-w-[80ch] text-[13.5px] leading-relaxed ${C.muted}`}>{pathsNote}</p>}
          </div>
        )}

        <div className="mt-14 grid gap-10 @3xl:mt-16 @5xl:grid-cols-12 @5xl:items-start @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-7">
            {schedule.length > 0 && (
              <Reveal className={`overflow-hidden p-5 @3xl:p-7 ${CARD.white}`}>
                <table className="w-full border-collapse text-left">
                  {scheduleTitle && <caption className={`mb-4 text-left ${TYPE_N.mono} ${C.muted}`}>{scheduleTitle}</caption>}
                  <thead className="hidden @3xl:table-header-group">
                    <tr className={`border-b border-black/[0.08] ${TYPE_N.mono} ${C.muted}`}>
                      <th scope="col" className="w-[30%] pb-3 pr-4 font-medium">
                        Waktu
                      </th>
                      <th scope="col" className="w-[28%] pb-3 pr-4 font-medium">
                        Kegiatan
                      </th>
                      <th scope="col" className="pb-3 font-medium">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.08]">
                    {schedule.map((item, i) => (
                      <tr key={`${field(item, 'title')}-${i}`} className="block py-4 first:pt-0 @3xl:table-row @3xl:py-0">
                        <td className="block font-mono text-[13px] font-medium tracking-[0.02em] text-(--nw-navy) @3xl:table-cell @3xl:py-4 @3xl:pr-4 @3xl:align-top">
                          {field(item, 'date')}
                        </td>
                        <td className={`mt-1 block text-[15.5px] font-semibold leading-snug @3xl:mt-0 @3xl:table-cell @3xl:py-4 @3xl:pr-4 @3xl:align-top ${C.navy}`}>
                          {field(item, 'title')}
                        </td>
                        <td className={`mt-1 block text-[14.5px] leading-relaxed @3xl:mt-0 @3xl:table-cell @3xl:py-4 @3xl:align-top ${C.body}`}>{field(item, 'text')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Reveal>
            )}
            {requirements.length > 0 && (
              <Reveal delay={100} className={schedule.length > 0 ? 'mt-10' : ''}>
                {requirementsTitle && <h3 className={`${C.navy} ${TYPE_N.h3}`}>{requirementsTitle}</h3>}
                <ul className={`grid gap-x-8 gap-y-3 @5xl:grid-cols-2 ${requirementsTitle ? 'mt-5' : ''}`}>
                  {requirements.map((requirement, i) => (
                    <li key={`${requirement}-${i}`} className={`flex gap-3 text-[15px] leading-relaxed ${C.body}`}>
                      <Check aria-hidden className="mt-[3px] h-4 w-4 shrink-0 text-(--nw-ink)" strokeWidth={2.2} />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
          <Reveal delay={120} className="min-w-0 @5xl:col-span-5">
            <div ref={formBox}>
              <QuestionForm m={m} registerFirst={registerFirst} />
            </div>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
