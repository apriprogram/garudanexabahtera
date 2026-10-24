// Pratinjau artikel panduan (draf dari daftar, atau isian form yang belum disimpan): judul H1, deskripsi, penulis &
// tanggal, lalu isi (dengan daftar Sumber bila isi belum menulisnya, lihat GuideBody) bergaya halaman /panduan/{slug}.
// Kartu pratinjau sengaja memakai token website (selalu terang) karena website publik tidak punya mode gelap; panel
// admin di sekitarnya tetap ikut tema. Isi dimuat lazy; gagal muat/render ditahan PreviewErrorBoundary supaya form
// artikel yang sedang diisi tidak ikut hilang.
import { Component, Suspense, lazy, useState, type ErrorInfo, type ReactNode } from 'react';
import { Eye, Pencil, RotateCw, TriangleAlert } from 'lucide-react';
import { Button, Modal } from '../../../components/admin/ui';
import { formatDateId } from '../../../seo/format';

const importGuideBody = () => lazy(() => import('./GuideBody'));

/**
 * Komponen lazy bersama semua pratinjau. React.lazy menyimpan impor yang gagal (mis. chunk lama 404 setelah deploy),
 * jadi "Coba lagi" membuat komponen lazy baru di sini; pratinjau yang dipasang sesudahnya ikut memakai yang baru.
 */
let sharedGuideBody = importGuideBody();

function reloadGuideBody() {
  sharedGuideBody = importGuideBody();
  return sharedGuideBody;
}

/** Pratinjau gagal dimuat atau dirender: pesan + "Coba lagi" di tempat pratinjau (pola PreviewErrorBoundary di PreviewPane.tsx). */
class PreviewErrorBoundary extends Component<{ onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Pratinjau artikel gagal dimuat:', error, info.componentStack);
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <TriangleAlert className="h-6 w-6 text-warning" aria-hidden />
        <p className="text-sm font-semibold text-fg">Pratinjau gagal dimuat</p>
        <p className="max-w-sm text-sm text-muted">Periksa koneksi internet lalu coba lagi. Isian artikel tidak hilang.</p>
        <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={this.retry} className="mt-2">
          Coba lagi
        </Button>
      </div>
    );
  }
}

/**
 * Isi Markdown yang dirender seperti di website (dimuat lazy), atau keterangan bila masih kosong. sources = kolom
 * Sumber, tampil sebagai bagian "## Sumber" bila isi belum memilikinya (sama dengan halaman artikel).
 */
export function GuideBodyPreview({ markdown, sources }: { markdown: string; sources?: readonly string[] }) {
  const [Body, setBody] = useState(() => sharedGuideBody);
  if (!markdown.trim()) return <p className="text-sm text-subtle">Belum ada isi untuk dipratinjau.</p>;
  const retry = () => {
    const next = reloadGuideBody();
    setBody(() => next);
  };
  return (
    <PreviewErrorBoundary onRetry={retry}>
      <Suspense
        fallback={
          <p className="text-sm text-subtle" role="status">
            Memuat pratinjau...
          </p>
        }
      >
        <Body markdown={markdown} sources={sources} />
      </Suspense>
    </PreviewErrorBoundary>
  );
}

export interface GuidePreviewArticle {
  title: string;
  description: string;
  body: string;
  /** URL sumber (kolom Sumber) */
  sources: readonly string[];
  author: string;
  datePublished: string;
  published: boolean;
}

export function GuidePreview({
  open,
  article,
  onClose,
  onEdit,
  zIndex,
}: {
  open: boolean;
  article: GuidePreviewArticle | null;
  onClose: () => void;
  /** Tombol "Edit" di kaki dialog (pratinjau dari daftar) */
  onEdit?: () => void;
  /** Di atas form artikel bila dibuka dari form */
  zIndex?: number;
}) {
  return (
    <Modal
      open={open && article !== null}
      onClose={onClose}
      title="Pratinjau artikel"
      description={
        article?.published
          ? 'Tampilan artikel seperti di website.'
          : 'Draf: belum tampil di website. Beginilah tampilannya setelah terbit.'
      }
      icon={<Eye />}
      size="lg"
      zIndex={zIndex}
      footer={
        <>
          {onEdit && (
            <Button variant="secondary" icon={<Pencil />} onClick={onEdit}>
              Edit artikel
            </Button>
          )}
          <Button onClick={onClose}>Tutup</Button>
        </>
      }
    >
      {article && (
        <article className="rounded-[20px] bg-surface p-5 text-fg ring-1 ring-inset ring-line sm:p-8">
          <p className="text-xs text-subtle sm:text-[13px]">
            {article.author} · {article.datePublished ? formatDateId(article.datePublished) : 'Tanggal belum diisi'}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[34px] sm:leading-[1.15]">
            {article.title.trim() || 'Judul belum diisi'}
          </h1>
          {article.description.trim() && (
            <p className="mt-3 break-words text-[15px] leading-relaxed text-muted sm:text-lg">{article.description}</p>
          )}
          <hr className="my-6 border-line sm:my-8" />
          <GuideBodyPreview markdown={article.body} sources={article.sources} />
        </article>
      )}
    </Modal>
  );
}

export default GuidePreview;
