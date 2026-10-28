// RS mitra (kunci `hospitals`) + Biaya (kunci `pricing`).
// RS mitra: kanvas; kartu putih berfoto 4:3 di dalam bingkai (radius 18), nama, kota (kapsul berpin), dan layanan.
// HP: rel mendatar yang bisa digeser (snap, kartu 78%), layar lebar: kisi 2 → 4 kolom. Di bawahnya kartu tiga angka
// (CountUp) dan catatan bahwa nama RS di demo fiktif.
// Biaya: pita putih; kartu paket di kanvas (harga besar, periode, keterangan, daftar centang, tombol penuh-lebar ke
// WhatsApp dengan nama paket). Kartu berlabel sorotan bergaris warna tema 2px dan boleh berfoto. Catatan: harga contoh,
// pembayaran tidak diproses di website.
import { Check, MapPin } from 'lucide-react';
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_GAP } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitLines, type HealthLinkModel } from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { C, CARD, CHIP, SECTION_PAD, TYPE_H } from './styles';
import { ButtonLink, IconTile, SectionHead } from './ui';

/** Kolom kisi angka per jumlah (kelas utuh agar terbaca Tailwind). */
const STAT_COLS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'];

export function Hospitals({ m }: { m: HealthLinkModel }) {
  const { hospitals: h } = m;
  const items = m.items('hospitals');
  const stats = list(h, 'stats', 3).filter((item) => field(item, 'value') || field(item, 'label'));
  const note = text(h, 'note');
  return (
    <TemplateSection sectionKey="hospitals" className={`${C.canvas} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead center eyebrow={text(h, 'eyebrow')} title={text(h, 'title')} subtitle={text(h, 'subtitle')} srTitle={text(h, 'eyebrow') || 'RS mitra'} />
        {/* Rel digeser di HP: Reveal seluruh rel, bukan tiap kartu */}
        <Reveal
          as="ul"
          className={`${SECTION_GAP} no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:mx-0 @3xl:grid @3xl:grid-cols-2 @3xl:gap-4 @3xl:overflow-visible @3xl:px-0 @5xl:mx-auto @5xl:max-w-[1200px] @5xl:grid-cols-4`}
        >
          {items.map((item, i) => {
            const image = field(item, 'image');
            const name = field(item, 'name');
            return (
              <li key={`${name}-${i}`} className={`w-[78%] max-w-[320px] shrink-0 snap-start p-2 @3xl:w-auto @3xl:max-w-none ${CARD}`}>
                {hasImage(image) && (
                  <KitPhoto
                    src={image}
                    alt={HEALTHLINK_PHOTOS.alt(image, `Gedung atau ruangan ${name}`)}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 80vw"
                    zoom
                    className="aspect-[4/3] rounded-[18px]"
                  />
                )}
                <div className="px-2 pb-2.5 pt-3.5">
                  <h3 className={`${C.ink} ${TYPE_H.h3}`}>{name}</h3>
                  {field(item, 'city') && (
                    <p className={`${CHIP} mt-2 h-6 bg-[#F5F7FA] px-2.5 text-[12px] ${C.ink}`}>
                      <MapPin aria-hidden className="h-3.5 w-3.5 text-(--hl-solid)" />
                      {field(item, 'city')}
                    </p>
                  )}
                  {field(item, 'services') && <p className={`mt-2 ${TYPE_H.small} ${C.muted}`}>{field(item, 'services')}</p>}
                </div>
              </li>
            );
          })}
        </Reveal>
        {stats.length > 0 && (
          <dl className={`mx-auto mt-6 grid max-w-[880px] ${STAT_COLS[stats.length]} divide-x divide-[#0E1B2B]/[0.07] py-5 @3xl:mt-8 @3xl:py-7 ${CARD}`}>
            {stats.map((stat, i) => (
              <div key={`${field(stat, 'label')}-${i}`} className="flex min-w-0 flex-col items-center px-2 text-center">
                <dt className={`order-last mt-2 text-[12.5px] leading-snug ${C.muted} @3xl:text-[14px]`}>{field(stat, 'label')}</dt>
                <dd className={`${TYPE_H.stat} text-(--hl-solid)`}>
                  <CountUp value={field(stat, 'value')} duration={1400} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {note && <p className={`mt-4 text-center text-[13px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}

export function Pricing({ m }: { m: HealthLinkModel }) {
  const { pricing: p } = m;
  const plans = m.items('pricing');
  const note = text(p, 'note');
  const cols = plans.length >= 3 ? '@5xl:grid-cols-3' : plans.length === 2 ? '@3xl:grid-cols-2' : '';
  return (
    <TemplateSection sectionKey="pricing" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead center eyebrow={text(p, 'eyebrow')} title={text(p, 'title')} subtitle={text(p, 'subtitle')} srTitle={text(p, 'eyebrow') || 'Biaya'} />
        <ul className={`${SECTION_GAP} mx-auto grid gap-3 @3xl:gap-4 ${cols} ${plans.length >= 3 ? 'max-w-[1120px]' : 'max-w-[760px]'}`}>
          {plans.map((plan, i) => {
            const badge = field(plan, 'badge');
            const image = field(plan, 'image');
            const features = splitLines(field(plan, 'features'));
            const featured = !!badge;
            return (
              <Reveal as="li" key={`${field(plan, 'name')}-${i}`} delay={stagger(i)} className="min-w-0">
                <article
                  className={`flex h-full flex-col rounded-[24px] p-5 @3xl:p-6 ${
                    featured ? 'bg-white ring-2 ring-inset ring-(--hl-solid)' : 'bg-[#F5F7FA] ring-1 ring-inset ring-[#0E1B2B]/[0.05]'
                  }`}
                >
                  {/* Kartu bersorot boleh berfoto; kartu lain diawali kotak ikon besar (mengisi tinggi yang sama, ala aplikasi) */}
                  {featured && hasImage(image) ? (
                    <KitPhoto
                      src={image}
                      alt={HEALTHLINK_PHOTOS.alt(image, `Ilustrasi paket ${field(plan, 'name')}`)}
                      sizes="(min-width: 1024px) 30vw, 100vw"
                      fallback="none"
                      position="50% 35%"
                      className="-mx-1.5 -mt-1.5 mb-5 aspect-[16/9] rounded-[18px] @5xl:aspect-[3/1]"
                    />
                  ) : (
                    <IconTile title={field(plan, 'name')} className={`mb-5 h-14 w-14 ${featured ? '' : 'bg-white! ring-1 ring-inset ring-[#0E1B2B]/[0.06]'}`} iconClassName="h-7 w-7" />
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`${C.ink} ${TYPE_H.h3}`}>{field(plan, 'name')}</h3>
                    {badge && <span className={`${CHIP} bg-(--hl-solid) text-white`}>{badge}</span>}
                  </div>
                  {field(plan, 'price') && (
                    <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                      <span className={`${TYPE_H.price} ${C.ink}`}>{field(plan, 'price')}</span>
                      {field(plan, 'period') && <span className={`text-[15px] ${C.muted}`}>{field(plan, 'period')}</span>}
                    </p>
                  )}
                  {field(plan, 'text') && <p className={`mt-2 ${TYPE_H.body} ${C.muted}`}>{field(plan, 'text')}</p>}
                  {features.length > 0 && (
                    <ul className="mb-6 mt-5 space-y-2.5">
                      {features.map((feature, j) => (
                        <li key={`${feature}-${j}`} className={`flex items-start gap-2.5 text-[14.5px] leading-snug ${C.ink}`}>
                          <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--hl-tint) text-(--hl-tint-ink)">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <ButtonLink
                    action={m.planAction(plan)}
                    label={field(plan, 'button_label') || 'Pilih paket'}
                    variant={featured ? 'solid' : 'light'}
                    size="md"
                    className="mt-auto w-full"
                  />
                </article>
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mx-auto mt-6 max-w-[640px] text-center text-[13px] leading-snug ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
