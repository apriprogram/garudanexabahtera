// Sambutan kepala sekolah (kunci `welcome`): foto membulat di kiri (persegi di HP, 4:5 di layar lebar), lalu label,
// H2, kutipan besar dengan lingkaran tanda kutip warna sorotan, isi sambutan, dan tanda tangan (nama + jabatan).
import { Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { hasImage, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { C, DISPLAY, SECTION_PAD, TYPE_M } from './styles';
import { Eyebrow } from './ui';

export function Welcome({ m }: { m: MadaniModel }) {
  const { welcome } = m;
  const eyebrow = text(welcome, 'eyebrow');
  const title = text(welcome, 'title');
  const quote = text(welcome, 'quote');
  const body = paragraphs(text(welcome, 'body'));
  const name = text(welcome, 'name');
  const role = text(welcome, 'role');
  const image = text(welcome, 'image');
  if (!title && !quote && body.length === 0) return null;
  const photo = hasImage(image);

  return (
    <TemplateSection sectionKey="welcome" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-14`}>
        {photo && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
            <KitPhoto
              src={image}
              alt={MADANI_PHOTOS.alt(image, name ? `Foto ${name}` : `Kepala ${m.companyName}`)}
              sizes="(min-width: 1024px) 40vw, 100vw"
              position="50% 30%"
              zoom
              className="aspect-square rounded-[28px] @2xl:aspect-[4/5] @5xl:max-w-[520px]"
            />
          </Reveal>
        )}
        <div className={`min-w-0 ${photo ? '@5xl:col-span-7' : '@5xl:col-span-10 @5xl:col-start-2'}`}>
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[24ch] text-balance text-(--md-deep) ${TYPE_M.h2}`}>
              {title}
            </Reveal>
          )}
          {quote && (
            <Reveal as="blockquote" delay={120} className="mt-8 flex gap-4 border-l-0 @3xl:gap-5">
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--md-hl) text-(--md-on-hl)">
                <Quote className="h-5 w-5 fill-current" />
              </span>
              <p className={`${DISPLAY} text-[19px] font-medium leading-snug tracking-[-0.01em] text-(--md-deep) @3xl:text-[22px]`}>{quote}</p>
            </Reveal>
          )}
          {body.length > 0 && (
            <Reveal delay={160} className={`mt-7 space-y-4 ${TYPE_M.body} ${C.body}`}>
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          {(name || role) && (
            <Reveal delay={200} className="mt-8 flex items-center gap-4 border-t border-black/[0.08] pt-6">
              <span aria-hidden className="h-10 w-1 shrink-0 rounded-full bg-(--md-primary)" />
              <span className="min-w-0">
                {name && <span className="block text-[16px] font-semibold text-(--md-deep)">{name}</span>}
                {role && <span className={`mt-0.5 block text-[14px] ${C.muted}`}>{role}</span>}
              </span>
            </Reveal>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
