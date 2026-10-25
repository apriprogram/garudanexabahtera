// Cari per tipe HP (kunci `finder`) — pembeda utama toko: panel abu membulat; kiri label + H2 + deskripsi, kanan dua
// langkah (1. chip merek, 2. chip tipe HP dari merek itu). Setelah tipe dipilih, produk yang cocok (kolom "Cocok untuk":
// tipe, merek, port, atau "Semua HP"; lihat model.ts isCompatible) tampil sebagai kartu ringkas dengan tombol pesan
// WhatsApp berisi nama produk + tipe HP. Kategori yang belum punya produk cocok disebut, dengan tautan tanya stok.
// Tipe HP terpilih dibagi dengan pencarian di header (memilih "Galaxy A55" di sana membuka bagian ini dengan tipe itu).
// Semua di browser (demo daftar kecil dari CMS), tanpa permintaan ke server.
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { brandsOf, isCompatible, productCategories, sameCategory, samplePhones, type GadgetkuModel, type Shop } from './model';
import { ProductRow } from './ProductCard';
import { C, CARD, CHIP, TYPE_G } from './styles';
import { SectionLabel } from './ui';

const CHIP_LIGHT = `${CHIP} bg-white text-[#0B0C0E] ring-1 ring-inset ring-black/[0.08] hover:ring-black/25 aria-pressed:ring-[#0B0C0E]`;

function Step({ n, children }: { n: number; children: string }) {
  return (
    <legend className="flex items-center gap-2.5 text-[14px] font-semibold text-[#0B0C0E]">
      <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0C0E] text-[12px] font-semibold text-white">
        {n}
      </span>
      {children}
    </legend>
  );
}

/** Garis HP + kaca pembesar (keadaan awal sebelum tipe dipilih). SVG dekoratif. */
function PhoneSearchArt() {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden focusable="false" className="h-20 w-20 shrink-0 text-[#0B0C0E]">
      <rect x="30" y="10" width="46" height="88" rx="12" stroke="currentColor" strokeWidth="3" />
      <rect x="47" y="17" width="12" height="4" rx="2" fill="currentColor" />
      <circle cx="78" cy="74" r="17" fill="var(--tpl-accent)" stroke="currentColor" strokeWidth="3" />
      <path d="m90.5 86.5 12 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="m71 74 5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Finder({ m, shop }: { m: GadgetkuModel; shop: Shop }) {
  const { finder } = m;
  const [brandChoice, setBrandChoice] = useState('');
  const models = m.models;
  if (models.length === 0) return null;

  const brands = brandsOf(models);
  const picked = models.find((phone) => phone.id === shop.phoneId) ?? null;
  const brand = picked?.brand ?? brandChoice;
  const brandModels = models.filter((phone) => phone.brand === brand);
  const eyebrow = text(finder, 'eyebrow');
  const title = text(finder, 'title');
  const subtitle = text(finder, 'subtitle');
  const emptyText = text(finder, 'empty_text');
  const matches = picked ? m.productItems.filter((item) => isCompatible(item, picked)) : [];
  const missing = picked ? productCategories(m.productItems).filter((c) => !matches.some((item) => sameCategory(field(item, 'category'), c))) : [];
  const quick = samplePhones(models, 3);
  const ask = picked ? m.askAction(`apakah ada aksesoris lain untuk ${picked.label}?`) : m.askAction('tipe HP saya belum ada di daftar. Bisa dibantu?');

  const chooseBrand = (next: string) => {
    setBrandChoice(next);
    if (picked && picked.brand !== next) shop.pickPhone('');
  };
  /** Pilih / batalkan tipe HP; merek tetap terpilih saat tipe dibatalkan (juga bila tipe dipilih dari pencarian header). */
  const choosePhone = (id: string) => {
    if (picked) setBrandChoice(picked.brand);
    shop.pickPhone(id);
  };

  return (
    <TemplateSection sectionKey="finder" className="pt-14 @3xl:pt-20">
      <div className={CONTAINER}>
        <div className={`${CARD.panel} ${C.surface} p-5 @3xl:p-10 @6xl:p-14`}>
          <div className="grid gap-8 @5xl:grid-cols-12 @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-5">
              {eyebrow && (
                <Reveal>
                  <SectionLabel>{eyebrow}</SectionLabel>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[14ch] text-balance text-[#0B0C0E] ${TYPE_G.h2}`}>
                  {title}
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-4 max-w-[46ch] ${TYPE_G.lead} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}
            </div>

            <Reveal delay={120} className="min-w-0 space-y-7 @5xl:col-span-7 @5xl:pt-2">
              <fieldset>
                <Step n={1}>Pilih merek</Step>
                <div className="mt-3 flex flex-wrap gap-2">
                  {brands.map((b) => (
                    <button key={b} type="button" aria-pressed={brand === b} onClick={() => chooseBrand(b)} className={CHIP_LIGHT}>
                      {b}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <Step n={2}>Pilih tipe HP</Step>
                {brand ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brandModels.map((phone) => (
                      <button
                        key={phone.id}
                        type="button"
                        aria-pressed={picked?.id === phone.id}
                        onClick={() => choosePhone(picked?.id === phone.id ? '' : phone.id)}
                        className={CHIP_LIGHT}
                      >
                        {phone.model}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-3 text-[14px] ${C.muted}`}>Pilih merek dulu untuk melihat tipe HP-nya.</p>
                )}
              </fieldset>
            </Reveal>
          </div>

          <div className="mt-9 border-t border-black/[0.08] pt-7 @3xl:mt-10 @3xl:pt-8">
            {/* role="status" sudah polite; tanpa aria-live eksplisit agar tidak tertukar dengan region keterangan pratinjau milik Shell */}
            <p className="sr-only" role="status">
              {picked ? `${matches.length} aksesoris cocok untuk ${picked.label}` : ''}
            </p>
            {picked ? (
              <div key={picked.id} className="gk-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p aria-hidden className="text-[16px] text-[#0B0C0E] @3xl:text-[17px]">
                    <span className="font-semibold">{matches.length} aksesoris</span> cocok untuk <span className="font-semibold">{picked.label}</span>
                    {picked.port && <span className={`ml-2 inline-flex rounded-full bg-white px-2.5 py-0.5 align-middle text-[12.5px] font-medium ${C.muted}`}>Port {picked.port}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => choosePhone('')}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[#0B0C0E] transition-colors hover:bg-white"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Ganti tipe HP
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul aria-label={`Aksesoris untuk ${picked.label}`} className="mt-5 grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4">
                    {matches.map((item, i) => (
                      <li key={`${field(item, 'name')}-${i}`}>
                        <ProductRow m={m} item={item} phoneLabel={picked.label} />
                      </li>
                    ))}
                  </ul>
                )}
                {(missing.length > 0 || matches.length === 0) && (
                  <div className={`mt-5 flex flex-col gap-2 text-[14px] @3xl:flex-row @3xl:items-center @3xl:gap-4 ${C.muted}`}>
                    <p>
                      {missing.length > 0 ? `${missing.join(', ')} untuk ${picked.label} belum tampil di sini.` : `Belum ada produk untuk ${picked.label} di sini.`}{' '}
                      {emptyText}
                    </p>
                    {ask && (
                      <ActionLink action={ask} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 font-medium text-[#0B0C0E] underline-offset-4 hover:underline">
                        Tanya stok ke admin
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </ActionLink>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-center">
                <PhoneSearchArt />
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-[#0B0C0E]">Pilih merek dan tipe HP-mu untuk melihat aksesoris yang cocok.</p>
                  {quick.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`text-[13px] ${C.muted}`}>Coba:</span>
                      {quick.map((phone) => (
                        <button
                          key={phone.id}
                          type="button"
                          onClick={() => shop.pickPhone(phone.id)}
                          className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13.5px] font-medium text-[#0B0C0E] ring-1 ring-inset ring-black/[0.08] transition-colors hover:ring-black/25"
                        >
                          {phone.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {emptyText && <p className={`mt-3 text-[14px] ${C.muted}`}>{emptyText}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
