// Render satu situs (template + konten) dengan pengaman: kode template tidak dikenal atau konten yang membuat
// komponen error tidak merusak halaman lain, tetapi menampilkan layar "tampilan belum tersedia".
// `data` (rute, basePath, tulisan berita/pengumuman) diteruskan ke template lewat SiteDataContext (shared/siteData.ts);
// tanpa `data` = beranda tanpa tulisan (demo, katalog).
import { Component, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { getTemplate, parseSiteContent, resolveContent } from './index';
import { SiteStatus } from './SiteStatus';
import { SITE_DATA_DEFAULT, SiteDataContext, type SiteData } from './shared/siteData';

class TemplateErrorBoundary extends Component<{ fallback: ReactNode; resetKey: unknown; children: ReactNode }, { failedKey: unknown; failed: boolean }> {
  state = { failed: false, failedKey: undefined as unknown };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ failedKey: this.props.resetKey });
    console.error('Template gagal dirender:', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: unknown }) {
    // Konten berubah (mis. pembeli memperbaiki isian di CMS) → coba render lagi
    if (this.state.failed && prev.resetKey !== this.props.resetKey && this.state.failedKey !== this.props.resetKey) {
      this.setState({ failed: false, failedKey: undefined });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface SiteRendererProps {
  templateCode: string | null | undefined;
  /** Konten tersimpan (objek, string JSON, atau null = konten bawaan template); bentuk lain diabaikan */
  content: unknown;
  preview?: boolean;
  /**
   * Gerak template (muncul saat digulir, marquee, hitung angka). Bawaan true: demo & situs live bergerak.
   * Pratinjau CMS merender Component langsung tanpa prop ini, jadi tetap diam.
   */
  motion?: boolean;
  /** Layar bila template tidak tersedia / error (default: SiteStatus "unavailable" layar penuh) */
  fallback?: ReactNode;
  /** Rute & tulisan situs (CustomerSite, SitePreview); bawaan: beranda tanpa tulisan */
  data?: SiteData;
}

export function SiteRenderer({ templateCode, content, preview = false, motion = true, fallback, data }: SiteRendererProps) {
  const def = getTemplate(templateCode);
  const resolved = useMemo(() => (def ? resolveContent(def, parseSiteContent(content)) : null), [def, content]);
  // Konten ATAU halaman/data berubah (mis. pindah ke tulisan lain) → coba render lagi setelah error
  const resetKey = useMemo(() => [resolved, data], [resolved, data]);
  const unavailable = fallback ?? <SiteStatus kind="unavailable" />;
  if (!def || !resolved) return <>{unavailable}</>;
  const Template = def.Component;
  return (
    <TemplateErrorBoundary fallback={unavailable} resetKey={resetKey}>
      <SiteDataContext.Provider value={data ?? SITE_DATA_DEFAULT}>
        <Template content={resolved} preview={preview} motion={motion} />
      </SiteDataContext.Provider>
    </TemplateErrorBoundary>
  );
}

export default SiteRenderer;
