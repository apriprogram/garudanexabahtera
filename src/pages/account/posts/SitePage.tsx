// Kerangka bersama halaman per situs di panel akun (Berita & Pengumuman, editor tulisan, SEO): wadah halaman, kepala
// halaman (kembali, nama situs, H1, navigasi pil situs), kerangka memuat, pemberitahuan situs nonaktif, dan pill status
// tulisan. Tata letak AccountLayout tidak memberi padding, jadi setiap halaman memakai PageContainer.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, MessageCircle, Newspaper } from 'lucide-react';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import { TEMPLATE_LIST } from '../../../templates';
import type { Site } from '../../../types/platform';
import type { SitePostStatus } from '../../../types/sitePosts';
import { Notice } from '../cms/ui';
import { helpWhatsappUrl, siteHelpMessage } from '../components/orderCopy';
import { SiteNav } from '../components/SiteNav';
import { EmptyState, Skeleton } from '../components/States';
import { hasPostsFeature, siteLinks } from './siteLinks';

export function PageContainer({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8" aria-busy={busy || undefined}>
      {children}
    </div>
  );
}

interface SitePageHeaderProps {
  site: Site;
  back: { to: string; label: string };
  title: string;
  description?: ReactNode;
  /** Tombol di kanan judul (HP: di bawah judul) */
  actions?: ReactNode;
}

/** Tombol kembali, situs (template · domain), H1 halaman, lalu navigasi pil situs. */
export function SitePageHeader({ site, back, title, description, actions }: SitePageHeaderProps) {
  return (
    <>
      <Link to={back.to} className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {back.label}
      </Link>
      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
            <Globe className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
            <span className="truncate">
              {site.template_name ? `${site.template_name} · ` : ''}
              <span className="font-medium text-fg">{site.domain}</span>
            </span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </header>
      <SiteNav siteId={site.id} posts={hasPostsFeature(site.template_code)} bleed className="mt-5" />
    </>
  );
}

/** Kerangka memuat: tombol kembali, judul, pil navigasi, lalu kartu-kartu. */
export function SitePageSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <PageContainer busy>
      <div role="status" aria-label={label}>
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="mt-4 h-4 w-48" />
        <Skeleton className="mt-2 h-8 w-64 max-w-full" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="card-site flex gap-4 p-4 sm:p-5">
              <Skeleton className="h-16 w-20 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Memuat...</span>
      </div>
    </PageContainer>
  );
}

/** Situs dinonaktifkan admin: halaman hanya-baca, bantuan lewat WhatsApp (pesan menyebut domainnya). */
export function SuspendedNotice({ site, children }: { site: Site; children?: ReactNode }) {
  const { settings } = useSiteSettings();
  return (
    <Notice
      tone="warning"
      title="Situs sedang dinonaktifkan"
      action={
        <a href={helpWhatsappUrl(settings, siteHelpMessage(site.domain))} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Hubungi kami via WhatsApp
          <span className="sr-only">(tab baru)</span>
        </a>
      }
    >
      {children ?? 'Situs ini dinonaktifkan sementara oleh admin, jadi isinya hanya bisa dilihat dan belum bisa diubah. Hubungi kami untuk mengaktifkannya kembali.'}
    </Notice>
  );
}

/** Template tanpa fitur tulisan: jelaskan, lalu arahkan ke Konten / SEO. */
export function PostsUnavailable({ site }: { site: Site }) {
  const names = TEMPLATE_LIST.filter((def) => def.features?.posts).map((def) => def.name);
  const links = siteLinks(site.id);
  return (
    <EmptyState
      icon={<Newspaper className="h-7 w-7" aria-hidden />}
      title="Template ini belum punya fitur berita"
      description={
        <>
          Berita &amp; pengumuman dengan foto, halaman sendiri, dan jumlah dilihat tersedia untuk template sekolah
          {names.length ? ` (${names.join(', ')})` : ''}. Konten dan SEO situs Anda tetap bisa diatur seperti biasa.
        </>
      }
      action={
        <>
          <Link to={links.content} className="btn btn-primary">
            Kelola konten
          </Link>
          <Link to={links.seo} className="btn btn-outline">
            Atur SEO
          </Link>
        </>
      }
    />
  );
}

/** Pill status tulisan: Terbit (hijau) / Draf (netral). Gaya sama dengan StatusPill pesanan. */
export function PostStatusPill({ status, className = '' }: { status: SitePostStatus; className?: string }) {
  const published = status === 'published';
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${
        published ? 'bg-success-50 text-success-700 ring-success/25' : 'bg-alt text-muted ring-line'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-success' : 'bg-subtle'}`} aria-hidden />
      {published ? 'Terbit' : 'Draf'}
    </span>
  );
}
