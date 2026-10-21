// Splits measured render items over A4 pages for the preview (the PDF and DOCX paginate themselves). Tables and lists
// may continue on the next page row by row / item by item (the table header repeats); headings stay with what
// follows; anything else moves to the next page whole.

export interface ItemMetrics {
  /** full height including the item's top spacing */
  height: number;
  /** splittable items: height of the part shown on every page (top spacing + table header) */
  head?: number;
  /** splittable items: heights of the rows / list items */
  units?: number[];
  /** a heading: never the last thing on a page */
  keepWithNext?: boolean;
  /** a page break: the next item starts a new page */
  pageBreak?: boolean;
}

/** Item `index` on a page; `from`/`to` = range of its units [from, to) when it is split. */
export interface PageSlice {
  index: number;
  from?: number;
  to?: number;
}

/** Minimum rows/items of a split table or list at the bottom of a page (avoids a lone row). */
const MIN_UNITS = 2;

export function paginate(metrics: ItemMetrics[], pageHeight: number): PageSlice[][] {
  const pages: PageSlice[][] = [[]];
  let used = 0;
  const current = () => pages[pages.length - 1];
  const newPage = () => {
    if (current().length) pages.push([]);
    used = 0;
  };
  const firstPart = (m: ItemMetrics | undefined) => (!m || m.pageBreak ? 0 : m.units?.length ? (m.head ?? 0) + m.units[0] : m.height);

  metrics.forEach((m, index) => {
    if (m.pageBreak) {
      newPage();
      return;
    }
    if (m.keepWithNext && used > 0 && used + m.height + firstPart(metrics[index + 1]) > pageHeight) newPage();
    if (used + m.height <= pageHeight) {
      current().push({ index });
      used += m.height;
      return;
    }
    const units = m.units ?? [];
    if (!units.length) {
      // atomic: next page (a block taller than a page simply overflows its own page)
      newPage();
      current().push({ index });
      used = m.height;
      return;
    }
    const head = m.head ?? 0;
    let from = 0;
    while (from < units.length) {
      let to = from;
      let height = head;
      while (to < units.length && used + height + units[to] <= pageHeight) {
        height += units[to];
        to += 1;
      }
      if (used > 0 && to - from < Math.min(MIN_UNITS, units.length - from)) {
        newPage();
        continue;
      }
      if (to === from) {
        // one row taller than a whole page
        height += units[from];
        to = from + 1;
      }
      current().push({ index, from, to });
      used += height;
      from = to;
      if (from < units.length) newPage();
    }
  });
  return pages;
}
