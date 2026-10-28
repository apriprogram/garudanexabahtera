// IGD 24 jam (kunci `emergency`): SATU-SATUNYA pita merah selebar layar (merah darurat tetap #B71C1C, putih 6,57:1,
// data-tpl-tone="inverse"). Atas: garis detak jantung (EKG) putih selebar wadah yang TERGAMBAR SEKALI saat pita masuk
// layar (gerak khas, ./medicare-general.css .mc-ecg-path), lalu titik di ujungnya. Kiri: label, H2, deskripsi, nomor IGD
// sangat besar (tautan tel:), tombol putih "Telepon IGD" + tombol garis "Ambulans", catatan 119. Kanan: foto 3:2
// opsional dan langkah saat darurat bernomor. HP: bertumpuk tanpa foto, tombol penuh-lebar.
import { Info, Phone } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePlayOnce } from './hooks';
import { displayPhone, stepItems, type MedicareModel } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { BTN, GRID_GAP, T } from './styles';
import { SectionLabel } from './ui';

/**
 * Garis EKG per lebar: layar lebar 1200×120 (dua denyut), HP/tablet 600×120 (satu denyut), jadi tebal garis tetap ±3px
 * tanpa non-scaling-stroke (yang merusak panjang garis putus pathLength=1). Titik bulat di ujung kanan.
 */
const ECG = {
  wide: {
    width: 1200,
    path: 'M0 70 H330 C345 70 352 52 368 52 C384 52 391 70 406 70 H452 L468 88 L488 12 L508 112 L524 70 H584 C604 70 612 44 634 44 C656 44 664 70 684 70 H812 L828 88 L848 12 L868 112 L884 70 H944 C964 70 972 44 994 44 C1016 44 1024 70 1044 70 H1184',
    stroke: 2.6,
    dot: 8,
  },
  narrow: {
    width: 600,
    path: 'M0 70 H150 C162 70 168 52 182 52 C196 52 202 70 214 70 H252 L266 88 L284 12 L302 112 L316 70 H372 C390 70 396 44 416 44 C436 44 442 70 460 70 H584',
    stroke: 5,
    dot: 12,
  },
} as const;

function Ecg() {
  const ref = useRef<HTMLDivElement>(null);
  usePlayOnce(ref);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none">
      {(['narrow', 'wide'] as const).map((size) => {
        const ecg = ECG[size];
        return (
          <svg
            key={size}
            viewBox={`0 0 ${ecg.width} 120`}
            className={`h-auto w-full ${size === 'wide' ? 'hidden @3xl:block' : 'block @3xl:hidden'}`}
            focusable="false"
          >
            <path d={`M0 70 H${ecg.width}`} stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={ecg.stroke / 2.5} fill="none" />
            <path d={ecg.path} pathLength={1} className="mc-ecg-path" stroke="#FFFFFF" strokeWidth={ecg.stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx={ecg.width - 16} cy={70} r={ecg.dot} fill="#FFFFFF" className="mc-ecg-dot" />
          </svg>
        );
      })}
    </div>
  );
}

export function Emergency({ m }: { m: MedicareModel }) {
  const { emergency } = m;
  const eyebrow = text(emergency, 'eyebrow');
  const title = text(emergency, 'title');
  const subtitle = text(emergency, 'subtitle');
  const note = text(emergency, 'note');
  const image = text(emergency, 'image');
  const steps = stepItems(emergency, 'steps', 4);
  const igdNumber = displayPhone(m.igdPhone);
  const ambulanceNumber = displayPhone(m.ambulancePhone);
  const callLabel = text(emergency, 'call_label') || 'Telepon IGD';
  const ambulanceLabel = text(emergency, 'ambulance_label');
  const hasAside = hasImage(image) || steps.length > 0;

  return (
    <TemplateSection sectionKey="emergency" data-tpl-tone="inverse" className="bg-[#B71C1C] py-16 text-white @3xl:py-24">
      <div className={CONTAINER}>
        <Ecg />
        <div className={`mt-8 grid grid-cols-1 gap-y-12 @3xl:mt-12 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className={`min-w-0 ${hasAside ? '@5xl:col-span-6' : '@5xl:col-span-9'}`}>
            {eyebrow && (
              <Reveal variant="fade">
                <SectionLabel label={eyebrow} tone="dark" />
              </Reveal>
            )}
            {title ? (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[20ch] ${T.h2} text-white`}>
                {title}
              </Reveal>
            ) : (
              <h2 className="sr-only">{eyebrow || 'IGD 24 jam'}</h2>
            )}
            {subtitle && (
              <Reveal as="p" delay={140} className={`mt-4 max-w-[44ch] ${T.lead} text-white`}>
                {subtitle}
              </Reveal>
            )}
            {m.igdAction && (
              <Reveal delay={200} className="mt-7">
                <ActionLink
                  action={m.igdAction}
                  aria-label={`${callLabel}: ${igdNumber}`}
                  className={`inline-flex min-h-12 items-center gap-3 whitespace-nowrap underline decoration-white/50 decoration-2 underline-offset-[10px] transition-colors hover:decoration-white ${T.phone} text-white`}
                >
                  <Phone aria-hidden className="h-[0.8em] w-[0.8em] shrink-0" strokeWidth={2.25} />
                  {igdNumber}
                </ActionLink>
              </Reveal>
            )}
            {(m.igdAction || (m.ambulanceAction && ambulanceLabel)) && (
              <Reveal delay={260} className="mt-8 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
                {m.igdAction && (
                  <ActionLink action={m.igdAction} className={`${BTN.white} w-full text-[#B71C1C]! @xl:w-auto`}>
                    <Phone aria-hidden className="h-5 w-5 shrink-0" />
                    {callLabel}
                  </ActionLink>
                )}
                {m.ambulanceAction && ambulanceLabel && (
                  <ActionLink action={m.ambulanceAction} aria-label={`${ambulanceLabel}: ${ambulanceNumber}`} className={`${BTN.ghost} w-full @xl:w-auto`}>
                    <Phone aria-hidden className="h-5 w-5 shrink-0" />
                    <span className="min-w-0">
                      {ambulanceLabel} <span className="tabular-nums">{ambulanceNumber}</span>
                    </span>
                  </ActionLink>
                )}
              </Reveal>
            )}
            {note && (
              <p className={`mt-6 flex max-w-[52ch] items-start gap-2.5 ${T.body} text-white`}>
                <Info aria-hidden className="mt-[0.25em] h-5 w-5 shrink-0" />
                {note}
              </p>
            )}
          </div>

          {hasAside && (
            <div className="min-w-0 @5xl:col-span-5 @5xl:col-start-8">
              {hasImage(image) && (
                <Reveal variant="fade" className="hidden @3xl:block">
                  <KitPhoto
                    src={image}
                    alt={MEDICARE_PHOTOS.alt(image, `Pintu IGD ${m.companyName}`)}
                    fallback="none"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="aspect-[3/2] rounded-[12px] ring-1 ring-white/25"
                  />
                </Reveal>
              )}
              {steps.length > 0 && (
                <ol className={`grid gap-5 ${hasImage(image) ? '@3xl:mt-8' : ''} @2xl:grid-cols-2`}>
                  {steps.map((step, i) => (
                    <Reveal as="li" key={`${field(step, 'title')}-${i}`} delay={stagger(i, 70)} className="flex min-w-0 items-start gap-4">
                      <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[18px] font-bold text-[#B71C1C]`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className={`${T.h3} text-white`}>{field(step, 'title')}</h3>
                        {field(step, 'text') && <p className={`mt-1 ${T.small} text-white`}>{field(step, 'text')}</p>}
                      </div>
                    </Reveal>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
