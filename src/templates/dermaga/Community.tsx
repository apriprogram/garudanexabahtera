// Galeri (kunci `gallery`) + Testimoni (kunci `testimonials`).
// Galeri: foto pertama melebar 21:9 selebar wadah (16:9 di HP) dengan parallax ringan — satu-satunya parallax di
// halaman; foto berikutnya 3:2 dalam 4 kolom (2 di tablet, 1 di HP), sudut persegi, membesar pelan saat disorot.
// Keterangan di BAWAH foto: nomor mono "G02" warna tema + teks abu.
// Testimoni: kartu bergaris tipis seperti surat muatan: kepala mono "REF 01 — rute", kutipan Space Grotesk, lalu foto
// persegi 48px (atau inisial) + nama + jabatan.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pad2, type DermagaModel } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { C, CARD, MONO_LABEL, SECTION_PAD, TYPE_D } from './styles';
import { SectionHead } from './ui';

function Caption({ index, caption }: { index: number; caption: string }) {
  return (
    <figcaption className="mt-3 flex items-baseline gap-3">
      <span aria-hidden className="shrink-0 font-mono text-[12px] font-medium tabular-nums tracking-[0.04em] text-(--tpl-accent-ink)">
        G{pad2(index + 1)}
      </span>
      {caption && <span className={`text-[14px] leading-snug ${C.muted}`}>{caption}</span>}
    </figcaption>
  );
}

export function Gallery({ m }: { m: DermagaModel }) {
  const { gallery } = m;
  const [first, ...rest] = m.items('gallery');
  if (!first) return null;
  const firstCaption = field(first, 'caption');
  return (
    <TemplateSection sectionKey="gallery" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(gallery, 'eyebrow')} number={m.number('gallery')} title={text(gallery, 'title')} subtitle={text(gallery, 'subtitle')} />
        <Reveal variant="fade" as="figure" className="mt-10 @3xl:mt-14">
          <KitPhoto
            src={field(first, 'image')}
            alt={DERMAGA_PHOTOS.alt(field(first, 'image'), firstCaption || `Galeri ${m.companyName}`)}
            parallax
            sizes="(min-width: 1536px) 1552px, 100vw"
            className="aspect-[16/9] @3xl:aspect-[21/9]"
            imgClassName="@3xl:object-[50%_80%]"
          />
          <Caption index={0} caption={firstCaption} />
        </Reveal>
        {rest.length > 0 && (
          <ul className="mt-8 grid gap-x-6 gap-y-8 @xl:grid-cols-2 @5xl:mt-10 @5xl:grid-cols-4">
            {rest.map((item, i) => {
              const image = field(item, 'image');
              const caption = field(item, 'caption');
              return (
                <Reveal as="li" key={`${image}-${i}`} delay={stagger(i)} className="min-w-0">
                  <figure className="group">
                    <KitPhoto
                      src={image}
                      alt={DERMAGA_PHOTOS.alt(image, caption || `Galeri ${m.companyName}`)}
                      zoom
                      sizes="(min-width: 1024px) 25vw, (min-width: 576px) 50vw, 100vw"
                      className="aspect-[3/2]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                    <Caption index={i + 1} caption={caption} />
                  </figure>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

function SquareAvatar({ name, photo }: { name: string; photo: string }) {
  if (hasImage(photo)) {
    return <KitPhoto src={photo} alt="" sizes="48px" fallback="none" className="h-12 w-12 shrink-0 rounded-[2px]" />;
  }
  return (
    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[2px] bg-(--tpl-accent-100) font-mono text-[13px] font-medium text-(--tpl-accent-ink)">
      {initials(name, '?')}
    </span>
  );
}

export function Testimonials({ m }: { m: DermagaModel }) {
  const { testimonials } = m;
  const items = m.items('testimonials');
  return (
    <TemplateSection sectionKey="testimonials" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(testimonials, 'eyebrow')} number={m.number('testimonials')} title={text(testimonials, 'title')} />
        {/* Subgrid: kepala REF, kutipan, dan nama sejajar antar-kartu sebaris walau rute di kepala terbungkus 2 baris */}
        <ul className="mt-10 grid gap-x-5 @3xl:mt-14 @4xl:grid-cols-2 @5xl:gap-x-6 @6xl:grid-cols-3">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const role = field(item, 'role');
            const route = field(item, 'route');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="row-span-3 grid min-w-0 grid-rows-subgrid pb-5 @5xl:pb-6">
                <figure className={`row-span-3 grid grid-rows-subgrid p-6 @5xl:p-7 ${CARD}`}>
                  <p className={`border-b pb-4 ${C.line} ${MONO_LABEL} ${C.muted} leading-relaxed`}>
                    <span className="text-(--tpl-accent-ink)">REF {pad2(i + 1)}</span>
                    {route && (
                      <>
                        <span aria-hidden> — </span>
                        <span>{route}</span>
                      </>
                    )}
                  </p>
                  <blockquote className={`mt-6 text-pretty ${TYPE_D.quote} ${C.ink}`}>
                    <p>“{field(item, 'quote')}”</p>
                  </blockquote>
                  {(name || role) && (
                    <figcaption className="mt-8 flex items-center gap-3.5 self-end">
                      <SquareAvatar name={name} photo={field(item, 'photo')} />
                      <span className="min-w-0">
                        {name && <span className={`block text-[15px] font-semibold leading-snug ${C.ink}`}>{name}</span>}
                        {role && <span className={`block text-[13.5px] leading-snug ${C.muted}`}>{role}</span>}
                      </span>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
