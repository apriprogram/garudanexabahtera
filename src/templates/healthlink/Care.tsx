// Resep & obat (kunci `prescription`) + Rekam medis (kunci `records`).
// Resep: pita putih; foto apotek 4:3 (radius 28) dengan foto kecil pengantaran di pojok (cincin putih 4px) dan label
// kaca, lalu alur tiga langkah tegak dengan garis penghubung yang TERISI sekali saat terlihat (gerak khas), label
// pilihan pengiriman, tombol "Tebus Resep", dan catatan obat keras. HP: foto → teks → alur; layar lebar: foto kiri.
// Rekam medis: kanvas; teks + poin centang + tombol di kiri, kartu "layar aplikasi" di kanan (judul, label profil,
// baris kunjungan dengan kotak tanggal, label status) bertanda "Ilustrasi". Website tidak menyimpan rekam medis.
import { Check, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePlayOnce } from './hooks';
import type { HealthLinkModel } from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { C, CHIP, DISPLAY, SECTION_PAD, TYPE_H } from './styles';
import { ButtonLink, IconTile, SectionHead } from './ui';

export function Prescription({ m }: { m: HealthLinkModel }) {
  const { prescription: p } = m;
  const image = text(p, 'image');
  const image2 = text(p, 'image_2');
  const withPhoto = hasImage(image);
  const steps = list(p, 'steps', 4).filter((item) => field(item, 'title'));
  const options = list(p, 'options', 4)
    .map((item) => field(item, 'label'))
    .filter(Boolean);
  const flowRef = useRef<HTMLOListElement>(null);
  const play = usePlayOnce(flowRef);
  const label = text(p, 'photo_label');
  const note = text(p, 'note');

  return (
    <TemplateSection sectionKey="prescription" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-8`}>
        {withPhoto && (
          <div className="relative min-w-0 @5xl:col-span-6">
            <KitPhoto
              src={image}
              alt={HEALTHLINK_PHOTOS.alt(image, 'Apoteker menyiapkan obat sesuai resep di apotek mitra')}
              sizes="(min-width: 1024px) 50vw, 100vw"
              parallax={6}
              position="50% 45%"
              className="aspect-[4/3] rounded-[28px] @5xl:w-[92%]"
            >
              {label && (
                <span className="absolute left-3 top-3 inline-flex h-9 items-center gap-2 rounded-full bg-white/90 pl-1.5 pr-3.5 text-[13.5px] font-semibold text-[#0E1B2B] ring-1 ring-inset ring-white/60 backdrop-blur-md">
                  <IconTile title="Apotek" className="h-6 w-6 rounded-full" iconClassName="h-3.5 w-3.5" />
                  {label}
                </span>
              )}
            </KitPhoto>
            {hasImage(image2) && (
              <KitPhoto
                src={image2}
                alt={HEALTHLINK_PHOTOS.alt(image2, 'Kurir mengantar obat ke rumah pasien')}
                sizes="(min-width: 1024px) 20vw, 45vw"
                fallback="none"
                position="55% 50%"
                className="absolute -bottom-6 right-0 aspect-[4/3] w-[44%] rounded-[22px] ring-4 ring-white @5xl:-bottom-8 @5xl:w-[42%]"
              />
            )}
          </div>
        )}

        <div className={`min-w-0 ${withPhoto ? 'mt-4 @5xl:col-span-5 @5xl:col-start-8 @5xl:mt-0' : '@5xl:col-span-8'}`}>
          <SectionHead eyebrow={text(p, 'eyebrow')} title={text(p, 'title')} subtitle={text(p, 'subtitle')} srTitle={text(p, 'eyebrow') || 'Resep & obat'} />
          {steps.length > 0 && (
            <ol ref={flowRef} data-play={play} className="hl-flow relative mt-8 space-y-5">
              {/* Garis alur: dasar tint + isian warna tema yang tumbuh sekali (scaleY) */}
              {steps.length > 1 && (
                <span aria-hidden className="absolute bottom-6 left-6 top-6 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-(--hl-tint)">
                  <span className="hl-flow-fill absolute inset-0 origin-top rounded-full bg-(--hl-solid)" />
                </span>
              )}
              {steps.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 120)} className="relative flex gap-4">
                  <IconTile title={field(item, 'title')} className="h-12 w-12 rounded-[16px] ring-4 ring-white" iconClassName="h-6 w-6" />
                  <span className="min-w-0 pt-0.5">
                    <h3 className={`${C.ink} ${TYPE_H.h3}`}>{field(item, 'title')}</h3>
                    {field(item, 'text') && <p className={`mt-1 ${TYPE_H.body} ${C.muted}`}>{field(item, 'text')}</p>}
                  </span>
                </Reveal>
              ))}
            </ol>
          )}
          {options.length > 0 && (
            <ul aria-label="Pilihan pengiriman" className="mt-7 flex flex-wrap gap-2">
              {options.map((option, i) => (
                <li key={`${option}-${i}`} className={`${CHIP} h-9 bg-[#F5F7FA] px-3.5 text-[13.5px] ${C.ink}`}>
                  <Check aria-hidden className="h-4 w-4 text-(--hl-solid)" strokeWidth={2.4} />
                  {option}
                </li>
              ))}
            </ul>
          )}
          <ButtonLink action={m.prescriptionAction} label={text(p, 'button_label')} size="lg" className="mt-7 w-full @xl:w-auto" />
          {note && <p className={`mt-4 text-[13px] leading-snug ${C.muted}`}>{note}</p>}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Records({ m }: { m: HealthLinkModel }) {
  const { records: r } = m;
  const points = list(r, 'points', 4)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const visits = list(r, 'visits', 4).filter((item) => field(item, 'title'));
  const screenTitle = text(r, 'screen_title');
  const profile = text(r, 'screen_profile');
  const note = text(r, 'note');
  const showScreen = visits.length > 0 || !!screenTitle;

  return (
    <TemplateSection sectionKey="records" className={`${C.canvas} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-8`}>
        <div className={`min-w-0 ${showScreen ? '@5xl:col-span-5 @6xl:col-span-5 @6xl:col-start-2' : '@5xl:col-span-8'}`}>
          <SectionHead eyebrow={text(r, 'eyebrow')} title={text(r, 'title')} subtitle={text(r, 'subtitle')} srTitle={text(r, 'eyebrow') || 'Rekam medis'} />
          {points.length > 0 && (
            <ul className="mt-7 space-y-3">
              {points.map((point, i) => (
                <Reveal as="li" key={`${point}-${i}`} delay={stagger(i)} className={`flex items-start gap-3 ${TYPE_H.body} ${C.ink}`}>
                  <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--hl-solid) text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {point}
                </Reveal>
              ))}
            </ul>
          )}
          <ButtonLink action={m.recordsAction} label={text(r, 'button_label')} variant="light" size="lg" className="mt-8 w-full @xl:w-auto" />
        </div>

        {showScreen && (
          <div className="min-w-0 @5xl:col-span-6 @5xl:col-start-7 @6xl:col-span-5 @6xl:col-start-7">
            <Reveal variant="scale" className="mx-auto max-w-[440px] rounded-[32px] bg-white p-3 ring-1 ring-inset ring-[#0E1B2B]/[0.08]">
              <div className="rounded-[24px] bg-[#F5F7FA] p-4 @3xl:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className={`${DISPLAY} min-w-0 truncate text-[18px] font-bold ${C.ink}`}>{screenTitle}</p>
                  <span className={`${CHIP} h-6 shrink-0 bg-white px-2.5 text-[11.5px] text-[#4A5869] ring-1 ring-inset ring-[#0E1B2B]/[0.08]`}>Ilustrasi</span>
                </div>
                {profile && <p className={`mt-1 text-[13px] ${C.muted}`}>{profile}</p>}
                {visits.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {visits.map((visit, i) => {
                      const [day, ...month] = field(visit, 'date').split(/\s+/);
                      return (
                        <li key={`${field(visit, 'title')}-${i}`} className="flex items-center gap-3 rounded-[18px] bg-white p-3 ring-1 ring-inset ring-[#0E1B2B]/[0.05]">
                          <span aria-hidden className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] bg-(--hl-tint) text-(--hl-tint-ink)">
                            <span className={`${DISPLAY} text-[16px] font-bold leading-none tabular-nums`}>{day}</span>
                            {month.length > 0 && <span className="mt-0.5 text-[10.5px] font-semibold uppercase leading-none tracking-wide">{month.join(' ')}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="sr-only">{field(visit, 'date')}: </span>
                            {/* Terbungkus, tidak dipotong "…": kolom teks sempit di HP karena label status */}
                            <span className={`block text-pretty text-[14.5px] font-semibold leading-snug [overflow-wrap:anywhere] ${C.ink}`}>{field(visit, 'title')}</span>
                            {field(visit, 'detail') && (
                              <span className={`mt-0.5 block text-pretty text-[12.5px] leading-snug [overflow-wrap:anywhere] ${C.muted}`}>{field(visit, 'detail')}</span>
                            )}
                          </span>
                          {field(visit, 'tag') && <span className={`${CHIP} h-6 shrink-0 bg-[#F5F7FA] px-2.5 text-[11.5px] ${C.ink}`}>{field(visit, 'tag')}</span>}
                          <ChevronRight aria-hidden className="hidden h-4 w-4 shrink-0 text-[#4A5869] @xl:block" />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Reveal>
            {note && <p className={`mx-auto mt-4 max-w-[440px] text-center text-[13px] leading-snug ${C.muted}`}>{note}</p>}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
