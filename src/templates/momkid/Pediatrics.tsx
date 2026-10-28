// Dokter anak (kunci `pediatrics`): kepala section di tengah, lalu kartu jadwal radius 28 bergiliran peach lembut /
// mint. Setiap kartu: INISIAL di ubin putih (tanpa foto: nama dokter demo fiktif), nama & gelar, fokus layanan, STRIP
// MINGGUAN tujuh pil (hari praktik berisi warna tema; pembaca layar mendengar kalimat "Praktik Senin, Rabu, dan
// Jumat"), jam praktik, dan tombol "Buat janji" → WhatsApp berisi nama dokter & jadwal. Catatan jadwal di bawah kartu.
import { Info } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { WhatsAppIcon } from '../shared/icons';
import { Doodle } from './art';
import { WEEK, daysSentence, doctorMessage, parseDays, type MomkidModel } from './model';
import { C, CARD, DISPLAY, PASTELS, RAIL, RAIL_ITEM, SECTION_PAD, TONE_BG } from './styles';
import { ButtonLink, SectionHead } from './ui';

const COLS: Record<number, string> = { 1: '@4xl:mx-auto @4xl:max-w-[480px]', 2: '@4xl:grid-cols-2', 3: '@4xl:grid-cols-2 @6xl:grid-cols-3', 4: '@4xl:grid-cols-2 @7xl:grid-cols-4' };

/** Gelar & awalan tidak ikut inisial: "dr. Nadia Prameswari, Sp.A" → "NP". */
const doctorInitials = (name: string) => initials(name.replace(/^(dr|drg|prof|bd|ns)\.?\s+/i, '').replace(/,.*$/, ''), 'DR');

export function Pediatrics({ m }: { m: MomkidModel }) {
  const { pediatrics } = m;
  const items = m.items('pediatrics');
  if (items.length === 0) return null;
  const buttonLabel = text(pediatrics, 'button_label');
  const note = text(pediatrics, 'note');

  return (
    <TemplateSection sectionKey="pediatrics" className={`${TONE_BG[m.tone('pediatrics')]} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(pediatrics, 'eyebrow')} doodle="stethoscope" title={text(pediatrics, 'title')} subtitle={text(pediatrics, 'subtitle')} srTitle="Dokter anak" />
        {/* HP & tablet tegak: rel geser (kartu ± 86%); ≥ @4xl: kisi. Reveal di seluruh daftar, bukan per kartu di dalam rel. */}
        <Reveal variant="scale" className="mt-8 @3xl:mt-12">
        <ul
          tabIndex={items.length > 1 ? 0 : undefined}
          aria-label="Jadwal dokter anak"
          className={`${items.length > 1 ? RAIL : 'grid'} ${COLS[Math.min(items.length, 4)] ?? COLS[4]}`}
        >
          {items.map((item, i) => {
            const name = field(item, 'name');
            const daysRaw = field(item, 'days');
            const days = parseDays(daysRaw);
            const hours = field(item, 'hours');
            const action = m.waWith(doctorMessage(m.companyName, name, daysRaw, hours)) ?? m.visitAction;
            return (
              <li key={`${name}-${i}`} className={items.length > 1 ? RAIL_ITEM : 'min-w-0'}>
                <article className={`flex h-full flex-col p-5 @3xl:p-6 ${CARD} ${PASTELS[i % 2]}`}>
                  {/* min-h di 4 kolom: strip hari sejajar antar-kartu walau nama dokter 2 baris */}
                  <div className="flex items-center gap-4 @7xl:min-h-[84px]">
                    <span aria-hidden className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-white ${DISPLAY} text-[22px] font-extrabold ${C.accent}`}>
                      {doctorInitials(name)}
                    </span>
                    <div className="min-w-0">
                      <h3 className={`${DISPLAY} text-[18px] font-extrabold leading-snug tracking-[-0.01em] ${C.ink}`}>{name}</h3>
                      {field(item, 'focus') && <p className={`mt-1 text-[14px] leading-snug ${C.muted}`}>{field(item, 'focus')}</p>}
                    </div>
                  </div>
                  {days.length > 0 && (
                    <div className="mt-5 @3xl:mt-6">
                      <p className="sr-only">{`Praktik ${daysSentence(days)}`}</p>
                      <ul aria-hidden className="grid grid-cols-7 gap-1">
                        {WEEK.map((day, d) => (
                          <li
                            key={day}
                            className={`flex h-9 items-center justify-center rounded-full text-[12px] font-bold ${
                              days.includes(d) ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white/70 text-[#6A5559]'
                            }`}
                          >
                            {day}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!days.length && daysRaw && <p className={`mt-6 text-[14.5px] font-medium ${C.ink}`}>{daysRaw}</p>}
                  {/* Jam + tombol sebaris bila muat (HP lebih ringkas), selain itu tombol turun selebar kartu */}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-5">
                    {hours && (
                      <p className={`flex items-center gap-2 text-[15px] font-semibold tabular-nums ${C.ink}`}>
                        <Doodle name="clock" blob="" className={`h-7 w-7 shrink-0 ${C.accent}`} />
                        {hours}
                      </p>
                    )}
                    <ButtonLink
                      action={action}
                      label={buttonLabel}
                      variant="white"
                      size="md"
                      arrow={false}
                      icon={action?.kind === 'external' ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                      className="grow @7xl:w-full"
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        </Reveal>
        {note && (
          <Reveal as="p" variant="fade" className={`mx-auto mt-8 flex max-w-[70ch] items-start justify-center gap-2 text-center text-[14px] leading-snug ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
