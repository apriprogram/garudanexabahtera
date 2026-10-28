// Poliklinik & penunjang (kunci `clinics`), latar putih. Kepala section dengan tiga angka besar di kanan (Atkinson,
// angka berjalan, garis pemisah tipis); kisi poli: kartu putih radius 12 bergaris tipis, ikon otomatis di kotak 48px,
// nama poli (H3) dan lokasi (ikon pin) — 4 kolom layar lebar, 3 tablet, 2 HP. Lalu label "Penunjang medis" dan kartu
// foto 3:2 (laboratorium, radiologi, farmasi) dengan chip jam buka; tanpa foto → ikon. HP: kartu mendatar dengan foto
// persegi kecil di kiri agar halaman HP ringkas. Anchor "#penunjang" menuju ke
// section ini.
import { Clock, MapPin } from 'lucide-react';
import { useId, useState } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { clinicItems, supportItems, type MedicareModel } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { BTN, C, CARD, ICON_BOX, SECTION_PAD, T } from './styles';
import { AutoIcon, SectionHead, SectionLabel } from './ui';

/** HP (< @xl): poli yang tampil sebelum "Tampilkan semua poli" (daftar ≤ 8 tampil utuh; layar lebar selalu utuh). */
const PHONE_LIMIT = 6;

function Stats({ m }: { m: MedicareModel }) {
  const stats = list(m.clinics, 'stats', 3).filter((item) => field(item, 'value'));
  if (stats.length === 0) return null;
  return (
    <Reveal delay={200}>
      <dl className={`grid divide-x divide-[#0E1B2E]/[0.12] ${['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'][stats.length]}`}>
        {stats.map((item, i) => (
          <div key={`${field(item, 'label')}-${i}`} className={`flex min-w-0 flex-col ${i === 0 ? 'pr-4' : 'px-4'} @3xl:px-6 ${i === 0 ? '@3xl:pl-0' : ''}`}>
            <dt className={`order-last mt-2 ${T.small} ${C.muted}`}>{field(item, 'label')}</dt>
            <dd className={`${T.num} text-(--tpl-accent-ink)`}>
              <CountUp value={field(item, 'value')} duration={1400} />
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

export function Clinics({ m }: { m: MedicareModel }) {
  const { clinics } = m;
  const items = clinicItems(clinics);
  const support = supportItems(clinics);
  const supportTitle = text(clinics, 'support_title');
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const canCollapse = items.length > PHONE_LIMIT + 2;

  return (
    <TemplateSection sectionKey="clinics" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(clinics, 'eyebrow')}
          title={text(clinics, 'title')}
          subtitle={text(clinics, 'subtitle')}
          srTitle="Poliklinik"
          aside={<Stats m={m} />}
        />

        {items.length > 0 && (
          // HP: satu kartu berisi baris (ikon kiri, nama + lokasi kanan, garis tipis), 6 poli pertama + "Tampilkan semua"; ≥ @xl: kisi kartu
          <ul id={listId} className="mt-10 divide-y divide-[#0E1B2E]/[0.1] overflow-hidden rounded-[12px] bg-white ring-1 ring-inset ring-[#0E1B2E]/[0.1] @xl:grid @xl:grid-cols-2 @xl:gap-3 @xl:divide-y-0 @xl:overflow-visible @xl:rounded-none @xl:bg-transparent @xl:ring-0 @3xl:mt-14 @3xl:grid-cols-3 @3xl:gap-4 @5xl:grid-cols-4">
            {items.map((item, i) => {
              const name = field(item, 'name');
              const location = field(item, 'location');
              return (
                <Reveal
                  as="li"
                  key={`${name}-${i}`}
                  delay={stagger(i % 4, 60)}
                  className={`flex min-w-0 items-center gap-4 px-4 py-3.5 @xl:flex-col @xl:items-start @xl:gap-0 @xl:rounded-[12px] @xl:bg-white @xl:p-5 @xl:ring-1 @xl:ring-inset @xl:ring-[#0E1B2E]/[0.1] ${canCollapse && !showAll && i >= PHONE_LIMIT ? '@max-xl:hidden' : ''}`}
                >
                  <span aria-hidden className={`${ICON_BOX} h-11! w-11! @xl:h-12! @xl:w-12!`}>
                    <AutoIcon name={name} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 @xl:mt-4">
                    <h3 className={`${T.h3} ${C.ink} [overflow-wrap:anywhere]`}>{name}</h3>
                    {location && (
                      <p className={`mt-0.5 flex items-start gap-1.5 @xl:mt-1.5 ${T.small} ${C.muted}`}>
                        <MapPin aria-hidden className="mt-[0.2em] h-4 w-4 shrink-0" />
                        <span className="min-w-0">{location}</span>
                      </p>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
        {canCollapse && (
          <button
            type="button"
            aria-expanded={showAll}
            aria-controls={listId}
            onClick={() => setShowAll((v) => !v)}
            className={`${BTN.outline} mt-4 w-full @xl:hidden`}
          >
            {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua poli (${items.length})`}
          </button>
        )}

        {support.length > 0 && (
          <div className={items.length > 0 ? 'mt-14 @3xl:mt-20' : 'mt-10 @3xl:mt-14'}>
            {supportTitle && (
              <Reveal variant="fade">
                <SectionLabel label={supportTitle} />
              </Reveal>
            )}
            <ul className={`grid gap-5 @3xl:grid-cols-3 ${supportTitle ? 'mt-6' : ''}`}>
              {support.map((item, i) => {
                const title = field(item, 'title');
                const image = field(item, 'image');
                const hours = field(item, 'hours');
                return (
                  <Reveal as="li" key={`${title}-${i}`} delay={stagger(i)} className={`group flex min-w-0 items-start gap-4 overflow-hidden p-4 @3xl:flex-col @3xl:items-stretch @3xl:gap-0 @3xl:p-0 ${CARD}`}>
                    {hasImage(image) ? (
                      <KitPhoto
                        src={image}
                        alt={MEDICARE_PHOTOS.alt(image, `Layanan ${title} di ${m.companyName}`)}
                        fallback="none"
                        zoom
                        sizes="(min-width: 768px) 33vw, 128px"
                        className="aspect-square w-24 shrink-0 rounded-[10px] @xl:w-32 @3xl:aspect-[3/2] @3xl:w-auto @3xl:rounded-none"
                        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span aria-hidden className={`${ICON_BOX} @3xl:mx-6 @3xl:mt-6`}>
                        <AutoIcon name={title} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col self-stretch @3xl:p-6">
                      <h3 className={`${T.h3} ${C.ink}`}>{title}</h3>
                      {field(item, 'text') && <p className={`mt-2 ${T.body} ${C.muted}`}>{field(item, 'text')}</p>}
                      {hours && (
                        <p className={`pt-3 ${T.small} @3xl:mt-auto @3xl:pt-4`}>
                          <span className="inline-flex items-center gap-2 rounded-[8px] bg-(--tpl-accent-50) px-3 py-1.5 font-semibold text-(--tpl-accent-ink)">
                            <Clock aria-hidden className="h-4 w-4 shrink-0" />
                            {hours}
                          </span>
                        </p>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
