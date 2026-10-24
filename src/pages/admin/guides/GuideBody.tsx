// Isi artikel untuk pratinjau di panel admin: ArticleMarkdown yang sama dengan halaman /panduan/{slug}, kolom Sumber
// ikut tampil sebagai bagian "## Sumber" bila isi belum menulisnya sendiri (withSourcesSection, sama dengan halaman
// artikel), token data ({{harga_template_min}} dsb.) diganti data template terbaru, dan tautan internal dibuka di tab
// baru supaya form yang sedang diisi tidak ditinggalkan. Dimuat lazy (lihat GuidePreview & GuideForm): react-markdown
// baru diunduh saat pratinjau pertama kali dibuka, tidak ikut chunk Pengaturan website.
import { useMemo, type MouseEvent } from 'react';
import { withSourcesSection } from '../../../content/panduan/parse';
import { resolvePlaceholders } from '../../../content/panduan/placeholders';
import { usePriceDate, usePublishedTemplates } from '../../../hooks/usePublishedTemplates';
import { ArticleMarkdown } from '../../public/panduan/ArticleMarkdown';

const NO_SOURCES: readonly string[] = [];

export default function GuideBody({ markdown, sources = NO_SOURCES }: { markdown: string; sources?: readonly string[] }) {
  const { templates } = usePublishedTemplates();
  const priceDate = usePriceDate();
  const resolved = useMemo(
    () => resolvePlaceholders(withSourcesSection(markdown, sources), { templates, priceDate }),
    [markdown, sources, templates, priceDate],
  );

  // Tautan internal (<Link> react-router) → tab baru; tautan eksternal sudah target="_blank"
  const openLinksInNewTab = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || link.target === '_blank') return;
    event.preventDefault();
    window.open(link.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div onClickCapture={openLinksInNewTab}>
      <ArticleMarkdown markdown={resolved} />
    </div>
  );
}
