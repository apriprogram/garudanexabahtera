// Fasilitas (kunci `facilities`; tautan CMS "#fasilitas" menuju ke sini): kepala section, lalu kartu sarana sekolah
// (laboratorium, perpustakaan, lapangan, tempat ibadah, sanggar) dalam grid 1 → 2 → 3 kolom. Kartu = putih di pita
// langit / putih bercincin 1px di pita putih (tanpa bayangan): foto 4:3 bila diisi, kalau tidak bulatan ikon langit (ikon
// dari nama), nama, dan keterangan singkat. Kartu muncul berurutan lewat <Reveal> (diam di pratinjau CMS &
// prefers-reduced-motion).
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, DISPLAY, SECTION_PAD, ZOOM, cardOn } from './styles';
import { Head, TitleIcon } from './ui';

export function Facilities({ m }: { m: PradiptaModel }) {
  const { facilities } = m;
  const tone = m.tone('facilities');
  const items = m.items('facilities');
  return (
    <TemplateSection sectionKey="facilities" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="facilities"
          eyebrow={text(facilities, 'eyebrow')}
          title={text(facilities, 'title')}
          fallback="Fasilitas"
          subtitle={text(facilities, 'subtitle')}
          tone={tone}
        />
        <ul className="mt-10 grid gap-3 @xl:grid-cols-2 @3xl:mt-12 @3xl:gap-4 @5xl:grid-cols-3">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const withImage = hasImage(image);
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 60)} className={`group flex min-w-0 flex-col p-5 ${cardOn(tone)}`}>
                {withImage && (
                  <div className="-mx-2 -mt-2 mb-4 overflow-hidden rounded-[14px]">
                    <KitPhoto
                      src={image}
                      alt={PRADIPTA_PHOTOS.alt(image, `${name} di ${m.companyName}`)}
                      fallback="none"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className={`aspect-[4/3] ${ZOOM}`}
                    />
                  </div>
                )}
                {/* Tanpa foto: bulatan ikon di kiri, nama & keterangan di kanan (lebih ringkas dari kartu ekskul di atasnya) */}
                <div className="flex min-w-0 items-start gap-4">
                  {!withImage && (
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--pd-sky2) text-(--pd-ink)">
                      <TitleIcon title={name} index={i} />
                    </span>
                  )}
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <h3 className={`text-balance ${DISPLAY} text-[17px] font-semibold leading-snug tracking-[-0.01em] ${C.ink}`}>{name}</h3>
                    {field(item, 'text') && <p className={`mt-1 text-pretty text-[14.5px] leading-relaxed ${C.body}`}>{field(item, 'text')}</p>}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
