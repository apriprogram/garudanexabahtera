// Bundling hemat (kunci `bundles`, referensi promo "furnmart"): judul terbelah (label + H2 kiri, deskripsi kanan), lalu
// kartu paket berdampingan — tumpukan ikon barang (otomatis dari isi paket), nama, keterangan, daftar barang bercentang,
// harga paket besar + harga normal dicoret + label "Hemat Rp…" (dihitung otomatis), tombol pesan WhatsApp berisi nama
// dan harga paket. Paket berlabel pertama tampil gelap dengan cahaya mint. HP: kartu bertumpuk.
import { Check } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_Y } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, resolveAction, text } from '../shared/utils';
import { bundleLines, featuredBundle, formatRupiah, savings, type GadgetkuModel } from './model';
import { BTN, C, TYPE_G } from './styles';
import { ItemIcon, PillLink, Price, SectionLabel } from './ui';

export function Bundles({ m }: { m: GadgetkuModel }) {
  const { bundles } = m;
  const eyebrow = text(bundles, 'eyebrow');
  const title = text(bundles, 'title');
  const subtitle = text(bundles, 'subtitle');
  const note = text(bundles, 'note');
  const items = list(bundles, 'items', 4).filter((item) => field(item, 'name'));
  if (items.length === 0) return null;
  const featured = featuredBundle(items);

  return (
    <TemplateSection sectionKey="bundles" className={SECTION_Y}>
      <div className={CONTAINER}>
        {(eyebrow || title || subtitle) && (
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-7">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                  {title}
                </Reveal>
              )}
            </div>
            {subtitle && (
              <Reveal as="p" delay={160} className={`max-w-[46ch] @5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2 ${TYPE_G.lead} ${C.muted}`}>
                {subtitle}
              </Reveal>
            )}
          </div>
        )}

        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @4xl:grid-cols-2 ${items.length >= 3 ? '@6xl:grid-cols-3' : ''} ${items.length === 4 ? '@7xl:grid-cols-4' : ''}`}>
          {items.map((item, i) => {
            const dark = i === featured;
            const name = field(item, 'name');
            const price = field(item, 'price');
            const oldPrice = field(item, 'old_price');
            const lines = bundleLines(field(item, 'items'));
            const saved = savings(price, oldPrice);
            const action = resolveAction(field(item, 'button_url'), m.orderAction(`${name}${price ? ` (${price})` : ''}`));
            return (
              <Reveal
                as="li"
                key={`${name}-${i}`}
                delay={stagger(i, 80)}
                data-tpl-tone={dark ? 'inverse' : undefined}
                className={`relative isolate flex flex-col overflow-hidden rounded-[28px] p-6 @3xl:p-8 ${dark ? 'bg-[#0B0C0E] text-white' : 'bg-[#F2F3F5] text-[#0B0C0E]'}`}
              >
                {dark && <span aria-hidden className="gk-glow absolute -right-16 -top-16 -z-10 h-56 w-56" />}
                <div className="flex items-start justify-between gap-4">
                  {lines.length > 0 && (
                    <span aria-hidden className="flex -space-x-2">
                      {lines.slice(0, 4).map((line, j) => (
                        <span
                          key={`${line}-${j}`}
                          className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 ${
                            dark ? 'bg-[#1E2024] text-(--gk-on-dark) ring-[#0B0C0E]' : 'bg-white text-[#0B0C0E] ring-[#F2F3F5]'
                          }`}
                        >
                          <ItemIcon name={line} className="h-5 w-5" />
                        </span>
                      ))}
                    </span>
                  )}
                  {field(item, 'badge') && (
                    <span className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${dark ? 'bg-(--gk-on-dark) text-[#0B0C0E]' : 'bg-[#0B0C0E] text-white'}`}>
                      {field(item, 'badge')}
                    </span>
                  )}
                </div>
                <h3 className={`mt-6 ${TYPE_G.h3} @3xl:text-[24px]`}>{name}</h3>
                {field(item, 'description') && <p className={`mt-2 text-[14.5px] leading-relaxed ${dark ? 'text-white/70' : C.muted}`}>{field(item, 'description')}</p>}
                {lines.length > 0 && (
                  <ul className="mt-5 space-y-2.5" aria-label={`Isi ${name}`}>
                    {lines.map((line, j) => (
                      <li key={`${line}-${j}`} className="flex items-start gap-2.5 text-[14.5px] leading-snug">
                        <Check aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-(--gk-on-dark)' : 'text-(--tpl-accent-ink)'}`} strokeWidth={2.5} />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-7">
                  <div className={`flex flex-wrap items-end justify-between gap-3 border-t pt-5 ${dark ? 'border-white/10' : 'border-black/[0.08]'}`}>
                    <Price price={price} oldPrice={oldPrice} size="lg" tone={dark ? 'dark' : 'light'} />
                    {saved > 0 && (
                      <span className={`mb-1 rounded-full px-3 py-1 text-[12.5px] font-semibold ${dark ? 'bg-white/10 text-(--gk-on-dark)' : 'bg-(--gk-tint) text-(--tpl-accent-ink)'}`}>
                        Hemat {formatRupiah(saved)}
                      </span>
                    )}
                  </div>
                  <PillLink
                    action={action}
                    label={field(item, 'button_label') || `Ambil ${name}`}
                    className={`${dark ? BTN.glow : BTN.ink} ${BTN.lg} mt-5 flex w-full`}
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mt-6 max-w-[70ch] text-[13.5px] leading-relaxed ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
