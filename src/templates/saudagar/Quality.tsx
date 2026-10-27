// Proses mutu (kunci `quality`, latar putih). Layar lebar: kiri 5 kolom menempel saat digulir — label, H2, deskripsi,
// foto berbingkai lengkung (4:5, maks. 420px) + keterangan; kanan 7 kolom langkah bernomor (angka serif besar, garis
// rambut di atas tiap langkah); di bawah keduanya kartu kraft selebar penuh "Dokumen yang kami siapkan" (judul 5 kolom
// kiri, baris bertanda pisah dua kolom di 7 kolom kanan, sejajar langkah). HP: kepala → foto lengkung 4:3 → langkah → kartu dokumen. Tanpa foto → teks
// melebar; tanpa dokumen → tanpa kartu.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, CARD, SECTION_PAD, SERIF, TYPE_S } from './styles';
import { Caption, SectionHead } from './ui';

export function Quality({ m }: { m: SaudagarModel }) {
  const { quality } = m;
  const steps = m.items('quality');
  const points = list(quality, 'points', 6).filter((item) => field(item, 'text'));
  const pointsTitle = text(quality, 'points_title');
  const image = text(quality, 'image');
  const caption = text(quality, 'image_caption');
  if (steps.length === 0) return null;

  return (
    <TemplateSection sectionKey="quality" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-8 @7xl:gap-12`}>
        <div className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+40px)] @5xl:col-span-5 @5xl:self-start">
          <SectionHead eyebrow={text(quality, 'eyebrow')} title={text(quality, 'title') || 'Proses mutu'} subtitle={text(quality, 'subtitle')} />
          {hasImage(image) && (
            <Reveal variant="fade" className="mt-10">
              <figure className="@xl:max-w-[420px]">
                <KitPhoto
                  src={image}
                  alt={SAUDAGAR_PHOTOS.alt(image, caption || `Pemeriksaan mutu di gudang ${m.companyName}`)}
                  zoom
                  sizes="(min-width: 1024px) 420px, 92vw"
                  className={`aspect-[4/3] @5xl:aspect-[4/5] ${ARCH}`}
                />
                {caption && (
                  <figcaption className="mt-4">
                    <Caption>{caption}</Caption>
                  </figcaption>
                )}
              </figure>
            </Reveal>
          )}
        </div>

        <div className="min-w-0 @5xl:col-span-7">
          <ol className={`border-b ${C.line}`}>
            {steps.map((item, i) => (
              <Reveal
                as="li"
                key={`${field(item, 'title')}-${i}`}
                delay={stagger(i)}
                className={`grid grid-cols-[52px_minmax(0,1fr)] gap-5 border-t py-7 @3xl:grid-cols-[80px_minmax(0,1fr)] @3xl:gap-6 @3xl:py-9 ${C.line}`}
              >
                <span aria-hidden className={`${SERIF} text-[44px] font-normal leading-[0.85] tracking-[-0.03em] @3xl:text-[60px] ${C.ink}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <h3 className={`${C.ink} ${TYPE_S.h3}`}>{field(item, 'title')}</h3>
                  {field(item, 'text') && <p className={`mt-2 max-w-[56ch] text-[15.5px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Kartu dokumen selebar penuh di bawah kedua kolom: kolom kiri (foto) dan kanan (langkah) berakhir sejajar */}
        {points.length > 0 && (
          <Reveal delay={120} className={`min-w-0 p-6 @3xl:p-8 @5xl:col-span-12 @5xl:mt-6 @5xl:grid @5xl:grid-cols-12 @5xl:gap-8 @5xl:p-10 @7xl:gap-12 ${CARD.kraft}`}>
            {pointsTitle && <h3 className={`text-balance ${SERIF} text-[20px] italic leading-snug @3xl:text-[22px] @5xl:col-span-5 @5xl:max-w-[24ch] @5xl:text-[26px] ${C.ink}`}>{pointsTitle}</h3>}
            <ul className={`grid gap-x-8 @3xl:grid-cols-2 ${pointsTitle ? 'mt-4 @5xl:col-span-7 @5xl:mt-0' : '@5xl:col-span-12 @6xl:grid-cols-3'}`}>
              {points.map((item, i) => (
                <li key={`${field(item, 'text')}-${i}`} className={`flex gap-3 border-t py-3 text-[15px] leading-snug ${C.line} ${C.ink}`}>
                  <span aria-hidden className="shrink-0 text-(--sg-ink)">
                    —
                  </span>
                  <span className="min-w-0">{field(item, 'text')}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
