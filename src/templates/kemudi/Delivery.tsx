// Antar-jemput (kunci `delivery`), pita putih: kepala section, lalu kiri (7 kolom, rata atas dengan peta; ≥ 1920px kartu
// 2 kolom) daftar ZONA sebagai tombol pilihan (aria-pressed; yang pertama terpilih): foto kecil 56px (atau nomor), nama,
// waktu tempuh perkiraan, chip biaya mono ("Gratis" hijau, "+Rp50.000" abu; HP sempit di bawah keterangan). Kanan (5
// kolom): PETA KOTA ABSTRAK (bukan peta asli,
// rasio 5:4 = viewBox, pin diposisikan persen) dalam kartu abu radius 24:
// jalan, jalan lingkar, sungai, taman, penanda garasi + pin bernomor; rute garasi → zona terpilih tergambar (1,2 dtk) dan
// penanda mobil mengikutinya (1,4 dtk, requestAnimationFrame + getPointAtLength) sekali saat terlihat dan setiap zona
// diganti. Gerak mati → rute utuh, mobil langsung di tujuan. Catatan jujur: waktu perkiraan, biaya dikonfirmasi admin.
import { Info } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { MAP_GARAGE, MAP_H, MAP_SLOTS, MAP_W } from './geometry';
import { useSeenOnce } from './hooks';
import { pad2, type KemudiModel } from './model';
import { C, DISPLAY, GRID_GAP, MONO, SECTION_PAD, WRAP } from './styles';
import { SectionHead } from './ui';
import { CityMap } from './scenes';

const pct = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`;

export function Delivery({ m }: { m: KemudiModel }) {
  const { delivery } = m;
  const zones = m.zones.slice(0, MAP_SLOTS.length);
  const [selected, setSelected] = useState(0);
  const motion = useMotionEnabled();
  const mapRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const seen = useSeenOnce(mapRef, motion);
  const index = Math.min(selected, zones.length - 1);
  const slot = MAP_SLOTS[index];
  const garageLabel = text(delivery, 'garage_label');
  const note = text(delivery, 'note');
  const animate = motion && seen;

  // Penanda mobil mengikuti rute terpilih (sekali per pilihan); gerak mati / tanpa getPointAtLength → langsung di tujuan
  useEffect(() => {
    const path = routeRef.current;
    const marker = markerRef.current;
    if (!slot || !marker) return;
    const place = (x: number, y: number, angle: number) => marker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    const endAngle = (() => {
      const pts = slot.route.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      const n = pts.length;
      return n >= 4 ? (Math.atan2(pts[n - 1] - pts[n - 3], pts[n - 2] - pts[n - 4]) * 180) / Math.PI : 0;
    })();
    if (!animate || !path || typeof path.getTotalLength !== 'function' || typeof window.requestAnimationFrame !== 'function') {
      place(slot.pin[0], slot.pin[1], endAngle);
      return;
    }
    if (!seen) return;
    const total = path.getTotalLength();
    const duration = 1400;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const at = eased * total;
      const p = path.getPointAtLength(at);
      const q = path.getPointAtLength(Math.min(total, at + 1));
      const angle = at + 1 <= total ? (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI : endAngle;
      place(p.x, p.y, angle);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [slot, animate, seen]);

  if (zones.length === 0) return null;

  return (
    <TemplateSection sectionKey="delivery" className={`${SECTION_PAD} ${C.white}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(delivery, 'eyebrow')} index={m.index('delivery')} title={text(delivery, 'title')} subtitle={text(delivery, 'subtitle')} srTitle="Antar-jemput" tone="white" />

        <div className={`mt-10 grid gap-y-8 @3xl:mt-12 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <Reveal className="min-w-0 @5xl:col-span-7 @5xl:self-start">
            {/* ≥ 1920px: zona jadi kartu foto 2 kolom (± 500px) setinggi peta, bukan baris 1000px dengan biaya jauh di kanan */}
            <ul aria-label="Zona antar-jemput" className="grid gap-2.5 @min-[120rem]:grid-cols-2 @min-[120rem]:gap-4">
              {zones.map((zone, i) => {
                const active = i === index;
                return (
                  <li key={`${zone.name}-${i}`} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(i)}
                      className={`flex h-full w-full min-w-0 items-center gap-4 rounded-[20px] p-3 pr-4 text-left ring-1 ring-inset transition-colors duration-200 @min-[120rem]:flex-col @min-[120rem]:items-stretch @min-[120rem]:gap-3.5 @min-[120rem]:pr-3 ${
                        active ? 'bg-(--tpl-accent-50) ring-(--tpl-accent)' : 'bg-white ring-[#0D1117]/[0.08] hover:bg-[#F8F9FB] hover:ring-[#0D1117]/20'
                      }`}
                    >
                      {hasImage(zone.image) ? (
                        <span aria-hidden className="shrink-0">
                          <KitPhoto
                            src={zone.image}
                            alt=""
                            sizes="(min-width: 1920px) 480px, 56px"
                            fallback="none"
                            className="h-14 w-14 rounded-[14px] @min-[120rem]:h-[150px] @min-[120rem]:w-full"
                          />
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#F2F4F7] text-[15px] @min-[120rem]:h-[150px] @min-[120rem]:w-full ${MONO} ${C.ink}`}
                        >
                          {pad2(i + 1)}
                        </span>
                      )}
                      {/* Teks + chip biaya: chip di kanan bila muat, turun ke bawah keterangan bila sempit (HP), jadi nama &
                          waktu tempuh tidak terjepit menjadi patahan satu kata */}
                      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 @min-[120rem]:flex-none @min-[120rem]:px-1 @min-[120rem]:pb-1">
                        <span className="min-w-0 grow basis-[12.5rem]">
                          <span className={`block text-pretty ${DISPLAY} text-[17px] font-semibold leading-tight tracking-[-0.01em] ${C.ink}`}>{zone.name}</span>
                          {zone.detail && <span className={`mt-1 block text-pretty text-[13.5px] leading-snug ${C.muted}`}>{zone.detail}</span>}
                        </span>
                        {zone.fee && (
                          <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] ${MONO} ${zone.free ? 'bg-[#E7F4EE] text-[#0F7B4F]' : 'bg-[#F2F4F7] text-[#0D1117]/85'}`}>{zone.fee}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {note && (
              <p className={`mt-5 flex items-start gap-2.5 text-[13.5px] leading-snug ${C.muted}`}>
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {note}
              </p>
            )}
          </Reveal>

          <Reveal delay={120} className="min-w-0 @5xl:col-span-5">
            <div ref={mapRef} data-seen={seen ? 'true' : 'false'} className="km-map relative aspect-[5/4] overflow-hidden rounded-[24px] bg-[#E9EDF2] ring-1 ring-inset ring-[#0D1117]/[0.06]">
              <CityMap route={slot?.route ?? ''} routeKey={`${index}-${seen ? 1 : 0}`} routeRef={routeRef} markerRef={markerRef} />
              <span aria-hidden className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2" style={{ left: pct(MAP_GARAGE[0], MAP_W), top: pct(MAP_GARAGE[1], MAP_H) }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0D1117] text-white ring-2 ring-white">
                  <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16 2.5a13.5 13.5 0 1 1 0 27a13.5 13.5 0 1 1 0-27zM16 6a10 10 0 1 0 0 20a10 10 0 1 0 0-20z" />
                    <path d="M6 14.5h6.6a3.6 3.6 0 0 1 6.8 0H26v3h-6.8l-1 8.6h-4.4l-1-8.6H6z" />
                  </svg>
                </span>
              </span>
              {zones.map((_, i) => {
                const [x, y] = MAP_SLOTS[i].pin;
                const active = i === index;
                return (
                  <span
                    key={`pin-${i}`}
                    aria-hidden
                    className={`km-pin absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-bold ring-2 transition-colors duration-200 ${MONO} ${
                      active ? 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-white' : 'bg-white text-[#0D1117] ring-[#0D1117]/15'
                    }`}
                    style={{ left: pct(x, MAP_W), top: pct(y, MAP_H), '--km-delay': `${i * 90}ms` } as CSSProperties}
                  >
                    {i + 1}
                  </span>
                );
              })}
              <p aria-hidden className={`absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-[12px] font-semibold backdrop-blur-sm ${C.ink}`}>
                <span className="h-2.5 w-2.5 rounded-[3px] bg-[#0D1117]" />
                {garageLabel || 'Garasi'}
                <span className="mx-1 h-3 w-px bg-[#0D1117]/20" />
                <span className="h-[3px] w-4 rounded-full bg-(--tpl-accent)" />
                Rute antar
              </p>
            </div>
            <p className="sr-only" aria-live="polite">
              {zones[index] ? `Rute dari ${garageLabel || 'garasi'} ke ${zones[index].name}${zones[index].fee ? `, biaya ${zones[index].fee}` : ''}` : ''}
            </p>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}

