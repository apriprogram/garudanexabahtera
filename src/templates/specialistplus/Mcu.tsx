// Paket medical check-up (kunci `mcu`), pita #F2F6F8. Layar ≥ @5xl: TABEL perbandingan (caption, th scope=col untuk
// paket, th scope=row untuk pemeriksaan): baris judul paket menempel di bawah header saat digulir, kolom paket
// bersorot diwarnai tipis, centang teal / garis abu (teks "Termasuk" / "Tidak termasuk" untuk pembaca layar), baris
// kaki berisi jumlah pemeriksaan dan tombol "Pesan paket" yang menyusun pesan WhatsApp. HP: kartu paket bertumpuk (tablet 2 kolom)
// (nama, harga, untuk siapa, daftar pemeriksaan yang termasuk, tombol pesan penuh-lebar). Baris tabel muncul
// bertahap (CSS .spx-row).
import { Check, Info, Minus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { text, type LinkAction } from '../shared/utils';
import { includedCount, mcuMessage, type McuPackage, type SpxModel } from './model';
import { C, MONO_LABEL, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

const TINT = 'bg-[color-mix(in_srgb,var(--tpl-accent)_7%,white)]';
/** Baris judul paket menempel di bawah header 68px (tabel hanya tampil ≥ @5xl, tanpa kotak gulir di sekitarnya) */
const STICKY = '@5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+68px)]';

function Badge({ text: label }: { text: string }) {
  if (!label) return null;
  return (
    <span className="inline-flex max-w-full items-center rounded-[4px] bg-(--tpl-accent) px-2 py-0.5 font-mono text-[11px] font-medium leading-5 text-(--tpl-on-accent)">
      <span className="truncate">{label}</span>
    </span>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
      <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.6} />
      <span className="sr-only">Termasuk</span>
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center text-[#0D1B2A]/35">
      <Minus aria-hidden className="h-4 w-4" />
      <span className="sr-only">Tidak termasuk</span>
    </span>
  );
}

export function Mcu({ m }: { m: SpxModel }) {
  const { mcu, matrix } = m;
  const { packages, rows } = matrix;
  if (packages.length === 0) return null;
  const eyebrow = text(mcu, 'eyebrow');
  const orderLabel = text(mcu, 'order_label') || 'Pesan paket';
  const note = text(mcu, 'note');
  const order = (pkg: McuPackage): LinkAction | null => m.waWith(mcuMessage(pkg, m.companyName)) ?? m.contactAction;
  const highlighted = (pkg: McuPackage) => !!pkg.badge;

  return (
    <TemplateSection sectionKey="mcu" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={eyebrow} code={m.code('mcu')} title={text(mcu, 'title')} subtitle={text(mcu, 'subtitle')} srTitle={eyebrow || 'Paket medical check-up'} />

        {/* Layar ≥ @5xl: tabel perbandingan (4 kolom paket butuh ≥ 960px agar harga tidak terpotong). Tanpa overflow agar
            baris judul paket bisa menempel. */}
        <Reveal variant="fade" className="mt-14 hidden rounded-[8px] bg-white ring-1 ring-inset ring-[#0D1B2A]/[0.1] @5xl:block">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left" data-spx-mcu-table="">
            <caption className="sr-only">Perbandingan paket medical check-up</caption>
            <thead>
              <tr>
                <th scope="col" className={`${STICKY} z-10 w-[28%] rounded-tl-[8px] border-b bg-white px-5 pb-4 pt-5 align-bottom ${C.line}`}>
                  <span className={`${MONO_LABEL} ${C.muted}`}>Pemeriksaan</span>
                </th>
                {packages.map((pkg, i) => (
                  <th
                    key={`${pkg.code}-${i}`}
                    scope="col"
                    className={`${STICKY} z-10 border-b border-l px-4 pb-4 pt-5 align-top font-normal ${C.line} ${highlighted(pkg) ? TINT : 'bg-white'} ${
                      i === packages.length - 1 ? 'rounded-tr-[8px]' : ''
                    }`}
                  >
                    <span className="flex min-h-6 items-center justify-between gap-2">
                      <span className={`${MONO_LABEL} text-(--tpl-accent-ink)`}>PKT-{pkg.code}</span>
                    </span>
                    <span className={`mt-1 block ${TYPE_S.h3} ${C.ink}`}>{pkg.name}</span>
                    {pkg.price && <span className={`mt-1 block ${TYPE_S.price} ${C.ink}`}>{pkg.price}</span>}
                    {pkg.audience && <span className={`mt-2 block text-[13px] leading-snug ${C.muted}`}>{pkg.audience}</span>}
                    {pkg.duration && <span className={`mt-1 block font-mono text-[12px] ${C.muted}`}>{pkg.duration}</span>}
                    {pkg.badge && (
                      <span className="mt-3 block">
                        <Badge text={pkg.badge} />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={`${row.label}-${r}`} className="spx-row" style={{ '--spx-i': Math.min(r, 10) } as CSSProperties}>
                  <th scope="row" className={`border-b px-5 py-3 text-[14.5px] font-medium leading-snug ${C.line} ${C.ink}`}>
                    {row.label}
                  </th>
                  {row.cells.map((yes, i) => (
                    <td key={i} className={`border-b border-l px-4 py-3 text-center ${C.line} ${highlighted(packages[i]) ? TINT : ''}`}>
                      <YesNo yes={yes} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={`px-5 py-4 align-middle ${MONO_LABEL} ${C.muted}`}>{rows.length > 0 ? `${rows.length} pemeriksaan` : ''}</td>
                {packages.map((pkg, i) => (
                  <td key={`${pkg.code}-${i}`} className={`border-l px-3 py-4 ${C.line} ${highlighted(pkg) ? TINT : ''} ${i === packages.length - 1 ? 'rounded-br-[8px]' : ''}`}>
                    <ButtonLink
                      action={order(pkg)}
                      label={orderLabel}
                      size="sm"
                      variant={highlighted(pkg) ? 'primary' : 'outline'}
                      arrow={false}
                      className="flex w-full"
                      ariaLabel={`${orderLabel}: ${pkg.name}`}
                    />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </Reveal>

        {/* HP: kartu paket bertumpuk; tablet: 2 kolom */}
        <ul aria-label="Paket medical check-up" className="mt-10 grid gap-4 @3xl:grid-cols-2 @5xl:hidden">
          {packages.map((pkg, i) => {
            const included = rows.filter((row) => row.cells[i]);
            return (
              <Reveal as="li" key={`${pkg.code}-${i}`} delay={stagger(i, 60)} className={`flex flex-col rounded-[8px] p-5 ring-1 ring-inset ${highlighted(pkg) ? `${TINT} ring-(--tpl-accent)` : 'bg-white ring-[#0D1B2A]/[0.1]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`${MONO_LABEL} text-(--tpl-accent-ink)`}>PKT-{pkg.code}</span>
                  <Badge text={pkg.badge} />
                </div>
                <h3 className={`mt-2 ${TYPE_S.h3} ${C.ink}`}>{pkg.name}</h3>
                {pkg.price && <p className={`mt-1 ${TYPE_S.price} ${C.ink}`}>{pkg.price}</p>}
                {(pkg.audience || pkg.duration) && (
                  <p className={`mt-1.5 text-[13.5px] leading-snug ${C.muted}`}>{[pkg.audience, pkg.duration].filter(Boolean).join(' · ')}</p>
                )}
                {included.length > 0 && (
                  <ul aria-label={`Pemeriksaan di paket ${pkg.name}`} className={`mt-4 grid gap-2 border-t pt-4 ${C.line}`}>
                    {included.map((row, r) => (
                      <li key={`${row.label}-${r}`} className={`flex items-start gap-2.5 text-[14px] leading-snug ${C.ink}`}>
                        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--tpl-accent-ink)" strokeWidth={2.4} />
                        {row.label}
                      </li>
                    ))}
                  </ul>
                )}
                <p className={`mt-auto pt-4 ${MONO_LABEL} ${C.muted}`}>{includedCount(matrix, i)} pemeriksaan</p>
                <ButtonLink action={order(pkg)} label={orderLabel} size="md" variant={highlighted(pkg) ? 'primary' : 'navy'} className="mt-3 flex w-full" ariaLabel={`${orderLabel}: ${pkg.name}`} />
              </Reveal>
            );
          })}
        </ul>

        {note && (
          <p className={`mt-5 flex items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
      </div>
    </TemplateSection>
  );
}
