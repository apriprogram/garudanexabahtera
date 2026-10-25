// Konsultasi penyuluh (kunci `consult`): panel hijau tua membulat ala hero referensi Holganix, polos tanpa garis
// dekoratif. Kiri: label kaca, H2 putih dengan kata sorotan aksen, deskripsi, langkah bernomor, kartu
// penyuluh (foto/inisial, nama, keahlian), jam layanan, tombol WhatsApp warna aksen. Kanan: foto tegak dengan dua
// gelembung chat contoh (pertanyaan pembeli & jawaban penyuluh). HP: foto di bawah teks, gelembung di dalam foto.
import { Clock } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { TaniModel } from './model';
import { TANI_PHOTOS } from './photos';
import { BTN, CARD, TYPE_T } from './styles';
import { Highlighted, PersonPhoto, SectionLabel } from './ui';

/** Gelembung chat contoh. `overlay`: menumpang di bagian bawah foto (layar lebar); selain itu di bawah foto (HP). */
function ChatBubbles({ m, overlay }: { m: TaniModel; overlay: boolean }) {
  const question = text(m.consult, 'chat_question');
  const answer = text(m.consult, 'chat_answer');
  const expert = list(m.consult, 'experts', 3).find((item) => field(item, 'name'));
  if (!question && !answer) return null;
  return (
    <div
      aria-label="Contoh percakapan konsultasi"
      role="group"
      className={overlay ? 'absolute inset-x-5 bottom-5 hidden space-y-2 @xl:block' : 'mx-auto mt-3 max-w-[460px] space-y-2 @xl:hidden'}
    >
      {question && (
        <p className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-[6px] bg-[#D9FDD3] px-4 py-2.5 text-[14px] leading-snug text-[#111B21]">
          <span className="sr-only">Pembeli: </span>
          {question}
        </p>
      )}
      {answer && (
        <div className="flex max-w-[92%] items-end gap-2">
          {expert && <PersonPhoto name={field(expert, 'name')} photo={field(expert, 'photo')} sizes="36px" className="h-9 w-9 ring-2 ring-white" />}
          <p className="rounded-[18px] rounded-bl-[6px] bg-white px-4 py-2.5 text-[14px] leading-snug text-[#111B21]">
            <span className="block text-[12px] font-semibold text-[#1E3A16]">{expert ? field(expert, 'name') : 'Penyuluh'}</span>
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

export function Consult({ m }: { m: TaniModel }) {
  const { consult } = m;
  const eyebrow = text(consult, 'eyebrow');
  const title = text(consult, 'title');
  const subtitle = text(consult, 'subtitle');
  const image = text(consult, 'image');
  const hours = text(consult, 'hours');
  const steps = list(consult, 'steps', 4).filter((item) => field(item, 'title') || field(item, 'text'));
  const experts = list(consult, 'experts', 3).filter((item) => field(item, 'name'));
  const label = text(consult, 'button_label');
  const action = resolveAction(text(consult, 'button_url'), m.consultAction);
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  if (!title && steps.length === 0 && !(action && label)) return null;
  const withImage = hasImage(image);

  return (
    <TemplateSection sectionKey="consult" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <div data-tpl-tone="inverse" className={`relative isolate overflow-hidden px-5 py-12 text-white @3xl:px-10 @3xl:py-14 @6xl:px-14 @6xl:py-16 ${CARD.forest}`}>

          <div className={`grid gap-10 ${withImage ? '@5xl:grid-cols-12 @5xl:items-center @5xl:gap-12' : ''}`}>
            <div className={`min-w-0 ${withImage ? '@5xl:col-span-7' : 'max-w-[760px]'}`}>
              {eyebrow && (
                <Reveal>
                  <SectionLabel tone="dark">{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[18ch] text-balance text-white ${TYPE_T.h2}`}>
                  <Highlighted title={title} highlight={text(consult, 'highlight')} tone="dark" />
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-5 max-w-[54ch] text-white/80 ${TYPE_T.lead}`}>
                  {subtitle}
                </Reveal>
              )}

              {steps.length > 0 && (
                <ol className="mt-9 grid gap-5 @3xl:grid-cols-3 @3xl:gap-6">
                  {steps.map((item, i) => (
                    <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 80)} className="min-w-0">
                      <span className="text-[13px] font-semibold tabular-nums text-(--tm-glow)">{String(i + 1).padStart(2, '0')}</span>
                      {field(item, 'title') && <h3 className="mt-1.5 text-[16px] font-semibold leading-snug">{field(item, 'title')}</h3>}
                      {field(item, 'text') && <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">{field(item, 'text')}</p>}
                    </Reveal>
                  ))}
                </ol>
              )}

              {experts.length > 0 && (
                <ul aria-label="Penyuluh kami" className="mt-9 flex flex-wrap gap-3">
                  {experts.map((item, i) => (
                    <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className="flex min-w-0 items-center gap-3 rounded-full bg-white/[0.08] py-2 pl-2 pr-5">
                      <span className="relative shrink-0">
                        <PersonPhoto name={field(item, 'name')} photo={field(item, 'photo')} />
                        <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#4ADE80] ring-2 ring-[#1E3A16]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-semibold">{field(item, 'name')}</span>
                        {field(item, 'role') && <span className="block text-[12.5px] leading-snug text-white/75">{field(item, 'role')}</span>}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              )}

              {((action && label) || hours) && (
                <Reveal delay={240} className="mt-9 flex flex-col items-start gap-4 @xl:flex-row @xl:items-center @xl:gap-6">
                  {action && label && (
                    <ActionLink action={action} className={`${BTN.accent} ${BTN.lg} max-w-full`}>
                      {isWa && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
                      <span className="truncate">{label}</span>
                    </ActionLink>
                  )}
                  {hours && (
                    <p className="inline-flex items-center gap-2 text-[14px] text-white/80">
                      <Clock aria-hidden className="h-4 w-4 shrink-0 text-(--tm-glow)" />
                      {hours}
                    </p>
                  )}
                </Reveal>
              )}
            </div>

            {withImage && (
              <Reveal variant="scale" delay={160} className="min-w-0 @5xl:col-span-5">
                <KitPhoto
                  src={image}
                  alt={TANI_PHOTOS.alt(image, `Konsultasi tanaman bersama penyuluh ${m.companyName}`)}
                  fallback="none"
                  sizes="(min-width: 1024px) 36vw, 100vw"
                  className="mx-auto aspect-[4/5] max-w-[460px] rounded-[28px]"
                >
                  <ChatBubbles m={m} overlay />
                </KitPhoto>
                <ChatBubbles m={m} overlay={false} />
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
