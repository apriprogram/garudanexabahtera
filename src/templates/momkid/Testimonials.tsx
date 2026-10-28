// Testimoni (kunci `testimonials`): kepala section di tengah, kartu cerita radius 28 bergiliran mint / peach lembut:
// doodle hati di gumpalan putih sebagai tanda kutip, kutipan, lalu foto bulat (atau inisial) + nama + "kota · layanan".
// HP: rel geser; layar lebar: kisi 2-3 kolom.
// Foto testimoni hanya dengan izin orang tersebut; nama di demo fiktif dan tidak berhubungan dengan orang di foto.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitAvatar } from '../kit/Photo';
import { Doodle } from './art';
import type { MomkidModel } from './model';
import { C, CARD, DISPLAY, PASTELS, SECTION_PAD, TONE_BG, TYPE } from './styles';
import { SectionHead } from './ui';

const COLS: Record<number, string> = { 1: '@4xl:mx-auto @4xl:max-w-[560px]', 2: '@4xl:grid-cols-2', 3: '@4xl:grid-cols-2 @6xl:grid-cols-3' };

export function Testimonials({ m }: { m: MomkidModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  return (
    <TemplateSection sectionKey="testimonials" className={`${TONE_BG[m.tone('testimonials')]} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} doodle="heart" title={text(testimonials, 'title')} srTitle="Testimoni" />
        {/* HP & tablet tegak: rel geser (kartu ± 86%, scroll-snap, bisa difokus); ≥ @4xl: kisi. Reveal di seluruh daftar
            (bukan per kartu di dalam rel). */}
        <Reveal variant="scale" className="mt-8 @3xl:mt-12">
          <ul
            tabIndex={items.length > 1 ? 0 : undefined}
            aria-label="Cerita orang tua"
            className={`mk-rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @4xl:mx-0 @4xl:grid @4xl:gap-5 @4xl:overflow-visible @4xl:px-0 @4xl:pb-0 ${COLS[Math.min(items.length, 3)]} @6xl:gap-6`}
          >
          {items.map((item, i) => {
            const name = field(item, 'name');
            const detail = field(item, 'detail');
            return (
              <li key={`${name}-${i}`} className={`min-w-0 shrink-0 snap-start ${items.length > 1 ? 'w-[86%] @xl:w-[60%]' : 'w-full'} @4xl:w-auto @4xl:last:odd:col-span-2 @6xl:last:odd:col-span-1`}>
                <figure className={`flex h-full flex-col p-6 @3xl:p-8 ${CARD} ${PASTELS[(i + 1) % 2]}`}>
                  <Doodle name="heart" blob="fill-white" className={`h-12 w-12 ${C.accent}`} />
                  <blockquote className={`mt-5 text-pretty ${TYPE.quote} ${C.ink}`}>
                    <p>“{field(item, 'quote')}”</p>
                  </blockquote>
                  {(name || detail) && (
                    <figcaption className="mt-auto flex items-center gap-3.5 pt-7">
                      <KitAvatar name={name} photo={field(item, 'photo')} className="h-14 w-14" sizes="56px" />
                      <span className="min-w-0">
                        {name && <span className={`block ${DISPLAY} text-[16px] font-extrabold leading-snug ${C.ink}`}>{name}</span>}
                        {detail && <span className={`block text-[13.5px] leading-snug ${C.muted}`}>{detail}</span>}
                      </span>
                    </figcaption>
                  )}
                </figure>
              </li>
            );
          })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
