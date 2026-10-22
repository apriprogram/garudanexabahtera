// Perawatan unggulan (section `featured`, brief §2.4): garis rambut penuh + label; kiri judul kapital besar dan chip
// "cocok untuk", tengah foto BULAT besar dengan busur tipis bertitik (dekoratif, titik muncul bertahap), kanan
// deskripsi, tahapan bernomor, dan tautan reservasi + bulatan sage. HP: judul → foto bulat 240px → paragraf → tahapan.
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePhotoSet } from '../kit/context';
import type { AuraModel } from './model';
import { BODY, DISPLAY, HAIR, INK, MUTED } from './styles';
import { ArrowDot, Chip, Label } from './ui';

/** Busur tipis di sekeliling foto bulat + titik penanda (dekoratif). */
function Orbit() {
  const dots = [
    { x: 300, y: 22, d: 0 },
    { x: 556, y: 196, d: 1 },
    { x: 470, y: 520, d: 2 },
  ];
  return (
    <svg viewBox="0 0 600 600" fill="none" aria-hidden className="pointer-events-none absolute -inset-[9%] h-[118%] w-[118%] overflow-visible">
      <path d="M300 22a278 278 0 0 1 256 174" stroke="#000" strokeOpacity={0.14} vectorEffect="non-scaling-stroke" />
      <path d="M572 300a272 272 0 0 1-102 220" stroke="#000" strokeOpacity={0.14} vectorEffect="non-scaling-stroke" />
      <path d="M44 300a256 256 0 0 1 100-202" stroke="#000" strokeOpacity={0.1} vectorEffect="non-scaling-stroke" />
      {dots.map((dot) => (
        <circle key={dot.d} cx={dot.x} cy={dot.y} r={7} className="fill-(--tpl-accent)" stroke="#000" strokeOpacity={0.15} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function Featured({ m }: { m: AuraModel }) {
  const photos = usePhotoSet();
  const { featured } = m;
  const eyebrow = text(featured, 'eyebrow');
  const title = text(featured, 'title');
  const body = paragraphs(text(featured, 'body'));
  const image = text(featured, 'image');
  const tagsTitle = text(featured, 'tags_title');
  const tags = list(featured, 'tags', 5)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const steps = list(featured, 'steps', 4)
    .map((item) => ({ title: field(item, 'title'), text: field(item, 'text') }))
    .filter((s) => s.title || s.text);
  const buttonLabel = text(featured, 'button_label');
  const action = buttonLabel ? resolveAction(text(featured, 'button_url'), m.treatmentAction(title)) : null;
  const withPhoto = hasImage(image);

  return (
    <TemplateSection sectionKey="featured" className={SECTION_Y}>
      <div className={CONTAINER}>
        <Reveal className={`flex items-center justify-between gap-4 border-t ${HAIR} pt-5`}>
          <Label>{eyebrow}</Label>
        </Reveal>

        <div className={`mt-10 grid gap-10 @3xl:mt-14 @4xl:grid-cols-12 @4xl:items-center @4xl:gap-8 ${withPhoto ? '' : '@4xl:items-start'}`}>
          {/* Judul + cocok untuk */}
          <div className={`flex flex-col gap-8 @4xl:self-stretch @4xl:justify-between ${withPhoto ? '@4xl:col-span-4' : '@4xl:col-span-5'}`}>
            {title && (
              <Reveal as="h2" className={`${DISPLAY} max-w-[12ch] text-[36px] leading-[1.0] @3xl:text-[48px] @6xl:text-[56px]`}>
                {title}
              </Reveal>
            )}
            {tags.length > 0 && (
              <Reveal delay={160}>
                {tagsTitle && <p className={`text-[13px] ${MUTED}`}>{tagsTitle}:</p>}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <li key={i}>
                      <Chip className="h-8 px-3.5 text-[13px]">{tag}</Chip>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>

          {/* Foto bulat */}
          {withPhoto && (
            <Reveal variant="scale" className="relative mx-auto w-[240px] @2xl:w-[300px] @4xl:col-span-4 @4xl:w-full @4xl:max-w-[380px]">
              <Orbit />
              <KitPhoto
                src={image}
                alt={photos.alt(image, title || 'Perawatan unggulan')}
                sizes="(min-width: 896px) 380px, 300px"
                zoom
                className="aspect-square w-full rounded-full"
              />
              <span aria-hidden className="absolute -bottom-1 right-[14%] flex h-14 w-14 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.08]">
                <span className="h-3 w-3 rounded-full bg-(--tpl-accent)" />
              </span>
            </Reveal>
          )}

          {/* Deskripsi + tahapan */}
          <div className={withPhoto ? '@4xl:col-span-4' : '@4xl:col-span-6 @4xl:col-start-7'}>
            {body.length > 0 && (
              <Reveal delay={120} className="space-y-4">
                {body.map((p, i) => (
                  <p key={i} className={BODY}>
                    {p}
                  </p>
                ))}
              </Reveal>
            )}
            {steps.length > 0 && (
              <ol className={`mt-8 border-t ${HAIR}`}>
                {steps.map((step, i) => (
                  <Reveal as="li" key={i} delay={200 + stagger(i)} className={`grid grid-cols-[32px_1fr] gap-3 border-b ${HAIR} py-4`}>
                    <span className="pt-0.5 text-[12px] tabular-nums text-[#6B6B6B]">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      {step.title && <span className={`block text-[15px] font-medium ${INK}`}>{step.title}</span>}
                      {step.text && <span className={`mt-1 block text-[14px] leading-relaxed ${MUTED}`}>{step.text}</span>}
                    </span>
                  </Reveal>
                ))}
              </ol>
            )}
            {action && (
              <Reveal delay={320} className="mt-8 flex justify-end">
                <ActionLink action={action} className={`group inline-flex min-h-12 items-center gap-4 text-right text-[13px] leading-snug ${INK}`}>
                  <span className="max-w-[20ch]">{buttonLabel}</span>
                  <ArrowDot size="h-11 w-11" className="group-hover:bg-(--tpl-accent-hover)" />
                </ActionLink>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
