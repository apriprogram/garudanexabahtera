// Komunitas & Galeri Sparring Padel.
// - `community` (PITA biru-malam): kepala section + tombol "Gabung grup komunitas" (WhatsApp); foto lapangan malam dari
//   udara (4:3) dan empat angka Saira miring neon yang menghitung naik (CountUp) dalam kisi 2×2 bergaris tipis; lalu
//   strip kegiatan yang berjalan pelan (Marquee — satu-satunya gerak tanpa henti, berhenti saat disorot; gerak mati →
//   daftar chip statis).
// - `gallery` (putih): susunan bertingkat (CSS columns 2 → 3) dengan rasio asli foto (4:5 / 3:2 dari registry),
//   zoom ringan saat masuk layar, keterangan di bawah foto.
import { CountUp, Marquee, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { COMMUNITY_MESSAGE, communityActivities, communityStats, type SparringModel } from './model';
import { SPARRING_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, SECTION_PAD, TYPE } from './styles';
import { ButtonLink, SectionHead } from './ui';

/** Garis antar-sel angka 2×2: kanan di kolom kiri, atas di baris kedua. */
const statCell = (i: number, n: number) => [i % 2 === 0 && i < n - 1 ? 'border-r' : '', i >= 2 ? 'border-t' : '', i % 2 === 0 ? 'pr-5' : 'pl-5'].join(' ');

export function Community({ m }: { m: SparringModel }) {
  const s = m.community;
  const stats = communityStats(s);
  const activities = communityActivities(s);
  const image = text(s, 'image');
  const photo = hasImage(image);
  const action = m.linkOr(text(s, 'button_url'), m.waIntent(COMMUNITY_MESSAGE));
  return (
    <TemplateSection sectionKey="community" data-tpl-tone="inverse" className={`overflow-hidden bg-(--sp-night) text-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="flex flex-col gap-7 @5xl:flex-row @5xl:items-end @5xl:justify-between">
          <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Komunitas" tone="dark" />
          <Reveal delay={200} className="shrink-0">
            <ButtonLink action={action} label={text(s, 'button_label')} variant="white" className="w-full @xl:w-auto" />
          </Reveal>
        </div>

        {(photo || stats.length > 0) && (
          <div className={`mt-10 grid items-center gap-y-8 @3xl:mt-14 @5xl:grid-cols-12 ${GRID_GAP}`}>
            {photo && (
              <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
                <KitPhoto
                  src={image}
                  alt={SPARRING_PHOTOS.alt(image, `Lapangan ${m.companyName} pada malam hari`)}
                  fallback="none"
                  zoom
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="aspect-[4/3] rounded-[14px] ring-1 ring-inset ring-white/10"
                />
              </Reveal>
            )}
            {stats.length > 0 && (
              <dl className={`grid grid-cols-2 ${photo ? '@5xl:col-span-7 @5xl:pl-6' : '@5xl:col-span-12 @5xl:grid-cols-4'}`}>
                {stats.map((stat, i) => (
                  <Reveal key={`${field(stat, 'label')}-${i}`} delay={stagger(i)} className={`flex min-w-0 flex-col border-white/12 py-6 @3xl:py-8 ${statCell(i, stats.length)}`}>
                    <dt className="order-last mt-3 text-[14px] leading-snug text-white/72 @3xl:text-[15px]">{field(stat, 'label')}</dt>
                    <dd className={`${TYPE.stat} text-(--sp-neon)`}>
                      <CountUp value={field(stat, 'value')} duration={1500} />
                    </dd>
                  </Reveal>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-12 border-y border-white/10 py-5 @3xl:mt-16">
          <Marquee
            label="Kegiatan komunitas"
            duration={46}
            gap={14}
            staticClassName={`${CONTAINER} flex flex-wrap items-center gap-3`}
          >
            {activities.map((activity, i) => (
              <span
                key={`${activity}-${i}`}
                className={`${DISPLAY} inline-flex h-11 items-center gap-2.5 rounded-full px-5 text-[17px] font-semibold italic text-white ring-1 ring-inset ring-white/20 @3xl:h-12 @3xl:text-[19px]`}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--sp-neon)" />
                {activity}
              </span>
            ))}
          </Marquee>
        </div>
      )}
    </TemplateSection>
  );
}

export function Gallery({ m }: { m: SparringModel }) {
  const s = m.gallery;
  const items = m.items('gallery');
  return (
    <TemplateSection sectionKey="gallery" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Galeri" />
        <ul className="mt-10 columns-2 gap-3 @3xl:mt-12 @3xl:columns-3 @3xl:gap-5">
          {items.map((item, i) => {
            const image = field(item, 'image');
            const asset = SPARRING_PHOTOS.asset(image);
            const caption = field(item, 'caption');
            // Rasio asli foto demo (4:5 atau 3:2); foto unggahan sendiri → bergantian 4:5 / 3:2
            const tall = asset ? asset.height > asset.width : i % 3 === 0;
            return (
              <Reveal as="li" key={`${image}-${i}`} delay={stagger(i % 3)} className="mb-3 break-inside-avoid @3xl:mb-5">
                <figure className="group">
                  <KitPhoto
                    src={image}
                    alt={SPARRING_PHOTOS.alt(image, caption || `Foto kegiatan di ${m.companyName}`)}
                    fallback="tint"
                    zoom
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className={`${tall ? 'aspect-[4/5]' : 'aspect-[3/2]'} rounded-[14px]`}
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  {caption && <figcaption className={`mt-2 text-[13.5px] leading-snug ${C.muted}`}>{caption}</figcaption>}
                </figure>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
