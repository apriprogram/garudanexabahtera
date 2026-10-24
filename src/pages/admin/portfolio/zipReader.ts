// Pembaca ZIP kecil untuk impor proyek (Pengaturan website > Proyek > Impor proyek), tanpa pustaka tambahan: daftar isi
// dibaca dari central directory, isi tiap file baru dibuka saat diperlukan dengan DecompressionStream('deflate-raw')
// bawaan browser (Chrome/Edge 103+, Firefox 113+, Safari 16.4+). Cukup untuk ZIP dari Windows (Kirim ke > Folder
// terkompresi, Compress-Archive yang memakai "\" sebagai pemisah), macOS, 7-Zip, zip, dan Python zipfile: metode simpan
// (0) dan deflate (8), ukuran ZIP64 per file. Tidak didukung: file terenkripsi, ZIP terbagi, dan arsip > 4 GB.

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const MAX32 = 0xffffffff;
const EOCD_SIZE = 22;
const CENTRAL_SIZE = 46;
const LOCAL_SIZE = 30;

const NOT_ZIP = 'File ini bukan ZIP yang valid.';
const BROKEN = 'ZIP rusak: daftar isinya tidak bisa dibaca.';
const NO_INFLATE = 'Browser ini belum bisa membuka ZIP. Pakai Chrome, Edge, atau Firefox terbaru, atau pilih folder berisi proyek.json.';
const brokenEntry = (path: string) => `"${path}" di dalam ZIP rusak dan tidak bisa dibuka.`;

/** Error membaca ZIP dengan pesan siap tampil. */
export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

/** Satu file di ZIP (folder tidak ikut). */
export interface ZipEntry {
  /** Path di dalam ZIP dengan pemisah "/". */
  path: string;
  /** Ukuran asli dalam byte. */
  size: number;
  /** Alasan file ini tidak bisa dibuka (terenkripsi, kompresi lain), atau undefined. */
  problem?: string;
  /** Isi file; dibuka sekali lalu disimpan. Gagal dengan ZipError. */
  read: () => Promise<Blob>;
}

const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** Buka deflate mentah; isinya harus tepat `size` byte (berhenti lebih awal bila lebih, jadi ZIP "bom" tidak memenuhi memori). */
async function inflate(raw: Blob, size: number, path: string): Promise<Blob> {
  if (typeof DecompressionStream === 'undefined') throw new ZipError(NO_INFLATE);
  const body = new Response(await bytesOf(raw)).body;
  if (!body) throw new ZipError(brokenEntry(path));
  const reader = body.pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > size) break;
      chunks.push(value);
    }
  } catch {
    throw new ZipError(brokenEntry(path));
  }
  if (total !== size) {
    void reader.cancel().catch(() => {});
    throw new ZipError(brokenEntry(path));
  }
  return new Blob(chunks);
}

/** Daftar file di ZIP. Gagal dengan ZipError bila bukan ZIP / daftar isinya rusak. */
export async function readZip(zip: Blob): Promise<ZipEntry[]> {
  // Akhir arsip: EOCD (22 byte) + komentar maks. 65.535 byte
  const tailStart = Math.max(0, zip.size - EOCD_SIZE - 0xffff);
  const tail = await bytesOf(zip.slice(tailStart));
  const tv = viewOf(tail);
  let at = -1;
  for (let i = tail.length - EOCD_SIZE; i >= 0; i--) {
    if (tv.getUint32(i, true) === EOCD) {
      at = i;
      break;
    }
  }
  if (at < 0) throw new ZipError(NOT_ZIP);
  if (tv.getUint16(at + 4, true) !== 0 || tv.getUint16(at + 6, true) !== 0) {
    throw new ZipError('ZIP yang terbagi beberapa bagian tidak didukung. Buat ulang sebagai satu file ZIP.');
  }
  const count = tv.getUint16(at + 10, true);
  const cdSize = tv.getUint32(at + 12, true);
  const cdOffset = tv.getUint32(at + 16, true);
  if (count === 0xffff || cdSize === MAX32 || cdOffset === MAX32) {
    throw new ZipError('ZIP lebih dari 4 GB atau berisi lebih dari 65.535 file tidak didukung.');
  }
  if (cdOffset + cdSize > tailStart + at) throw new ZipError(NOT_ZIP);

  const cd = await bytesOf(zip.slice(cdOffset, cdOffset + cdSize));
  const view = viewOf(cd);
  const utf8 = new TextDecoder();
  const entries: ZipEntry[] = [];
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (p + CENTRAL_SIZE > cd.length || view.getUint32(p, true) !== CENTRAL) throw new ZipError(BROKEN);
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    let compressed = view.getUint32(p + 20, true);
    let size = view.getUint32(p + 24, true);
    const nameEnd = p + CENTRAL_SIZE + view.getUint16(p + 28, true);
    const extraEnd = nameEnd + view.getUint16(p + 30, true);
    let offset = view.getUint32(p + 42, true);
    if (extraEnd > cd.length) throw new ZipError(BROKEN);
    // Nama tanpa tanda UTF-8 (bit 11) biasanya ASCII; dibaca sebagai UTF-8 juga
    const path = utf8.decode(cd.subarray(p + CENTRAL_SIZE, nameEnd)).replace(/\\/g, '/');
    // ZIP64: nilai 0xFFFFFFFF diganti angka 64-bit di extra field 0x0001, berurutan
    for (let e = nameEnd; e + 4 <= extraEnd; e += 4 + view.getUint16(e + 2, true)) {
      if (view.getUint16(e, true) !== 0x0001) continue;
      let q = e + 4;
      const end = q + view.getUint16(e + 2, true);
      const next = (value: number) => {
        if (value !== MAX32 || q + 8 > end) return value;
        q += 8;
        return Number(view.getBigUint64(q - 8, true));
      };
      size = next(size);
      compressed = next(compressed);
      offset = next(offset);
    }
    p = extraEnd + view.getUint16(p + 32, true);
    if (path.endsWith('/')) continue;

    let problem: string | undefined;
    if (flags & 1) problem = `"${path}" di dalam ZIP terkunci kata sandi.`;
    else if (method !== 0 && method !== 8) problem = `"${path}" memakai kompresi yang tidak didukung. Buat ulang ZIP-nya dengan pengaturan biasa (Deflate).`;

    let opened: Promise<Blob> | null = null;
    const open = async (): Promise<Blob> => {
      if (problem) throw new ZipError(problem);
      const head = await bytesOf(zip.slice(offset, offset + LOCAL_SIZE));
      const hv = viewOf(head);
      if (head.length < LOCAL_SIZE || hv.getUint32(0, true) !== LOCAL) throw new ZipError(brokenEntry(path));
      const start = offset + LOCAL_SIZE + hv.getUint16(26, true) + hv.getUint16(28, true);
      if (start + compressed > zip.size) throw new ZipError(brokenEntry(path));
      const raw = zip.slice(start, start + compressed);
      if (method === 8) return inflate(raw, size, path);
      if (compressed !== size) throw new ZipError(brokenEntry(path));
      return raw;
    };
    entries.push({
      path,
      size,
      problem,
      read: () => {
        if (!opened) {
          opened = open();
          // Gagal → boleh dicoba lagi
          opened.catch(() => {
            opened = null;
          });
        }
        return opened;
      },
    });
  }
  return entries;
}
