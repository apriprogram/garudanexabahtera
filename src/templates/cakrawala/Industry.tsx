// Teaching factory & industri (kunci `industry`) + prestasi (kunci `achievements`).
// Industri: panel biru tinta membulat (inset, referensi CBRLP) — label, H2, deskripsi, unit produksi berikon di kiri,
// foto berketerangan di kanan; di bawahnya tiga kartu sertifikasi gelap, lalu deret logo mitra (logo unggahan, atau
// simbol geometris + nama) di atas garis tipis. Prestasi: kartu putih bergaris tipis — ikon piala, chip tingkat, tahun,
// peringkat (H3), nama lomba, dan nama siswa.
import { UserRound } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, safeImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { PartnerMark } from './marks';
import type { CakrawalaModel } from './model';
import { CAKRAWALA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, PANEL, PANEL_OUTER, SECTION_PAD, TYPE_C } from './styles';
import { IconBox, SectionHead } from './ui';

const SUB_TITLE = 'text-[12.5px] font-semibold uppercase tracking-[0.14em]';

function Partner({ name, logo, index }: { name: string; logo: string; index: number }) {
  const src = safeImage(logo);
  if (src) {
    return <img src={src} alt={name} loading="lazy" decoding="async" width={140} height={40} className="h-9 w-auto max-w-[150px] object-contain opacity-80 brightness-0 invert" />;
  }
  return (
    <span className="inline-flex max-w-full items-center gap-2.5 text-white/75">
      <PartnerMark shape={index} className="h-7 w-7 shrink-0 text-(--ck-bright)" />
      {/* Nama panjang (maks. 40 huruf) boleh turun baris di HP agar tidak melebar keluar panel */}
      <span className={`${DISPLAY} min-w-0 text-[16px] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]`}>{name}</span>
    </span>
  );
}

export function Industry({ m }: { m: CakrawalaModel }) {
  const { industry } = m;
  const title = text(industry, 'title');
  const image = text(industry, 'image');
  const caption = text(industry, 'image_caption');
  const units = list(industry, 'units', 4).filter((item) => field(item, 'title'));
  const certs = list(industry, 'certs', 3).filter((item) => field(item, 'title'));
  const partners = list(industry, 'partners', 12).filter((item) => field(item, 'name'));
  if (!title && units.length === 0 && certs.length === 0 && partners.length === 0) return null;
  const unitsTitle = text(industry, 'units_title');
  const certsTitle = text(industry, 'certs_title');
  const partnersTitle = text(industry, 'partners_title');

  return (
    <TemplateSection sectionKey="industry" className="py-2">
      <div className={PANEL_OUTER}>
        <div data-tpl-tone="inverse" className={`${PANEL.deep} ${SECTION_PAD}`}>
          <div className="grid gap-10 @4xl:grid-cols-12 @5xl:gap-14">
            <div className={`min-w-0 ${hasImage(image) ? '@4xl:col-span-6' : '@4xl:col-span-12'}`}>
              <SectionHead layout="stack" tone="dark" eyebrow={text(industry, 'eyebrow')} title={title} subtitle={text(industry, 'subtitle')} />
              {units.length > 0 && (
                <div className="mt-9">
                  {unitsTitle && <h3 className={`${SUB_TITLE} text-(--ck-bright)`}>{unitsTitle}</h3>}
                  <ul className={`${unitsTitle ? 'mt-4' : ''} divide-y divide-white/10 border-y border-white/10`}>
                    {units.map((item, i) => (
                      <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="flex gap-4 py-4">
                        <IconBox title={field(item, 'title')} index={i} tone="dark" className="h-10 w-10 rounded-[12px]" />
                        <div className="min-w-0">
                          <p className={`${DISPLAY} text-[16px] font-semibold leading-snug text-white`}>{field(item, 'title')}</p>
                          {field(item, 'text') && <p className="mt-1 text-[14px] leading-relaxed text-white/70">{field(item, 'text')}</p>}
                        </div>
                      </Reveal>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {hasImage(image) && (
              <Reveal variant="fade" className="@4xl:col-span-6">
                <figure className="relative">
                  <KitPhoto
                    src={image}
                    alt={CAKRAWALA_PHOTOS.alt(image, caption || `Praktik di ${m.companyName}`)}
                    sizes="(min-width: 1280px) 720px, (min-width: 896px) 48vw, 92vw"
                    className="aspect-[4/3] rounded-[22px] @4xl:aspect-auto @4xl:h-full @4xl:min-h-[440px]"
                  />
                  {caption && (
                    <figcaption className="absolute bottom-3 left-3 right-3 rounded-[14px] bg-[#0D1830]/70 px-4 py-2.5 text-[13px] leading-snug text-white backdrop-blur-md @xl:right-auto">
                      {caption}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            )}
          </div>

          {certs.length > 0 && (
            <div className="mt-14">
              {certsTitle && <h3 className={`${SUB_TITLE} text-(--ck-bright)`}>{certsTitle}</h3>}
              <ul className={`${certsTitle ? 'mt-4' : ''} grid gap-3 @3xl:grid-cols-3`}>
                {certs.map((item, i) => (
                  <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className={`p-5 @3xl:p-6 ${CARD.dark}`}>
                    <IconBox title={field(item, 'title')} index={i} tone="dark" className="h-10 w-10 rounded-[12px]" />
                    <p className={`mt-5 ${DISPLAY} text-[17px] font-semibold leading-snug text-white`}>{field(item, 'title')}</p>
                    {field(item, 'text') && <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{field(item, 'text')}</p>}
                  </Reveal>
                ))}
              </ul>
            </div>
          )}

          {partners.length > 0 && (
            <div className="mt-14 border-t border-white/10 pt-8">
              {partnersTitle && <h3 className={`${SUB_TITLE} text-white/70`}>{partnersTitle}</h3>}
              <ul className={`${partnersTitle ? 'mt-6' : ''} flex flex-wrap items-center gap-x-10 gap-y-6`}>
                {partners.map((item, i) => (
                  <li key={`${field(item, 'name')}-${i}`} className="min-w-0 max-w-full">
                    <Partner name={field(item, 'name')} logo={field(item, 'logo')} index={i} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}

export function Achievements({ m }: { m: CakrawalaModel }) {
  const { achievements } = m;
  const items = list(achievements, 'items', 8).filter((item) => field(item, 'title') || field(item, 'event'));
  if (items.length === 0) return null;
  const cols = items.length >= 4 ? '@5xl:grid-cols-4' : items.length === 3 ? '@5xl:grid-cols-3' : '';

  return (
    <TemplateSection sectionKey="achievements" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(achievements, 'eyebrow')} title={text(achievements, 'title')} subtitle={text(achievements, 'subtitle')} />
        <ul className={`mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @3xl:gap-4 ${cols}`}>
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className={`flex flex-col p-5 @3xl:p-6 ${CARD.white}`}>
              <div className="flex items-center justify-between gap-3">
                <IconBox title="prestasi" className="h-11 w-11 rounded-[14px]" />
                <span className="flex flex-wrap justify-end gap-1.5 text-[12px] font-semibold">
                  {field(item, 'level') && <span className="rounded-full bg-(--ck-tint) px-2.5 py-1 text-(--ck-ink)">{field(item, 'level')}</span>}
                  {field(item, 'year') && <span className={`rounded-full bg-[#F3F6FA] px-2.5 py-1 ${C.ink}`}>{field(item, 'year')}</span>}
                </span>
              </div>
              {field(item, 'title') && <h3 className={`mt-6 ${C.ink} ${TYPE_C.h3}`}>{field(item, 'title')}</h3>}
              {field(item, 'event') && <p className={`mt-1.5 ${TYPE_C.small} ${C.muted}`}>{field(item, 'event')}</p>}
              {field(item, 'name') && <div aria-hidden className="min-h-5 flex-1" />}
              {field(item, 'name') && (
                <p className={`flex items-center gap-2 border-t border-black/[0.07] pt-4 text-[13.5px] font-medium ${C.ink}`}>
                  <UserRound aria-hidden className="h-4 w-4 shrink-0 text-(--ck-ink)" strokeWidth={1.8} />
                  {field(item, 'name')}
                </p>
              )}
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}
