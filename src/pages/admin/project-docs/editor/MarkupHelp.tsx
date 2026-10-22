// Bantuan format isi bagian (markup spec §4.1 + ekstensi engine) dan daftar data otomatis: field {{...}} dan blok
// {{#...}}. Klik token untuk menyisipkannya di posisi kursor isi bagian yang terakhir disunting.
import { useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { cn } from '../../../../components/admin/ui';

const FORMAT: [string, string][] = [
  ['Baris kosong', 'Paragraf baru (satu Enter = pindah baris)'],
  ['- teks', 'Poin'],
  ['1. teks', 'Daftar bernomor'],
  ['(1) teks', 'Ayat'],
  ['a. teks', 'Huruf; awali dua spasi agar menjorok'],
  ['**teks**', 'Tebal'],
  ['*teks*', 'Miring'],
  ['{{field|-}}', 'Isi "-" bila datanya kosong'],
];

const FIELDS: [string, string][] = [
  ['{{client.name}}', 'Nama klien'],
  ['{{client.pic_name}}', 'PIC klien'],
  ['{{client.address}}', 'Alamat klien'],
  ['{{company.name}}', 'Nama perusahaan'],
  ['{{company.signatory_name}}', 'Penanda tangan'],
  ['{{project.name}}', 'Nama proyek'],
  ['{{project.code}}', 'Kode proyek'],
  ['{{project.service_label}}', 'Jenis layanan'],
  ['{{project.value_rupiah}}', 'Nilai kontrak'],
  ['{{project.value_terbilang}}', 'Nilai terbilang'],
  ['{{project.scope_summary}}', 'Ruang lingkup'],
  ['{{project.duration_days}}', 'Durasi (hari)'],
  ['{{document.number}}', 'Nomor dokumen'],
  ['{{document.date_long}}', 'Tanggal dokumen'],
  ['{{document.day}}', 'Hari dokumen'],
];

const BLOCKS: [string, string][] = [
  ['{{#jadwal}}', 'Tabel jadwal lengkap'],
  ['{{#jadwal_ringkas}}', 'Tabel jadwal ringkas'],
  ['{{#termin}}', 'Tabel termin pembayaran'],
  ['{{#rekening}}', 'Rekening perusahaan'],
  ['{{#rincian_invoice}}', 'Item invoice'],
  ['{{#total_invoice}}', 'Total invoice'],
  ['{{#ringkasan_uji}}', 'Ringkasan hasil UAT'],
  ['{{#tanda_tangan}}', 'Posisi tanda tangan'],
  ['{{#halaman_baru}}', 'Pindah halaman'],
];

function TokenList({ items, onPick }: { items: [string, string][]; onPick: (token: string) => void }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {items.map(([token, label]) => (
        <li key={token}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(token)}
            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
            title="Sisipkan"
          >
            <code className="truncate font-mono text-[12px] text-adm-cobalt-fg">{token}</code>
            <span className="shrink-0 text-[11px] text-adm-muted">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MarkupHelp({ onInsert }: { onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-adm-ghost">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-[13px] font-medium text-adm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
      >
        <CircleHelp className="h-4 w-4 text-adm-subtle" strokeWidth={1.75} aria-hidden />
        <span className="flex-1">Bantuan format & data otomatis</span>
        <ChevronDown className={cn('h-4 w-4 text-adm-subtle transition-transform', open && 'rotate-180')} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Format teks</p>
            <dl className="grid gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">
              {FORMAT.map(([syntax, meaning]) => (
                <div key={syntax} className="flex min-w-0 items-baseline gap-2">
                  <dt className="shrink-0 font-mono text-adm-fg">{syntax}</dt>
                  <dd className="truncate text-adm-muted">{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Data otomatis</p>
            <p className="mb-1.5 text-xs text-adm-muted">Terisi dari data proyek, klien, dan pengaturan. Data kosong tampil sebagai […] dan muncul di peringatan.</p>
            <TokenList items={FIELDS} onPick={onInsert} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Blok otomatis</p>
            <p className="mb-1.5 text-xs text-adm-muted">Tulis di baris sendiri. Isinya mengikuti data terbaru selama dokumen masih draft.</p>
            <TokenList items={BLOCKS} onPick={onInsert} />
          </div>
        </div>
      )}
    </div>
  );
}
