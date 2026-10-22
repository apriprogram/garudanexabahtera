// Perawatan (section `services`): label kecil "PILIH KATEGORI", tab kategori sebagai judul besar ("Perawatan Wajah /
// Perawatan Kuku"; HP: chip gulir), lalu bento foto campuran (2 ubin tinggi, 2 ubin lebar, sisanya bertiga) dengan
// judul putih di atas gradasi, chip harga, dan tombol panah bulat. Ubin = tautan reservasi WhatsApp perawatan itu.
// Kartu terakhir putih bergaris: "lihat lebih banyak di Instagram". Tab: role=tab, panah kiri/kanan, crossfade 200ms.
import { useId, useRef, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, FONT_DISPLAY, SECTION_Y } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, resolveAction, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePhotoSet } from '../kit/context';
import type { AuraModel, Treatment } from './model';
import { bentoClass, bentoSlots, categoryKey, treatmentsIn, type BentoSlot } from './model';
import { BODY, H2, INK } from './styles';
import { ArrowDot, Label } from './ui';

const SIZES: Record<BentoSlot, string> = {
  tall: '(min-width: 896px) 25vw, 50vw',
  wide: '(min-width: 896px) 50vw, 100vw',
  tallWide: '(min-width: 896px) 50vw, 100vw',
  half: '(min-width: 896px) 50vw, 50vw',
  third: '(min-width: 896px) 33vw, 50vw',
  full: '100vw',
};

function TreatmentTile({ t, slot, action }: { t: Treatment; slot: BentoSlot; action: LinkAction | null }) {
  const photos = usePhotoSet();
  const big = slot === 'tall' || slot === 'wide' || slot === 'tallWide' || slot === 'full';
  const content = (
    <>
      <span className="relative flex flex-col gap-1">
        <span className="text-[14px] font-medium leading-snug @3xl:text-[16px]">{t.title}</span>
        {t.count && <span className="text-[12px] opacity-85">{t.count}</span>}
        {t.description && (
          <span className={`mt-1 line-clamp-2 max-w-[36ch] text-[13px] leading-snug opacity-85 ${big ? 'hidden @5xl:block' : 'sr-only'}`}>{t.description}</span>
        )}
      </span>
      <span className="relative mt-auto flex items-end justify-between gap-2">
        {t.price ? (
          <span className={`block h-7 min-w-0 truncate rounded-full bg-white/90 px-3 text-[11px] font-medium leading-7 ${INK} @3xl:text-[12px]`}>{t.price}</span>
        ) : (
          <span />
        )}
        {/* Ubin kecil di HP: panah disembunyikan agar harga tetap utuh (seluruh ubin tetap tautan) */}
        <span className={big ? 'shrink-0' : 'hidden shrink-0 @xl:block'}>
          <ArrowDot tone="white" size="h-9 w-9 @3xl:h-10 @3xl:w-10" up />
        </span>
      </span>
      <span className="sr-only">, reservasi</span>
    </>
  );

  if (!hasImage(t.image)) {
    return (
      <ActionLink action={action} className={`group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-(--tpl-accent-200) p-4 ${INK} @3xl:p-5`}>
        <svg viewBox="0 0 200 200" fill="none" aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 opacity-40">
          <circle cx="100" cy="100" r="98" stroke="#000" strokeOpacity={0.2} />
          <circle cx="100" cy="100" r="70" stroke="#000" strokeOpacity={0.2} />
        </svg>
        {content}
      </ActionLink>
    );
  }

  return (
    <ActionLink action={action} className="group relative block h-full overflow-hidden rounded-[20px]">
      <KitPhoto
        src={t.image}
        alt={photos.alt(t.image, t.title)}
        sizes={SIZES[slot]}
        zoom
        className="absolute inset-0 h-full w-full"
        imgClassName="transition-[scale] duration-700 group-hover:scale-[1.03]"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[85%] bg-gradient-to-b from-black/70 via-black/35 to-transparent" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      </KitPhoto>
      <span className="relative flex h-full flex-col p-4 text-white @3xl:p-5">{content}</span>
    </ActionLink>
  );
}

function MoreTile({ label, action }: { label: string; action: LinkAction }) {
  return (
    <ActionLink
      action={action}
      className={`group flex h-full flex-col justify-between gap-4 rounded-[20px] bg-white p-4 ring-1 ring-inset ring-black/10 transition-colors hover:ring-black/25 @3xl:p-5`}
    >
      <span className={`max-w-[18ch] text-[14px] font-medium leading-snug ${INK} @3xl:text-[16px]`}>{label}</span>
      <ArrowDot className="self-end" size="h-10 w-10" up />
    </ActionLink>
  );
}

export function Services({ m, category, onCategory }: { m: AuraModel; category: string | null; onCategory: (category: string | null) => void }) {
  const { services } = m;
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const eyebrow = text(services, 'eyebrow');
  const title = text(services, 'title');
  const subtitle = text(services, 'subtitle');
  const cats = m.categories;
  const tabs = cats.length > 0;
  const activeIndex = Math.max(0, cats.findIndex((c) => categoryKey(c) === categoryKey(category ?? '')));
  const active = tabs ? cats[activeIndex] : null;
  const shown = treatmentsIn(m.treatments, cats, active);
  const moreLabel = text(services, 'more_label');
  const moreFallback: LinkAction | null = m.instagram ? { kind: 'external', href: m.instagram.href } : m.waAction;
  const moreAction = moreLabel ? resolveAction(text(services, 'more_url'), moreFallback) : null;
  const total = shown.length + (moreAction ? 1 : 0);
  const slots = bentoSlots(total);
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  const select = (i: number) => {
    const next = (i + cats.length) % cats.length;
    onCategory(cats[next]);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') select(i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') select(i - 1);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End') select(cats.length - 1);
    else return;
    e.preventDefault();
  };

  const grid = (
    <ul className="grid auto-rows-[150px] grid-cols-2 gap-2.5 @xl:auto-rows-[190px] @4xl:auto-rows-[clamp(160px,14cqw,230px)] @4xl:grid-cols-12 @4xl:gap-3">
      {shown.map((t, i) => (
        <li key={t.index} className={bentoClass(slots, i)}>
          <TreatmentTile t={t} slot={slots[i]} action={m.treatmentAction(t.title)} />
        </li>
      ))}
      {moreAction && (
        <li className={bentoClass(slots, total - 1)}>
          <MoreTile label={moreLabel} action={moreAction} />
        </li>
      )}
    </ul>
  );

  return (
    <TemplateSection sectionKey="services" className={SECTION_Y}>
      <div className={CONTAINER}>
        <Reveal className="grid gap-5 @4xl:grid-cols-12 @4xl:items-end @4xl:gap-8">
          <div className="min-w-0 @4xl:col-span-8">
            {eyebrow && <Label>{eyebrow}</Label>}
            {tabs ? (
              <>
                <h2 className="sr-only">{title || 'Perawatan'}</h2>
                <div
                  role="tablist"
                  aria-label={title || 'Kategori perawatan'}
                  className="aura-rail -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:flex-wrap @3xl:items-baseline @3xl:gap-x-4 @3xl:gap-y-1 @3xl:overflow-visible @3xl:px-0"
                >
                  {cats.map((cat, i) => {
                    const selected = i === activeIndex;
                    return (
                      <span key={cat} className="flex shrink-0 items-baseline gap-4">
                        {i > 0 && (
                          <span aria-hidden className={`hidden ${FONT_DISPLAY} text-[36px] font-light text-[#C9C9C9] @3xl:inline @6xl:text-[48px]`}>
                            /
                          </span>
                        )}
                        <button
                          ref={(el) => {
                            tabRefs.current[i] = el;
                          }}
                          type="button"
                          role="tab"
                          id={tabId(i)}
                          aria-selected={selected}
                          aria-controls={panelId}
                          tabIndex={selected ? 0 : -1}
                          onClick={() => onCategory(cat)}
                          onKeyDown={(e) => onKeyDown(e, i)}
                          className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] @3xl:h-auto @3xl:rounded-none @3xl:bg-transparent @3xl:px-0 @3xl:font-[family-name:var(--tpl-font-display)] @3xl:text-[36px] @3xl:font-light @3xl:leading-[1.15] @3xl:tracking-[-0.01em] @6xl:text-[48px] ${
                            selected
                              ? 'bg-[#1C1C1C] font-medium text-white @3xl:text-[#1C1C1C]'
                              : 'bg-[#F0F0F0] text-[#1C1C1C] @3xl:text-[#767676] @3xl:hover:text-[#1C1C1C]'
                          }`}
                        >
                          {cat}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              title && <h2 className={`${eyebrow ? 'mt-4' : ''} max-w-[22ch] text-balance ${H2}`}>{title}</h2>
            )}
          </div>
          {subtitle && <p className={`max-w-[44ch] @4xl:col-span-4 @4xl:pb-2 ${BODY}`}>{subtitle}</p>}
        </Reveal>

        <Reveal className="mt-8 @3xl:mt-12">
          {tabs ? (
            <div key={active ?? ''} role="tabpanel" id={panelId} aria-labelledby={tabId(activeIndex)} className="aura-tabpanel">
              {grid}
            </div>
          ) : (
            grid
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
