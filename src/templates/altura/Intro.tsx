// Pembuka Altura setelah hero: `about` (pil label "Who we are" di kiri, judul besar dua baris di kanan, paragraf, tombol),
// `pillars` (tiga kartu tinggi bernomor 01/02/03 radius 28: zaitun gelap, warna tema dengan foto gedung yang memudar di
// bawah, dan kartu foto; tiap kartu punya bulatan panah limau di lekuk sudut kanan-bawah dan seluruh kartu bisa diklik),
// dan `amenities` (deret pil bergaris berisi teks + pil foto kecil yang berjalan pelan).
import { Marquee, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { AlturaModel } from './model';
import { ALTURA_PHOTOS } from './photos';
import { C, DISPLAY, TYPE_A } from './styles';
import { ArrowDot, PillCta, SectionHead } from './ui';

export function About({ m }: { m: AlturaModel }) {
  const { about } = m;
  const action = m.linkOr(text(about, 'button_url'), m.sectionAction('leadership') ?? m.contactAction);
  return (
    <TemplateSection sectionKey="about" className="pb-12 pt-20 @3xl:pb-14 @3xl:pt-28 @5xl:pb-16 @5xl:pt-36">
      <div className={CONTAINER}>
        <SectionHead
          layout="split"
          eyebrow={text(about, 'eyebrow')}
          title={text(about, 'title')}
          subtitle={text(about, 'body')}
          titleClassName="!max-w-[24ch]"
          aside={<PillCta action={action} label={text(about, 'button_label')} variant="white" size="md" />}
        />
      </div>
    </TemplateSection>
  );
}

/** Gaya kartu pilar per urutan: kartu ke-2 berwarna tema; kartu lain berfoto bila ada foto, kalau tidak gelap. */
type PillarKind = 'deep' | 'accent' | 'photo';

export function Pillars({ m }: { m: AlturaModel }) {
  const items = m.items('pillars');
  const title = text(m.pillars, 'title');
  const padTop = !m.shown('about');
  return (
    <TemplateSection sectionKey="pillars" className={`pb-14 @3xl:pb-20 ${padTop ? 'pt-20 @3xl:pt-28' : ''}`}>
      <div className={CONTAINER}>
        {title && <h2 className="sr-only">{title}</h2>}
        <ul className="grid gap-3 @3xl:grid-cols-3 @5xl:gap-5">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const kind: PillarKind = i === 1 ? 'accent' : hasImage(image) ? 'photo' : 'deep';
            const label = field(item, 'link_label');
            const action = m.linkOr(field(item, 'url'), null);
            const dark = kind !== 'accent';
            const number = String(i + 1).padStart(2, '0');
            return (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 100)} className="min-w-0">
                <article
                  data-tpl-tone={dark || m.accentTone ? 'inverse' : undefined}
                  className={`group relative isolate flex h-full min-h-[380px] flex-col overflow-hidden rounded-[28px] p-6 [--al-notch-bg:#fff] @3xl:min-h-[440px] @5xl:min-h-[480px] @5xl:p-8 ${
                    kind === 'accent' ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--al-deep) text-white'
                  }`}
                >
                  {kind === 'photo' && (
                    <>
                      <KitPhoto
                        src={image}
                        alt=""
                        fallback="none"
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="absolute inset-0 -z-20"
                        imgClassName="transition-[scale] duration-1000 group-hover:scale-[1.04]"
                      />
                      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-(--al-deep) via-(--al-deep)/70 to-(--al-deep)/20" />
                    </>
                  )}
                  <div className="flex items-center gap-4">
                    <span aria-hidden className={`${DISPLAY} text-[15px] font-semibold tabular-nums`}>
                      {number}.
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-current opacity-30" />
                  </div>
                  <div className={`max-w-[34ch] ${kind === 'accent' ? 'mt-8' : 'mt-auto pr-12 pt-24'}`}>
                    <h3 className={TYPE_A.h3lg}>{field(item, 'title')}</h3>
                    {field(item, 'text') && (
                      <p className={`mt-3 ${TYPE_A.body} ${kind === 'accent' ? 'opacity-85' : 'text-white/75'}`}>{field(item, 'text')}</p>
                    )}
                    {label && action && (
                      <ActionLink
                        action={action}
                        className="mt-5 inline-flex min-h-10 items-center text-[14.5px] font-semibold underline decoration-current/40 underline-offset-[6px] after:absolute after:inset-0 after:rounded-[28px] after:content-[''] hover:decoration-current"
                      >
                        {label}
                      </ActionLink>
                    )}
                  </div>
                  {kind === 'accent' && hasImage(image) && (
                    // Foto gedung di bagian bawah kartu warna tema, memudar ke atas (tampak "keluar" dari kartu)
                    <div className="relative -mb-6 mr-[64px] mt-6 min-h-[170px] flex-1 @5xl:-mb-8 @5xl:mr-[68px]">
                      <KitPhoto
                        src={image}
                        alt={ALTURA_PHOTOS.alt(image, field(item, 'title'))}
                        fallback="none"
                        sizes="(min-width: 768px) 30vw, 90vw"
                        position="50% 30%"
                        className="al-fade-top absolute inset-0 rounded-t-[18px]"
                        imgClassName={m.accentTone ? '' : 'grayscale contrast-125'}
                      >
                        {/* Warna tema terang: foto hitam-putih diwarnai warna tema (duotone) agar menyatu dengan kartu */}
                        {!m.accentTone && <span aria-hidden className="absolute inset-0 bg-(--tpl-accent) mix-blend-multiply" />}
                      </KitPhoto>
                    </div>
                  )}
                  <span aria-hidden className="al-notch pointer-events-none">
                    <ArrowDot size="lg" tone={kind === 'accent' ? 'ink' : 'accent'} />
                  </span>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Amenities({ m }: { m: AlturaModel }) {
  const items = m.items('amenities');
  const title = text(m.amenities, 'title') || 'Highlights';
  return (
    <TemplateSection sectionKey="amenities" className={`pb-16 @3xl:pb-24 ${m.shown('pillars') || m.shown('about') ? '' : 'pt-16 @3xl:pt-24'}`}>
      <h2 className="sr-only">{title}</h2>
      <Marquee
        label={title}
        duration={48}
        gap={14}
        staticClassName={`${CONTAINER} flex flex-wrap items-center justify-center gap-3`}
      >
        {items.flatMap((item, i) => {
          const image = field(item, 'image');
          const pill = (
            <span
              key={`t-${i}`}
              className={`${DISPLAY} flex h-16 max-w-[330px] items-center rounded-full px-7 text-[19px] font-medium tracking-[-0.02em] ring-1 ring-inset ring-[#141612]/[0.14] @5xl:h-[76px] @5xl:max-w-none @5xl:px-9 @5xl:text-[24px] ${C.ink}`}
            >
              <span className="truncate">{field(item, 'text')}</span>
            </span>
          );
          return hasImage(image)
            ? [<KitPhoto key={`p-${i}`} src={image} alt="" fallback="none" sizes="200px" className="h-16 w-[124px] rounded-full @5xl:h-[76px] @5xl:w-[148px]" />, pill]
            : [pill];
        })}
      </Marquee>
    </TemplateSection>
  );
}
