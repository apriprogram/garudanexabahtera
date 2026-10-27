// Guru & tenaga kependidikan (kunci `teachers`) + cerita alumni (kunci `testimonials`, anchor #testimoni).
// Guru: kartu putih bergaris rambut berisi foto bulat atau INISIAL (Onest, tinta tema di bidang tint; tanpa wajah yang
// ditempelkan ke nama fiktif), nama, dan jabatan; tombol opsional di kanan judul. Alumni: kartu putih dengan tanda kutip
// besar warna tema, kutipan, lalu foto/inisial + nama + keterangan; tautan teks di bawah (mis. "Alumni? Isi Tracer Study").
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { JumantaraModel } from './model';
import { BTN, C, CARD, DISPLAY, LINE, SECTION_PAD } from './styles';
import { Person, PersonName, SectionHead, SectionRule, TextLink } from './ui';

export function Teachers({ m }: { m: JumantaraModel }) {
  const { teachers } = m;
  const items = m.items('teachers');
  if (items.length === 0) return null;
  const buttonLabel = text(teachers, 'button_label');
  const action = buttonLabel ? m.linkOr(text(teachers, 'button_url'), null) : null;
  const button =
    action && buttonLabel ? (
      <ActionLink action={action} className={`group ${BTN.outline} ${BTN.md}`}>
        <span className="truncate">{buttonLabel}</span>
        {action.kind === 'external' && <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />}
      </ActionLink>
    ) : undefined;

  return (
    <TemplateSection sectionKey="teachers" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('teachers')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(teachers, 'eyebrow')} title={text(teachers, 'title')} fallback="Guru dan tenaga kependidikan" subtitle={text(teachers, 'subtitle')} aside={button} />
        <ul className="mt-10 grid grid-cols-1 gap-3 @min-[360px]:grid-cols-2 @3xl:mt-12 @3xl:grid-cols-3 @3xl:gap-4 @6xl:grid-cols-4">
          {items.map((item, i) => {
            const name = field(item, 'name');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 50)} className="min-w-0">
                <article className={`flex h-full flex-col gap-4 p-4 @3xl:flex-row @3xl:items-center @3xl:p-5 ${CARD.white}`}>
                  <Person name={name} photo={field(item, 'photo')} className="h-12 w-12 text-[16px] @3xl:h-14 @3xl:w-14 @3xl:text-[18px]" />
                  <div className="min-w-0">
                    <h3 className={`${DISPLAY} text-[15.5px] font-semibold leading-snug tracking-[-0.01em] ${C.ink} @3xl:text-[16px]`}>
                      <PersonName name={name} />
                    </h3>
                    {field(item, 'role') && <p className={`mt-1 text-[13px] leading-snug ${C.muted} @3xl:text-[13.5px]`}>{field(item, 'role')}</p>}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Testimonials({ m }: { m: JumantaraModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  if (items.length === 0) return null;
  const action = m.linkOr(text(testimonials, 'link_url'), m.sectionAction('services'));

  return (
    <TemplateSection sectionKey="testimonials" className={`relative ${SECTION_PAD}`}>
      <SectionRule show={m.ruleAbove('testimonials')} />
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} title={text(testimonials, 'title')} fallback="Cerita alumni" subtitle={text(testimonials, 'subtitle')} />
        <ul className="mt-10 grid gap-4 @3xl:mt-12 @3xl:grid-cols-2 @5xl:gap-5">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className="min-w-0">
                <figure className={`flex h-full flex-col p-6 @3xl:p-7 ${CARD.white}`}>
                  <span aria-hidden className={`${DISPLAY} h-7 text-[48px] font-bold leading-none text-(--tpl-accent)`}>
                    “
                  </span>
                  <blockquote className={`mt-4 text-pretty text-[16px] leading-relaxed ${C.ink} @3xl:text-[16.5px]`}>
                    <p>{field(item, 'quote')}</p>
                  </blockquote>
                  {/* Pengisi: nama menempel di dasar kartu, minimal 24px di bawah kutipan */}
                  <div aria-hidden className="min-h-6 flex-1" />
                  {(name || role) && (
                    <figcaption className={`flex items-center gap-3.5 border-t pt-5 ${LINE}`}>
                      <Person name={name} photo={field(item, 'photo')} className="h-11 w-11 text-[15px]" sizes="44px" />
                      <span className="min-w-0">
                        {name && <span className={`block ${DISPLAY} text-[15.5px] font-semibold leading-snug ${C.ink}`}>{name}</span>}
                        {role && <span className={`mt-0.5 block text-[13.5px] leading-snug ${C.muted}`}>{role}</span>}
                      </span>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
        <TextLink action={action} label={text(testimonials, 'link_label')} className="mt-6" />
      </div>
    </TemplateSection>
  );
}
