// Langganan isi ulang (kunci `refill`): kiri foto tegak membulat dengan label "hemat hingga …"; kanan label, judul
// (kata miring), deskripsi, lalu dua pilihan radio asli bergaya kartu — produk (nama, ukuran, harga) dan jadwal kirim
// (setiap n minggu, −x%) — dan ringkasan gelap yang dihitung otomatis: harga per kiriman (harga normal dicoret),
// hemat per kiriman, perkiraan kiriman & hemat setahun. Tombol membuka WhatsApp berisi produk + jadwal. HP: foto
// pendek di atas, pilihan bertumpuk.
import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { formatRupiah, maxDiscount, parseRupiah, refillQuote, type GlowModel } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { BTN, C, MONO, SERIF, TYPE_G } from './styles';
import { Eyebrow, Highlighted } from './ui';

export function Refill({ m }: { m: GlowModel }) {
  const { refill } = m;
  const name = useId();
  const products = list(refill, 'products', 6).filter((item) => field(item, 'name') && parseRupiah(field(item, 'price')) !== null);
  const intervals = list(refill, 'intervals', 4).filter((item) => field(item, 'label') && Number(field(item, 'weeks').replace(/\D/g, '')) > 0);
  const [productIndex, setProductIndex] = useState(0);
  // Bawaan: jadwal kedua (biasanya "setiap 4 minggu") bila ada
  const [intervalIndex, setIntervalIndex] = useState(1);
  if (products.length === 0 || intervals.length === 0) return null;

  const product = products[Math.min(productIndex, products.length - 1)];
  const interval = intervals[Math.min(intervalIndex, intervals.length - 1)];
  const quote = refillQuote(field(product, 'price'), field(interval, 'weeks'), field(interval, 'discount'));
  const eyebrow = text(refill, 'eyebrow');
  const title = text(refill, 'title');
  const subtitle = text(refill, 'subtitle');
  const image = text(refill, 'image');
  const badge = text(refill, 'badge');
  const note = text(refill, 'note');
  const buttonLabel = text(refill, 'button_label') || 'Mulai langganan';
  const points = list(refill, 'points', 5).filter((item) => field(item, 'text'));
  const discount = Number(field(interval, 'discount').replace(/\D/g, '')) || 0;
  const productName = field(product, 'name');
  const size = field(product, 'size');
  const message = `Halo ${m.companyName}, saya ingin berlangganan isi ulang ${productName}${size ? ` (${size})` : ''} ${field(interval, 'label').toLowerCase()}${
    discount ? ` dengan potongan ${discount}%` : ''
  }${quote ? `, ${formatRupiah(quote.perDelivery)} per kiriman` : ''}.`;
  const action = resolveAction(text(refill, 'button_url'), m.waWith(message));
  const isWa = action?.kind === 'external' && /wa\.me/.test(action.href);
  const best = maxDiscount(intervals);
  const option = (checked: boolean, layout = 'items-center gap-3') =>
    `flex cursor-pointer ${layout} rounded-[16px] px-4 py-3 ring-1 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--gs-accent-text) ${
      checked ? 'bg-[#FCFAF6] ring-[#2B211C]' : 'ring-[#2B211C]/15 hover:bg-[#FCFAF6]/60'
    }`;

  return (
    <TemplateSection sectionKey="refill" className={SECTION_Y}>
      <div className={`${CONTAINER} grid items-start gap-10 @5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16`}>
        {hasImage(image) && (
          <Reveal variant="scale" className="relative min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+100px)] @5xl:col-span-5">
            <KitPhoto
              src={image}
              alt={GLOWSTORY_PHOTOS.alt(image, title || 'Langganan isi ulang')}
              fallback="none"
              zoom
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/3] rounded-[24px] @xl:aspect-[16/10] @5xl:aspect-[4/5] @5xl:rounded-[28px]"
            />
            {(badge || best > 0) && (
              <span className="absolute left-4 top-4 rounded-full bg-[#2B211C] px-3.5 py-2 text-[13px] font-medium text-[#F6F1EA]">{badge || `Hemat hingga ${best}%`}</span>
            )}
          </Reveal>
        )}

        <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-7' : '@5xl:col-span-8 @5xl:col-start-3'}`}>
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          {title && (
            <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance ${C.ink} ${TYPE_G.h2}`}>
              <Highlighted title={title} highlight={text(refill, 'highlight')} />
            </Reveal>
          )}
          {subtitle && (
            <Reveal as="p" delay={160} className={`mt-4 max-w-[54ch] ${TYPE_G.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}

          <Reveal delay={200} className="mt-8 grid gap-6 @3xl:grid-cols-2">
            <fieldset className="min-w-0">
              <legend className={`${MONO} ${C.muted}`}>1 · Pilih produk</legend>
              <div className="mt-3 space-y-2">
                {products.map((item, i) => {
                  const checked = item === product;
                  return (
                    <label key={`${field(item, 'name')}-${i}`} className={option(checked)}>
                      <input type="radio" name={`${name}-produk`} checked={checked} onChange={() => setProductIndex(i)} className="sr-only" />
                      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${checked ? 'bg-[#2B211C] ring-[#2B211C]' : 'ring-[#2B211C]/30'}`}>
                        {checked && <Check className="h-3 w-3 text-[#F6F1EA]" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14.5px] font-medium leading-snug text-[#2B211C]">{field(item, 'name')}</span>
                        {field(item, 'size') && <span className={`block text-[12.5px] ${C.muted}`}>{field(item, 'size')}</span>}
                      </span>
                      <span className="shrink-0 text-[13.5px] font-medium text-[#2B211C]">{field(item, 'price')}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="min-w-0">
              <fieldset>
                <legend className={`${MONO} ${C.muted}`}>2 · Kirim setiap</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {intervals.map((item, i) => {
                    const checked = item === interval;
                    const off = Number(field(item, 'discount').replace(/\D/g, '')) || 0;
                    return (
                      <label key={`${field(item, 'label')}-${i}`} className={option(checked, 'flex-col items-start justify-center gap-0.5')}>
                        <input type="radio" name={`${name}-jadwal`} checked={checked} onChange={() => setIntervalIndex(i)} className="sr-only" />
                        <span className="text-[14px] font-medium leading-snug text-[#2B211C]">{field(item, 'label')}</span>
                        {off > 0 && <span className="text-[12.5px] font-medium text-(--gs-accent-text)">hemat {off}%</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {quote && (
                <div data-tpl-tone="inverse" className="mt-4 rounded-[20px] bg-[#2B211C] p-5 text-[#F6F1EA]" aria-live="polite">
                  <p className={`${MONO} text-[#F6F1EA]/70`}>Per kiriman</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className={`${SERIF} text-[36px] leading-none tabular-nums`}>{formatRupiah(quote.perDelivery)}</span>
                    {quote.saving > 0 && <span className="text-[14px] text-[#F6F1EA]/60 line-through">{formatRupiah(quote.normal)}</span>}
                  </p>
                  {quote.saving > 0 && (
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#F6F1EA]/15 pt-4 text-[13px]">
                      <div>
                        <dt className="text-[#F6F1EA]/70">Hemat per kiriman</dt>
                        <dd className="mt-0.5 text-[15px] font-semibold text-(--gs-accent-light)">{formatRupiah(quote.saving)}</dd>
                      </div>
                      <div>
                        <dt className="text-[#F6F1EA]/70">± {quote.deliveriesPerYear} kiriman setahun</dt>
                        <dd className="mt-0.5 text-[15px] font-semibold text-(--gs-accent-light)">{formatRupiah(quote.savingPerYear)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={240} className="mt-8 flex flex-col gap-6 @3xl:flex-row @3xl:items-start @3xl:justify-between">
            {points.length > 0 && (
              <ul className="space-y-2.5">
                {points.map((item, i) => (
                  <li key={`${field(item, 'text')}-${i}`} style={{ transitionDelay: `${stagger(i, 60)}ms` }} className="flex items-start gap-3 text-[15px] leading-snug text-[#2B211C]">
                    <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--gs-accent-soft) text-(--gs-accent-text)">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {field(item, 'text')}
                  </li>
                ))}
              </ul>
            )}
            {action && (
              <ActionLink action={action} className={`${BTN.accent} ${BTN.lg} shrink-0`}>
                {isWa && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
                {buttonLabel}
              </ActionLink>
            )}
          </Reveal>
          {note && <p className={`mt-5 max-w-[60ch] text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
        </div>
      </div>
    </TemplateSection>
  );
}
