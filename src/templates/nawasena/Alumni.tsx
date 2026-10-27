// Cerita alumni (kunci `testimonials`, anchor #testimoni), pita abu kertas. Layar lebar: kiri 5 kolom label, H2,
// deskripsi, tautan tracer study (opsional); kanan 7 kolom kutipan pertama besar (serif miring) + baris nama dengan
// inisial bulat navy (atau foto). Di bawahnya kutipan lain dalam kartu putih radius 8 (3 kolom). Tanpa foto → inisial
// (demo sengaja tanpa wajah: nama fiktif tidak ditempel pada foto stok).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import type { ListItem } from '../types';
import { KitAvatar } from '../kit/Photo';
import type { NawasenaModel } from './model';
import { C, CARD, DISPLAY, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

function Person({ item, size = 'md' }: { item: ListItem; size?: 'md' | 'lg' }) {
  const name = field(item, 'name');
  const role = field(item, 'role');
  const photo = field(item, 'photo');
  const disc = size === 'lg' ? 'h-12 w-12 text-[18px]' : 'h-10 w-10 text-[16px]';
  return (
    <span className="flex items-center gap-3.5">
      {hasImage(photo) ? (
        <KitAvatar name={name} photo={photo} className={disc} sizes={size === 'lg' ? '48px' : '40px'} />
      ) : (
        <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-(--nw-navy) leading-none text-white ${DISPLAY} font-normal ${disc}`}>
          {initials(name, '?')}
        </span>
      )}
      <span className="min-w-0">
        {name && <span className={`block text-[15px] font-semibold leading-snug ${C.navy}`}>{name}</span>}
        {/* Kartu sebaris: keterangan selalu 2 baris (garis pemisah kartu tetap sejajar walau panjangnya berbeda) */}
        {role && <span className={`mt-0.5 block text-[13.5px] leading-snug ${C.muted} ${size === 'md' ? 'min-h-[2lh]' : ''}`}>{role}</span>}
      </span>
    </span>
  );
}

export function Alumni({ m }: { m: NawasenaModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  if (items.length === 0) return null;
  const [featured, ...rest] = items;
  const link = m.linkOr(text(testimonials, 'link_url'), null);
  const linkLabel = text(testimonials, 'link_label');
  return (
    <TemplateSection sectionKey="testimonials" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="grid gap-10 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12">
          <div className="min-w-0 @5xl:col-span-5">
            <SectionHead
              layout="stack"
              eyebrow={text(testimonials, 'eyebrow')}
              number={m.number('testimonials')}
              title={text(testimonials, 'title') || 'Cerita alumni'}
              subtitle={text(testimonials, 'subtitle')}
              aside={link && linkLabel ? <TextLink action={link} label={linkLabel} /> : undefined}
            />
          </div>
          <Reveal as="figure" delay={120} className="min-w-0 @5xl:col-span-7 @5xl:pt-10">
            <span aria-hidden className={`block h-10 text-[80px] leading-none text-(--nw-ink) ${DISPLAY} font-normal`}>
              “
            </span>
            <blockquote className={`mt-2 max-w-[34ch] text-balance text-[22px] italic leading-[1.35] @3xl:text-[30px] ${C.navy} ${DISPLAY} font-normal`}>
              {field(featured, 'quote')}
            </blockquote>
            <figcaption className="mt-6">
              <Person item={featured} size="lg" />
            </figcaption>
          </Reveal>
        </div>
        {rest.length > 0 && (
          <ul className="mt-12 grid gap-3 @3xl:mt-16 @3xl:grid-cols-2 @3xl:gap-4 @6xl:grid-cols-3">
            {rest.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i, 80)} className="min-w-0">
                <figure className={`flex h-full flex-col p-6 @3xl:p-7 ${CARD.white}`}>
                  <blockquote className={`flex-1 text-[15.5px] leading-relaxed ${C.body}`}>“{field(item, 'quote')}”</blockquote>
                  <figcaption className="mt-6 border-t border-black/[0.08] pt-5">
                    <Person item={item} />
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
