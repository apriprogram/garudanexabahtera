// Program unggulan (kunci `programs`): kartu krem membulat — chip label + lingkaran panah (tanya program lewat WhatsApp)
// di atas, judul, deskripsi, keterangan singkat, lalu foto membulat di bawah. Kartu pertama memakai warna sorotan.
// HP: rel geser mendatar (scroll-snap, kartu 84% lebar sehingga kartu berikutnya mengintip); tablet: 2 kolom; layar
// lebar: 3 kolom.
import { ArrowUpRight, Check } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { C, SECTION_PAD, TYPE_M } from './styles';
import { Chip, SectionHead } from './ui';

export function Programs({ m }: { m: MadaniModel }) {
  const { programs } = m;
  const items = list(programs, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="programs" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(programs, 'eyebrow')} title={text(programs, 'title')} subtitle={text(programs, 'subtitle')} />
        <Reveal
          as="ul"
          delay={80}
          aria-label="Daftar program"
          className="-mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] @2xl:mx-0 @2xl:grid @2xl:snap-none @2xl:grid-cols-2 @2xl:gap-4 @2xl:overflow-visible @2xl:px-0 @3xl:mt-12 @5xl:grid-cols-3 @5xl:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => {
            const name = field(item, 'title');
            const hl = i === 0 && items.length > 1;
            const action = resolveAction(field(item, 'url'), m.askAbout(`program ${name}`));
            const image = field(item, 'image');
            return (
              <li
                key={`${name}-${i}`}
                className={`flex w-[84%] min-w-0 shrink-0 snap-start flex-col rounded-[24px] p-5 @2xl:w-auto @3xl:p-6 ${hl ? 'bg-(--md-hl)' : 'bg-[#F6F4EC]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {field(item, 'label') ? <Chip tone={hl ? 'glass' : 'line'}>{field(item, 'label')}</Chip> : <span />}
                  {action && (
                    <ActionLink
                      action={action}
                      aria-label={`Tanya tentang ${name}`}
                      className={`group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                        hl ? 'bg-(--md-deep) text-(--md-hl-ink) hover:bg-(--md-deep)/85' : 'bg-white text-(--md-deep) ring-1 ring-inset ring-black/[0.08] hover:bg-(--md-deep) hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-45" aria-hidden />
                    </ActionLink>
                  )}
                </div>
                <h3 className={`mt-5 ${hl ? 'text-(--md-on-hl)' : 'text-(--md-deep)'} ${TYPE_M.h3}`}>{name}</h3>
                {field(item, 'description') && (
                  <p className={`mt-2 text-[14.5px] leading-relaxed ${hl ? 'text-(--md-on-hl)/85' : C.muted}`}>{field(item, 'description')}</p>
                )}
                {field(item, 'meta') && (
                  <p className={`mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold ${hl ? 'text-(--md-on-hl)' : 'text-(--md-ink)'}`}>
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                    {field(item, 'meta')}
                  </p>
                )}
                {hasImage(image) && (
                  <div className="mt-auto pt-6">
                    <KitPhoto
                      src={image}
                      alt={MADANI_PHOTOS.alt(image, `Kegiatan program ${name}`)}
                      sizes="(min-width: 1024px) 30vw, (min-width: 672px) 45vw, 100vw"
                      zoom
                      className="aspect-[4/3] rounded-[18px]"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
