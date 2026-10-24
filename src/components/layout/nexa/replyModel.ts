import { useEffect, useMemo, useState } from 'react';
import { getHiddenSections, useSiteSettings } from '../../../hooks/useSiteSettings';
import { apiGet } from '../../../lib/api';
import type { PublicProject, Template } from '../../../types/platform';
import { buildProjectItems } from '../../sections/projects/projectItems';

/*
 * Model penyajian jawaban Nexa (dipakai NexaReply.tsx) (pemilik 2026-10-24: "lebih rapi dan jelas", tampilkan gambar mockup template & proyek):
 * - teks dipecah jadi paragraf dan daftar ("- " / "1."), **tebal** dirender, path situs jadi tautan berlabel ramah
 *   (/template/aura-studio → "Aura Studio", /harga → "halaman Harga"), wa.me/… → "WhatsApp";
 * - template yang disebut (path /template/{slug}) tampil sebagai kartu bergambar mockup + harga di bawah teks;
 * - proyek yang disebut lewat kode [proyek:p-12] / [proyek:f-slug] (lihat NEXA_INSTRUCTIONS di backend), atau semua
 *   proyek (maks. 4) bila pengunjung menanyakan hasil kerja kami, tampil sebagai kartu bergambar seperti section Projects.
 */

export type NexaCards = 'templates' | 'projects';

/**
 * Pertanyaan tentang hasil kerja kami → galeri proyek di bawah jawaban: "proyek apa saja yang sudah dikerjakan?",
 * "boleh lihat proyek kalian?", "ada portofolio?". Kata "kalian"/"apa saja" hanya dihitung bila menempel pada kata proyek,
 * jadi "apakah kalian bisa bikin aplikasi untuk klien saya?" tetap dijawab sebagai pertanyaan layanan. Bukan proyek
 * pengunjung sendiri ("project klinik saya", "saya sudah bayar proyek") dan bukan pertanyaan template ("templatenya").
 * Cocok untuk teks asli (NexaChat) maupun teks yang sudah dinormalisasi (localAnswer).
 */
export const PROJECT_QUESTION =
  /^(?!.*\b(?:template\w*|tema(?:nya)?|katalog\w*)\b)(?!.*\b(?:proyek|project)\s+(?:saya|aku|ku|kami)\b)(?!.*\b(?:saya|aku|kami)\s+(?:sudah|pernah)\b)(?=.*\b(?:proyek|project|projects|portofolio|portfolio|hasil kerja|karya|klien|client)\b)(?=.*(?:\b(?:portofolio|portfolio|hasil kerja)\b|\b(?:proyek|project|projects|karya|klien|client)\s+(?:kalian|sebelumnya|terdahulu|terbaru)\b|\b(?:lihat|contoh|daftar)\s+(?:proyek|project|projects|karya)\b|\b(?:proyek|project|projects|karya)\s+apa\s+saja\b|\bapa\s+saja\s+(?:proyek|project|projects|karya)\b|\bsiapa\s+(?:saja\s+)?(?:klien|client)\b|\b(?:proyek|project|projects|karya)\b.*\b(?:sudah|pernah)\s+(?:kalian\s+)?(?:dikerjakan|mengerjakan|kerjakan|dibuat|membuat|buat|digarap|bikin|ditangani|menangani)\b))/is;

export const MAX_CARDS = 4;

/** Path halaman situs yang boleh jadi tautan (bukan path lain yang mungkin ditulis model) atau wa.me/nomor. */
export const LINKS =
  /(^|[^\w/.])(?:(\/(?:template|harga|pesan-custom|jasa-pembuatan-website|jasa-pembuatan-aplikasi-mobile|tentang|kontak|panduan|syarat-ketentuan|kebijakan-privasi|kebijakan-pengembalian-dana)(?:\/[a-z0-9-]+)*)|(?:https?:\/\/)?wa\.me\/(\d{8,15}))/g;
export const TEMPLATE_PATH = /^\/template\/(?!kategori\/)([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const LIST_ITEM = /^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/;

/** Kode proyek di teks AI (lihat NEXA_INSTRUCTIONS): [proyek:p-12] / [proyek:f-slug]. */
const PROJECT_CODE = /\[proyek:([a-z0-9-]{1,120})\]/gi;
// Kode yang dibuang meninggalkan penanda sementara (karakter pribadi U+E000); hanya teks di sekitar penanda itu yang
// dirapikan, bukan seluruh jawaban (".co.id" dan "- .NET" tetap utuh). Tanpa lookbehind: Safari lama gagal memuatnya.
const MARK = '\uE000';
const MARK_IN_PARENS = /[ \t]*\([ \t]*(?:kode[ \t]*:?[ \t]*)?\uE000[ \t]*\)/gi;
// Pemisah di depannya (": ", " — ", "Kode: ") ikut dibuang bila ada teks sebelumnya; "- [proyek:p-1] Kasir" tetap butir
const MARK_WITH_LEAD = /(\S)[ \t]*(?:[:\u2013\u2014-][ \t]*)?(?:kode[ \t]*)?(?:[:\u2013\u2014-][ \t]*)?\uE000/gi;
const MARK_REST = /\uE000[ \t]*/g;
// Butir yang isinya hanya kode ("- [proyek:p-1]") tidak menyisakan "-"
const EMPTY_LIST_ITEM = /^[ \t]*(?:[-•*]|\d+[.)])[ \t]*$/gm;

export const PAGE_LABEL: Record<string, string> = {
  '/template': 'katalog template',
  '/harga': 'halaman Harga',
  '/pesan-custom': 'form pesan custom',
  '/jasa-pembuatan-website': 'Jasa pembuatan website',
  '/jasa-pembuatan-aplikasi-mobile': 'Jasa aplikasi mobile',
  '/tentang': 'Tentang kami',
  '/kontak': 'Kontak',
  '/panduan': 'Panduan',
  '/syarat-ketentuan': 'Syarat & ketentuan',
  '/kebijakan-privasi': 'Kebijakan privasi',
  '/kebijakan-pengembalian-dana': 'Kebijakan pengembalian dana',
};

/** Label halaman untuk jawaban berbahasa Inggris (prompt: jawab bahasa Inggris bila pengunjung menulis bahasa Inggris). */
export const PAGE_LABEL_EN: Record<string, string> = {
  '/template': 'template catalog',
  '/harga': 'pricing page',
  '/pesan-custom': 'custom order form',
  '/jasa-pembuatan-website': 'website development service',
  '/jasa-pembuatan-aplikasi-mobile': 'mobile app development service',
  '/tentang': 'about us',
  '/kontak': 'contact page',
  '/panduan': 'guide',
  '/syarat-ketentuan': 'terms & conditions',
  '/kebijakan-privasi': 'privacy policy',
  '/kebijakan-pengembalian-dana': 'refund policy',
};

const EN_WORDS = /\b(?:the|you|your|our|we|and|for|with|can|please|check|here|about|is|are|of|to)\b/gi;
const ID_WORDS = /\b(?:dan|di|untuk|yang|anda|kami|bisa|dengan|ke|ini|cek|silakan|atau|itu|dari|ada)\b/gi;
/** Jawaban berbahasa Inggris (lebih banyak kata fungsi Inggris daripada Indonesia): label tautan & kartu ikut Inggris. */
export const isEnglishReply = (text: string) => (text.match(EN_WORDS)?.length ?? 0) > (text.match(ID_WORDS)?.length ?? 0);

/** "aura-studio" → "Aura Studio" (template yang belum termuat / kategori). */
export const humanize = (slug: string) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

/**
 * Blok jawaban; daftar bernomor menyimpan nomor awalnya ("2." setelah sub-butir tetap 2, bukan mulai lagi dari 1).
 * indent: butir menjorok (sub-daftar), dipisah dari daftar induknya agar nomor induk tidak bergeser.
 */
type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[]; indent?: boolean }
  | { kind: 'ol'; start: number; items: string[]; indent?: boolean };

export interface ParsedReply {
  blocks: Block[];
  templateSlugs: string[];
  projectKeys: string[];
}

/** Teks jawaban → blok (paragraf/daftar) + template & proyek yang disebut (urut kemunculan, tanpa duplikat). */
export function parseReply(text: string): ParsedReply {
  const projectKeys: string[] = [];
  const clean = text
    .replaceAll(MARK, '')
    .replace(/https?:\/\/(?:www\.)?garudanexa\.com(?=\/)/g, '')
    .replace(PROJECT_CODE, (_, key: string) => {
      const lower = key.toLowerCase();
      if (!projectKeys.includes(lower)) projectKeys.push(lower);
      return MARK;
    })
    .replace(MARK_IN_PARENS, '')
    .replace(MARK_WITH_LEAD, '$1')
    .replace(MARK_REST, '')
    .replace(EMPTY_LIST_ITEM, '');

  const templateSlugs: string[] = [];
  for (const match of clean.matchAll(LINKS)) {
    const slug = match[2] ? TEMPLATE_PATH.exec(match[2])?.[1] : undefined;
    if (slug && !templateSlugs.includes(slug)) templateSlugs.push(slug);
  }

  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const raw of clean.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      flush();
      const last = blocks[blocks.length - 1];
      const kind = item[1] ? 'ol' : 'ul';
      const indent = /^[ \t]/.test(raw);
      // Butir menjorok = sub-daftar sendiri: "1. Paket\n   1. Basic\n2. Bayar" → langkah "2. Bayar" tetap 2
      if (last && last.kind === kind && Boolean(last.indent) === indent) last.items.push(item[2]);
      else if (kind === 'ol') blocks.push({ kind, start: Number(item[1]) || 1, items: [item[2]], ...(indent ? { indent } : {}) });
      else blocks.push({ kind, items: [item[2]], ...(indent ? { indent } : {}) });
      continue;
    }
    // Baris menjorok di bawah butir = lanjutan butir itu (bukan paragraf baru yang memutus daftar)
    const last = blocks[blocks.length - 1];
    if (/^[ \t]/.test(raw) && paragraph.length === 0 && last && last.kind !== 'p') {
      last.items[last.items.length - 1] += ` ${line}`;
      continue;
    }
    // Baris biasa setelah daftar: paragraf baru
    paragraph.push(line);
  }
  flush();
  return { blocks, templateSlugs, projectKeys };
}

/**
 * Data kartu: template terbit (get_templates) dan proyek beranda (get_public_projects + portfolio_data). Proyek kosong
 * bila admin menyembunyikan section Projects (disabled_sections), sama seperti beranda.
 */
export function useNexaCatalog(enabled: boolean) {
  const { settings } = useSiteSettings();
  // Keduanya disimpan sekaligus: menyimpan template lebih dulu memicu cleanup effect dan membatalkan proyek yang belum tiba
  const [data, setData] = useState<{ templates: Template[]; projects: PublicProject[] } | null>(null);
  useEffect(() => {
    if (!enabled || data !== null) return undefined;
    let alive = true;
    Promise.all([
      apiGet<{ templates?: Template[] }>('get_templates').then((res) => (Array.isArray(res.templates) ? res.templates : [])),
      apiGet<{ projects?: PublicProject[] }>('get_public_projects').then((res) =>
        Array.isArray(res.projects) ? res.projects.filter((p) => p && p.name) : [],
      ),
    ])
      .then(([templates, projects]) => {
        if (alive) setData({ templates, projects });
      })
      // Gagal (mis. jaringan putus): data tetap null, jadi panel yang dibuka lagi mencoba lagi (lib/api sudah melepas
      // permintaan gagal dari cache)
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled, data]);
  const portfolio = settings.portfolio_data;
  const hideProjects = getHiddenSections(settings).has('projects');
  return useMemo(
    () => ({
      templates: new Map((data?.templates ?? []).map((t) => [t.slug, t])),
      templateList: data?.templates ?? [],
      projects: data && !hideProjects ? buildProjectItems(data.projects, portfolio) : [],
    }),
    [data, portfolio, hideProjects],
  );
}

export type NexaCatalog = ReturnType<typeof useNexaCatalog>;
