// Parser lokal transkrip suara (cadangan bila Nexa AI mati, tanpa kunci, atau gagal): kata kunci yang diucapkan admin
// ("nama klien …", "email …", "item … harga …", "jatuh tempo …") membagi transkrip menjadi potongan, lalu tiap potongan
// dirapikan: angka yang diucapkan dengan kata ("satu juta lima ratus ribu", "1,5 juta", "500rb") jadi rupiah bulat,
// tanggal ("15 November", "besok", "14 hari") jadi YYYY-MM-DD, email yang dieja ("budi at gmail titik com") dirapikan.
// Murni: tanpa DOM dan tanpa I/O. Hasilnya selalu diperiksa admin di form sebelum disimpan.
import { addDays, type DiscountType, type DocKind, type InvoiceStatus, type TimelineStep, type VoiceData } from './types';

type Field =
  | 'client_name'
  | 'client_company'
  | 'client_email'
  | 'client_phone'
  | 'client_address'
  | 'date'
  | 'due_date'
  | 'valid_until'
  | 'item'
  | 'discount'
  | 'tax'
  | 'no_tax'
  | 'notes'
  | 'payment_info'
  | 'status'
  | 'title'
  | 'summary'
  | 'scope'
  | 'timeline'
  | 'terms';

const COMMON: [Field, string[]][] = [
  ['client_name', ['nama klien', 'nama client', 'nama pelanggan', 'nama customer', 'kepada', 'klien', 'client', 'pelanggan', 'customer']],
  ['client_company', ['nama perusahaan', 'perusahaan', 'instansi']],
  ['client_email', ['alamat email', 'email', 'e-mail', 'e mail', 'surel', 'imel']],
  ['client_phone', ['nomor telepon', 'no telepon', 'nomor hp', 'no hp', 'nomor wa', 'no wa', 'nomor whatsapp', 'whatsapp', 'telepon', 'telpon', 'telp', 'handphone', 'hp']],
  ['client_address', ['alamat']],
  ['date', ['tanggal invoice', 'tanggal proposal', 'tanggal dokumen', 'tanggal']],
  ['tax', ['ppn', 'pajak']],
  ['no_tax', ['tanpa ppn', 'tanpa pajak', 'tidak pakai ppn', 'tidak kena ppn']],
];

const INVOICE: [Field, string[]][] = [
  ['due_date', ['tanggal jatuh tempo', 'jatuh tempo', 'jatuh tempo tanggal', 'tenggat', 'batas pembayaran', 'batas bayar']],
  ['item', ['item', 'layanan', 'produk', 'barang', 'pekerjaan']],
  ['discount', ['diskon', 'potongan harga', 'potongan']],
  ['notes', ['catatan', 'keterangan']],
  ['payment_info', ['info pembayaran', 'informasi pembayaran', 'cara pembayaran', 'pembayaran ke', 'pembayaran melalui', 'transfer ke', 'rekening']],
  ['status', ['status']],
];

const PROPOSAL: [Field, string[]][] = [
  ['valid_until', ['berlaku sampai tanggal', 'berlaku sampai', 'berlaku hingga', 'masa berlaku', 'berlaku selama']],
  ['title', ['judul proyek', 'judul project', 'nama proyek', 'nama project', 'judul']],
  ['summary', ['latar belakang', 'ringkasan', 'deskripsi proyek', 'tujuan proyek', 'tujuan']],
  ['scope', ['ruang lingkup', 'lingkup pekerjaan', 'fitur fiturnya', 'fitur-fiturnya', 'fiturnya', 'fitur']],
  ['timeline', ['tahapan', 'timeline', 'jadwal pengerjaan', 'jadwal']],
  ['item', ['rincian biaya', 'biaya', 'item']],
  ['terms', ['syarat dan ketentuan', 'syarat & ketentuan', 'syarat', 'ketentuan']],
];

// ── Angka yang diucapkan ──

const UNIT: Record<string, number> = { nol: 0, kosong: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };
const SPECIAL: Record<string, number> = { sepuluh: 10, sebelas: 11, seratus: 100 };
const SCALE: Record<string, number> = { ribu: 1e3, seribu: 1e3, juta: 1e6, sejuta: 1e6, miliar: 1e9, milyar: 1e9, semiliar: 1e9, triliun: 1e12 };
const NUMBER_WORDS = [...Object.keys(UNIT), ...Object.keys(SPECIAL), ...Object.keys(SCALE), 'belas', 'puluh', 'ratus', 'setengah', 'koma'];
const RUN_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:(?:${NUMBER_WORDS.join('|')})(?:\\s+|$|(?=[^\\p{L}\\p{N}])))+`, 'giu');

/** Satu deret kata angka → teks angka; null bila deretnya bukan angka (mis. hanya "ribu" setelah digit). */
function wordsToNumber(run: string): string | null {
  const words = run.toLowerCase().trim().split(/\s+/);
  if (words.every((w) => w in SCALE && !w.startsWith('se')) || words.every((w) => w === 'koma' || w === 'setengah')) return null;
  // Deret angka satuan saja ("nol delapan satu dua") = digit berurutan (nomor telepon, nomor rekening)
  if (words.length >= 2 && words.every((w) => w in UNIT)) return words.map((w) => UNIT[w]).join('');
  let total = 0;
  let small = 0;
  let last = 0;
  let decimals: string | null = null;
  const smallValue = () => small + (decimals ? Number(`0.${decimals}`) : 0);
  for (const w of words) {
    if (decimals !== null && w in UNIT) {
      decimals += String(UNIT[w]);
    } else if (w in UNIT) {
      small += UNIT[w];
      last = UNIT[w];
    } else if (w in SPECIAL) {
      small += SPECIAL[w];
      last = 0;
    } else if (w === 'belas') {
      small += 10;
      last = 0;
    } else if (w === 'puluh') {
      small += last * 9;
      last = 0;
    } else if (w === 'ratus') {
      small += last * 99;
      last = 0;
    } else if (w === 'setengah') {
      small += 0.5;
    } else if (w === 'koma') {
      decimals = '';
    } else if (w in SCALE) {
      const value = w.startsWith('se') ? 1 : smallValue() || 1;
      total += value * SCALE[w];
      small = 0;
      last = 0;
      decimals = null;
    }
  }
  const value = total + smallValue();
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : null;
}

/** Kata angka di teks diganti digit: "satu juta lima ratus ribu" → "1500000", "nol delapan satu dua" → "0812". */
export function normalizeNumbers(text: string): string {
  return text.replace(RUN_RE, (run) => {
    const trailing = /\s+$/.exec(run)?.[0] ?? '';
    const number = wordsToNumber(run);
    return number === null ? run : `${number}${trailing}`;
  });
}

const MONEY_SCALE: Record<string, number> = { triliun: 1e12, t: 1e12, miliar: 1e9, milyar: 1e9, m: 1e9, juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3, k: 1e3 };
const MONEY_RE = /(\d+(?:[.,]\d+)*)\s*(triliun|miliar|milyar|juta|ribu|jt|rb|m|t|k)?(?![\p{L}])/giu;

function digitValue(text: string, scaled: boolean): number {
  // 1.500.000 = ribuan; 1,5 / 1.5 dengan satuan = desimal; 1.500 tanpa satuan = ribuan
  if (/^\d{1,3}([.]\d{3})+$/.test(text) && !(scaled && /^\d+\.\d{1,2}$/.test(text))) return Number(text.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3})+$/.test(text) && !scaled) return Number(text.replace(/,/g, ''));
  return Number(text.replace(',', '.'));
}

/** Semua jumlah uang di teks, berurutan: "2 juta 500 ribu" = 2500000 (skala menurun digabung). */
export function findAmounts(text: string): { value: number; index: number; end: number }[] {
  const found: { value: number; index: number; end: number; scale: number }[] = [];
  for (const m of text.matchAll(MONEY_RE)) {
    const scale = m[2] ? MONEY_SCALE[m[2].toLowerCase()] : 1;
    const value = digitValue(m[1], Boolean(m[2])) * scale;
    if (!Number.isFinite(value)) continue;
    const index = m.index ?? 0;
    const prev = found[found.length - 1];
    const gap = prev ? text.slice(prev.end, index) : '';
    if (prev && prev.scale > scale && prev.scale > 1 && /^\s*(dan\s*)?$/i.test(gap)) {
      prev.value += value;
      prev.end = index + m[0].length;
      prev.scale = scale;
    } else {
      found.push({ value, index, end: index + m[0].length, scale });
    }
  }
  return found.map(({ value, index, end }) => ({ value: Math.round(value * 100) / 100, index, end }));
}

// ── Tanggal ──

const MONTHS: [RegExp, number][] = [
  [/^jan/, 1], [/^feb|^peb/, 2], [/^mar/, 3], [/^apr/, 4], [/^mei/, 5], [/^jun/, 6],
  [/^jul/, 7], [/^ag/, 8], [/^sep/, 9], [/^okt|^oct/, 10], [/^nov|^nop/, 11], [/^des|^dec/, 12],
];
const MONTH_WORD = '(januari|jan|februari|pebruari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|agt|ags|september|sept|sep|oktober|okt|november|nopember|nov|desember|des)';
const pad = (n: number) => String(n).padStart(2, '0');

function isoDate(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : '';
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return isoDate(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(d, last));
}

/**
 * Tanggal dari potongan teks; `base` = tanggal acuan (hari ini atau tanggal dokumen untuk jatuh tempo). `future` =
 * tanggal tanpa tahun yang sudah lewat pindah ke tahun berikutnya (jatuh tempo, masa berlaku).
 */
export function parseDate(text: string, base: string, future = false): string {
  const t = text.toLowerCase();
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(t);
  if (m) return isoDate(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]), Number(m[1]));
  m = new RegExp(`(\\d{1,2})\\s+${MONTH_WORD}(?:\\s+(\\d{4}))?`).exec(t);
  if (m) {
    const month = MONTHS.find(([re]) => re.test(m![2]))?.[1] ?? 1;
    const year = m[3] ? Number(m[3]) : Number(base.slice(0, 4));
    const date = isoDate(year, month, Number(m[1]));
    return !m[3] && future && date && date < base ? isoDate(year + 1, month, Number(m[1])) : date;
  }
  if (/\bhari ini\b/.test(t)) return base;
  if (/\blusa\b/.test(t)) return addDays(base, 2);
  if (/\bbesok\b/.test(t)) return addDays(base, 1);
  if (/\bminggu depan\b|\bpekan depan\b/.test(t)) return addDays(base, 7);
  if (/\bbulan depan\b/.test(t)) return addMonths(base, 1);
  if (/\bakhir bulan\b/.test(t)) {
    const [y, mo] = base.split('-').map(Number);
    return isoDate(y, mo, new Date(Date.UTC(y, mo, 0)).getUTCDate());
  }
  m = /(\d{1,3})\s*(hari|minggu|pekan|bulan)/.exec(t);
  if (m) {
    const n = Number(m[1]);
    return m[2] === 'bulan' ? addMonths(base, n) : addDays(base, m[2] === 'hari' ? n : n * 7);
  }
  m = /^\s*(\d{1,2})\b/.exec(t);
  if (m) {
    const [y, mo] = base.split('-').map(Number);
    const date = isoDate(y, mo, Number(m[1]));
    return future && date && date < base ? addMonths(date, 1) : date;
  }
  return '';
}

// ── Teks ──

const UPPER_WORDS = new Set([
  'pt', 'cv', 'ud', 'pd', 'tbk', 'rt', 'rw', 'sd', 'smp', 'sma', 'smk', 'mi', 'mts', 'rs', 'rsud', 'ui', 'ux', 'seo', 'api', 'erp',
  'crm', 'pos', 'ppdb', 'cms', 'lms', 'hrd', 'it', 'ai', 'pdf', 'umkm', 'bumn', 'bumd',
]);
/** Awal nama instansi klien ("dari PT …", "dari SMA …"). */
const ORGANIZATIONS = 'pt|cv|ud|pd|yayasan|koperasi|sekolah|toko|sd|smp|sma|smk|mi|mts|universitas|kampus|rs|rsud|rumah sakit|klinik|dinas|desa|kantor|bank';
const BANKS = /\b(bca|bni|bri|bsi|btn|cimb|ocbc|pt|cv)\b/gi;
const SMALL_WORDS = new Set(['dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'yang', 'dengan', 'pada', 'serta']);

/** "budi santoso dari pt maju jaya" → "Budi Santoso dari PT Maju Jaya". */
export function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (UPPER_WORDS.has(lower.replace(/\.$/, ''))) return w.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const sentence = (text: string) => {
  const t = text.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

/** Rapikan pinggir potongan: kata sambung di depan ("nya", "adalah", ":") dan tanda baca di belakang. */
const clean = (text: string) =>
  text
    .replace(/^(?:\s|[:,.;-]|nya\b|adalah\b|yaitu\b|yakni\b|ialah\b|sebesar\b|sebanyak\b)+/i, '')
    .replace(/[\s,.;:]+$/, '')
    .trim();

/** Email yang dieja: "budi at gmail titik com" → "budi@gmail.com"; '' bila hasilnya bukan email. */
export function spokenEmail(text: string): string {
  const email = text
    .toLowerCase()
    .replace(/\s+(?:at|et|@)\s+|\s*@\s*/g, '@')
    .replace(/\s+(?:titik|dot)\s+|\s*\.\s*/g, '.')
    .replace(/\s+(?:garis bawah|underscore)\s+/g, '_')
    .replace(/\s+(?:strip|minus|dash)\s+/g, '-')
    .replace(/\s+/g, '')
    .replace(/\.+$/, '');
  const m = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/.exec(email);
  return m ? m[0] : '';
}

// ── Item ──

const UNIT_WORDS = '(paket|unit|bulan|tahun|buah|pcs|halaman|orang|hari|minggu|kali|lisensi|akun|set|lembar|jam|domain|user|modul|layanan|item|sesi)';

/** "pembuatan website 1 paket harga 5 juta" → { description, qty: 1, unit: 'paket', price: 5000000 }. */
export function parseItem(text: string): { description: string; qty: number; unit: string; price: number } | null {
  const t = clean(text);
  if (!t) return null;
  let qty = 1;
  let unit = '';
  let cut = t.length;
  const qtyMatch =
    /(?:qty|kuantitas|jumlah|sebanyak)\s*(\d+(?:[.,]\d+)?)\s*([\p{L}]+)?/iu.exec(t) ??
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${UNIT_WORDS}\\b`, 'i').exec(t);
  if (qtyMatch) {
    qty = Number(qtyMatch[1].replace(',', '.')) || 1;
    const maybeUnit = (qtyMatch[2] ?? '').toLowerCase();
    if (new RegExp(`^${UNIT_WORDS}$`).test(maybeUnit)) unit = maybeUnit;
    cut = Math.min(cut, qtyMatch.index);
  }
  const priceKey = /(?:harga\s*satuan|harga|seharga|biaya|@|masing[\s-]*masing|per\s*(?:unit|paket|item|bulan|tahun))\s*(?:nya)?\s*(?:rp\.?)?\s*/i.exec(t);
  const totalKey = /(?:total|semuanya|jumlah harga)\s*(?:nya)?\s*(?:rp\.?)?\s*/i.exec(t);
  const amounts = findAmounts(t.replace(/rp\.?\s*(?=\d)/gi, (s) => ' '.repeat(s.length)));
  let price = 0;
  const after = (key: RegExpExecArray | null) => (key ? amounts.find((a) => a.index >= key.index + key[0].length - 1 && a.index <= key.index + key[0].length + 1) : undefined);
  const unitPrice = after(priceKey);
  const total = after(totalKey);
  if (unitPrice) {
    price = unitPrice.value;
    cut = Math.min(cut, priceKey!.index);
  } else if (total) {
    price = qty > 0 ? total.value / qty : total.value;
    cut = Math.min(cut, totalKey!.index);
  } else {
    // Tanpa kata "harga": jumlah terakhir yang bukan qty
    const candidate = [...amounts].reverse().find((a) => !qtyMatch || a.index !== qtyMatch.index + qtyMatch[0].indexOf(qtyMatch[1]));
    if (candidate && candidate.value >= 1000) {
      price = candidate.value;
      cut = Math.min(cut, candidate.index);
    }
  }
  const description = sentence(clean(t.slice(0, cut).replace(/\b(?:dengan|sebanyak|jumlah|qty|rp\.?)\s*$/i, '')));
  if (!description) return null;
  return { description, qty: Math.round(qty * 100) / 100, unit, price: Math.floor(price + 0.5) };
}

// ── Pemotongan transkrip ──

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

function segments(text: string, kind: DocKind): { field: Field; keyword: string; value: string }[] {
  const table = [...COMMON, ...(kind === 'invoice' ? INVOICE : PROPOSAL)];
  const aliases = table.flatMap(([field, words]) => words.map((w) => ({ field, w })));
  aliases.sort((a, b) => b.w.length - a.w.length);
  const lookup = new Map(aliases.map((a) => [a.w.replace(/\s+/g, ' '), a.field]));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${aliases.map((a) => escapeRe(a.w)).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const hits = [...text.matchAll(re)].map((m) => ({
    field: lookup.get(m[1].toLowerCase().replace(/\s+/g, ' ')) as Field,
    keyword: m[1],
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
  }));
  return hits.map((hit, i) => ({ field: hit.field, keyword: hit.keyword, value: text.slice(hit.end, hits[i + 1]?.start ?? text.length) }));
}

const splitList = (text: string) =>
  clean(text)
    .split(/\s*(?:[,;]|\bdan\b|\bserta\b|\blalu\b|\bkemudian\b|\bselanjutnya\b)\s*/i)
    .map((s) => sentence(clean(s)))
    .filter(Boolean);

function parseTimeline(text: string): TimelineStep[] {
  const parts = clean(text)
    .split(/\s*(?:[,;]|\b(?:tahap|fase)\b(?:\s+(?:\d+|pertama|kedua|ketiga|keempat|kelima|terakhir))?)\s*/i)
    .map((s) => clean(s.replace(/^(?:dan|lalu|kemudian|selanjutnya)\s+/i, '')))
    .filter(Boolean);
  return parts.map((part) => {
    const d = /(?:selama\s*)?(\d+(?:[.,]\d+)?\s*(?:hari|minggu|pekan|bulan)(?:\s*kerja)?)/i.exec(part);
    const phase = sentence(clean(d ? part.slice(0, d.index) : part));
    return { phase: phase || sentence(part), duration: d ? d[1].replace(/\s+/g, ' ') : '', description: '' };
  });
}

/** Transkrip → isian form. Kunci yang tidak terdeteksi tidak ikut (form tidak menimpanya). */
export function parseTranscript(transcript: string, kind: DocKind, today: string, docDate = today): VoiceData {
  const text = normalizeNumbers(transcript.replace(/\s+/g, ' ').trim());
  const out: VoiceData = {};
  const items: NonNullable<VoiceData['items']> = [];
  let baseDate = docDate;
  for (const { field, keyword, value } of segments(text, kind)) {
    const v = clean(value);
    switch (field) {
      case 'client_name': {
        if (!v || out.client_name) break;
        // "Budi Santoso dari PT Maju Jaya", "Ibu Sari dari SMA Harapan Bangsa": instansi di belakang "dari"/"di"
        const company = new RegExp(`\\s+(?:dari|di)\\s+((?:${ORGANIZATIONS})\\b.*)$`, 'i').exec(v);
        out.client_name = titleCase(company ? v.slice(0, company.index) : v);
        if (company && !out.client_company) out.client_company = titleCase(clean(company[1]));
        break;
      }
      case 'client_company':
        if (v) out.client_company = titleCase(v);
        break;
      case 'client_email': {
        const email = spokenEmail(v);
        if (email) out.client_email = email;
        break;
      }
      case 'client_phone': {
        const phone = v.replace(/[^\d+]/g, '');
        if (/^\+?\d{6,20}$/.test(phone)) out.client_phone = phone;
        break;
      }
      case 'client_address':
        if (v) out.client_address = titleCase(v);
        break;
      case 'date': {
        const date = parseDate(v, today);
        if (date) {
          out.date = date;
          baseDate = date;
        }
        break;
      }
      case 'due_date':
      case 'valid_until': {
        const date = parseDate(v, baseDate, true);
        if (date) out[field] = date;
        break;
      }
      case 'item': {
        const item = parseItem(v);
        if (item) items.push(item);
        break;
      }
      case 'discount': {
        const percent = /(\d+(?:[.,]\d+)?)\s*(?:persen|%)/i.exec(v);
        const amount = findAmounts(v)[0];
        if (percent) {
          out.discount_type = 'percent' satisfies DiscountType;
          out.discount_value = Number(percent[1].replace(',', '.'));
        } else if (amount) {
          out.discount_type = 'amount';
          out.discount_value = Math.floor(amount.value + 0.5);
        }
        break;
      }
      case 'tax': {
        out.tax_enabled = true;
        const rate = /(\d+(?:[.,]\d+)?)\s*(?:persen|%)?/i.exec(v);
        if (rate && Number(rate[1].replace(',', '.')) <= 100) out.tax_rate = Number(rate[1].replace(',', '.'));
        break;
      }
      case 'no_tax':
        out.tax_enabled = false;
        break;
      case 'notes':
        if (v) out.notes = sentence(v);
        break;
      case 'payment_info':
        // "rekening bca 123 atas nama pt garuda" → "Rekening BCA 123 atas nama PT garuda"
        if (v) {
          const lead = /^(?:info|informasi|cara)/i.test(keyword) ? '' : `${keyword.toLowerCase()} `;
          out.payment_info = sentence(`${lead}${v}`.replace(BANKS, (bank) => bank.toUpperCase()));
        }
        break;
      case 'status': {
        const status: InvoiceStatus | null = /lunas|dibayar/i.test(v) ? 'lunas' : /kirim/i.test(v) ? 'terkirim' : /dra/i.test(v) ? 'draft' : null;
        if (status) out.status = status;
        break;
      }
      case 'title':
        if (v) out.title = titleCase(v);
        break;
      case 'summary':
        if (v) out.summary = sentence(v).replace(/([^.!?])$/, '$1.');
        break;
      case 'scope': {
        const scope = splitList(v);
        if (scope.length) out.scope = [...(out.scope ?? []), ...scope];
        break;
      }
      case 'timeline': {
        const steps = parseTimeline(v);
        if (steps.length) out.timeline = [...(out.timeline ?? []), ...steps];
        break;
      }
      case 'terms': {
        const lines = clean(v)
          .split(/\s*[;]\s*|\.\s+/)
          .map((s) => sentence(clean(s)))
          .filter(Boolean);
        if (lines.length) out.terms = lines.join('\n');
        break;
      }
    }
  }
  if (items.length) out.items = items;
  // Status "lunas" diucapkan tanpa kata "status" ("invoice ini sudah lunas")
  if (kind === 'invoice' && !out.status && /\bsudah\s+(?:lunas|dibayar)\b/i.test(text)) out.status = 'lunas';
  return out;
}
