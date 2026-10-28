// Profil developer (kunci `developer`, putih hangat) + Fasilitas kawasan (kunci `amenities`, krem).
// Developer: baris 1 — kiri (1-6) label, H2, nama developer (kapital kecil warna tema), cerita singkat; kanan (8-12)
// gambar garis RUMAH tipis (dekoratif, tergambar SEKALI saat masuk layar: stroke-dashoffset ≤ 1,6 dtk, ./homenest.css)
// di atas empat angka 2×2 bergaris rambut (Inter tipis, menghitung naik). Baris 2 — tiga foto proyek 4:3 dengan nama
// Cormorant + kota (HP: rel geser mendatar). Baris 3 — tiga nilai kerja bergaris atas. HP: bertumpuk.
// Fasilitas: kiri (1-5) foto tegak 4:5 (SATU-SATUNYA foto parallax di halaman), kanan (7-12) label, H2, kalimat
// pengantar, lalu daftar fasilitas 2 kolom bergaris rambut (ikon garis otomatis dari nama, nama, jarak). HP: judul, foto 3:2,
// daftar satu kolom.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { HomeNestModel } from './model';
import { HOMENEST_PHOTOS } from './photos';
import { C, GRID_GAP, LABEL, LABEL_SM, SECTION_PAD, SERIF, TYPE } from './styles';
import { AmenityIcon, SectionHead } from './ui';

/** Gambar garis rumah (atap pelana + volume datar + pintu, jendela, pohon, garis tanah). Dekoratif, tanpa teks. */
function HouseLine() {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const paths = [
    'M8 150H472',
    'M118 150V82H300V150',
    'M96 92L209 30L322 92',
    'M300 150V104H404V150',
    'M290 104H414',
    'M192 150V112H226V150',
    'M140 98H174V124H140Z',
    'M330 118H374V136H330Z',
    'M440 150V122',
    'M440 122C424 122 418 108 424 98C428 88 452 88 456 98C462 108 456 122 440 122Z',
  ];
  return (
    <Reveal variant="fade" className="hn-draw">
      <svg viewBox="0 0 480 160" className={`h-auto w-full ${C.accent}`} aria-hidden focusable="false">
        {paths.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={{ animationDelay: `${i * 50}ms` }} {...line} />
        ))}
      </svg>
    </Reveal>
  );
}

export function Developer({ m }: { m: HomeNestModel }) {
  const { developer } = m;
  const stats = list(developer, 'stats', 4).filter((i) => field(i, 'value') || field(i, 'label'));
  const projects = list(developer, 'projects', 3).filter((i) => hasImage(field(i, 'image')));
  const values = list(developer, 'values', 3).filter((i) => field(i, 'title') || field(i, 'text'));
  const name = text(developer, 'name');
  const body = text(developer, 'body');

  return (
    <TemplateSection sectionKey="developer" className={`${SECTION_PAD} ${C.warm}`}>
      <div className={CONTAINER}>
        <div className={`grid grid-cols-1 gap-y-12 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-6">
            <SectionHead layout="stack" eyebrow={text(developer, 'eyebrow')} title={text(developer, 'title')} srTitle={name || 'Profil developer'} />
            {name && (
              <Reveal as="p" delay={160} className={`mt-7 ${LABEL} ${C.accent}`}>
                {name}
              </Reveal>
            )}
            {body && (
              <Reveal as="p" delay={200} className={`mt-4 max-w-[52ch] text-pretty ${TYPE.lead} ${C.muted}`}>
                {body}
              </Reveal>
            )}
          </div>
          <div className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
            <HouseLine />
            {stats.length > 0 && (
              <Reveal delay={120}>
                <dl className={`mt-6 grid grid-cols-2 border-t ${C.line}`}>
                  {stats.map((s, i) => (
                    <div key={`${field(s, 'label')}-${i}`} className={`flex min-w-0 flex-col border-b py-6 ${C.line} ${i % 2 === 1 ? 'border-l pl-6' : 'pr-6'}`}>
                      <dt className={`order-last mt-3 text-[14px] leading-snug ${C.muted}`}>{field(s, 'label')}</dt>
                      <dd className={`${TYPE.stat} ${C.ink}`}>{field(s, 'value') ? <CountUp value={field(s, 'value')} /> : '–'}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
        </div>

        {projects.length > 0 && (
          // HP: rel geser mendatar (kartu 80% lebar, kartu berikutnya mengintip) agar tiga foto tidak bertumpuk panjang;
          // ≥ @2xl: kisi 2/3 kolom. Reveal membungkus relnya, bukan tiap kartu (kartu di luar layar tetap terlihat).
          <Reveal className="mt-14 @3xl:mt-24">
            <ul
              aria-label="Foto proyek"
              className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:mx-0 @2xl:grid @2xl:snap-none @2xl:gap-x-8 @2xl:gap-y-10 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0 @2xl:grid-cols-2 @5xl:gap-x-10 ${projects.length >= 3 ? '@5xl:grid-cols-3' : ''}`}
            >
              {projects.map((p, i) => (
                <li key={`${field(p, 'name')}-${i}`} className={`group min-w-0 shrink-0 snap-start @2xl:w-auto ${projects.length > 1 ? 'w-[82%]' : 'w-full'}`}>
                  <KitPhoto
                    src={field(p, 'image')}
                    alt={HOMENEST_PHOTOS.alt(field(p, 'image'), `Proyek ${field(p, 'name')}`)}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
                    className="aspect-[4/3]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  />
                  <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className={`${SERIF} text-[22px] font-semibold ${C.ink}`}>{field(p, 'name')}</span>
                    {field(p, 'city') && <span className={`${LABEL_SM} ${C.muted}`}>{field(p, 'city')}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {values.length > 0 && (
          <ul className={`mt-16 grid gap-y-8 @3xl:mt-20 @3xl:grid-cols-3 ${GRID_GAP}`}>
            {values.map((v, i) => (
              <Reveal as="li" key={`${field(v, 'title')}-${i}`} delay={stagger(i)} className={`min-w-0 border-t pt-6 ${C.line}`}>
                <h3 className={`${TYPE.h3sm} ${C.ink}`}>{field(v, 'title')}</h3>
                {field(v, 'text') && <p className={`mt-2 max-w-[36ch] ${TYPE.body} ${C.muted}`}>{field(v, 'text')}</p>}
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}

export function Amenities({ m }: { m: HomeNestModel }) {
  const { amenities } = m;
  const items = m.items('amenities');
  const image = text(amenities, 'image');
  const withPhoto = hasImage(image);

  return (
    <TemplateSection sectionKey="amenities" className={`${SECTION_PAD} ${C.cream}`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
        {/* HP: kolom teks "contents" → urutan judul, foto, lalu daftar (order); layar lebar: foto kiri, teks kanan */}
        <div className={`contents @5xl:block @5xl:min-w-0 ${withPhoto ? '@5xl:col-span-6 @5xl:col-start-7 @5xl:row-start-1' : '@5xl:col-span-12'}`}>
          <SectionHead layout="stack" eyebrow={text(amenities, 'eyebrow')} title={text(amenities, 'title')} subtitle={text(amenities, 'subtitle')} srTitle="Fasilitas kawasan" className="order-1 min-w-0 @5xl:order-none" />
          <ul className={`order-3 grid min-w-0 border-t @2xl:grid-cols-2 @2xl:gap-x-10 @5xl:order-none @5xl:mt-10 ${withPhoto ? '' : '@5xl:grid-cols-4'} ${C.line}`}>
            {items.map((item, i) => (
              <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 50)} className={`flex min-h-16 min-w-0 items-center gap-4 border-b py-3 @2xl:min-h-[72px] @2xl:py-4 ${C.line}`}>
                <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center ring-1 ring-inset ring-(--hn-ink)/30 ${C.accent}`}>
                  <AmenityIcon title={field(item, 'title')} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15.5px] font-medium leading-snug ${C.ink}`}>{field(item, 'title')}</span>
                  {field(item, 'detail') && <span className={`mt-0.5 block text-[13.5px] ${C.muted}`}>{field(item, 'detail')}</span>}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
        {withPhoto && (
          <div className="order-2 min-w-0 @5xl:order-none @5xl:col-span-5 @5xl:col-start-1 @5xl:row-start-1">
            <KitPhoto
              src={image}
              alt={HOMENEST_PHOTOS.alt(image, `Fasilitas kawasan ${m.companyName}`)}
              fallback="none"
              parallax
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[3/2] @2xl:aspect-[16/11] @5xl:aspect-[4/5]"
            />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
