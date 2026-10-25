// Custom casing (kunci `custom`): panel tint aksen; kiri label + H2 (kata sorotan) + deskripsi + langkah bernomor +
// harga; kanan "studio" putih — mockup casing (bingkai warna casing, modul kamera SVG) berisi foto contoh atau foto
// pengunjung, dengan kontrol: pilih foto, perbesar, warna casing (daftar dari CMS), tipe HP (dibagi dengan pencarian per
// tipe), dan tombol pesan WhatsApp berisi tipe + warna. Foto pengunjung HANYA dibaca di browser (URL.createObjectURL),
// tidak dikirim ke server dan tidak disimpan; dilepas saat diganti / komponen dilepas. Foto bisa digeser (seret, atau
// tombol panah saat mockup difokus) dan selalu menutupi bidang casing.
import { ImagePlus, Lock, Move, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, safeImage, text } from '../shared/utils';
import { useAspect } from './hooks';
import { DEFAULT_CASE_FRAME, brandsOf, caseColors, type GadgetkuModel, type Shop } from './model';
import { GADGETKU_PHOTOS } from './photos';
import { BTN, C, CARD, TYPE_G } from './styles';
import { Highlighted, PillLink, SectionLabel } from './ui';

/** Rasio tinggi ÷ lebar bidang foto di dalam mockup (sebelum terukur). */
const FRAME_RATIO = 2.13;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Modul kamera (kaca gelap dengan tiga lensa) di pojok kiri atas mockup. SVG dekoratif. */
function CameraModule() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false" className="pointer-events-none absolute left-[7%] top-[3.6%] w-[42%]">
      <rect x="2" y="2" width="96" height="96" rx="26" fill="#1B1C20" fillOpacity=".92" stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5" />
      {[
        [30, 30],
        [30, 70],
        [70, 50],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="15.5" fill="#0A0A0C" stroke="#4A4C52" strokeWidth="3" />
          <circle cx={cx} cy={cy} r="6" fill="#20232A" />
          <circle cx={cx - 3} cy={cy - 3} r="2" fill="#ffffff" fillOpacity=".5" />
        </g>
      ))}
      <circle cx="72" cy="22" r="5" fill="#E9E3C9" fillOpacity=".85" />
    </svg>
  );
}

export function CustomCase({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const { custom } = m;
  const inputId = useId();
  const hintId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [upload, setUpload] = useState<string>('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [imageRatio, setImageRatio] = useState(0);
  const [colorKey, setColorKey] = useState('');
  const frameRatio = useAspect(frame, FRAME_RATIO);

  // Foto pengunjung dilepas dari memori saat diganti atau saat komponen dilepas
  useEffect(() => {
    if (!upload) return;
    return () => URL.revokeObjectURL(upload);
  }, [upload]);

  const sample = safeImage(text(custom, 'image'));
  const src = upload || sample;
  const asset = !upload && sample ? GADGETKU_PHOTOS.asset(sample) : null;
  // Pilihan warna dari CMS (`custom.case_colors`); pilihan yang hilang setelah diedit → warna pertama, kosong → tanpa pilihan
  const colors = caseColors(text(custom, 'case_colors'));
  const caseColor = colors.find((c) => c.key === colorKey) ?? colors[0] ?? null;
  const phone = m.models.find((p) => p.id === shop.phoneId) ?? null;
  const brands = brandsOf(m.models);
  const eyebrow = text(custom, 'eyebrow');
  const title = text(custom, 'title');
  const subtitle = text(custom, 'subtitle');
  const priceLabel = text(custom, 'price_label');
  const priceNote = text(custom, 'price_note');
  const steps = list(custom, 'steps', 3).filter((item) => field(item, 'title') || field(item, 'text'));
  const subject = `casing custom untuk ${phone?.label ?? 'HP saya'}${caseColor ? `, warna ${caseColor.label.toLowerCase()}` : ''}. Fotonya saya kirim di chat ini`;
  const action = resolveAction(text(custom, 'button_url'), m.orderAction(subject));
  const buttonLabel = text(custom, 'button_label') || 'Pesan Casing Custom';
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);

  // Ukuran foto (persen bidang) agar selalu menutupi bidang casing: "cover" × perbesaran
  const ratio = imageRatio || frameRatio;
  const width = zoom * Math.max(1, frameRatio / ratio) * 100;
  const height = zoom * Math.max(1, ratio / frameRatio) * 100;

  const resetView = () => {
    setZoom(1);
    setPos({ x: 0.5, y: 0.5 });
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    setError('');
    setImageRatio(0);
    resetView();
    setUpload(URL.createObjectURL(file));
  };

  /** Geser foto `dx`, `dy` piksel layar (positif = ke kanan/bawah). */
  const move = (dx: number, dy: number, from = pos) => {
    const el = frame.current;
    if (!el) return;
    const slackX = (el.clientWidth * (width - 100)) / 100;
    const slackY = (el.clientHeight * (height - 100)) / 100;
    setPos({ x: slackX > 0 ? clamp01(from.x - dx / slackX) : 0.5, y: slackY > 0 ? clamp01(from.y - dy / slackY) : 0.5 });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!src) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start) move(e.clientX - start.x, e.clientY - start.y, { x: start.px, y: start.py });
  };
  const onPointerEnd = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = 16;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(-step, 0),
      ArrowRight: () => move(step, 0),
      ArrowUp: () => move(0, -step),
      ArrowDown: () => move(0, step),
      '+': () => setZoom((z) => Math.min(ZOOM_MAX, z + 0.1)),
      '=': () => setZoom((z) => Math.min(ZOOM_MAX, z + 0.1)),
      '-': () => setZoom((z) => Math.max(ZOOM_MIN, z - 0.1)),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return (
    <TemplateSection sectionKey="custom" className={SECTION_Y}>
      <div className={CONTAINER}>
        <div className={`${CARD.panel} grid gap-10 bg-(--gk-tint) p-5 @3xl:p-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-10 @6xl:p-14`}>
          <div className="min-w-0 @5xl:col-span-5">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[14ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                <Highlighted title={title} highlight={text(custom, 'highlight')} tone="light" />
              </Reveal>
            )}
            {subtitle && (
              <Reveal as="p" delay={160} className={`mt-4 max-w-[46ch] ${TYPE_G.lead} text-[#3D4148]`}>
                {subtitle}
              </Reveal>
            )}
            {steps.length > 0 && (
              <ol className="mt-8 space-y-4">
                {steps.map((step, i) => (
                  <Reveal as="li" key={`${field(step, 'title')}-${i}`} delay={200 + stagger(i, 80)} className="flex gap-4">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B0C0E] text-[14px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 pt-1">
                      {field(step, 'title') && <span className="block text-[16px] font-semibold text-[#0B0C0E]">{field(step, 'title')}</span>}
                      {field(step, 'text') && <span className="mt-0.5 block text-[14.5px] leading-relaxed text-[#3D4148]">{field(step, 'text')}</span>}
                    </span>
                  </Reveal>
                ))}
              </ol>
            )}
            {(priceLabel || priceNote) && (
              <Reveal delay={320} className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {priceLabel && <span className={`${TYPE_G.price} text-[26px] text-[#0B0C0E] @3xl:text-[30px]`}>{priceLabel}</span>}
                {priceNote && <span className="text-[14px] text-[#3D4148]">{priceNote}</span>}
              </Reveal>
            )}
          </div>

          <Reveal variant="fade" delay={120} className={`min-w-0 p-5 @3xl:p-8 @5xl:col-span-7 ${CARD.white}`}>
            <div className="grid items-center gap-8 @2xl:grid-cols-[auto_1fr] @2xl:gap-10">
              <div className="flex flex-col items-center">
                {/* Mockup: bingkai warna casing, bidang foto yang bisa digeser, modul kamera */}
                <div
                  className="relative aspect-[72/148] w-[210px] rounded-[38px] p-[7px] ring-1 ring-inset ring-black/10 transition-colors @3xl:w-[240px] @3xl:rounded-[42px]"
                  style={{ background: caseColor?.frame ?? DEFAULT_CASE_FRAME }}
                >
                  <div
                    ref={frame}
                    role="group"
                    aria-roledescription="pratinjau casing"
                    aria-label={`Pratinjau casing ${caseColor ? `${caseColor.label.toLowerCase()} ` : ''}${upload ? 'dengan foto pilihanmu' : 'dengan foto contoh'}`}
                    aria-describedby={hintId}
                    tabIndex={src ? 0 : -1}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerEnd}
                    onPointerCancel={onPointerEnd}
                    onKeyDown={onKeyDown}
                    className={`relative h-full w-full touch-none select-none overflow-hidden rounded-[31px] bg-[#E9EAEE] outline-offset-4 @3xl:rounded-[35px] ${src ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    {src ? (
                      <img
                        key={src}
                        src={src}
                        srcSet={asset?.srcSet}
                        sizes={asset ? '480px' : undefined}
                        width={asset?.width}
                        height={asset?.height}
                        alt={upload ? 'Foto pilihanmu di pratinjau casing' : GADGETKU_PHOTOS.alt(sample, 'Foto contoh di pratinjau casing custom')}
                        draggable={false}
                        decoding="async"
                        loading={upload ? 'eager' : 'lazy'}
                        onLoad={(e) => {
                          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                          if (w > 0 && h > 0) setImageRatio(h / w);
                        }}
                        onError={() => {
                          if (!upload) return;
                          setError('Foto ini tidak bisa ditampilkan browser. Coba foto JPG atau PNG.');
                          setUpload('');
                        }}
                        style={{ width: `${width}%`, height: `${height}%`, left: `${(100 - width) * pos.x}%`, top: `${(100 - height) * pos.y}%` }}
                        className="pointer-events-none absolute max-w-none"
                      />
                    ) : (
                      <span className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] ${C.muted}`}>
                        <ImagePlus className="h-8 w-8" aria-hidden />
                        Belum ada foto
                      </span>
                    )}
                  </div>
                  <CameraModule />
                </div>
                <p id={hintId} className={`mt-4 flex items-center gap-1.5 text-[12.5px] ${C.muted}`}>
                  <Move className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Seret foto (atau tombol panah) untuk menggeser
                </p>
              </div>

              <div className="min-w-0 space-y-6">
                <div>
                  <p className="text-[14px] font-semibold text-[#0B0C0E]">Foto</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <label htmlFor={inputId} className={`${BTN.ink} ${BTN.md} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2`}>
                      <ImagePlus className="h-4 w-4" aria-hidden />
                      {upload ? 'Ganti foto' : 'Pilih foto'}
                      <input id={inputId} type="file" accept="image/*" onChange={onFile} className="sr-only" />
                    </label>
                    {(upload || zoom !== 1 || pos.x !== 0.5 || pos.y !== 0.5) && (
                      <button
                        type="button"
                        onClick={() => {
                          setUpload('');
                          setImageRatio(0);
                          setError('');
                          resetView();
                        }}
                        className={`${BTN.ghost} ${BTN.md}`}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        {upload ? 'Pakai foto contoh' : 'Atur ulang'}
                      </button>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="mt-2 text-[13px] font-medium text-[#B42318]">
                      {error}
                    </p>
                  )}
                </div>

                <label className="block">
                  <span className="flex items-center justify-between text-[14px] font-semibold text-[#0B0C0E]">
                    Perbesar foto
                    <span className={`text-[13px] font-medium tabular-nums ${C.muted}`}>{Math.round(zoom * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={ZOOM_MIN * 100}
                    max={ZOOM_MAX * 100}
                    step={5}
                    value={Math.round(zoom * 100)}
                    onChange={(e) => setZoom(Number(e.target.value) / 100)}
                    disabled={!src}
                    className="mt-3 w-full accent-[#0B0C0E]"
                  />
                </label>

                {colors.length > 0 && (
                  <fieldset>
                    <legend className="text-[14px] font-semibold text-[#0B0C0E]">Warna casing</legend>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          aria-pressed={caseColor?.key === c.key}
                          onClick={() => setColorKey(c.key)}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#F2F3F5] pl-1.5 pr-4 text-[14px] font-medium text-[#0B0C0E] ring-inset transition-colors hover:bg-[#E6E8EB] aria-pressed:ring-2 aria-pressed:ring-[#0B0C0E]"
                        >
                          <span aria-hidden className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/15" style={{ background: c.swatch }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                {m.models.length > 0 && (
                  <label className="block">
                    <span className="text-[14px] font-semibold text-[#0B0C0E]">Tipe HP</span>
                    <select
                      value={phone?.id ?? ''}
                      onChange={(e) => shop.pickPhone(e.target.value)}
                      className="mt-2.5 h-11 w-full rounded-xl bg-[#F2F3F5] px-3 text-[15px] text-[#0B0C0E]"
                    >
                      <option value="">Pilih tipe HP…</option>
                      {brands.map((b) => (
                        <optgroup key={b} label={b}>
                          {m.models
                            .filter((p) => p.brand === b)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                )}

                <div>
                  <PillLink
                    action={action}
                    label={buttonLabel}
                    arrow={!isWa}
                    icon={isWa ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
                    className={`${BTN.ink} ${BTN.lg} flex w-full`}
                  />
                  <p className={`mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed ${C.muted}`}>
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Foto yang kamu pilih hanya tampil di browser ini: tidak diunggah ke server dan tidak disimpan.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
