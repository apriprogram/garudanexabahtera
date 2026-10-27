// Testimoni orang tua & alumni (kunci `testimonials`) + galeri (kunci `gallery`).
// Testimoni: kiri 4 kolom label + H2 + deskripsi + tautan (mis. tracer study; kosong → disembunyikan), kanan 2×2 kartu
// kutipan putih: ikon kutip, kutipan, lalu inisial (atau foto) + nama + keterangan.
// Galeri: bento 4 kolom (foto 1 = 2×2, foto 2 = 2×1, lainnya 1×1) tanpa sel kosong untuk 1–8 foto; foto radius 20 yang
// sekali zoom-out saat muncul dan membesar pelan saat disorot; keterangan berupa pil putih di kiri bawah (teks gelap di
// atas putih, tanpa lapisan gelap).
import { Quote } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import { galleryCells, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, SECTION_PAD, ZOOM, cardOn } from './styles';
import { Head, Initials, PillLink, TextLink } from './ui';

export function Testimonials({ m }: { m: PradiptaModel }) {
  const { testimonials } = m;
  const tone = m.tone('testimonials');
  const items = m.items('testimonials');
  const link = m.linkOr(text(testimonials, 'link_url'), null);
  return (
    <TemplateSection sectionKey="testimonials" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
        <div className="min-w-0 @5xl:col-span-4">
          <Head
            sectionKey="testimonials"
            layout="stack"
            eyebrow={text(testimonials, 'eyebrow')}
            title={text(testimonials, 'title')}
            fallback="Testimoni"
            subtitle={text(testimonials, 'subtitle')}
            tone={tone}
            aside={text(testimonials, 'link_url') ? <TextLink action={link} label={text(testimonials, 'link_label')} /> : undefined}
          />
        </div>
        <ul className="grid min-w-0 gap-3 @3xl:grid-cols-2 @3xl:gap-4 @5xl:col-span-8">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const photo = field(item, 'photo');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className={`flex flex-col p-6 @3xl:p-7 ${cardOn(tone)}`}>
                <Quote aria-hidden className="h-5 w-5 text-(--pd-ink)" strokeWidth={2} />
                <blockquote className={`mt-4 flex-1 text-pretty text-[16px] leading-relaxed ${C.ink}`}>{field(item, 'quote')}</blockquote>
                {(name || field(item, 'role')) && (
                  <div className="mt-6 flex items-center gap-3">
                    {hasImage(photo) ? <KitAvatar name={name} photo={photo} className="h-11 w-11" sizes="48px" /> : <Initials name={name} />}
                    <div className="min-w-0">
                      {name && <p className={`text-[15px] font-semibold leading-snug ${C.ink}`}>{name}</p>}
                      {field(item, 'role') && <p className={`text-pretty text-[13.5px] leading-snug ${C.muted}`}>{field(item, 'role')}</p>}
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Gallery({ m }: { m: PradiptaModel }) {
  const { gallery } = m;
  const tone = m.tone('gallery');
  const items = m.items('gallery');
  const cells = galleryCells(items.length);
  const buttonAction = text(gallery, 'button_url') ? m.linkOr(text(gallery, 'button_url'), null) : null;
  const button = buttonAction ? (
    <PillLink
      action={buttonAction}
      label={text(gallery, 'button_label')}
      variant={tone === 'sky' ? 'light' : 'soft'}
      external={buttonAction.kind === 'external'}
      className="w-full @xl:w-auto"
    />
  ) : null;
  return (
    <TemplateSection sectionKey="gallery" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head sectionKey="gallery" eyebrow={text(gallery, 'eyebrow')} title={text(gallery, 'title')} fallback="Galeri" tone={tone} aside={button} />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:auto-rows-[240px] @3xl:grid-cols-4 @3xl:gap-4">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const caption = field(item, 'caption');
            const [cell, sizes] = cells[i];
            return (
              <Reveal as="li" key={`${image}-${i}`} delay={stagger(i, 60)} className={`group relative min-w-0 overflow-hidden rounded-[20px] ${cell}`}>
                <KitPhoto
                  src={image}
                  alt={PRADIPTA_PHOTOS.alt(image, caption || `Kegiatan ${m.companyName}`)}
                  fallback="none"
                  zoom
                  sizes={sizes}
                  className={`absolute inset-0 ${ZOOM}`}
                />
                {caption && (
                  <p className={`absolute bottom-3 left-3 right-3 flex @3xl:bottom-4 @3xl:left-4 @3xl:right-auto`}>
                    <span className={`inline-flex min-h-8 max-w-full items-center rounded-full bg-white px-3 py-1 text-[13px] font-medium leading-snug ${C.ink}`}>{caption}</span>
                  </p>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
