// Building blocks of the A4 preview: one component per render item, the kop, the footer and the page sheet. Sizes are
// in points (pt) so the preview matches the PDF; colors are the site tokens (always light), the logo is brand-600.
import type { CSSProperties, ReactNode } from 'react';
import { LogoMark } from '../../../components/ui/LogoMark';
import type { CompanySettings } from '../types';
import {
  FONT,
  FOOTER_FROM_BOTTOM,
  KOP_TOP,
  METERAI_BOX,
  PAGE,
  SIGN_SPACE,
  columnWidths,
  contactLine,
  listMarker,
  markerWidth,
  signatureColumns,
  signedText,
  type RenderItem,
} from './layout';
import type { Block, BlockAlign, SignatureSlot, TextRun } from './model';

const pt = (n: number) => `${n}pt`;
const ALIGN: Record<BlockAlign, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' };

function Runs({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, i) =>
        run.bold || run.italic ? (
          <span key={i} className={`${run.bold ? 'font-bold' : ''} ${run.italic ? 'italic' : ''}`}>
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}

function MeteraiBox() {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center border-[0.8pt] border-dashed border-subtle text-[7pt] leading-tight text-subtle" style={{ width: pt(METERAI_BOX.width), height: pt(METERAI_BOX.height) }}>
      <span className="font-bold">e-Meterai</span>
      <span>Rp10.000</span>
    </div>
  );
}

type ContentBlock = Exclude<Block, { type: 'signatures' }>;

/** One content block; `from`/`to` render only those rows / list items (a block split over pages). */
function BlockView({ block, from, to, contentPt }: { block: ContentBlock; from?: number; to?: number; contentPt: number }): ReactNode {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? 'pt-[4pt] pb-[3pt] text-[13pt] leading-snug' : block.level === 2 ? 'pt-[12pt] pb-[3pt] text-[10.5pt]' : 'pt-[8pt] pb-[2pt] text-[10pt]';
      return (
        <div role="heading" aria-level={block.level + 1} className={`whitespace-pre-line font-bold ${size} ${ALIGN[block.align ?? 'left']}`}>
          {block.text}
        </div>
      );
    }
    case 'paragraph':
      if (block.boxed) {
        return (
          <div className="pt-[8pt]">
            <span className="inline-block border-[1.2pt] border-fg px-[8pt] py-[4pt] text-[14pt] font-bold">
              <Runs runs={block.runs} />
            </span>
          </div>
        );
      }
      return (
        <p className={`whitespace-pre-line pt-[4pt] ${block.size === 'small' ? 'text-[8pt]' : block.size === 'large' ? 'text-[14pt]' : ''} ${ALIGN[block.align ?? 'left']}`}>
          <Runs runs={block.runs} />
        </p>
      );
    case 'list': {
      const start = from ?? 0;
      const items = block.items.slice(start, to ?? block.items.length);
      return (
        <ul role="list" className="list-none" style={{ paddingLeft: `${(block.indent ?? 0) * 2}em` }}>
          {items.map((item, i) => (
            <li key={start + i} data-pd-unit className="flex pt-[2.5pt]">
              <span className="shrink-0" style={{ width: `${markerWidth(block)}em` }}>
                {listMarker(block, start + i)}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-line text-justify">
                <Runs runs={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    }
    case 'table': {
      const widths = columnWidths(block, contentPt, FONT.table * 0.52, 8);
      const total = widths.reduce((a, b) => a + b, 0);
      const start = from ?? 0;
      const last = block.rows.length - 1;
      return (
        <div className="pt-[6pt]">
          <table className="w-full table-fixed border-collapse text-[8.5pt] leading-[1.35]">
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: `${(w / total) * 100}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {block.columns.map((col, i) => (
                  <th key={i} scope="col" className={`border-[0.6pt] border-line-strong bg-alt px-[4pt] py-[2.5pt] align-bottom font-bold ${ALIGN[block.align?.[i] ?? 'left']}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.slice(start, to ?? block.rows.length).map((row, r) => {
                const isTotal = block.total && start + r === last;
                return (
                  <tr key={start + r} data-pd-unit className={isTotal ? 'bg-alt font-bold' : undefined}>
                    {block.columns.map((_, i) => (
                      <td key={i} className={`whitespace-pre-line break-words border-[0.6pt] border-line-strong px-[4pt] py-[2.5pt] align-top ${ALIGN[block.align?.[i] ?? 'left']}`}>
                        <Runs runs={row[i] ?? []} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case 'keyValue': {
      const start = from ?? 0;
      const rows = block.rows.slice(start, to ?? block.rows.length);
      if (block.variant === 'totals') {
        return (
          <div className="flex justify-end pt-[6pt]">
            <table className="w-[55%] border-collapse" style={{ maxWidth: pt(250) }}>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={start + i} data-pd-unit className={row.strong ? `font-bold ${start + i > 0 ? 'border-t-[0.8pt] border-fg' : ''}` : undefined}>
                    <td className="py-[2pt] pr-[8pt] align-top">{row.label}</td>
                    <td className="whitespace-nowrap py-[2pt] text-right align-top">
                      <Runs runs={row.value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div className="pt-[4pt]">
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((row, i) => (
                <tr key={start + i} data-pd-unit className={row.strong ? 'font-bold' : undefined}>
                  <td className="w-px whitespace-nowrap py-[1pt] pr-[4pt] align-top">{row.label}</td>
                  <td className="w-px py-[1pt] pr-[4pt] align-top">:</td>
                  <td className="whitespace-pre-line py-[1pt] align-top">
                    <Runs runs={row.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'spacer':
      return <div aria-hidden style={{ height: pt(block.size ?? 12) }} />;
    case 'pageBreak':
      return null;
    case 'meteraiBox':
      return (
        <div className="flex justify-end pt-[12pt]">
          <MeteraiBox />
        </div>
      );
  }
}

function Slot({ slot, captionLine, orgLine }: { slot: SignatureSlot; captionLine: boolean; orgLine: boolean }) {
  const stamp = slot.signed_at ? 'Ditandatangani secara elektronik' : slot.note ?? '';
  return (
    <div className="flex min-w-0 flex-col items-center">
      {captionLine && <p>{slot.caption || ' '}</p>}
      <p className="font-bold">{slot.label}</p>
      {orgLine && <p>{slot.organization || ' '}</p>}
      <div className="flex w-full items-center justify-center" style={{ height: pt(SIGN_SPACE) }}>
        {slot.image_src ? (
          <img src={slot.image_src} alt={`Tanda tangan ${slot.signer_name}`} className="object-contain" style={{ maxHeight: pt(SIGN_SPACE - 6), maxWidth: pt(140) }} />
        ) : stamp ? (
          <span className="text-[8pt] italic text-subtle">{stamp}</span>
        ) : null}
      </div>
      <p className={`font-bold ${slot.signer_name ? 'underline underline-offset-2' : ''}`}>{slot.signer_name || '(.............................)'}</p>
      <p>{slot.signer_title || ' '}</p>
      {slot.signed_at && <p className="pt-[2pt] text-[6.5pt] leading-tight text-subtle">{signedText(slot)}</p>}
    </div>
  );
}

function SignatureRow({ item }: { item: Extract<RenderItem, { kind: 'signatures' }> }) {
  const captionLine = item.slots.some((s) => s.caption);
  const orgLine = item.slots.some((s) => s.organization);
  const columns = signatureColumns(item.slots, item.meterai);
  return (
    <div className="grid gap-x-[12pt] pt-[22pt] text-center" style={{ gridTemplateColumns: columns.map((c) => (c.kind === 'meterai' ? 'auto' : 'minmax(0, 1fr)')).join(' ') }}>
      {columns.map((col, i) => {
        if (col.kind === 'slot') return <Slot key={i} slot={col.slot} captionLine={captionLine} orgLine={orgLine} />;
        if (col.kind === 'empty') return <div key={i} />;
        return (
          <div key={i} className="flex flex-col items-center" aria-label="Kotak e-Meterai">
            {captionLine && <p className="invisible">.</p>}
            <p className="invisible font-bold">.</p>
            {orgLine && <p className="invisible">.</p>}
            <div className="flex items-center" style={{ height: pt(SIGN_SPACE) }}>
              <MeteraiBox />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One render item (content block or signature row), optionally a slice of its rows / items. */
export function PreviewItem({ item, from, to, contentPt }: { item: RenderItem; from?: number; to?: number; contentPt: number }) {
  return item.kind === 'signatures' ? <SignatureRow item={item} /> : <BlockView block={item.block} from={from} to={to} contentPt={contentPt} />;
}

/** One A4 sheet: kop on top, content area inside the page margins, footer "nomor · Halaman x dari y". */
export function PageSheet({
  company,
  margins,
  footer,
  page,
  pages,
  children,
}: {
  company: CompanySettings;
  margins: { top: number; right: number; bottom: number; left: number };
  footer: string;
  page: number;
  pages: number;
  children: ReactNode;
}) {
  const sides: CSSProperties = { left: pt(margins.left), right: pt(margins.right) };
  const contact = contactLine(company);
  return (
    <section
      aria-label={`Halaman ${page} dari ${pages}`}
      className="pd-sheet relative bg-white text-[10pt] leading-[1.42] text-fg ring-1 ring-line-strong"
      style={{ width: pt(PAGE.width), height: pt(PAGE.height) }}
    >
      <header className="absolute flex items-center gap-[9pt] border-b-[1.2pt] border-brand-600 pb-[5pt]" style={{ ...sides, top: pt(KOP_TOP) }}>
        {/* LOGO.height (44pt wide wings) */}
        <LogoMark className="h-[26.7pt] text-brand-600" />
        <div className="min-w-0">
          <p className="text-[12.5pt] font-bold leading-tight">{company?.name}</p>
          {contact && <p className="pt-[1pt] text-[7.5pt] leading-snug text-muted">{contact}</p>}
        </div>
      </header>
      <div className="absolute" style={{ ...sides, top: pt(margins.top) }}>
        {children}
      </div>
      <footer className="absolute flex justify-between gap-[12pt] border-t-[0.5pt] border-line-strong pt-[3pt] text-[7.5pt] text-subtle" style={{ ...sides, top: pt(PAGE.height - FOOTER_FROM_BOTTOM) }}>
        <span>{footer}</span>
        <span className="shrink-0">
          Halaman {page} dari {pages}
        </span>
      </footer>
    </section>
  );
}
