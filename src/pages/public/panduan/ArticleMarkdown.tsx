// Isi artikel panduan (Markdown + GFM) dengan gaya situs: H2 ber-id untuk daftar isi, tabel yang bisa digeser di
// dalam bingkainya sendiri (halaman tidak pernah scroll horizontal), checklist berikon, tautan internal sebagai <Link>
// (navigasi SPA, <a href> asli di HTML prerender) dan tautan eksternal di tab baru. react-markdown hanya dimuat chunk
// halaman artikel (lazy), tidak pernah bundel utama (dijaga plugin gn-entry-budget di vite.config.ts).
import { CircleCheck, Square } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { headingId } from '../../../content/panduan/parse';

/** Simpul hast minimal yang dibaca di sini. */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
}

/** Teks polos sebuah simpul (untuk id judul). */
const nodeText = (node: HastNode | undefined): string =>
  !node ? '' : node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(nodeText).join('');

/** Jumlah kolom tabel = sel di baris pertama. */
function columnCount(node: HastNode | undefined): number {
  const rows: HastNode[] = [];
  const walk = (n: HastNode) => {
    if (n.tagName === 'tr') rows.push(n);
    else n.children?.forEach(walk);
  };
  if (node) walk(node);
  return rows[0]?.children?.filter((c) => c.tagName === 'th' || c.tagName === 'td').length ?? 0;
}

/** Lebar minimum tabel: kolom tetap terbaca di HP; bingkainya yang digeser, bukan halamannya. */
const tableMinWidth = (columns: number): string => (columns >= 4 ? 'min-w-[40rem]' : columns === 3 ? 'min-w-[34rem]' : '');

const isExternal = (href: string): boolean => /^https?:\/\//i.test(href);

interface ArticleMarkdownProps {
  markdown: string;
  /** Ubah tautan internal sebelum dirender (mis. template yang tidak lagi terbit → katalog). */
  resolveHref?: (href: string) => string;
}

export function ArticleMarkdown({ markdown, resolveHref = (href) => href }: ArticleMarkdownProps) {
  const components: Components = {
    h1: ({ children }) => <h2 className="mt-12 text-xl font-semibold text-fg">{children}</h2>,
    h2: ({ node, children }) => (
      <h2
        id={headingId(nodeText(node as HastNode))}
        className="mt-12 scroll-mt-[calc(var(--nav-offset)+1.5rem)] text-xl font-semibold leading-tight tracking-[-0.02em] text-fg first:mt-0 sm:mt-16 sm:text-[28px] sm:leading-[1.15]"
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => <h3 className="mt-8 text-base font-semibold leading-snug text-fg sm:mt-10 sm:text-xl">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-6 text-[15px] font-semibold text-fg sm:text-base">{children}</h4>,
    p: ({ children }) => <p className="mt-4 first:mt-0 sm:mt-5">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
    a: ({ href = '', children }) => {
      const target = resolveHref(href);
      if (isExternal(target)) {
        return (
          <a href={target} target="_blank" rel="noopener noreferrer" className="link-site font-medium break-words">
            {children}
            <span className="sr-only"> (tab baru)</span>
          </a>
        );
      }
      if (target.startsWith('/')) {
        return (
          <Link to={target} className="link-site font-medium">
            {children}
          </Link>
        );
      }
      return (
        <a href={target} className="link-site font-medium">
          {children}
        </a>
      );
    },
    ul: ({ className, children }) =>
      className?.includes('contains-task-list') ? (
        <ul className="mt-4 space-y-2.5 sm:mt-5">{children}</ul>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-subtle sm:mt-5">{children}</ul>
      ),
    ol: ({ children, start }) => (
      <ol start={start} className="mt-4 list-decimal space-y-2 pl-5 marker:font-mono marker:text-[0.85em] marker:text-subtle sm:mt-5">
        {children}
      </ol>
    ),
    li: ({ className, children }) =>
      className?.includes('task-list-item') ? (
        <li className="flex items-start gap-3 rounded-[16px] bg-alt px-4 py-3 ring-1 ring-inset ring-line [&>p]:mt-0">{children}</li>
      ) : (
        <li className="pl-1 [&>p]:mt-2 [&>p:first-child]:mt-0">{children}</li>
      ),
    // Kotak centang checklist GFM → ikon (bukan kontrol formulir yang dibacakan "dinonaktifkan")
    input: ({ checked }) =>
      checked ? (
        <CircleCheck className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary" aria-hidden />
      ) : (
        <Square className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary" aria-hidden />
      ),
    blockquote: ({ children }) => (
      <aside className="mt-6 rounded-[20px] bg-alt p-4 text-fg ring-1 ring-inset ring-line sm:mt-8 sm:p-6 [&>p]:mt-2 [&>p:first-child]:mt-0">
        {children}
      </aside>
    ),
    hr: () => <hr className="my-10 border-line" />,
    table: ({ node, children }) => (
      // relative: teks sr-only "(tab baru)" (position absolute) di dalam sel ikut terpotong bingkai ini, bukan melebarkan
      // halaman di HP
      <div
        className="relative mt-6 overflow-x-auto rounded-[20px] ring-1 ring-inset ring-line sm:mt-8"
        tabIndex={0}
        role="region"
        aria-label="Tabel, geser ke samping bila perlu"
      >
        <table className={`w-full border-collapse text-left text-[13px] leading-relaxed sm:text-[15px] ${tableMinWidth(columnCount(node as HastNode))}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-alt text-fg">{children}</thead>,
    th: ({ children, style }) => (
      <th scope="col" style={style} className="px-4 py-3 align-bottom text-[12px] font-semibold sm:px-5 sm:text-[13px]">
        {children}
      </th>
    ),
    td: ({ children, style }) => (
      <td style={style} className="border-t border-line px-4 py-3 align-top sm:px-5 sm:py-3.5 [&_strong]:text-fg">
        {children}
      </td>
    ),
    code: ({ children }) => <code className="rounded bg-alt px-1.5 py-0.5 font-mono text-[0.9em] text-fg">{children}</code>,
  };

  return (
    <div className="text-[15px] leading-[1.75] text-muted sm:text-[17px] [&>p:first-child]:text-fg sm:[&>p:first-child]:text-[19px] sm:[&>p:first-child]:leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

