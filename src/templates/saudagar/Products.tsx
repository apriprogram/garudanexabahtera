// Komoditas (kunci `products`, latar kertas): kepala terbelah (label + H2 kiri, deskripsi kanan), lalu tab serif per
// kategori (role=tablist; panah kiri/kanan, Home/End; garis saffron di bawah tab aktif) dan panel: foto kategori
// berbingkai lengkung + daerah asal (kiri 4 kolom), pengantar + kartu spesifikasi kraft (kanan 8 kolom). Kartu: nama,
// varietas miring, catatan, baris Grade · Asal · Kadar air · Kemasan · Min. pesanan bergaris rambut, dan tautan "Minta
// penawaran" yang membuka formulir dengan komoditas itu terpilih. Panel tidak aktif `hidden` tetapi tetap di HTML
// (perayap). Hanya satu kategori → tanpa tablist. Panel baru memudar ≤ 300 ms hanya setelah pengunjung mengganti tab.
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { specRows, type ProductTab, type SaudagarModel } from './model';
import { SAUDAGAR_PHOTOS } from './photos';
import { ARCH, C, CARD, PHOTO_HOVER, SECTION_PAD, SERIF, TYPE_S } from './styles';
import { ArrowLink, Caption, SectionHead } from './ui';

/** `wide` = kartu ganjil terakhir di kisi dua kolom: selebar dua kolom, kepala kiri dan baris spesifikasi kanan. */
function SpecCard({ m, item, onQuote, wide = false }: { m: SaudagarModel; item: Record<string, string>; onQuote: (product: string) => void; wide?: boolean }) {
  const name = field(item, 'name');
  const variety = field(item, 'variety');
  const note = field(item, 'note');
  const rows = specRows(m.products, item);
  const buttonLabel = text(m.products, 'button_label');
  // Formulir tampil → gulir ke formulir dengan komoditas terpilih; tanpa formulir → WhatsApp berisi nama komoditas
  const action: LinkAction | null = m.shown('contact')
    ? { kind: 'section', target: 'contact' }
    : m.waWith(`Halo ${m.companyName}, saya ingin meminta penawaran ${name}.`);
  return (
    <article
      className={`flex w-full min-w-0 flex-col p-6 @3xl:p-7 ${wide ? '@3xl:grid @3xl:grid-cols-2 @3xl:grid-rows-[1fr_auto] @3xl:gap-x-10' : ''} ${CARD.kraft}`}
    >
      {/* Kepala kartu mengisi sisa tinggi → baris spesifikasi kartu bersebelahan sejajar walau catatannya beda panjang */}
      <div className={`flex-1 ${wide ? '@3xl:col-start-1 @3xl:row-start-1' : ''}`}>
        <h3 className={`text-pretty ${C.ink} ${TYPE_S.h3}`}>{name}</h3>
        {variety && <p className={`mt-1 ${SERIF} text-[16px] italic leading-snug ${C.muted}`}>{variety}</p>}
        {note && <p className={`mt-3 max-w-[48ch] text-pretty text-[14.5px] leading-relaxed ${C.muted}`}>{note}</p>}
      </div>
      {rows.length > 0 && (
        <dl className={`mt-5 divide-y border-t ${wide ? '@3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1 @3xl:mt-0 @3xl:border-b' : ''} ${C.line} ${C.divide}`}>
          {rows.map((row) => (
            <div key={row.key} className="flex items-baseline justify-between gap-4 py-3">
              <dt className={`shrink-0 text-[13px] ${C.muted}`}>{row.label}</dt>
              <dd className={`min-w-0 text-right text-[14px] font-medium leading-snug ${C.ink}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className={`pt-4 ${wide ? '@3xl:col-start-1 @3xl:row-start-2' : ''}`}>
        <ArrowLink action={action} label={buttonLabel} ariaLabel={`${buttonLabel}: ${name}`} onNavigate={() => onQuote(name)} />
      </div>
    </article>
  );
}

function Panel({ m, tab, onQuote }: { m: SaudagarModel; tab: ProductTab; onQuote: (product: string) => void }) {
  const withImage = hasImage(tab.image);
  // Kisi tetap dua kolom bila ada foto: jumlah ganjil → kartu terakhir selebar dua kolom (tidak menyisakan lubang)
  const count = tab.items.length;
  const wideLast = withImage && count > 1 && count % 2 === 1;
  const cards = (
    <ul className={`grid gap-4 @3xl:grid-cols-2 @5xl:gap-6 ${withImage ? '' : '@6xl:grid-cols-3'}`}>
      {tab.items.map((item, i) => {
        const wide = wideLast && i === count - 1;
        return (
          <li key={`${field(item, 'name')}-${i}`} className={`flex min-w-0 ${wide ? '@3xl:col-span-2' : ''}`}>
            <SpecCard m={m} item={item} onQuote={onQuote} wide={wide} />
          </li>
        );
      })}
    </ul>
  );
  const intro = tab.intro && <p className={`max-w-[60ch] ${TYPE_S.lead} ${C.muted}`}>{tab.intro}</p>;
  if (!withImage) {
    return (
      <div className="grid gap-8">
        {(intro || tab.origin) && (
          <div className="grid gap-2">
            {intro}
            {tab.origin && <Caption>{tab.origin}</Caption>}
          </div>
        )}
        {cards}
      </div>
    );
  }
  // HP: foto 4:3 → pengantar → kartu. Tablet: foto (5 kol) + pengantar di sampingnya, kartu selebar penuh di bawah.
  // Layar lebar: foto 4 kolom merentang dua baris, pengantar + kartu 8 kolom.
  return (
    <div className="grid gap-8 @3xl:grid-cols-12 @3xl:gap-x-8 @5xl:grid-rows-[auto_1fr] @7xl:gap-x-12">
      <figure className="group min-w-0 @3xl:col-span-5 @3xl:row-start-1 @5xl:col-span-4 @5xl:row-end-3">
        <KitPhoto
          src={tab.image}
          alt={SAUDAGAR_PHOTOS.alt(tab.image, `${tab.name} dari kebun mitra ${m.companyName}`)}
          zoom
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 92vw"
          imgClassName={PHOTO_HOVER}
          className={`aspect-[4/3] @3xl:aspect-[4/5] ${ARCH}`}
        />
        {tab.origin && (
          <figcaption className="mt-4">
            <Caption>{tab.origin}</Caption>
          </figcaption>
        )}
      </figure>
      {intro && <div className="min-w-0 @3xl:col-span-7 @3xl:row-start-1 @3xl:self-end @5xl:col-span-8 @5xl:self-start">{intro}</div>}
      <div className={`min-w-0 @3xl:col-span-12 @5xl:col-span-8 @5xl:col-start-5 ${intro ? '@5xl:row-start-2' : '@5xl:row-start-1'}`}>{cards}</div>
    </div>
  );
}

export function Products({ m, onQuote }: { m: SaudagarModel; onQuote: (product: string) => void }) {
  const { products, tabs } = m;
  const baseId = useId();
  const [current, setCurrent] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  if (tabs.length === 0) return null;
  const title = text(products, 'title');
  const note = text(products, 'note');
  const selected = tabs.find((tab) => tab.key === current)?.key ?? tabs[0].key;
  const many = tabs.length > 1;
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  const select = (key: string, focus = false) => {
    if (key !== selected) setChanged(true);
    setCurrent(key);
    if (focus) tabRefs.current[key]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((tab) => tab.key === selected);
    const next: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(tabs[(next[e.key] + tabs.length) % tabs.length].key, true);
  };

  return (
    <TemplateSection sectionKey="products" className={`bg-[#F7F2E8] ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead layout="split" eyebrow={text(products, 'eyebrow')} title={title || 'Komoditas'} subtitle={text(products, 'subtitle')} />

        <Reveal className="mt-10 @3xl:mt-14">
          {many && (
            <div
              role="tablist"
              aria-label={title || 'Komoditas'}
              onKeyDown={onKeyDown}
              className={`sg-rail -mx-5 flex gap-4 overflow-x-auto border-b px-5 @md:gap-7 @2xl:mx-0 @2xl:px-0 @3xl:gap-10 ${C.line}`}
            >
              {tabs.map((tab, i) => {
                const isSelected = tab.key === selected;
                return (
                  <button
                    key={tab.key}
                    ref={(el) => {
                      tabRefs.current[tab.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={tabId(i)}
                    aria-selected={isSelected}
                    aria-controls={panelId(i)}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => select(tab.key)}
                    className={`relative flex min-h-14 shrink-0 items-baseline gap-1.5 pb-3 pt-2 ${SERIF} text-[19px] font-normal @md:gap-2 @md:text-[22px] leading-none tracking-[-0.01em] transition-colors duration-300 @3xl:text-[28px] ${
                      isSelected ? C.ink : `${C.muted} hover:text-[#221A13]`
                    }`}
                  >
                    {tab.name}
                    <span aria-hidden className={`font-sans text-[12px] tabular-nums ${C.muted}`}>
                      {tab.items.length}
                    </span>
                    <span aria-hidden className="sg-tab-line absolute inset-x-0 -bottom-px h-0.5 bg-(--tpl-accent)" />
                  </button>
                );
              })}
            </div>
          )}
          {tabs.map((tab, i) =>
            many ? (
              <div
                key={tab.key}
                role="tabpanel"
                id={panelId(i)}
                aria-labelledby={tabId(i)}
                hidden={tab.key !== selected}
                tabIndex={0}
                data-enter={changed && tab.key === selected ? 'true' : undefined}
                className="sg-panel mt-8 rounded-[4px] @3xl:mt-12"
              >
                <Panel m={m} tab={tab} onQuote={onQuote} />
              </div>
            ) : (
              <div key={tab.key}>
                <Panel m={m} tab={tab} onQuote={onQuote} />
              </div>
            ),
          )}
        </Reveal>

        {note && <p className={`mt-10 max-w-[80ch] text-[13.5px] leading-relaxed @3xl:mt-12 ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
