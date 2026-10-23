// Penulis artikel panduan (docs/platform/SEO-PLAN.md §5.8, keputusan default 5): "Tim Garuda Nexa" sebagai
// Organization sampai ada orang nyata dengan nama, peran dan profil publik. Saat itu tambahkan entri `type: 'Person'`
// dengan `role` dan `profileUrl` (mis. LinkedIn) yang benar-benar ada, lalu pakai namanya di frontmatter `author`.
// Jangan menulis nama, jabatan, foto atau kredensial rekaan (kebijakan Google soal kepenulisan palsu).
// Modul murni (tanpa React): dipakai *.seo.ts (bundel utama) dan halaman artikel.
import { COMPANY_FACTS } from '../lib/companyFacts';
import { HUB_PATHS, absoluteUrl } from '../seo/paths';

export interface Author {
  /** Nama persis seperti di frontmatter `author` dan di byline. */
  name: string;
  type: 'Person' | 'Organization';
  /** Peran (orang) atau keterangan singkat (tim). */
  role: string;
  /** 1–2 kalimat di kotak penulis. */
  bio: string;
  /** Halaman di situs yang menjelaskan penulis. */
  path: string;
  /** Profil publik yang nyata (LinkedIn dsb.). Kosong untuk tim. */
  profileUrl?: string;
}

export const DEFAULT_AUTHOR_NAME = `Tim ${COMPANY_FACTS.name}`;

export const AUTHORS: Readonly<Record<string, Author>> = {
  [DEFAULT_AUTHOR_NAME]: {
    name: DEFAULT_AUTHOR_NAME,
    type: 'Organization',
    role: `Tim ${COMPANY_FACTS.legalName}`,
    bio: `Tim di balik template website siap pakai ${COMPANY_FACTS.name} serta jasa pembuatan website dan aplikasi mobile custom. Kami menulis panduan ini agar pemilik usaha bisa memahami biaya dan pilihan sebelum membuat website atau aplikasi; setiap angka dari pihak lain kami sertakan sumbernya.`,
    path: HUB_PATHS.about,
  },
};

/** Penulis dengan nama ini, atau undefined (tes artikel memastikan semua penulis terdaftar). */
export const findAuthor = (name: string): Author | undefined => AUTHORS[name];

/** Penulis dengan nama ini; nama yang tidak terdaftar → tim (tidak pernah menampilkan nama yang tidak dikenal). */
export const getAuthor = (name: string): Author => AUTHORS[name] ?? AUTHORS[DEFAULT_AUTHOR_NAME];

/** Penulis untuk JSON-LD Article (src/seo/jsonld.ts article()). */
export const authorForJsonLd = (author: Author): { type: Author['type']; name: string; url: string } => ({
  type: author.type,
  name: author.name,
  url: author.profileUrl ?? absoluteUrl(author.path),
});
