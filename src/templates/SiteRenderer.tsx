// Render satu situs (template + konten) dengan pengaman: kode template tidak dikenal atau konten yang membuat
// komponen error tidak merusak halaman lain, tetapi menampilkan layar "tampilan belum tersedia".
// `data` (rute, basePath, tulisan berita/pengumuman, fitur Berita & Pengumuman) diteruskan ke template lewat
// SiteDataContext (shared/siteData.ts); tanpa `data` = beranda tanpa tulisan, berita biasa (demo, katalog).
// `postsEnabled` hanya berlaku untuk template mampu (features.posts); pemanggil mengisinya dari `site.addons.posts`.
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
  /** Rute, tulisan & fitur situs (CustomerSite, SitePreview, demo ?fitur=berita); bawaan: beranda tanpa tulisan */
  data?: SiteData;
}

export function SiteRenderer({ templateCode, content, preview = false, motion = true, fallback, data }: SiteRendererProps) {
  const def = getTemplate(templateCode);
  const resolved = useMemo(() => (def ? resolveContent(def, parseSiteContent(content)) : null), [def, content]);
  // Konten ATAU halaman/data berubah (mis. pindah ke tulisan lain) → coba render lagi setelah error
  const resetKey = useMemo(() => [resolved, data], [resolved, data]);
  const capable = def?.features?.posts === true;
  const value = useMemo<SiteData>(() => {
    const base = data ?? SITE_DATA_DEFAULT;
    // Template tidak mampu tidak pernah memakai section/halaman tulisan (nilai lama tanpa field = false)
    const postsEnabled = capable && base.postsEnabled === true;
    return base.postsEnabled === postsEnabled ? base : { ...base, postsEnabled };
  }, [data, capable]);
  const unavailable = fallback ?? <SiteStatus kind="unavailable" />;
  if (!def || !resolved) return <>{unavailable}</>;
  const Template = def.Component;
  return (
    <TemplateErrorBoundary fallback={unavailable} resetKey={resetKey}>
      <SiteDataContext.Provider value={value}>
        <Template content={resolved} preview={preview} motion={motion} />
      </SiteDataContext.Provider>
    </TemplateErrorBoundary>
  );
}

export default SiteRenderer;
