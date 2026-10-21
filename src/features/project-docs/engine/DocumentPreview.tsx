// A4 preview of a DocModel. The blocks are measured once off-screen at their printed width and paginated (kop and
// "Halaman x dari y" on every sheet); the sheets are scaled to the available width, never below a readable size: on a
// phone the sheet keeps its proportions and scrolls sideways inside its own frame, not the page. A print-only copy
// of the sheets (portal on <body>) makes the browser's print dialog produce the same A4 pages.
// Paper is always white with site tokens (also inside the dark admin theme); only the logo uses the brand color.
import { useLayoutEffect, useMemo, useRef, useState, type FC } from 'react';
import { createPortal } from 'react-dom';
import { MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { PAGE, pageMargins, renderItems, type RenderItem } from './layout';
import type { DocModel } from './model';
import { paginate, type ItemMetrics, type PageSlice } from './paginate';
import { PageSheet, PreviewItem } from './PreviewParts';

/** CSS pixels per point. */
const PX = 4 / 3;
const PAGE_W = PAGE.width * PX;
const PAGE_H = PAGE.height * PX;
/** Space between sheets (px, unscaled). */
const GAP = 16;
/** Auto fit never goes below this scale (≈ 8 px body text); narrower frames scroll sideways. */
const MIN_FIT = 0.6;
const ZOOMS = [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];

const PRINT_CSS = `
.pd-print-portal{display:none}
@media print{
  @page{size:A4;margin:0}
  html,body{background:white!important}
  body>*:not(.pd-print-portal){display:none!important}
  .pd-print-portal{display:block!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pd-print-portal .pd-sheet{break-after:page;box-shadow:none!important}
  .pd-print-portal .pd-sheet:last-child{break-after:auto}
}`;

const BUTTON =
  'relative inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-alt hover:text-fg disabled:pointer-events-none disabled:opacity-40 after:absolute after:-inset-1.5';

/** Heights of the measured items (unscaled px); tables, lists and "Label : isi" rows report their rows as units. */
function readMetrics(root: HTMLElement, items: RenderItem[]): ItemMetrics[] {
  const nodes = root.querySelectorAll<HTMLElement>(':scope > [data-pd-item]');
  return items.map((item, i): ItemMetrics => {
    if (item.kind === 'block' && item.block.type === 'pageBreak') return { height: 0, pageBreak: true };
    const el = nodes[i];
    const height = el ? el.getBoundingClientRect().height : 0;
    const units = el ? Array.from(el.querySelectorAll<HTMLElement>('[data-pd-unit]'), (u) => u.getBoundingClientRect().height) : [];
    const keepWithNext = item.kind === 'block' && item.block.type === 'heading';
    if (units.length < 2) return { height, keepWithNext };
    return { height, head: Math.max(0, height - units.reduce((a, b) => a + b, 0)), units, keepWithNext };
  });
}

const samePages = (a: PageSlice[][], b: PageSlice[][]) => JSON.stringify(a) === JSON.stringify(b);

/** Next zoom level below (-1) or above (+1) `scale`. */
const zoomStep = (scale: number, direction: 1 | -1) =>
  direction < 0 ? ZOOMS.filter((z) => z < scale - 0.001).pop() ?? ZOOMS[0] : ZOOMS.find((z) => z > scale + 0.001) ?? ZOOMS[ZOOMS.length - 1];

/** A4 page look of a document model (screen + print). */
export const DocumentPreview: FC<{ model: DocModel; className?: string }> = ({ model, className = '' }) => {
  const items = useMemo(() => renderItems(model), [model]);
  const margins = pageMargins(model.meta.type);
  const contentPt = PAGE.width - margins.left - margins.right;
  // 2 px of slack for sub-pixel rounding of the measured rows
  const contentHeight = (PAGE.height - margins.top - margins.bottom) * PX - 2;

  const measureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ items: RenderItem[]; pages: PageSlice[][] } | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');

  // Paginate from the measured heights; again whenever they change (web fonts, images)
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const measure = () => {
      const pages = paginate(readMetrics(root, items), contentHeight);
      setLayout((prev) => (prev && prev.items === items && samePages(prev.pages, pages) ? prev : { items, pages }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [items, contentHeight]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameWidth(frame.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Until measured (first render, tests without layout): one page per explicit page break
  const pages = layout?.items === items ? layout.pages : paginate(items.map((item) => ({ height: 0, pageBreak: item.kind === 'block' && item.block.type === 'pageBreak' })), contentHeight);
  const fit = frameWidth > 0 ? Math.min(1, Math.max(MIN_FIT, (frameWidth - 2) / PAGE_W)) : 1;
  const scale = zoom === 'fit' ? fit : zoom;
  const totalHeight = pages.length * PAGE_H + (pages.length - 1) * GAP;

  const sheets = pages.map((slices, p) => (
    <PageSheet key={p} company={model.kop.company} margins={margins} footer={model.footer.text} page={p + 1} pages={pages.length}>
      {slices.map((slice) => (
        <PreviewItem key={`${slice.index}-${slice.from ?? 0}`} item={items[slice.index]} from={slice.from} to={slice.to} contentPt={contentPt} />
      ))}
    </PageSheet>
  ));

  return (
    <article aria-label={`Pratinjau ${model.meta.title}`} className={`min-w-0 ${className}`}>
      <style href="pd-document-print" precedence="default">
        {PRINT_CSS}
      </style>
      <div className="mb-2 flex justify-end">
        <div role="toolbar" aria-label="Zoom pratinjau" className="inline-flex items-center gap-0.5 rounded-full bg-white p-0.5 ring-1 ring-inset ring-line">
          <button type="button" className={BUTTON} onClick={() => setZoom((z) => zoomStep(z === 'fit' ? fit : z, -1))} disabled={scale <= ZOOMS[0] + 0.001} aria-label="Perkecil" title="Perkecil">
            <ZoomOut className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-fg" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className={BUTTON}
            onClick={() => setZoom((z) => zoomStep(z === 'fit' ? fit : z, 1))}
            disabled={scale >= ZOOMS[ZOOMS.length - 1] - 0.001}
            aria-label="Perbesar"
            title="Perbesar"
          >
            <ZoomIn className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={BUTTON} onClick={() => setZoom('fit')} aria-pressed={zoom === 'fit'} aria-label="Sesuaikan lebar" title="Sesuaikan lebar">
            <MoveHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div ref={frameRef} className="overflow-x-auto overscroll-x-contain pb-1">
        <div className="mx-auto" style={{ width: PAGE_W * scale, height: totalHeight * scale }}>
          <div className="flex origin-top-left flex-col" style={{ width: PAGE_W, gap: GAP, transform: `scale(${scale})` }}>
            {sheets}
          </div>
        </div>
        {/* Off-screen measuring copy at the printed content width */}
        <div className="relative h-0 overflow-hidden" aria-hidden>
          <div ref={measureRef} className="invisible absolute left-0 top-0 text-[10pt] leading-[1.42] text-fg" style={{ width: `${contentPt}pt` }}>
            {items.map((item, i) => (
              <div key={i} data-pd-item>
                <PreviewItem item={item} contentPt={contentPt} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(<div className="pd-print-portal">{sheets}</div>, document.body)}
    </article>
  );
};
