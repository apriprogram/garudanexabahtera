// Kalkulator rombongan (kunci `convoy`), abu hangat: kepala section, lalu kartu putih selebar wadah — angka peserta
// besar yang bisa diketik + penggeser 10–300 (trek amber terisi), JALAN KONVOI (aspal tinta + marka putih) tempat ikon
// bus berbaris sesuai rekomendasi (ukuran relatif benar; bus yang berubah melaju masuk ≤ 300 ms), dan hasil: "2 Big bus
// + 1 Medium bus", "133 kursi · sisa 13 kursi", "Perkiraan mulai Rp8.700.000 / hari", tombol amber "Minta penawaran
// untuk 120 peserta" (WhatsApp berisi rekomendasi). Data bus dari section Armada; perhitungan di ./model
// (recommendConvoy: jumlah bus paling sedikit, lalu kursi kosong paling sedikit). Harga = perkiraan dari harga contoh.
import { useId, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { BUS_WIDTH } from './geometry';
import { NBSP, convoyLabel, convoyMessage, convoyPriceUnit, convoySeats, convoySlots, formatRupiah, parseWhole, recommendConvoy, type FleetUnit, type LajurModel } from './model';
import { BTN, C, CARD, DISPLAY, LABEL_SM, SECTION_PAD, WRAP } from './styles';
import { SectionHead } from './ui';
import { Coach } from './vehicles';

const MIN = 10;
const MAX = 300;

type Slot = { key: string; unit: FleetUnit };

/**
 * Satu baris jalan: bus berbaris di tengah (ukuran relatif benar, roda tepat di aspal), lalu aspal dengan marka.
 * `big` = lebar big bus dalam % lebar baris (8 per baris di layar lebar, 4 per baris di HP).
 */
function RoadRow({ slots, max, offset = 0, className = '' }: { slots: Slot[]; max: number; offset?: number; className?: string }) {
  // Bus sebesar mungkin (maks. `max`% untuk big bus) selama seluruh baris muat di ±94% lebar jalan
  const relative = slots.reduce((sum, s) => sum + BUS_WIDTH[s.unit.size] / BUS_WIDTH.big, 0);
  const big = relative > 0 ? Math.min(max, (94 - 1.4 * (slots.length - 1)) / relative) : max;
  return (
    <div className={className}>
      <div className="flex min-h-[44px] items-end justify-center gap-[1.4%] px-[3%] @3xl:min-h-[60px] @6xl:min-h-[72px]">
        {slots.map((slot, i) => (
          <div
            key={`${slot.key}-${slot.unit.index}`}
            className="lj-slide shrink-0"
            style={{ width: `${(BUS_WIDTH[slot.unit.size] / BUS_WIDTH.big) * big}%`, '--lj-delay': `${Math.min(i + offset, 7) * 40}ms` } as CSSProperties}
          >
            <Coach size={slot.unit.size} className="block h-auto w-full" wheelClassName="lj-wheel" />
          </div>
        ))}
      </div>
      <div className="lj-asphalt h-5 @3xl:h-6" />
    </div>
  );
}

export function Convoy({ m }: { m: LajurModel }) {
  const section = m.convoy;
  const baseId = useId();
  const initial = parseWhole(text(section, 'default_people'), MIN, MAX, 120);
  const [people, setPeople] = useState(initial);
  const [draft, setDraft] = useState<string | null>(null);
  const convoy = recommendConvoy(m.fleet, people);
  // Perkiraan = jumlah harga contoh, hanya bila semua bus berharga dan satuannya sama (satuan dari CMS, mis. "/ hari")
  const priceUnit = convoy ? convoyPriceUnit(convoy) : null;
  const slots: Slot[] = convoySlots(convoy);
  const label = text(section, 'button_label');
  const action = label ? m.waWith(convoyMessage(people, convoy, m.companyName)) : null;
  const note = text(section, 'note');
  const fill = `${((people - MIN) / (MAX - MIN)) * 100}%`;
  const typed = draft ?? String(people);
  // Lebar isian mengikuti jumlah digit (angka tabular): kata "peserta" tetap menempel pada angkanya
  const digits = `${Math.max(2, typed.length) + 0.25}ch`;

  const commit = (raw: string) => {
    const n = parseWhole(raw, MIN, MAX, people);
    setPeople(n);
    setDraft(null);
  };

  return (
    <TemplateSection sectionKey="convoy" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(section, 'eyebrow')} index={m.numbers.convoy} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Kalkulator rombongan" />

        <Reveal className={`mt-10 @3xl:mt-12 ${CARD} p-4 @3xl:p-6 @5xl:p-8`}>
          <div className="grid gap-6 @5xl:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] @5xl:items-center @5xl:gap-10">
            <div className="min-w-0">
              <label htmlFor={`${baseId}-people`} className={`${LABEL_SM} ${C.muted}`}>
                Jumlah peserta
              </label>
              <div className="mt-1 flex items-baseline gap-3">
                <input
                  id={`${baseId}-people`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  value={typed}
                  style={{ width: digits }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setDraft(value);
                    const n = Number(value);
                    if (value && n >= MIN && n <= MAX) setPeople(n);
                  }}
                  onBlur={(e) => commit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
                  }}
                  aria-describedby={`${baseId}-range-help`}
                  className={`min-w-0 border-b-2 border-[#14161A]/15 bg-transparent pb-1 ${DISPLAY} text-[48px] font-bold leading-none tabular-nums tracking-[-0.03em] text-[#14161A] transition-colors focus:border-(--tpl-accent) focus:outline-none @3xl:text-[56px]`}
                />
                <span className={`text-[16px] font-medium ${C.muted}`}>peserta</span>
              </div>
              <p id={`${baseId}-range-help`} className={`mt-2 text-[12.5px] ${C.muted}`}>
                Ketik atau geser, {MIN}–{MAX} peserta.
              </p>
            </div>
            <div className="min-w-0">
              <input
                type="range"
                min={MIN}
                max={MAX}
                step={1}
                value={people}
                aria-label="Geser jumlah peserta"
                aria-valuetext={`${people} peserta`}
                onChange={(e) => {
                  setPeople(Number(e.target.value));
                  setDraft(null);
                }}
                className="lj-range h-11 w-full cursor-pointer"
                style={{ '--lj-fill': fill } as CSSProperties}
              />
              <div aria-hidden className={`mt-1 flex justify-between text-[12px] tabular-nums ${C.muted}`}>
                {[MIN, 100, 200, MAX].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Jalan konvoi: HP 2 baris × 4, layar lebar 1 baris × 8 (dekoratif; hasilnya tertulis di bawah) */}
          <div aria-hidden className="mt-7 overflow-hidden rounded-[8px] bg-[#F3F2EE] pt-5 @3xl:mt-8 @3xl:pt-7">
            <RoadRow slots={slots} max={18} className="hidden @3xl:block" />
            <div className="@3xl:hidden">
              <RoadRow slots={slots.slice(0, 4)} max={30} />
              {slots.length > 4 && <RoadRow slots={slots.slice(4)} max={30} offset={4} className="pt-4" />}
            </div>
          </div>

          <div className={`mt-6 grid grid-cols-1 gap-5 border-t pt-6 @5xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] @5xl:items-center @5xl:gap-10 ${C.line}`}>
            <p role="status" className="min-w-0">
              {convoy ? (
                <>
                  <span className={`block ${DISPLAY} text-[19px] font-medium leading-snug tracking-[-0.01em] @3xl:text-[22px] ${C.ink}`}>{convoyLabel(convoy)}</span>
                  <span className={`mt-1 block text-[14.5px] tabular-nums ${C.muted}`}>
                    {convoySeats(convoy)} · {people} peserta
                  </span>
                </>
              ) : (
                <span className={`block text-[16px] font-medium ${C.ink}`}>Untuk {people} peserta, susunan armadanya dibantu admin.</span>
              )}
            </p>
            {convoy && convoy.price > 0 && priceUnit !== null && (
              <p className="min-w-0">
                <span className={`block ${LABEL_SM} ${C.muted}`}>Perkiraan mulai</span>
                <span className={`mt-1 block ${DISPLAY} text-[22px] font-bold tabular-nums tracking-[-0.02em] @3xl:text-[26px] ${C.ink}`}>
                  {formatRupiah(convoy.price)}
                  {priceUnit && <span className={`ml-1.5 font-sans text-[14px] font-medium tracking-normal ${C.muted}`}>{priceUnit.split(' ').join(NBSP)}</span>}
                </span>
              </p>
            )}
            {action && label && (
              // Label boleh terlipat di HP sempit (tanpa terpotong): tombol tumbuh ke bawah. `!` wajib: BUTTON sudah membawa
              // whitespace-nowrap dan di CSS hasil build kelas itu MENANG atas whitespace-normal (urutan utilitas), jadi dulu
              // "Minta penawaran untuk 120 peserta" keluar 21px dari tombol di HP 320px (label CMS lebih panjang → halaman
              // bergeser ke samping).
              <ActionLink
                action={action}
                className={`${BTN.primary} min-h-12 w-full whitespace-normal! px-6 py-3 text-center leading-snug @3xl:min-h-14 @5xl:w-auto @5xl:whitespace-nowrap!`}
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                <span>
                  {label} untuk {people} peserta
                </span>
              </ActionLink>
            )}
          </div>
          {note && <p className={`mt-4 text-[13px] leading-snug ${C.muted}`}>{note}</p>}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
