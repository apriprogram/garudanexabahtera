// Fasilitas (kunci `facilities`) di latar pasir: layar lebar foto GOR 4:3 (radius 20, zoom halus) di kolom 1-6 dengan
// motif garis lapangan tipis di belakangnya (kiri atas, tidak melintasi teks); kanan: label, H2, pengantar, empat
// angka besar Sora (CountUp, 2 × 2 bergaris tipis), lalu chip fasilitas berikon otomatis. HP: foto → judul → angka
// 2 × 2 → chip. Tanpa foto → kolom teks selebar wadah dengan angka 4 sejajar (tanpa motif).
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { facilityItems, facilityStats, type SmashModel } from './model';
import { SMASHHALL_PHOTOS } from './photos';
import { C, CHIP, GRID_GAP, SECTION_PAD, TYPE_S } from './styles';
import { AmenityIcon, SectionLabel } from './ui';

/** Garis lapangan bulu tangkis (dilihat dari atas), dekoratif. */
function CourtLines({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 440" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden focusable="false">
      <rect x="1" y="1" width="198" height="438" />
      <path d="M16 1v438M184 1v438M1 220h198M1 155h198M1 285h198M100 1v154M100 285v154M1 25h198M1 415h198" />
    </svg>
  );
}

export function Facilities({ m }: { m: SmashModel }) {
  const { facilities } = m;
  const image = text(facilities, 'image');
  const withPhoto = hasImage(image);
  const stats = facilityStats(facilities);
  const items = facilityItems(facilities);
  const eyebrow = text(facilities, 'eyebrow');
  const title = text(facilities, 'title');
  const subtitle = text(facilities, 'subtitle');

  return (
    <TemplateSection sectionKey="facilities" className={`relative overflow-hidden ${C.sand} ${SECTION_PAD}`}>
      {/* Motif di sudut kiri atas, di belakang foto: tidak pernah melintasi teks */}
      {withPhoto && (
        <CourtLines className="pointer-events-none absolute -left-14 -top-24 hidden h-[560px] w-[255px] rotate-[-28deg] text-[#171512]/[0.06] @5xl:block" />
      )}
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
        {withPhoto && (
          <Reveal variant="fade" className="relative min-w-0 @5xl:col-span-6">
            <KitPhoto
              src={image}
              alt={SMASHHALL_PHOTOS.alt(image, `Lapangan bulu tangkis di ${m.companyName}`)}
              zoom
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] rounded-[20px]"
            />
          </Reveal>
        )}

        <div className={`min-w-0 ${withPhoto ? '@5xl:col-span-6 @6xl:col-span-5 @6xl:col-start-8' : '@5xl:col-span-12'}`}>
          {eyebrow && (
            <Reveal variant="fade">
              <SectionLabel label={eyebrow} />
            </Reveal>
          )}
          {title ? (
            <Reveal as="h2" delay={80} className={`max-w-[22ch] ${eyebrow ? 'mt-5' : ''} ${TYPE_S.h2} ${C.ink}`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">{eyebrow || 'Fasilitas'}</h2>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-4 max-w-[48ch] text-pretty ${TYPE_S.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}

          {stats.length > 0 && (
            <Reveal delay={200}>
              <dl className={`mt-9 grid grid-cols-2 border-t border-[#171512]/10 ${withPhoto ? '' : '@3xl:grid-cols-4'}`}>
                {stats.map((s, i) => (
                  <div
                    key={`${field(s, 'label')}-${i}`}
                    className={`flex min-w-0 flex-col border-b border-[#171512]/10 py-5 ${i % 2 === 0 ? 'pr-4' : 'border-l pl-5'} ${
                      withPhoto ? '' : '@3xl:border-l @3xl:pl-5 @3xl:first:border-l-0 @3xl:first:pl-0'
                    }`}
                  >
                    <dt className={`order-last mt-2 text-[13.5px] leading-snug ${C.muted}`}>{field(s, 'label')}</dt>
                    <dd className={`${TYPE_S.stat} ${C.ink}`}>{field(s, 'value') ? <CountUp value={field(s, 'value')} /> : '–'}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          {items.length > 0 && (
            <ul aria-label={title || eyebrow || 'Fasilitas'} className="mt-8 flex flex-wrap gap-2">
              {items.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'label')}-${i}`} variant="fade" delay={stagger(i, 50)} className={`${CHIP} bg-white ring-1 ring-inset ring-[#171512]/10 ${C.ink}`}>
                  <span className="text-(--tpl-accent-ink)">
                    <AmenityIcon label={field(item, 'label')} />
                  </span>
                  {field(item, 'label')}
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
