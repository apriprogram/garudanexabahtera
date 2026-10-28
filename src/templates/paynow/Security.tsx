// Keamanan (kunci `security`): section MALAM INDIGO (inverse). Layar lebar: kiri foto tegak 4:5 radius 28 dengan chip
// kaca (ikon sidik jari bergradasi + teks) di pojok kiri bawah; kanan label glow, H2 putih, deskripsi, lalu kartu fitur
// 2×2 (ubin ikon bergradasi, judul, satu kalimat). HP: kepala, foto, kartu satu kolom. Fitur = fitur produk merek
// (contoh); tanpa klaim sertifikasi atau izin.
import { Fingerprint } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { securityIcon } from './icons';
import type { PaynowModel } from './model';
import { PAYNOW_PHOTOS } from './photos';
import { CARD_DARK, DISPLAY, GRID_GAP, SECTION_PAD } from './styles';
import { AutoIcon, SectionHead } from './ui';

export function Security({ m }: { m: PaynowModel }) {
  const { security } = m;
  const items = m.items('security');
  const image = text(security, 'image');
  const badge = text(security, 'badge');
  const photo = hasImage(image);
  return (
    <TemplateSection sectionKey="security" data-tpl-tone="inverse" className={`${SECTION_PAD} bg-(--pn-night) text-white`}>
      <div className={`${CONTAINER} grid gap-y-12 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}>
        <div className={`min-w-0 ${photo ? '@5xl:col-span-6 @5xl:col-start-7 @5xl:row-start-1' : '@5xl:col-span-12'}`}>
          <SectionHead eyebrow={text(security, 'eyebrow')} title={text(security, 'title')} subtitle={text(security, 'subtitle')} srTitle={text(security, 'eyebrow') || 'Keamanan'} tone="dark" />
          <ul className={`mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:gap-4 ${photo ? '' : '@5xl:grid-cols-4'}`}>
            {items.map((item, i) => {
              const title = field(item, 'title');
              return (
                <Reveal as="li" key={`${title}-${i}`} delay={stagger(i)} className={`flex min-w-0 items-start gap-4 p-5 @2xl:block @3xl:p-6 ${CARD_DARK}`}>
                  <span aria-hidden className="pn-grad flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white">
                    <AutoIcon name={securityIcon(title)} className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  </span>
                  {/* HP: ikon di kiri, teks di kanan (baris ringkas); ≥ @2xl: kartu dengan ikon di atas */}
                  <div className="min-w-0 @2xl:mt-5">
                    <h3 className={`text-[17px] font-semibold leading-snug tracking-[-0.01em] text-white @3xl:text-[18px] ${DISPLAY}`}>{title}</h3>
                    {field(item, 'text') && <p className="mt-1 text-[14.5px] leading-relaxed text-white/72">{field(item, 'text')}</p>}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
        {photo && (
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
            <KitPhoto
              src={image}
              alt={PAYNOW_PHOTOS.alt(image, `Keamanan transaksi ${m.companyName}`)}
              zoom
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/5] max-h-[640px] w-full rounded-[28px] @3xl:aspect-[16/10] @5xl:aspect-[4/5]"
            >
              {badge && (
                <p className="absolute bottom-4 left-4 right-4 flex w-max max-w-[calc(100%-32px)] items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--pn-night)_72%,transparent)] py-2 pl-2 pr-4 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-md @3xl:bottom-6 @3xl:left-6">
                  <span aria-hidden className="pn-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Fingerprint className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 truncate">{badge}</span>
                </p>
              )}
            </KitPhoto>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
