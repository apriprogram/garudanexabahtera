// Paket wisata (kunci `packages`), latar putih: kepala section, chip saringan jenis trip (Semua + jenis dari CMS; sama
// dengan chip di hero), jumlah hasil (role=status, tujuan fokus dari tombol "Lihat paket" di hero dan dari tombol atur ulang
// saringan), lalu kisi KARTU POS 1 / 2 (@2xl) / 3 (@5xl) kolom; ≥ 1920px jarak kolom 56px (kartu 560px) atau 4 kolom untuk
// 4/7/8 kartu, ≥ 2400px 4–6 kolom (6 kartu satu baris): bingkai putih 8px di sekeliling foto 4:3 (zoom pelan saat disorot),
// perangko harga berlubang miring di sudut foto ("Mulai Rp875rb per orang"), jenis trip, nama paket, baris meta berikon
// (durasi · min. peserta · transportasi), tiga chip "yang termasuk" berikon otomatis, tombol buka-tutup "Lihat itinerary"
// (nama aksesibel + nama paket; Hari 1/2/3 satu baris), pil "Pesan paket" (WhatsApp berisi nama & harga paket) + tombol
// teks "Hitung biaya" (mengisi formulir hitung biaya). HP: 3 kartu dulu + "Lihat semua n paket". Saringan diganti → kartu
// muncul ulang (250 ms, bertahap).
import { Bus, ChevronDown, Clock, RotateCcw, Users } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { filterPackages, formatPriceShort, packageColsHuge, packageColsWide, packageCount, packageMessage, type LawatanModel, type TourPackage } from './model';
import { LAWATAN_PHOTOS } from './photos';
import { BTN, C, LABEL_SM, POSTCARD, SECTION_PAD, TEXT_LINK, TYPE, WRAP } from './styles';
import { ButtonLink, ChoiceChips, IncludeIcon, PriceStamp, SectionHead, TextLink } from './ui';

/** Kartu sebelum tombol "Lihat semua n paket" di HP (kartu 4+ disembunyikan lewat container query). */
const PREVIEW_PHONE = 3;

/** Kelas kolom ≥ 2400px (string utuh agar Tailwind membuatnya). */
const HUGE_COLS: Record<4 | 5 | 6, string> = {
  4: '@min-[150rem]:grid-cols-4',
  5: '@min-[150rem]:grid-cols-5',
  6: '@min-[150rem]:grid-cols-6',
};

/**
 * Buka-tutup itinerary per kartu (pola disclosure: tombol aria-expanded/aria-controls, panel tanpa role region agar enam
 * kartu tidak menambah enam landmark bernama sama). Nama aksesibel memuat nama paket; teks terlihat tetap "Lihat itinerary".
 */
function Itinerary({ pkg }: { pkg: TourPackage }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  if (pkg.itinerary.length === 0) return null;
  const panelId = `${baseId}-panel`;
  return (
    <div className={`mt-4 border-t border-dashed ${C.line}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Lihat itinerary: ${pkg.title}`}
        onClick={() => setOpen((v) => !v)}
        className={`group/acc flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-[14px] font-semibold ${C.ink}`}
      >
        <span className="underline decoration-[#1D2320]/25 underline-offset-4 group-hover/acc:decoration-(--tpl-accent)">Lihat itinerary</span>
        <ChevronDown aria-hidden className={`lw-acc h-4 w-4 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} data-open={open} inert={!open} className="lw-collapse">
        <div className="overflow-hidden">
          <ol className="grid gap-2 pb-2 pt-1">
            {pkg.itinerary.map((line, i) => (
              <li key={`${line}-${i}`} className="grid grid-cols-[56px_1fr] items-baseline gap-2 text-[14px] leading-snug">
                <span className={`${LABEL_SM} ${C.accent}`}>Hari {i + 1}</span>
                <span className={C.muted}>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Card({ m, pkg, orderLabel, calcLabel, onPlan }: { m: LawatanModel; pkg: TourPackage; orderLabel: string; calcLabel: string; onPlan: (title: string) => void }) {
  const price = formatPriceShort(pkg.price);
  const order = orderLabel ? m.waWith(packageMessage(pkg, m.companyName)) : null;
  const meta: { key: string; icon: typeof Clock; text: string }[] = [
    { key: 'duration', icon: Clock, text: pkg.duration },
    { key: 'people', icon: Users, text: pkg.minPeople ? `min. ${pkg.minPeople} orang` : '' },
    { key: 'transport', icon: Bus, text: pkg.transport },
  ].filter((row) => row.text);
  return (
    <article className={`group flex h-full min-w-0 flex-col p-2 ${POSTCARD}`}>
      <div className="relative">
        <KitPhoto
          src={pkg.image}
          alt={LAWATAN_PHOTOS.alt(pkg.image, `Foto tujuan paket ${pkg.title}`)}
          sizes="(min-width: 1920px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[4/3] rounded-[12px]"
          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
        />
        {price && <PriceStamp price={price} className="absolute -top-2.5 right-3 rotate-[3deg] @3xl:right-4" />}
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-4 @3xl:px-3.5 @3xl:pb-3.5">
        {pkg.types.length > 0 && <p className={`${LABEL_SM} ${C.accent}`}>{pkg.types.join(' · ')}</p>}
        <h3 className={`mt-1.5 ${TYPE.h3} ${C.ink}`}>{pkg.title}</h3>
        {!price && <p className={`mt-1 text-[14px] font-medium ${C.muted}`}>Harga menyusul</p>}
        {meta.length > 0 && (
          <ul className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] ${C.muted}`}>
            {meta.map(({ key, icon: Icon, text: value }) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <Icon aria-hidden className="h-4 w-4 shrink-0 text-(--lw-ink)" strokeWidth={1.7} />
                {value}
              </li>
            ))}
          </ul>
        )}
        {pkg.includes.length > 0 && (
          <ul aria-label="Termasuk" className="mt-4 flex flex-wrap gap-1.5">
            {pkg.includes.slice(0, 3).map((item) => (
              <li key={item} className={`inline-flex items-center gap-1.5 rounded-full bg-[#FBF6EE] px-2.5 py-1 text-[12.5px] font-medium ring-1 ring-inset ring-[#1D2320]/[0.08] ${C.ink}`}>
                <IncludeIcon title={item} className="h-3.5 w-3.5 shrink-0 text-(--lw-ink)" />
                {item}
              </li>
            ))}
          </ul>
        )}
        {/* Itinerary + tombol menempel di dasar kartu: garis putus-putus & tombol sejajar antar-kartu satu baris */}
        <div className="mt-auto">
          <Itinerary pkg={pkg} />
          {(order || calcLabel) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-4">
              <ButtonLink
                action={order}
                label={orderLabel}
                size="md"
                arrow={false}
                icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />}
                ariaLabel={`${orderLabel}: ${pkg.title} (WhatsApp)`}
              />
              {calcLabel && (
                <button type="button" onClick={() => onPlan(pkg.title)} aria-label={`${calcLabel}: ${pkg.title}`} className={`${TEXT_LINK} text-[14px]`}>
                  {calcLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function Packages({
  m,
  type,
  onType,
  changed,
  statusRef,
  onPlan,
}: {
  m: LawatanModel;
  type: string;
  onType: (type: string) => void;
  /** true setelah saringan diganti (kartu beranimasi muncul) */
  changed: boolean;
  statusRef: RefObject<HTMLParagraphElement | null>;
  onPlan: (title: string) => void;
}) {
  const { packages } = m;
  const baseId = useId();
  const all = m.tours;
  const shown = filterPackages(all, type);
  const [expanded, setExpanded] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const limited = !expanded && !type && shown.length > PREVIEW_PHONE;
  const orderLabel = text(packages, 'order_label');
  const calcLabel = m.shown('custom') ? text(packages, 'calc_label') : '';
  const empty = text(packages, 'empty_text') || 'Belum ada paket untuk jenis trip ini.';
  const note = text(packages, 'note');
  const showMore = () => {
    setExpanded(true);
    window.setTimeout(() => (list.current?.children[PREVIEW_PHONE] as HTMLElement | undefined)?.focus(), 0);
  };
  // Tombol atur ulang hilang begitu saringan kosong → fokus ke jumlah hasil ("6 paket"), tidak jatuh ke <body>
  const showAll = () => {
    onType('');
    window.setTimeout(() => statusRef.current?.focus({ preventScroll: true }), 0);
  };

  return (
    <TemplateSection sectionKey="packages" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(packages, 'eyebrow')} number={m.number('packages')} title={text(packages, 'title')} subtitle={text(packages, 'subtitle')} srTitle="Paket wisata" />

        <Reveal className="mt-10 flex flex-col gap-4 @3xl:mt-14 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          {m.types.length > 0 && (
            <ChoiceChips
              name={`${baseId}-filter`}
              label="Saring paket menurut jenis trip"
              options={[['', 'Semua'] as const, ...m.types.map((t) => [t, t] as const)]}
              value={type}
              onChange={onType}
            />
          )}
          <div className="flex min-h-11 items-center gap-5">
            {/* role="status" sudah polite; tanpa aria-live eksplisit (region status ber-aria-live milik Shell) */}
            <p ref={statusRef} tabIndex={-1} role="status" className={`text-[15px] focus:outline-none ${C.muted}`}>
              <span className={`font-semibold ${C.ink}`}>{packageCount(shown.length)}</span>
              {type && shown.length > 0 && <span> dari {all.length}</span>}
            </p>
            {type && (
              <button type="button" onClick={showAll} className={`${TEXT_LINK} text-[14px]`}>
                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                Semua paket
              </button>
            )}
          </div>
        </Reveal>

        {shown.length > 0 ? (
          <Reveal className="mt-6 @3xl:mt-8">
            <ul
              ref={list}
              key={type}
              data-filtered={changed ? 'true' : 'false'}
              className={`grid items-start gap-5 @2xl:grid-cols-2 @2xl:gap-6 @5xl:grid-cols-3 @5xl:gap-8 @min-[120rem]:gap-x-14 @min-[150rem]:gap-x-10 ${
                packageColsWide(shown.length) === 4 ? '@min-[120rem]:grid-cols-4' : ''
              } ${HUGE_COLS[packageColsHuge(shown.length)]}`}
            >
              {shown.map((pkg, i) => (
                <li
                  key={pkg.index}
                  tabIndex={-1}
                  className={`lw-pop h-full min-w-0 focus:outline-none ${limited && i >= PREVIEW_PHONE ? 'hidden @2xl:block' : ''}`}
                  style={{ '--lw-delay': `${Math.min(i, 6) * 35}ms` } as CSSProperties}
                >
                  <Card m={m} pkg={pkg} orderLabel={orderLabel} calcLabel={calcLabel} onPlan={onPlan} />
                </li>
              ))}
            </ul>
            {limited && (
              <div className="mt-8 flex justify-center @2xl:hidden">
                <button type="button" onClick={showMore} className={`${BTN.outline} ${BTN.lg} w-full`}>
                  Lihat semua {shown.length} paket
                  <ChevronDown aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
          </Reveal>
        ) : (
          <div className={`mt-8 rounded-[18px] border border-dashed px-6 py-14 text-center ${C.line}`}>
            <p className={`mx-auto max-w-[32ch] ${TYPE.h3sm} ${C.ink}`}>{empty}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6">
              <button type="button" onClick={showAll} className={TEXT_LINK}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                Tampilkan semua paket
              </button>
              <TextLink action={m.sectionAction('custom')} label="Rancang trip sendiri" />
            </div>
          </div>
        )}

        {note && <p className={`mt-8 max-w-[80ch] text-[13.5px] leading-relaxed @3xl:mt-10 ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}

