// Pengingat kontrol (kunci `reminders`): pita putih; formulir kecil di kartu kanvas (jenis dari CMS, tanggal, jam,
// waktu pengingat, catatan) → panel hasil (role=status) dengan ringkasan, tombol "Unduh .ics" (file kalender dibuat di
// peramban lewat Blob) dan tautan "Google Calendar". Semuanya dibuat di perangkat pengunjung: tidak ada data yang
// dikirim atau disimpan di website. Galat per isian (aria-invalid + aria-describedby), fokus ke galat pertama. Layar
// lebar: foto 4:3 di kiri dengan label kaca; HP: foto disembunyikan agar formulir langsung terlihat.
import { BellRing, CalendarPlus, ChevronDown, Download } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  ALARMS,
  DEFAULT_ALARM,
  REMINDER_FIELDS,
  REMINDER_NOTE_MAX,
  googleCalendarHref,
  isoDate,
  reminderFileName,
  reminderIcs,
  reminderTitle,
  reminderTypes,
  reminderWhen,
  validateReminder,
  type HealthLinkModel,
  type ReminderErrors,
  type ReminderForm,
} from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { BTN, C, CARD_SOFT, INPUT, SECTION_PAD, TYPE_H } from './styles';
import { SectionHead } from './ui';

const LABEL = 'mb-1.5 block text-[14px] font-semibold text-[#0E1B2B]';
const ERROR = 'mt-1.5 text-[13px] font-medium text-[#B42318]';
const SELECT = `${INPUT} appearance-none pr-11`;
/** Panah pilihan (dekoratif) di kanan select. */
const CHEVRON = 'pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4A5869]';

export function Reminders({ m }: { m: HealthLinkModel }) {
  const { reminders: r } = m;
  const types = reminderTypes(r);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [today] = useState(() => isoDate(new Date()));
  const [form, setForm] = useState<ReminderForm>({ type: types[0] ?? '', date: '', time: '09:00', alarm: DEFAULT_ALARM, note: '' });
  const [errors, setErrors] = useState<ReminderErrors>({});
  const [result, setResult] = useState<ReminderForm | null>(null);
  const image = text(r, 'image');
  const label = text(r, 'photo_label');
  const privacy = text(r, 'privacy_note');
  // Pilihan jenis dari CMS berubah (pratinjau) → pilihan yang tidak ada lagi diganti yang pertama
  const current: ReminderForm = types.includes(form.type) ? form : { ...form, type: types[0] ?? '' };

  const update = (key: keyof ReminderForm, value: string) => {
    setForm({ ...current, [key]: value });
    setResult(null);
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateReminder(current, types, isoDate(new Date()));
    setErrors(found);
    const first = REMINDER_FIELDS.find((key) => found[key]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      setResult(null);
      return;
    }
    setResult(current);
  };

  const download = () => {
    if (!result || typeof URL.createObjectURL !== 'function') return;
    const blob = new Blob([reminderIcs(result, m.companyName, new Date())], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = reminderFileName(result);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1500);
  };

  const fieldProps = (key: keyof ReminderForm) => ({
    id: `${id}-${key}`,
    name: key,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
  });
  const errorText = (key: keyof ReminderForm) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className={ERROR}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <TemplateSection sectionKey="reminders" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-8 @5xl:grid-cols-12 @5xl:gap-8`}>
        {hasImage(image) && (
          <div className="hidden min-w-0 @5xl:col-span-5 @5xl:block @5xl:self-center">
            <KitPhoto
              src={image}
              alt={HEALTHLINK_PHOTOS.alt(image, 'Pasien melihat pengingat jadwal kontrol di ponsel')}
              sizes="(min-width: 1024px) 40vw, 100vw"
              fallback="none"
              zoom
              position="45% 50%"
              className="aspect-[4/3] rounded-[28px]"
            >
              {label && (
                <span className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 pr-4 text-[14px] font-semibold text-[#0E1B2B] ring-1 ring-inset ring-white/60 backdrop-blur-md">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-(--hl-tint) text-(--hl-tint-ink)">
                    <BellRing className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  {label}
                </span>
              )}
            </KitPhoto>
          </div>
        )}

        <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-6 @5xl:col-start-7' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
          <SectionHead eyebrow={text(r, 'eyebrow')} title={text(r, 'title')} subtitle={text(r, 'subtitle')} srTitle={text(r, 'eyebrow') || 'Pengingat kontrol'} />
          <div className={`mt-7 p-4 @2xl:p-6 ${CARD_SOFT}`}>
            <form ref={formRef} noValidate onSubmit={submit} aria-label="Buat pengingat kontrol">
              <div className="grid gap-4 @sm:grid-cols-2 @sm:gap-x-3 @2xl:gap-x-4">
                <div className="@sm:col-span-2">
                  <label htmlFor={`${id}-type`} className={LABEL}>
                    Jenis pengingat
                  </label>
                  <div className="relative">
                    <select {...fieldProps('type')} value={current.type} onChange={(e) => update('type', e.target.value)} className={SELECT}>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden className={CHEVRON} />
                  </div>
                  {errorText('type')}
                </div>
                <div>
                  <label htmlFor={`${id}-date`} className={LABEL}>
                    Tanggal
                  </label>
                  <input {...fieldProps('date')} type="date" min={today} value={current.date} onChange={(e) => update('date', e.target.value)} className={INPUT} />
                  {errorText('date')}
                </div>
                <div>
                  <label htmlFor={`${id}-time`} className={LABEL}>
                    Jam
                  </label>
                  <input {...fieldProps('time')} type="time" step={300} value={current.time} onChange={(e) => update('time', e.target.value)} className={INPUT} />
                  {errorText('time')}
                </div>
                <div className="@sm:col-span-2 @2xl:col-span-1">
                  <label htmlFor={`${id}-alarm`} className={LABEL}>
                    Ingatkan
                  </label>
                  <div className="relative">
                    <select {...fieldProps('alarm')} value={current.alarm} onChange={(e) => update('alarm', e.target.value)} className={SELECT}>
                      {Object.entries(ALARMS).map(([key, [optionLabel]]) => (
                        <option key={key} value={key}>
                          {optionLabel}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden className={CHEVRON} />
                  </div>
                </div>
                <div className="@sm:col-span-2 @2xl:col-span-1">
                  <label htmlFor={`${id}-note`} className={LABEL}>
                    Catatan (opsional)
                  </label>
                  <input
                    {...fieldProps('note')}
                    type="text"
                    maxLength={REMINDER_NOTE_MAX}
                    value={current.note}
                    onChange={(e) => update('note', e.target.value)}
                    placeholder="mis. Bawa hasil lab"
                    className={INPUT}
                  />
                </div>
              </div>
              <button type="submit" className={`${BTN.solid} ${BTN.lg} mt-5 w-full @2xl:w-auto`}>
                <CalendarPlus aria-hidden className="h-5 w-5" />
                {text(r, 'form_button') || 'Buat pengingat'}
              </button>
            </form>

            {/* role="status" sudah polite; tanpa aria-live eksplisit (region status ber-aria-live milik Shell untuk keterangan pratinjau) */}
            <div role="status">
              {result && (
                <div className="mt-5 rounded-[20px] bg-white p-4 ring-1 ring-inset ring-(--hl-solid)/30 @2xl:p-5" data-hl-reminder="">
                  <p className="text-[13px] font-semibold text-(--hl-solid)">Pengingat siap ditambahkan</p>
                  <p className={`mt-1 ${TYPE_H.h3} ${C.ink}`}>{reminderTitle(result, m.companyName)}</p>
                  <p className={`mt-1 text-[14px] ${C.muted}`}>
                    {reminderWhen(result.date, result.time)} · {ALARMS[result.alarm]?.[0] ?? ''}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 @xl:flex-row">
                    <button type="button" onClick={download} className={`${BTN.solid} ${BTN.md}`}>
                      <Download aria-hidden className="h-5 w-5" />
                      Unduh .ics
                    </button>
                    <ActionLink action={{ kind: 'external', href: googleCalendarHref(result, m.companyName) }} className={`${BTN.light} ${BTN.md}`}>
                      <CalendarPlus aria-hidden className="h-5 w-5" />
                      Google Calendar
                    </ActionLink>
                  </div>
                </div>
              )}
            </div>
            {privacy && <p className={`mt-4 text-[13px] leading-snug ${C.muted}`}>{privacy}</p>}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
