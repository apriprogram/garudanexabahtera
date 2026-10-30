// Tur sehari (kunci `tours`, pita PASIR): kepala section (label + H2 kiri, kalimat kanan), lalu kartu foto TEGAK 4:5
// radius 28 — lencana kaca berisi lama tur di kiri atas, nama tur Playfair putih, tempat yang dikunjungi, dan harga
// "Mulai Rp750rb / mobil" di atas gradasi hijau tua di bagian bawah foto (teks ≥ 4,5:1); di bawah foto tombol pil garis
// "Pesan tur ini" (WhatsApp berisi nama, lama, harga, dan rute tur) dan tombol teks "Ubah rute" yang mengisi tempat tur
// ke Rancang tur lalu menggulir ke sana. Kisi 4 kolom (@7xl ≥ 1280px — di 1024px kartu 4 kolom terlalu sempit untuk nama
// + tempat + harga; ≥ 1920px: 5 kolom bila ≥ 5 tur, 4 tur dibatasi 560px per kartu; 3 tur = 3 kolom), 2 kolom (@2xl); HP: rel
// geser dengan snap (kartu 80%, kartu berikutnya mengintip) yang menggulir di dalam wadahnya sendiri. Foto membesar
// pelan saat disorot. JUJUR: harga contoh per mobil, tiket masuk & makan tidak termasuk (catatan di bawah kisi).
import { Clock, Route } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { NBSP, formatDecimal, formatPriceShort, tourMessage, type PesiarModel, type Tour } from './model';
import { PESIAR_PHOTOS } from './photos';
import { BTN, C, SECTION_PAD, SERIF, TYPE, WRAP } from './styles';
import { SectionHead } from './ui';

/**
 * Kolom kisi & `sizes` foto menurut JUMLAH tur (layar ≥ 1920px: kartu tidak melebar lewat ± 560px). 5+ tur → 5 kolom;
 * 4 tur (bawaan) → tetap 4 kolom, tiap kartu maks. 560px dan sisa ruang dibagi ke celah (kisi tetap selebar WRAP);
 * 3 tur → 3 kolom mulai 1280px (tanpa kolom kosong); 1–2 tur → 2 kolom.
 */
function tourGrid(count: number): { cols: string; sizes: string } {
  if (count >= 5) return { cols: '@7xl:grid-cols-4 @min-[120rem]:grid-cols-5', sizes: '(min-width: 1920px) 20vw, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 80vw' };
  if (count === 4) {
    return {
      cols: '@7xl:grid-cols-4 @min-[120rem]:grid-cols-[repeat(4,minmax(0,560px))] @min-[120rem]:justify-between',
      sizes: '(min-width: 2240px) 560px, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 80vw',
    };
  }
  if (count === 3) return { cols: '@7xl:grid-cols-3', sizes: '(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 80vw' };
  return { cols: '', sizes: '(min-width: 640px) 50vw, 80vw' };
}

function TourCard({ m, tour, sizes, bookLabel, editLabel, onEdit }: { m: PesiarModel; tour: Tour; sizes: string; bookLabel: string; editLabel: string; onEdit: ((tour: Tour) => void) | null }) {
  const price = formatPriceShort(tour.price);
  const book = bookLabel ? m.waWith(tourMessage(tour, m.companyName)) : null;
  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#1E2622]/10">
        <KitPhoto
          src={tour.image}
          alt={PESIAR_PHOTOS.alt(tour.image, `Foto tur ${tour.name}`)}
          sizes={sizes}
          className="aspect-[4/5]"
          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
        />
        <div aria-hidden className="ps-card-fade absolute inset-0" />
        {tour.hours > 0 && (
          <span className="absolute left-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/85 px-3.5 text-[13px] font-semibold text-[#1E2622] ring-1 ring-inset ring-black/10 backdrop-blur-md">
            <Clock aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {formatDecimal(tour.hours)}
            {NBSP}jam
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white @3xl:p-6">
          <h3 className={`${SERIF} text-balance text-[26px] font-medium leading-[1.1] @3xl:text-[28px]`}>{tour.name}</h3>
          {tour.stops.length > 0 && (
            <p className="mt-2 flex items-start gap-2 text-[13.5px] leading-snug text-white/90">
              <Route aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span className="text-pretty">{tour.stops.join(', ')}</span>
            </p>
          )}
          {price && (
            <p className="mt-3 text-[14px] text-white/90">
              Mulai <span className="text-[19px] font-semibold tabular-nums text-white">{price}</span> / mobil
            </p>
          )}
        </div>
      </div>
      {(book || (onEdit && editLabel)) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {book && (
            <ActionLink action={book} aria-label={`${bookLabel}: ${tour.name} (WhatsApp)`} className={`${BTN.outline} ${BTN.sm}`}>
              {bookLabel}
            </ActionLink>
          )}
          {onEdit && editLabel && (
            <button
              type="button"
              onClick={() => onEdit(tour)}
              aria-label={`${editLabel}: ${tour.name}`}
              className="inline-flex min-h-11 items-center text-[14px] font-medium text-[#1E2622] underline decoration-[#1E2622]/35 underline-offset-[5px] transition-colors hover:text-(--ps-ink) hover:decoration-(--ps-ink)"
            >
              {editLabel}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function Tours({ m, onEdit }: { m: PesiarModel; onEdit: ((tour: Tour) => void) | null }) {
  const { tours } = m;
  const items = m.tourList;
  const note = text(tours, 'note');
  const grid = tourGrid(items.length);
  return (
    <TemplateSection sectionKey="tours" className={`${SECTION_PAD} ${C.sand}`}>
      <div className={WRAP}>
        <SectionHead number={m.number('tours')} eyebrow={text(tours, 'eyebrow')} title={text(tours, 'title')} subtitle={text(tours, 'subtitle')} srTitle="Tur sehari" />
        <Reveal className="mt-10 @3xl:mt-14">
          <ul
            aria-label="Daftar tur"
            className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] @2xl:mx-0 @2xl:grid @2xl:grid-cols-2 @2xl:gap-x-6 @2xl:gap-y-12 @2xl:overflow-visible @2xl:px-0 @2xl:pb-0 ${grid.cols}`}
          >
            {items.map((tour) => (
              <li key={tour.index} className="w-[80%] shrink-0 snap-start @2xl:w-auto">
                <TourCard m={m} tour={tour} sizes={grid.sizes} bookLabel={text(tours, 'book_label')} editLabel={text(tours, 'edit_label')} onEdit={onEdit} />
              </li>
            ))}
          </ul>
        </Reveal>
        {note && <p className={`mt-8 max-w-[70ch] @3xl:mt-10 ${TYPE.small} ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
