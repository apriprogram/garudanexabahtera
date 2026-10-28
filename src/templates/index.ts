// Registry template situs pembeli. Kontrak: docs/platform/SPEC.md §7.
// Kunci = `template_code` di tabel templates / template_orders / template_sites.
import { altura } from './altura';
import { arenaClub } from './arena-club';
import { auraStudio } from './aura-studio';
import { bestari } from './bestari';
import { cakrawala } from './cakrawala';
import { corporateNexa } from './corporate-nexa';
import { dermaga } from './dermaga';
import { finova } from './finova';
import { gadgetku } from './gadgetku';
import { glowstory } from './glowstory';
import { healthlink } from './healthlink';
import { homenest } from './homenest';
import { jumantara } from './jumantara';
import { madani } from './madani';
import { medicareGeneral } from './medicare-general';
import { momkid } from './momkid';
import { nawasena } from './nawasena';
import { nusaniaga } from './nusaniaga';
import { paynow } from './paynow';
import { portline } from './portline';
import { pradipta } from './pradipta';
import { puncakgear } from './puncakgear';
import { saudagar } from './saudagar';
import { serenity } from './serenity';
import { skynusa } from './skynusa';
import { smashhall } from './smashhall';
import { sparringPadel } from './sparring-padel';
import { specialistplus } from './specialistplus';
import { startupClean } from './startup-clean';
import { tanimakmur } from './tanimakmur';
import { velora } from './velora';
import { applyIntroduced } from './shared/compat';
import { isPlainObject, toListItem } from './shared/utils';
import type { ListItem, SectionContent, SiteContent, TemplateDefinition } from './types';

// Urutan = urutan pilihan "Kode template" di admin (sama dengan sort_order katalog).
// Template 2026-10-22 (arena-club, aura-studio, finova): brief di docs/platform/TEMPLATE-BRIEFS-2026-10.md.
// Serenity (2026-10-25): studio wellness, hero foto layar penuh (src/templates/serenity/Serenity.tsx).
// SkyNusa (2026-10-25): toko drone, hero lembar spesifikasi + keranjang demo (src/templates/skynusa/SkyNusa.tsx).
// TaniMakmur (2026-10-25): toko tani, paket per tanaman (src/templates/tanimakmur/TaniMakmur.tsx).
// PuncakGear (2026-10-25): toko perlengkapan mendaki, panduan per gunung + sewa alat (src/templates/puncakgear/PuncakGear.tsx).
// GadgetKu.id (2026-10-25): toko aksesori HP, cari per tipe HP + custom casing (src/templates/gadgetku/GadgetKu.tsx).
// GlowStory (2026-10-25): toko online kecantikan, kuis jenis kulit + langganan isi ulang (src/templates/glowstory/GlowStory.tsx).
// Madani (2026-10-25): website sekolah Islam SMA/MA, slider foto berbingkai + PPDB ke WhatsApp (src/templates/madani/Madani.tsx).
// Cakrawala (2026-10-25): website SMK/SMA, hero slider foto + PPDB lewat WhatsApp (src/templates/cakrawala/Cakrawala.tsx).
// Bestari (2026-10-26): website SMA, hero slider foto + navbar transparan + PPDB lewat WhatsApp (src/templates/bestari/Bestari.tsx).
// Altura (2026-10-27): company profile developer properti global berbahasa Inggris, hero dua panel (src/templates/altura/Altura.tsx).
// Portline (2026-10-27): company profile berbahasa Inggris grup pelayaran & logistik, hero slider + indeks 01/02/03 (src/templates/portline/Portline.tsx).
// Velora (2026-10-27): company profile Inggris grup otomotif, hero kartu foto + model berfilter + test drive (src/templates/velora/Velora.tsx).
// Dermaga (2026-10-27): ekspor-impor & freight forwarding, hero rute di atas foto terminal + pita pasar + formulir penawaran ke WhatsApp (src/templates/dermaga/Dermaga.tsx).
// Saudagar (2026-10-27): eksportir kopi, kakao & rempah, hero tiga foto lengkung + tab spesifikasi + kalender panen (src/templates/saudagar/Saudagar.tsx).
// NusaNiaga (2026-10-27): importir & distributor bahan baku & mesin, hero foto berbilah + garis alur proses + formulir penawaran ke WhatsApp (src/templates/nusaniaga/NusaNiaga.tsx).
// Jumantara (2026-10-27): landing page SMA negeri "Clean institutional", bilah utilitas + hero slider foto berbilah progres + pita angka sekolah + SPMB lewat WhatsApp (src/templates/jumantara/Jumantara.tsx).
// Nawasena (2026-10-27): landing page SMA negeri "Elegant navy", hero slider foto latar Ken Burns + rel nomor slide + strip pengumuman + SPMB lewat WhatsApp (src/templates/nawasena/Nawasena.tsx).
// Pradipta (2026-10-27): landing page SMA negeri "Simple sky", header putih dengan penunjuk menu bergeser + hero slider foto berthumbnail + SPMB lewat WhatsApp (src/templates/pradipta/Pradipta.tsx).
// Batch 2026-10-28 (8 template, hero berlatar foto): Sparring Padel (booking padel + komunitas), SmashHall (GOR badminton),
// PayNow (landing page dompet digital), MediCare General (RS umum), MomKid Hospital (RS ibu & anak), SpecialistPlus (klinik
// spesialis & diagnostik), HealthLink (telemedicine), HomeNest (katalog & penjualan rumah); detail di komentar komponen root.
export const TEMPLATES: Record<string, TemplateDefinition> = {
  [corporateNexa.code]: corporateNexa,
  [startupClean.code]: startupClean,
  [arenaClub.code]: arenaClub,
  [auraStudio.code]: auraStudio,
  [finova.code]: finova,
  [serenity.code]: serenity,
  [skynusa.code]: skynusa,
  [tanimakmur.code]: tanimakmur,
  [puncakgear.code]: puncakgear,
  [gadgetku.code]: gadgetku,
  [glowstory.code]: glowstory,
  [madani.code]: madani,
  [cakrawala.code]: cakrawala,
  [bestari.code]: bestari,
  [altura.code]: altura,
  [portline.code]: portline,
  [velora.code]: velora,
  [dermaga.code]: dermaga,
  [saudagar.code]: saudagar,
  [nusaniaga.code]: nusaniaga,
  [jumantara.code]: jumantara,
  [nawasena.code]: nawasena,
  [pradipta.code]: pradipta,
  [sparringPadel.code]: sparringPadel,
  [smashhall.code]: smashhall,
  [paynow.code]: paynow,
  [medicareGeneral.code]: medicareGeneral,
  [momkid.code]: momkid,
  [specialistplus.code]: specialistplus,
  [healthlink.code]: healthlink,
  [homenest.code]: homenest,
};

/** Daftar template untuk pilihan (mis. select "Kode template" di admin). */
export const TEMPLATE_LIST: TemplateDefinition[] = Object.values(TEMPLATES);

export const TEMPLATE_OPTIONS: { code: string; name: string }[] = TEMPLATE_LIST.map(({ code, name }) => ({ code, name }));

/** Template berdasarkan kode; kode kosong/tidak dikenal → undefined. */
export const getTemplate = (code: string | null | undefined): TemplateDefinition | undefined => {
  const key = typeof code === 'string' ? code.trim().toLowerCase() : '';
  return key && Object.prototype.hasOwnProperty.call(TEMPLATES, key) ? TEMPLATES[key] : undefined;
};

/** Konten tersimpan bisa berupa objek, string JSON, atau null. Selain objek → null. */
export function parseSiteContent(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isPlainObject(value) ? value : null;
}

const toBool = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'false' || value === 0 || value === '0') return false;
  if (value === 'true' || value === 1 || value === '1') return true;
  return undefined;
};

function mergeSection(base: unknown, saved: unknown): SectionContent {
  const result: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};

  if (isPlainObject(saved)) {
    for (const [key, value] of Object.entries(saved)) {
      if (key === 'enabled') {
        const flag = toBool(value);
        if (flag !== undefined) result.enabled = flag;
        continue;
      }
      const expected = result[key];
      const expectsList = Array.isArray(expected);
      if (Array.isArray(value)) {
        // List tersimpan MENGGANTI list bawaan (termasuk [] = semua item dihapus pembeli)
        if (expected !== undefined && !expectsList) continue;
        result[key] = value.map(toListItem).filter((item): item is ListItem => item !== null);
      } else if (typeof value === 'string') {
        if (!expectsList) result[key] = value;
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        if (!expectsList) result[key] = String(value);
      } else if (typeof value === 'boolean') {
        if (!expectsList) result[key] = value;
      }
      // null, objek, dsb. → nilai bawaan dipertahankan
    }
  }

  const enabled = toBool(result.enabled);
  result.enabled = enabled ?? true;
  return result as SectionContent;
}

/**
 * Gabungkan konten bawaan template dengan konten tersimpan (deep merge per section):
 * nilai tersimpan menimpa bawaan, list tersimpan mengganti list bawaan, tipe yang salah (mis. string di tempat list)
 * diabaikan, dan `enabled` bawaan = true. `content` boleh null, string JSON, atau objek tidak lengkap.
 */
export function resolveContent(def: TemplateDefinition, content: SiteContent | Record<string, unknown> | string | null | undefined): SiteContent {
  const parsed = parseSiteContent(content);
  const saved = parsed ?? {};
  const defaults: Record<string, unknown> = isPlainObject(def?.defaultContent) ? def.defaultContent : {};
  const keys = new Set([...Object.keys(defaults), ...Object.keys(saved)]);
  const result: SiteContent = {};
  for (const key of keys) {
    if (!isPlainObject(defaults[key]) && !isPlainObject(saved[key])) continue;
    result[key] = mergeSection(defaults[key], saved[key]);
  }
  // Konten tersimpan sebelum field/section `introduced` ada → tanpa isi demo (shared/compat.ts)
  return parsed ? applyIntroduced(def, parsed, result) : result;
}

export type { SiteContent, TemplateDefinition } from './types';
