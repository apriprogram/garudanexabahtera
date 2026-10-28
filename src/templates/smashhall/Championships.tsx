// Kejuaraan (kunci `championships`): SATU pita tinta gelap di halaman (data-tpl-tone="inverse"). Kepala section putih
// dengan tombol "Daftar turnamen" (WhatsApp) di kanan; layar lebar foto 16:9 opsional (radius 20) di kolom 1-5 dan
// garis waktu turnamen di kolom 7-12: ubin tanggal Sora, garis vertikal yang tumbuh sekali (warna tema terang), label
// status (dibuka = warna tema, selesai = abu), nama, kategori, biaya atau hasil. HP: foto lalu garis waktu.
// JUJUR: turnamen komunitas; tanpa klaim sanksi federasi.
import { Trophy } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { askMessage, splitDate, statusTone, type SmashModel } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { DISPLAY, GRID_GAP, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

const STATUS = {
  open: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  done: 'bg-white/10 text-white/80',
  neutral: 'ring-1 ring-inset ring-white/35 text-white',
} as const;

export function Championships({ m }: { m: SmashModel }) {
  const { championships } = m;
  const events = m.items('championships');
  const image = text(championships, 'image');
  const withPhoto = hasImage(image);
  const buttonLabel = text(championships, 'button_label');
  const action = m.waWith(askMessage(m.companyName, 'mendaftar turnamen')) ?? m.contactAction;
  const note = text(championships, 'note');

  return (
    <TemplateSection sectionKey="championships" data-tpl-tone="inverse" className={`bg-[#171512] text-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          tone="dark"
          eyebrow={text(championships, 'eyebrow')}
          title={text(championships, 'title')}
          subtitle={text(championships, 'subtitle')}
          srTitle="Kejuaraan"
          aside={buttonLabel && action ? <ButtonLink action={action} label={buttonLabel} className="w-full @xl:w-auto" /> : undefined}
        />

        <div className={`mt-10 grid grid-cols-1 gap-y-10 @3xl:mt-14 @5xl:grid-cols-12 ${GRID_GAP}`}>
          {withPhoto && (
            <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={SMASHHALL_PHOTOS.alt(image, `Suasana turnamen bulu tangkis di ${m.companyName}`)}
                zoom
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/3] rounded-[20px]"
              />
            </Reveal>
          )}

          <Reveal className={`relative min-w-0 ${withPhoto ? '@5xl:col-span-7 @5xl:col-start-6 @6xl:col-span-6 @6xl:col-start-7' : '@5xl:col-span-12'}`}>
            <ol className="relative grid gap-3">
              {events.map((e, i) => {
                const [day, month] = splitDate(field(e, 'date'));
                const tone = statusTone(field(e, 'status'));
                return (
                  <Reveal as="li" key={`${field(e, 'name')}-${i}`} delay={stagger(i)} className="relative flex min-w-0 gap-4 @3xl:gap-5">
                    {/* Garis waktu ke ubin berikutnya: rel tipis + isian warna tema yang tumbuh sekali (dekoratif) */}
                    {i < events.length - 1 && (
                      <>
                        <span aria-hidden className="absolute -bottom-3 left-[31px] top-16 w-0.5 bg-white/15 @3xl:left-[35px] @3xl:top-[72px]" />
                        <span aria-hidden className="sh-track absolute -bottom-3 left-[31px] top-16 w-0.5 bg-(--sh-bright) @3xl:left-[35px] @3xl:top-[72px]" />
                      </>
                    )}
                    <p
                      className={`${DISPLAY} relative flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#24221F] ring-1 ring-inset ring-white/10 @3xl:h-[72px] @3xl:w-[72px] ${
                        tone === 'done' ? 'text-white/70' : 'text-white'
                      }`}
                    >
                      <span className="text-[22px] font-bold leading-none tabular-nums @3xl:text-[24px]">{day}</span>
                      {month && <span className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/70">{month}</span>}
                    </p>
                    <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-4 py-4 ring-1 ring-inset ring-white/10 @3xl:px-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className={`${TYPE_S.h3} text-white`}>{field(e, 'name')}</h3>
                        {field(e, 'status') && (
                          <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${STATUS[tone]}`}>{field(e, 'status')}</span>
                        )}
                      </div>
                      {field(e, 'category') && <p className="mt-1.5 text-[14px] text-white/70">{field(e, 'category')}</p>}
                      {field(e, 'info') && (
                        <p className="mt-2 flex items-start gap-2 text-[14px] text-white/90">
                          {tone === 'done' && <Trophy aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--sh-bright)" />}
                          {field(e, 'info')}
                        </p>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </ol>
            {note && <p className="mt-6 text-[13.5px] leading-snug text-white/65">{note}</p>}
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
