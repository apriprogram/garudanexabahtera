// Building blocks shared by the document templates: section constructors, party identities in Indonesian contract
// style and the closing clause on electronic signatures. Everything returns markup with merge fields; values are
// filled at render time (buildModel), so a template never copies project data that could go stale.
import type { DocSection, DocTable, MergeData, ServiceType, SlaDefaults } from '../../types';

/** Options of defaultContent(): settings that are not part of MergeData (a whole PdSettings object fits). */
export interface TemplateOptions {
  /** settings `pd_sla_defaults` (SLA: support hours, uptime, priorities); the seeded defaults when omitted */
  sla_defaults?: SlaDefaults;
}

/** What a template function receives. */
export interface TemplateInput {
  data: MergeData;
  service: ServiceType;
  /** client is a private person (perorangan), not a company */
  person: boolean;
  options: TemplateOptions;
}

/** Same values as the seeded `pd_sla_defaults` (spec §3). */
export const SLA_DEFAULTS: SlaDefaults = {
  support_hours: 'Senin–Jumat 09.00–17.00 WIB',
  uptime: '99,5%',
  priorities: [
    { level: 'P1 – Kritis', response: '2 jam', resolution: '1 hari kerja' },
    { level: 'P2 – Tinggi', response: '4 jam', resolution: '2 hari kerja' },
    { level: 'P3 – Normal', response: '1 hari kerja', resolution: '5 hari kerja' },
  ],
};

/** A section; `title` '' = no heading. */
export const section = (id: string, title: string, body?: string, table?: DocTable): DocSection => ({
  id,
  title,
  ...(body !== undefined ? { body } : {}),
  ...(table ? { table } : {}),
});

/** Borderless "Label : isi" rows (a two-column table without column headers). */
export const keyValue = (rows: [string, string][]): DocTable => ({ columns: ['', ''], rows: rows.map(([label, value]) => [label, value]) });

export const lines = (...parts: (string | false | null | undefined)[]) => parts.filter((p): p is string => typeof p === 'string').join('\n');

/** "Pada hari ini, Rabu, tanggal 21 Oktober 2026, bertempat di Bandung, ..." */
export const OPENING =
  'Pada hari ini, **{{document.day}}**, tanggal **{{document.date_long}}**, bertempat di {{company.city}}, kami yang bertanda tangan di bawah ini:';

export const PIHAK_PERTAMA =
  '**{{company.name}}**, suatu perseroan terbatas yang didirikan berdasarkan hukum Negara Republik Indonesia, berkedudukan di {{company.city}} dan beralamat di {{company.address}}, dalam hal ini diwakili oleh **{{company.signatory_name}}** selaku **{{company.signatory_title}}**, yang bertindak untuk dan atas nama {{company.name}}, selanjutnya disebut **PIHAK PERTAMA**.';

export function pihakKedua(person: boolean): string {
  return person
    ? '**{{client.name}}**, warga negara Indonesia, bertempat tinggal di {{client.address}}, {{client.city}}, dalam hal ini bertindak untuk dan atas nama diri sendiri, selanjutnya disebut **PIHAK KEDUA**.'
    : '**{{client.name}}**, berkedudukan di {{client.city}} dan beralamat di {{client.address}}, dalam hal ini diwakili oleh **{{client.pic_name}}** selaku **{{client.pic_title}}**, yang bertindak untuk dan atas nama {{client.name}}, selanjutnya disebut **PIHAK KEDUA**.';
}

/** Numbered party identities + the PARA PIHAK definition. */
export function paraPihak(person: boolean): string {
  return lines(
    `1. ${PIHAK_PERTAMA}`,
    `2. ${pihakKedua(person)}`,
    '',
    'PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama disebut **PARA PIHAK** dan masing-masing disebut **PIHAK**.',
  );
}

/** Ayat on electronic signing (UU ITE), used in the closing article of every signed agreement. */
export const E_SIGN_CLAUSE =
  'dibuat dan ditandatangani secara elektronik oleh PARA PIHAK melalui platform {{company.name}} dalam keadaan sadar dan tanpa paksaan dari pihak mana pun. Tanda tangan elektronik PARA PIHAK memiliki kekuatan hukum dan akibat hukum yang sah sesuai Undang-Undang Nomor 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik beserta perubahannya';

/** Client contact person: the PIC for a company, the client for a private person. */
export const pic = (person: boolean) => (person ? '{{client.name}}' : '{{client.pic_name}}');
export const picTitle = (person: boolean) => (person ? 'Pemilik proyek' : '{{client.pic_title}}');
