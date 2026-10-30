// Armada (kunci `fleet`), putih: kepala section, lalu TAB besar per jenis bus (role=tablist; panah/Home/End) berisi ikon
// bus mini + nama + jumlah kursi. Panel: gambar bus tampak samping di atas garis lajur putus-putus dengan angka kursi
// raksasa samar di belakangnya (gambar dipilih dari jumlah kursi, ukuran relatif benar; foto pembeli 16:9 menggantikan
// gambar), lalu nama, "50 kursi · susunan 2-2 · 6 unit", chip fasilitas berikon, harga mulai + "contoh", catatan sopir
// & kernet, tombol "Pilih bus ini" (mengisi jenis bus di bilah penawaran hero, menggulir ke sana, fokus ke jumlah
// peserta) dan "Lihat denah kursi" (membuka denah tampak atas). Gerak: saat tab diganti, bus melaju masuk dari kiri
// (≤ 600 ms) dengan roda berputar; denah terbuka 300 ms.
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { BUS_WIDTH, seatMapSize } from './geometry';
import { formatRupiah, NBSP, seatPlan, type FleetUnit, type LajurModel } from './model';
import { LAJUR_PHOTOS } from './photos';
import { BTN, C, DISPLAY, GRID_GAP, LABEL_SM, SECTION_PAD, WRAP } from './styles';
import { FacilityIcon, SectionHead } from './ui';
import { BusGlyph, Coach, SeatMap } from './vehicles';

const hasToilet = (unit: FleetUnit) => unit.facilities.some((f) => /toilet|wc/i.test(f));

function Illustration({ unit, moved }: { unit: FleetUnit; moved: boolean }) {
  if (hasImage(unit.image)) {
    return (
      <KitPhoto
        src={unit.image}
        alt={LAJUR_PHOTOS.alt(unit.image, `Foto ${unit.name} ${unit.seats} kursi`)}
        sizes="(min-width: 1152px) 56vw, 100vw"
        fallback="none"
        className="aspect-[16/9] overflow-hidden rounded-[10px]"
      />
    );
  }
  const width = `${(BUS_WIDTH[unit.size] / BUS_WIDTH.big) * 100}%`;
  // Panggung abu: HP/tablet berbingkai 16:8 / 16:7; layar lebar setinggi kolom info di sebelahnya (rata bawah dengan
  // tombol). Bus + garis lajur di tengah panggung; garis lajur diam, hanya bus yang melaju masuk.
  return (
    <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-[10px] bg-[#F3F2EE] px-[6%] @3xl:aspect-[16/7] @6xl:aspect-auto @6xl:h-full @6xl:py-10">
      <div className="relative flex w-full justify-center pb-[3px]">
        {/* Garis lajur tepat di bawah roda (gambar bus berakhir di garis tanah), selebar 92% panggung */}
        <span aria-hidden className="lj-lane-line absolute -inset-x-[2.3%] bottom-0 h-[3px]" />
        <div key={unit.index} data-moved={moved ? 'true' : 'false'} className="lj-drive relative" style={{ width } as CSSProperties}>
          <Coach size={unit.size} wheelClassName="lj-wheel" className="block h-auto w-full" />
        </div>
      </div>
    </div>
  );
}

export function Fleet({ m, onChoose }: { m: LajurModel; onChoose: (index: number) => void }) {
  const section = m.fleetSection;
  const fleet = m.fleet;
  const baseId = useId();
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, fleet.length - 1);
  const unit = fleet[index];
  if (!unit) return null;
  const many = fleet.length > 1;
  /** 4–6 jenis bus: tab jadi rel geser (kisi n kolom terlalu sempit untuk nama kelas di HP/tablet) */
  const rail = fleet.length > 3;
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;
  const mapId = `${baseId}-map`;
  const plan = seatPlan(unit.seats, unit.layout);
  const toilet = hasToilet(unit);
  const biggest = fleet.reduce((max, u) => Math.max(max, seatMapSize(seatPlan(u.seats, u.layout), hasToilet(u)).w), 1);
  const mapWidth = `${Math.round((seatMapSize(plan, toilet).w / biggest) * 100)}%`;
  const priceNote = text(section, 'price_note');
  const includedNote = text(section, 'included_note');
  const chooseLabel = text(section, 'choose_label');
  const mapLabel = text(section, 'map_label') || 'Lihat denah kursi';
  const canChoose = !!chooseLabel && m.shown('hero');

  const select = (i: number, focus = true) => {
    const next = (i + fleet.length) % fleet.length;
    if (next !== index) setMoved(true);
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: fleet.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };
  const details = [`${unit.seats} kursi`, `susunan ${unit.layout[0]}-${unit.layout[1]}`, unit.units > 0 ? `${unit.units} unit` : ''].filter(Boolean);

  return (
    <TemplateSection sectionKey="fleet" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.fleet} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Armada" />

        {many && (
          <Reveal className="mt-10 @3xl:mt-12">
            <div
              role="tablist"
              aria-label="Pilih jenis bus"
              onKeyDown={onKeyDown}
              // Garis tepi = border (bukan ring inset): latar putih tiap tab menutupi ring inset sehingga tepi hilang.
              // ≤ 3 jenis: kisi n kolom. 4–6 jenis: rel geser mendatar (tab sama lebar memenuhi baris bila muat, tidak
              // pernah lebih sempit dari namanya; yang tidak muat digeser, tab terpilih ikut tergulir saat difokus).
              className={
                rail
                  ? 'flex snap-x snap-mandatory overflow-x-auto rounded-[10px] border border-[#14161A]/15 [scrollbar-width:thin]'
                  : 'grid overflow-hidden rounded-[10px] border border-[#14161A]/15'
              }
              style={rail ? undefined : { gridTemplateColumns: `repeat(${fleet.length}, minmax(0, 1fr))` }}
            >
              {fleet.map((u, i) => {
                const selected = i === index;
                return (
                  <button
                    key={u.index}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={tabId(i)}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={(e) => {
                      select(i, false);
                      if (rail) e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                    }}
                    // HP: nama di atas jumlah kursi · tablet: ikon bus di kiri nama & kursi (nama utuh, tanpa "…") ·
                    // layar lebar (≤ 3 jenis): satu baris ikon, nama, kursi di kanan; rel 4–6 jenis tetap bertumpuk
                    className={`relative grid min-h-16 min-w-0 grid-cols-1 content-center items-center justify-items-start gap-x-3 gap-y-0.5 px-2.5 py-3 text-left transition-colors duration-200 @3xl:min-h-20 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:px-5 ${
                      rail ? 'shrink-0 grow basis-0 snap-start min-w-[8.5rem] @3xl:min-w-[12.5rem]' : '@5xl:flex @5xl:gap-4 @5xl:px-6'
                    } ${i > 0 ? 'border-l border-[#14161A]/15' : ''} ${selected ? 'bg-[#14161A] text-white' : 'bg-white text-[#14161A] hover:bg-[#F3F2EE]'}`}
                  >
                    <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${selected ? 'bg-(--tpl-accent)' : 'bg-transparent'}`} />
                    <BusGlyph size={u.size} className="hidden shrink-0 @3xl:row-span-2 @3xl:block" />
                    <span
                      className={`min-w-0 max-w-full ${DISPLAY} text-[12.5px] font-medium leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] @3xl:text-[16px] ${
                        rail ? '' : '@5xl:truncate @5xl:text-[17px] @5xl:tracking-normal'
                      }`}
                    >
                      {u.name}
                    </span>
                    <span className={`text-[12.5px] tabular-nums @3xl:text-[13px] ${rail ? '' : '@5xl:ml-auto @5xl:text-[14px]'} ${selected ? 'text-white/[0.72]' : C.muted}`}>
                      {u.seats} kursi
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        <div
          id={panelId}
          role={many ? 'tabpanel' : undefined}
          aria-labelledby={many ? tabId(index) : undefined}
          className={`grid grid-cols-1 gap-y-8 @6xl:grid-cols-12 ${GRID_GAP} ${many ? 'mt-6 @3xl:mt-8' : 'mt-10 @3xl:mt-12'}`}
        >
          <div className="min-w-0 @6xl:col-span-7 @6xl:row-start-1">
            <Illustration unit={unit} moved={moved} />
          </div>

          <div className="min-w-0 @6xl:col-span-5 @6xl:col-start-8 @6xl:row-start-1 @6xl:self-start @6xl:pt-2">
            <h3 className={`${DISPLAY} text-[26px] font-bold leading-tight tracking-[-0.02em] @3xl:text-[30px] ${C.ink}`}>{unit.name}</h3>
            <p className={`mt-2 text-[15px] tabular-nums ${C.muted}`}>{details.join(' · ')}</p>
            {unit.facilities.length > 0 && (
              <ul aria-label="Fasilitas" className="mt-6 flex flex-wrap gap-2">
                {unit.facilities.map((f) => (
                  <li key={f} className="inline-flex min-h-9 items-center gap-2 rounded-[6px] bg-[#F3F2EE] px-3 text-[13.5px] font-medium text-[#14161A]">
                    <FacilityIcon name={f} className="h-4 w-4 text-(--lj-ink)" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            <div className={`mt-7 border-t pt-6 ${C.line}`}>
              <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${C.ink}`}>
                {unit.price > 0 && <span className={`${LABEL_SM} ${C.muted}`}>Mulai</span>}
                <span className={`${DISPLAY} text-[28px] font-bold tabular-nums tracking-[-0.02em] @3xl:text-[32px]`}>
                  {unit.price > 0 ? formatRupiah(unit.price) : 'Harga menyusul'}
                </span>
                {unit.price > 0 && unit.priceUnit && <span className={`text-[15px] ${C.muted}`}>{unit.priceUnit.split(' ').join(NBSP)}</span>}
              </p>
              {(priceNote || includedNote) && (
                <p className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] ${C.muted}`}>
                  {includedNote && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#14161A]">
                      <Check aria-hidden className="h-4 w-4 text-(--lj-ink)" strokeWidth={2.4} />
                      {includedNote}
                    </span>
                  )}
                  {priceNote && <span>{priceNote}</span>}
                </p>
              )}
            </div>
            <div className="mt-7 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
              {canChoose && (
                <button type="button" onClick={() => onChoose(unit.index)} className={`${BTN.primary} ${BTN.lg}`} aria-label={`${chooseLabel}: ${unit.name} ${unit.seats} kursi`}>
                  {chooseLabel}
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" />
                </button>
              )}
              <button
                type="button"
                aria-expanded={mapOpen}
                aria-controls={mapId}
                onClick={() => setMapOpen((v) => !v)}
                className={`${BTN.ghost} ${BTN.lg}`}
              >
                {mapLabel}
                <ChevronDown aria-hidden className={`lj-acc h-4 w-4 ${mapOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div id={mapId} data-open={mapOpen ? 'true' : 'false'} inert={!mapOpen} className="lj-collapse min-w-0 @6xl:col-span-7 @6xl:row-start-2">
            <div className="overflow-hidden">
              <div className={`rounded-[10px] border px-4 py-5 @3xl:px-6 ${C.line}`}>
                <p className={`text-[14px] ${C.ink}`}>
                  <span className="font-semibold">Denah kursi {unit.name}</span>
                  <span className={C.muted}>
                    {' '}
                    · {unit.seats} kursi penumpang, susunan {unit.layout[0]}-{unit.layout[1]}
                    {plan.back > 0 ? `, ${plan.back} di bangku belakang` : ''}
                    {toilet ? ', toilet di belakang' : ''}. Depan bus di kanan.
                  </span>
                </p>
                <div className="mt-4" style={{ width: mapWidth }}>
                  <SeatMap key={unit.index} plan={plan} toilet={toilet} className="block h-auto w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
