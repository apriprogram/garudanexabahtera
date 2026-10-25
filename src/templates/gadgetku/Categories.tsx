// Kategori (kunci `categories`, referensi "Bose · However you listen"): judul terpusat, lalu kartu foto membulat
// berlabel (nama + keterangan di kiri bawah, panah di kanan bawah). Dua kartu pertama lebar (16:10), sisanya tegak (4:5);
// HP: dua kolom, dua kartu pertama selebar layar. Klik kartu → bagian Produk tersaring ke kategori itu (atau tautan
// sendiri bila diisi).
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { GadgetkuModel, Shop } from './model';
import { TYPE_G } from './styles';
import { ItemIcon, SectionLabel } from './ui';

/** Kartu bertautan; tanpa tujuan (produk disembunyikan & tautan kosong) → kartu biasa. */
function CardLink({
  action,
  onNavigate,
  label,
  className,
  children,
}: {
  action: LinkAction | null;
  onNavigate?: () => void;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return action ? (
    <ActionLink action={action} onNavigate={onNavigate} aria-label={label} className={className}>
      {children}
    </ActionLink>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function Categories({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const { categories } = m;
  const eyebrow = text(categories, 'eyebrow');
  const title = text(categories, 'title');
  const items = list(categories, 'items', 6).filter((item) => field(item, 'title'));
  if (items.length === 0) return null;
  // Kartu kecil (setelah dua kartu lebar) mengisi satu baris di layar lebar: 4 → 3 kolom, 3 → 4 kolom, 1–2 → 6 kolom
  const small = items.length - 2;
  const smallSpan = small >= 4 ? '@5xl:col-span-3' : small === 3 ? '@5xl:col-span-4' : '@5xl:col-span-6';

  return (
    <TemplateSection sectionKey="categories" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title) && (
          <div className="mx-auto max-w-[760px] text-center">
            {eyebrow && (
              <Reveal>
                <SectionLabel>{eyebrow}</SectionLabel>
              </Reveal>
            )}
            {title && (
              <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} mx-auto max-w-[18ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                {title}
              </Reveal>
            )}
          </div>
        )}
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-14 @3xl:gap-4 @5xl:grid-cols-12">
          {items.map((item, i) => {
            const name = field(item, 'title');
            const image = field(item, 'image');
            const wide = i < 2;
            const own = resolveAction(field(item, 'url'), null);
            const action = own ?? m.productsAction;
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                delay={stagger(i, 70)}
                className={wide ? 'col-span-2 @5xl:col-span-6' : `col-span-1 ${smallSpan}`}
              >
                <CardLink
                  action={action}
                  onNavigate={own ? undefined : () => shop.pickCategory(name)}
                  label={field(item, 'text') ? `${name}, ${field(item, 'text')}` : name}
                  className={`group relative isolate flex overflow-hidden rounded-[24px] bg-[#F2F3F5] text-white @3xl:rounded-[28px] ${
                    wide ? 'aspect-[16/10]' : 'aspect-[4/5]'
                  }`}
                >
                  {hasImage(image) ? (
                    <KitPhoto
                      src={image}
                      alt=""
                      fallback="none"
                      zoom
                      sizes={wide ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                      className="absolute inset-0 -z-20"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span aria-hidden className="absolute inset-0 -z-20 flex items-center justify-center bg-[#1A1C20] text-white/40">
                      <ItemIcon name={name} className="h-1/4 w-1/4" strokeWidth={1.25} />
                    </span>
                  )}
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <span className="mt-auto flex w-full items-end justify-between gap-3 p-4 @3xl:p-6">
                    <span className="min-w-0">
                      <span className={`block text-white ${wide ? 'text-[22px] @3xl:text-[28px]' : 'text-[17px] @3xl:text-[22px]'} font-medium leading-tight tracking-[-0.025em]`}>
                        {name}
                      </span>
                      {field(item, 'text') && <span className="mt-1 block text-[13px] leading-snug text-white/80 @3xl:text-[14px]">{field(item, 'text')}</span>}
                    </span>
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0B0C0E] transition-transform duration-300 group-hover:rotate-45 @3xl:h-11 @3xl:w-11"
                    >
                      <ArrowUpRight className="h-[18px] w-[18px]" />
                    </span>
                  </span>
                </CardLink>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
