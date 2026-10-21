// The tiny body markup of spec §4.1, extended for formal Indonesian documents:
//   blank line            new paragraph (a single line break stays a line break, e.g. address blocks)
//   "- " / "* "           bullet item
//   "1. "  "(1) "  "a. "  numbered item: 1. 2. 3. / ayat (1) (2) / huruf a. b. (number of the first item is kept)
//   leading spaces/tab    the list item is one level deeper (huruf a. b. under ayat (1))
//   **bold**  *italic*    inline emphasis
//   {{#name}}             a line on its own = block directive (auto table, signature row, page break), see autoBlocks.ts
// Merge fields are resolved per run AFTER the markup is split, so a merged value can never inject markup.
import type { Block, ListStyle, TextRun } from './model';

type ListBlock = Extract<Block, { type: 'list' }>;

const BULLET = /^[-*•]\s+/;
const DECIMAL = /^(\d{1,3})[.)]\s+/;
const PAREN = /^\((\d{1,3})\)\s+/;
const ALPHA = /^([a-z])[.)]\s+/;
const DIRECTIVE = /^\{\{#([a-z_]+)\}\}$/;
const BOLD = /(\*\*[^*]+?\*\*)/;
const ITALIC = /(\*[^*\s](?:[^*]*?[^*\s])?\*)/;

/** Inline markup → runs; `resolve` fills merge fields; empty runs are dropped. */
export function toRuns(text: string, resolve: (s: string) => string = (s) => s): TextRun[] {
  const runs: TextRun[] = [];
  const push = (raw: string, style: { bold?: boolean; italic?: boolean }) => {
    const value = resolve(raw);
    if (value !== '') runs.push({ text: value, ...style });
  };
  for (const part of String(text ?? '').split(BOLD)) {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      push(part.slice(2, -2), { bold: true });
      continue;
    }
    for (const piece of part.split(ITALIC)) {
      if (piece.length > 2 && ITALIC.test(piece) && piece.startsWith('*') && piece.endsWith('*')) push(piece.slice(1, -1), { italic: true });
      else if (piece !== '') push(piece, {});
    }
  }
  return runs;
}

/** Plain text of runs. */
export const runsText = (runs: TextRun[]) => runs.map((r) => r.text).join('');

/** List marker detection: style, number of the item (1-based) and the text after the marker. */
function listItem(line: string): { ordered: boolean; style: ListStyle | undefined; n: number; text: string } | null {
  let m = PAREN.exec(line);
  if (m) return { ordered: true, style: 'paren', n: Number(m[1]), text: line.slice(m[0].length) };
  m = DECIMAL.exec(line);
  if (m) return { ordered: true, style: undefined, n: Number(m[1]), text: line.slice(m[0].length) };
  m = ALPHA.exec(line);
  if (m) return { ordered: true, style: 'alpha', n: m[1].charCodeAt(0) - 96, text: line.slice(m[0].length) };
  m = BULLET.exec(line);
  if (m) return { ordered: false, style: undefined, n: 0, text: line.slice(m[0].length) };
  return null;
}

/**
 * Body markup → paragraph / list blocks. `directive(name)` returns the blocks of a `{{#name}}` line (null = unknown
 * directive, which the caller reports); without it directive lines stay plain text.
 */
export function parseBody(
  body: string,
  resolve: (s: string) => string = (s) => s,
  directive?: (name: string) => Block[],
): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: ListBlock | null = null;

  const flushParagraph = () => {
    const lines = paragraph.map((line) => toRuns(line, resolve)).filter((runs) => runsText(runs).trim() !== '');
    paragraph = [];
    if (!lines.length) return;
    const runs = lines.flatMap((line, i) => (i === 0 ? line : [{ text: '\n' }, ...line]));
    // Line-broken text (addresses, signature blocks) reads better left-aligned than justified
    blocks.push({ type: 'paragraph', runs, align: lines.length > 1 ? 'left' : 'justify' });
  };
  const flushList = () => {
    if (list && list.items.length) blocks.push(list);
    list = null;
  };

  for (const raw of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const name = directive ? DIRECTIVE.exec(line)?.[1] : undefined;
    const item = line ? listItem(line) : null;
    if (line === '') {
      flushParagraph();
      flushList();
    } else if (name !== undefined && directive) {
      flushParagraph();
      flushList();
      blocks.push(...directive(name));
    } else if (item) {
      flushParagraph();
      const indent = /^(\s{2,}|\t)/.test(raw) ? 1 : 0;
      const current = list as ListBlock | null;
      if (!current || current.ordered !== item.ordered || current.style !== item.style || (current.indent ?? 0) !== indent) {
        flushList();
        list = { type: 'list', ordered: item.ordered, items: [] };
        if (item.style) list.style = item.style;
        if (item.ordered && item.n > 1) list.start = item.n;
        if (indent) list.indent = indent;
      }
      const runs = toRuns(item.text, resolve);
      (list as ListBlock).items.push(runs.length ? runs : [{ text: '' }]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}
