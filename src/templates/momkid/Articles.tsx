// Artikel parenting (kunci `articles`): kepala section rata kiri + tautan "Lihat semua artikel" di kanan. Kartu radius
// 28 bergiliran peach lembut / mint: foto 3:2 (opsional) di dalam bingkai, chip kategori putih, waktu baca berikon jam,
// judul (tautan yang meregang menutupi seluruh kartu; tautan keluar dari CMS, mis. blog atau Instagram), ringkasan, dan
// teks "Baca artikel →". Tanpa tautan → kartu biasa. Tanpa foto → kartu teks saja.
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Doodle } from './art';
import type { MomkidModel } from './model';
import { MOMKID_PHOTOS } from './photos';
import { C, CARD, DISPLAY, GRID_GAP, PASTELS, SECTION_PAD, TONE_BG, TYPE } from './styles';
import { SectionHead, TextLink } from './ui';

const COLS: Record<number, string> = { 1: '@4xl:max-w-[560px]', 2: '@4xl:grid-cols-2', 3: '@4xl:grid-cols-2 @6xl:grid-cols-3' };

export function Articles({ m }: { m: MomkidModel }) {
  const { articles } = m;
  const items = m.items('articles');
  if (items.length === 0) return null;
  const allLink = m.linkOr(text(articles, 'link_url'), null);

  return (
    <TemplateSection sectionKey="articles" className={`${TONE_BG[m.tone('articles')]} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-6 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
          <SectionHead
            align="left"
            eyebrow={text(articles, 'eyebrow')}
            doodle="book"
            title={text(articles, 'title')}
            subtitle={text(articles, 'subtitle')}
            srTitle="Artikel parenting"
            className="min-w-0 @5xl:col-span-8"
          />
          <div className="min-w-0 @5xl:col-span-4 @5xl:justify-self-end">
            <TextLink action={allLink} label={text(articles, 'link_label')} />
          </div>
        </div>
        <ul className={`mt-8 grid gap-5 @3xl:mt-12 ${COLS[Math.min(items.length, 3)]} @6xl:gap-6`}>
          {items.map((item, i) => {
            const image = field(item, 'image');
            const title = field(item, 'title');
            const action = m.linkOr(field(item, 'url'), null);
            const photo = hasImage(image);
            return (
              <Reveal as="li" variant="scale" key={`${title}-${i}`} delay={stagger(i)} className="min-w-0">
                {/* HP: baris ringkas (foto persegi 104px di kiri); ≥ @4xl: kartu tegak dengan foto 3:2 di atas */}
                <article
                  className={`group relative h-full p-2.5 ${photo ? 'grid grid-cols-[104px_minmax(0,1fr)] items-start gap-x-1' : 'flex flex-col'} @4xl:flex @4xl:flex-col @4xl:items-stretch ${CARD} ${PASTELS[i % 2]}`}
                >
                  {photo && (
                    <KitPhoto
                      src={image}
                      alt={MOMKID_PHOTOS.alt(image, title)}
                      fallback="none"
                      zoom
                      sizes="(min-width: 1152px) 31vw, (min-width: 896px) 46vw, 104px"
                      className="aspect-square rounded-[20px] @4xl:aspect-[3/2] @4xl:rounded-[22px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="flex flex-1 flex-col px-3 pb-2 pt-1.5 @4xl:px-4 @4xl:pb-4 @4xl:pt-5">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {field(item, 'category') && (
                        <span className={`inline-flex h-7 items-center rounded-full bg-white px-3 ${TYPE.label} text-[12.5px] ${C.mintInk}`}>{field(item, 'category')}</span>
                      )}
                      {field(item, 'minutes') && (
                        <span className={`inline-flex items-center gap-1 text-[13px] ${C.muted}`}>
                          <Doodle name="clock" blob="" className="h-5 w-5" />
                          {field(item, 'minutes')}
                        </span>
                      )}
                    </p>
                    <h3 className={`mt-2.5 ${DISPLAY} text-[17px] font-extrabold leading-snug tracking-[-0.01em] @4xl:mt-3.5 @4xl:text-[21px] ${C.ink}`}>
                      {action ? (
                        <ActionLink action={action} className="rounded-[2px] after:absolute after:inset-0 after:rounded-[28px] after:content-['']">
                          {title}
                        </ActionLink>
                      ) : (
                        title
                      )}
                    </h3>
                    {field(item, 'excerpt') && <p className={`mt-1.5 line-clamp-2 text-[14px] leading-snug @4xl:mt-2 @4xl:line-clamp-none @4xl:text-[14.5px] @4xl:leading-relaxed ${C.muted}`}>{field(item, 'excerpt')}</p>}
                    {action && (
                      <p aria-hidden className={`mt-auto hidden items-center gap-1.5 pt-5 @4xl:inline-flex ${DISPLAY} text-[14.5px] font-extrabold ${C.accent}`}>
                        Baca artikel
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </p>
                    )}
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
