// Paket persalinan (kunci `packages`): kepala section rata kiri dengan PILIHAN KAMAR di kanan (dua tombol radio
// berbentuk pil, mis. "Kamar Kelas 1" / "Kamar VIP"; disembunyikan bila hanya ada satu pilihan). Kartu radius 28 berisi
// peach lembut (kartu berlabel sorotan: mint), doodle di lingkaran putih, nama paket, keterangan, harga "mulai" Nunito
// besar yang berganti mengikuti pilihan kamar, chip lama rawat, isi paket berpoin hati, dan tombol "Tanya paket ini" →
// WhatsApp berisi nama paket & kamar. Catatan harga di bawah kartu (harga mulai, biaya akhir mengikuti kondisi medis).
import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { Doodle } from './art';
import type { DoodleName } from './icons';
import { packageMessage, splitTags, type MomkidModel } from './model';
import { BG, C, CARD, DISPLAY, GRID_GAP, RAIL, RAIL_ITEM, SECTION_PAD, TONE_BG, TYPE } from './styles';
import { ButtonLink, SectionHead } from './ui';

const CARD_DOODLE: DoodleName[] = ['heart', 'swaddle', 'star', 'stroller'];
const COLS: Record<number, string> = { 1: '', 2: '@4xl:grid-cols-2', 3: '@4xl:grid-cols-2 @6xl:grid-cols-3', 4: '@4xl:grid-cols-2 @7xl:grid-cols-4' };

export function Packages({ m }: { m: MomkidModel }) {
  const { packages } = m;
  const items = m.items('packages');
  const [room, setRoom] = useState<'a' | 'b'>('a');
  const baseId = useId();
  if (items.length === 0) return null;
  const optionA = text(packages, 'option_a');
  const optionB = text(packages, 'option_b');
  const toggle = !!(optionA && optionB);
  const current = toggle && room === 'b' ? 'b' : 'a';
  const roomLabel = current === 'b' ? optionB : optionA;
  const note = text(packages, 'note');
  const buttonLabel = text(packages, 'button_label');

  const priceOf = (item: (typeof items)[number]) => field(item, current === 'b' ? 'price_b' : 'price_a') || field(item, 'price_a');

  return (
    <TemplateSection sectionKey="packages" className={`${TONE_BG[m.tone('packages')]} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-8 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
          <SectionHead
            align="left"
            eyebrow={text(packages, 'eyebrow')}
            doodle="swaddle"
            title={text(packages, 'title')}
            subtitle={text(packages, 'subtitle')}
            srTitle="Paket persalinan"
            className="min-w-0 @5xl:col-span-7"
          />
          {toggle && (
            <Reveal delay={120} className="min-w-0 @5xl:col-span-5 @5xl:justify-self-end">
              <fieldset className="min-w-0">
                <legend className={`mb-2.5 text-[14px] font-medium ${C.muted}`}>Harga untuk</legend>
                <div className={`grid grid-cols-2 gap-1 rounded-full p-1.5 ${BG.peachSoft}`}>
                  {(['a', 'b'] as const).map((key) => (
                    <label
                      key={key}
                      className={`flex h-11 cursor-pointer items-center justify-center rounded-full px-4 text-center ${DISPLAY} text-[15px] font-extrabold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--mk-accent-text) ${
                        current === key ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `${C.ink} hover:bg-white/70`
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${baseId}-room`}
                        value={key}
                        checked={current === key}
                        onChange={() => setRoom(key)}
                        className="sr-only"
                      />
                      <span className="truncate">{key === 'a' ? optionA : optionB}</span>
                    </label>
                  ))}
                </div>
                <p className="sr-only" aria-live="polite">{`Harga ditampilkan untuk ${roomLabel}`}</p>
              </fieldset>
            </Reveal>
          )}
        </div>

        {/* HP & tablet tegak: rel geser (kartu ± 86%, scroll-snap); ≥ @4xl: kisi. Reveal di seluruh daftar (bukan per kartu di
            dalam rel). */}
        <Reveal variant="scale" className="mt-8 @3xl:mt-12">
        <ul
          tabIndex={items.length > 1 ? 0 : undefined}
          aria-label="Daftar paket persalinan"
          className={`${items.length > 1 ? RAIL : 'grid'} ${COLS[Math.min(items.length, 4)]} @6xl:gap-6`}
        >
          {items.map((item, i) => {
            const badge = field(item, 'badge');
            const price = priceOf(item);
            const inclusions = splitTags(field(item, 'inclusions')).slice(0, 6);
            const name = field(item, 'name');
            const action = m.waWith(packageMessage(m.companyName, name, roomLabel)) ?? m.visitAction;
            return (
              <li key={`${name}-${i}`} className={items.length > 1 ? RAIL_ITEM : 'min-w-0'}>
                <article className={`flex h-full flex-col p-5 @3xl:p-8 ${CARD} ${badge ? BG.mint : BG.peachSoft}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white">
                      <Doodle name={CARD_DOODLE[i % CARD_DOODLE.length]} blob="" className={`h-10 w-10 ${C.ink}`} />
                    </span>
                    {badge && (
                      <span className={`inline-flex h-8 items-center gap-1 rounded-full bg-white pl-1.5 pr-3 ${TYPE.label} ${C.mintInk}`}>
                        <Doodle name="star" blob="" className="h-6 w-6" />
                        {badge}
                      </span>
                    )}
                  </div>
                  <h3 className={`mt-5 @3xl:mt-6 ${TYPE.h3} ${C.ink}`}>{name}</h3>
                  {/* Tinggi minimum 2 baris: harga sejajar antar-kartu sebaris walau keterangan 1 atau 2 baris */}
                  {field(item, 'summary') && <p className={`mt-2 ${TYPE.body} ${C.muted} @4xl:min-h-[3.25em]`}>{field(item, 'summary')}</p>}
                  <div className="mt-5 @3xl:mt-6">
                    <p className={`text-[13.5px] font-medium ${C.muted}`}>mulai</p>
                    <p key={`${current}-${price}`} className={`mk-fade mt-1 ${TYPE.price} ${C.ink}`}>
                      {price || <span className="text-[22px]">Tanyakan admin</span>}
                    </p>
                    <p className={`mt-2 flex flex-wrap gap-2 text-[13.5px] ${C.ink}`}>
                      {roomLabel && <span className="inline-flex h-8 items-center rounded-full bg-white px-3 font-medium">{roomLabel}</span>}
                      {field(item, 'stay') && <span className="inline-flex h-8 items-center rounded-full bg-white px-3 font-medium">{field(item, 'stay')}</span>}
                    </p>
                  </div>
                  {inclusions.length > 0 && (
                    <ul aria-label={`Isi paket ${name}`} className="mt-5 grid gap-2.5 border-t border-[#2E2228]/10 pt-5 @3xl:mt-6 @3xl:pt-6">
                      {inclusions.map((inc, j) => (
                        <li key={`${inc}-${j}`} className={`flex items-start gap-2.5 text-[14.5px] leading-snug ${C.ink}`}>
                          <svg viewBox="0 0 16 16" aria-hidden focusable="false" className="mt-[3px] h-3.5 w-3.5 shrink-0 fill-(--mk-accent-text)">
                            <path d="M8 14.2S1.5 10.3 1.5 5.8A3.4 3.4 0 0 1 8 4a3.4 3.4 0 0 1 6.5 1.8c0 4.5-6.5 8.4-6.5 8.4z" />
                          </svg>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-6 @3xl:pt-8">
                    <ButtonLink action={action} label={buttonLabel} variant="white" size="md" className="w-full" />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        </Reveal>

        {note && (
          <Reveal as="p" variant="fade" className={`mx-auto mt-8 flex max-w-[70ch] items-start justify-center gap-2 text-center text-[14px] leading-snug ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
