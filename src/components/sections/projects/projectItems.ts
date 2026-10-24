// Kartu proyek beranda (#projects) dan kartu proyek di jawaban Nexa: satu sumber data yang sama. Proyek klien yang layak
// tampil (presentable.ts, min. 2), atau portofolio cadangan (setting portfolio_data / DEFAULT_PORTFOLIO). Daftar dan
// label yang sama dipakai backend untuk pengetahuan Nexa (nexa_showcase_facts di backend/modules/nexa.php = nexa.js).
import type { PublicProject } from '../../../types/platform';
import { readList } from '../../../hooks/useSiteSettings';
import { presentableProjects } from './presentable';
import { mediaLink, projectDescription, projectGallery, projectTools, projectUrl, type PortfolioItem } from './portfolio';

export type { PortfolioItem } from './portfolio';

export interface ProjectCardData {
  key: string;
  /** Kunci suka & dilihat di server (showcase_stats): p-{id} proyek, f-{slug judul} portofolio cadangan. */
  statsKey: string;
  title: string;
  label: string;
  description: string;
  /** Gambar kartu (mockup). */
  image: string | null;
  /** Tools / teknologi (chip di dialog detail); proyek klien: []. */
  tools: string[];
  /** Tautan situs ("Kunjungi Situs"), atau null. */
  url: string | null;
  /** Gambar detail di dialog, berurutan; kosong → dialog memakai gambar kartu. */
  gallery: string[];
  /** Video proyek di dialog, atau null. */
  video: string | null;
}

export const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { title: 'Web App Dashboard', desc: 'SAAS / FINANCE', image: '/assets/portofolio/portfolio1.png' },
  { title: 'Mobile POS App', desc: 'RETAIL / ANDROID', image: '/assets/portofolio/portfolio2.png' },
  { title: 'E-Commerce System', desc: 'SHOPPING / WEB', image: '/assets/product/ischool.png' },
  { title: 'Corporate Website', desc: 'BRANDING / MODERN', image: '/assets/product/isantri.png' },
  { title: 'Sistem Informasi Desa', desc: 'GOVERNMENT / WEB', image: '/assets/product/pos.png' },
];

const SERVICE_LABEL: Record<string, string> = {
  website: 'Website',
  web: 'Website',
  mobile_app: 'Aplikasi Mobile',
  mobile: 'Aplikasi Mobile',
  android: 'Aplikasi Android',
  ios: 'Aplikasi iOS',
};

export const serviceLabel = (value: string | null | undefined) => {
  const raw = (value || '').trim();
  return SERVICE_LABEL[raw.toLowerCase()] ?? raw.replace(/_/g, ' ');
};

/**
 * Slug judul portofolio = showcaseSlug() di backend/modules/templates.js (pf_showcase_slug di templates.php). Huruf non-ASCII
 * dibuang SEBELUM huruf kecil: strtolower PHP hanya mengubah ASCII, sedangkan toLowerCase JS mengubah "İ" → "i̇" dan tanda
 * Kelvin → "k", jadi urutan sebaliknya membuat kunci beda antara backend.
 */
export const showcaseSlug = (title: string) =>
  title.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '').slice(0, 100);

/** Kartu proyek dari get_public_projects + setting portfolio_data (urutan & kunci sama dengan #projects). */
export function buildProjectItems(projects: readonly PublicProject[], portfolioRaw: string | undefined): ProjectCardData[] {
  // Teks uji (Lorem ipsum, "Coba text") tidak boleh sampai ke beranda; satu proyek saja juga tampak sepi
  const presentable = presentableProjects(projects);
  if (presentable.length > 0) {
    return presentable.map((project) => ({
      key: `p-${project.id}`,
      statsKey: `p-${project.id}`,
      title: project.name,
      label: serviceLabel(project.service_type),
      description: (project.description || '').trim(),
      image: project.image || null,
      tools: [],
      url: null,
      gallery: [],
      video: null,
    }));
  }
  return readList<PortfolioItem>(portfolioRaw, DEFAULT_PORTFOLIO)
    .filter((item) => item && item.title && item.image)
    .map((item, index) => ({
      key: `f-${index}-${item.title}`,
      statsKey: `f-${showcaseSlug(item.title)}`,
      title: item.title,
      label: item.desc || '',
      // Isian baru (Pengaturan website > Proyek) opsional; entri lama tanpa isian ini tampil seperti sebelumnya
      description: projectDescription(item.description),
      image: item.image,
      tools: projectTools(item.tools),
      url: projectUrl(item.url) || null,
      gallery: projectGallery(item.gallery),
      video: mediaLink(item.video) || null,
    }));
}
