// Skema CMS bersama template Company Profile (corporate-nexa, startup-clean).
// Kunci section & field SAMA di kedua template agar konten tetap terbaca bila suatu saat template diganti.
import type { TemplateField, TemplateListField, TemplateSection } from '../types';

const t = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'text', key, label, ...extra });
const ta = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'textarea', key, label, ...extra });
const img = (key: string, label: string, help?: string): TemplateField => ({ type: 'image', key, label, help });
const url = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'url', key, label, ...extra });

const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40 });
const title = (placeholder: string) => t('title', 'Judul', { placeholder, maxLength: 120 });
const subtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });

const listField = (key: string, label: string, itemLabel: string, fields: TemplateField[], max: number): TemplateListField => ({
  type: 'list',
  key,
  label,
  itemLabel,
  fields,
  max,
});

export interface SchemaLabels {
  /** Sebutan untuk daftar layanan, mis. "Layanan" atau "Fitur" */
  servicesLabel: string;
  serviceItemLabel: string;
}

export function companyProfileSections({ servicesLabel, serviceItemLabel }: SchemaLabels): TemplateSection[] {
  return [
    {
      key: 'brand',
      label: 'Identitas & warna',
      description: 'Nama perusahaan, logo, dan warna aksen yang dipakai di seluruh halaman.',
      fields: [
        t('company_name', 'Nama perusahaan', { placeholder: 'mis. PT Maju Bersama', maxLength: 80 }),
        t('tagline', 'Tagline', { placeholder: 'mis. Solusi konstruksi terpercaya', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
        img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai inisial nama perusahaan.'),
        { type: 'color', key: 'accent_color', label: 'Warna aksen', help: 'Dipakai untuk tombol, tautan, dan sorotan. Teks otomatis disesuaikan agar tetap terbaca.' },
      ],
    },
    {
      key: 'hero',
      label: 'Hero (bagian pembuka)',
      description: 'Bagian paling atas yang pertama kali dilihat pengunjung.',
      toggleable: true,
      fields: [
        t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Dipercaya 200+ klien sejak 2009', maxLength: 60 }),
        t('title', 'Judul utama', { placeholder: 'mis. Membangun ruang usaha yang kokoh dan tepat waktu', maxLength: 120 }),
        t('highlight', 'Kata yang disorot', {
          placeholder: 'mis. tepat waktu',
          maxLength: 60,
          help: 'Bagian dari judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.',
        }),
        ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat apa yang Anda tawarkan.', maxLength: 300 }),
        t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Hubungi Kami', maxLength: 30 }),
        url('primary_url', 'Tautan tombol utama', { placeholder: 'https://...', help: 'Kosongkan untuk menuju bagian Kontak.' }),
        t('secondary_label', 'Teks tombol kedua', { placeholder: `mis. Lihat ${servicesLabel}`, maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol kedua.' }),
        url('secondary_url', 'Tautan tombol kedua', { placeholder: 'https://...', help: `Kosongkan untuk menuju bagian ${servicesLabel}.` }),
        img('image', 'Gambar hero', 'Foto kantor, tim, atau produk. Disarankan 1600×1200 px.'),
      ],
    },
    {
      key: 'about',
      label: 'Tentang kami',
      toggleable: true,
      fields: [
        eyebrow('mis. Tentang kami'),
        title('mis. Mitra yang mengutamakan kualitas'),
        ta('body', 'Isi', { placeholder: 'Ceritakan sejarah, visi, dan nilai perusahaan. Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
        img('image', 'Gambar', 'Disarankan 1200×900 px.'),
        t('badge_value', 'Angka sorotan', { placeholder: 'mis. 15+', maxLength: 12, help: 'Tampil sebagai label di atas gambar. Kosongkan untuk menyembunyikan.' }),
        t('badge_label', 'Keterangan angka sorotan', { placeholder: 'mis. Tahun pengalaman', maxLength: 40 }),
        listField('points', 'Poin unggulan', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Tim bersertifikat', maxLength: 100 })], 6),
      ],
    },
    {
      key: 'services',
      label: servicesLabel,
      toggleable: true,
      fields: [
        eyebrow(`mis. ${servicesLabel}`),
        title(`mis. ${servicesLabel} kami`),
        subtitle('Kalimat pengantar singkat.'),
        listField(
          'items',
          `Daftar ${servicesLabel.toLowerCase()}`,
          serviceItemLabel,
          [
            t('title', 'Nama', { placeholder: `mis. ${serviceItemLabel} unggulan`, maxLength: 60 }),
            ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 220 }),
            img('image', 'Gambar (opsional)', 'Kosongkan untuk memakai ikon.'),
          ],
          9,
        ),
      ],
    },
    {
      key: 'advantages',
      label: 'Keunggulan & angka',
      toggleable: true,
      fields: [
        eyebrow('mis. Mengapa kami'),
        title('mis. Hasil kerja yang terukur'),
        subtitle('Kalimat pengantar singkat.'),
        listField(
          'stats',
          'Angka pencapaian',
          'Angka',
          [
            t('value', 'Angka', { placeholder: 'mis. 350+', maxLength: 12 }),
            t('label', 'Keterangan', { placeholder: 'mis. Proyek selesai', maxLength: 40 }),
          ],
          4,
        ),
        listField(
          'items',
          'Keunggulan',
          'Keunggulan',
          [
            t('title', 'Judul', { placeholder: 'mis. Tepat waktu', maxLength: 60 }),
            ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 200 }),
          ],
          6,
        ),
      ],
    },
    {
      key: 'gallery',
      label: 'Galeri',
      toggleable: true,
      fields: [
        eyebrow('mis. Galeri'),
        title('mis. Proyek yang telah kami selesaikan'),
        subtitle('Kalimat pengantar singkat.'),
        listField(
          'items',
          'Foto',
          'Foto',
          [img('image', 'Foto', 'Disarankan 1200×900 px.'), t('caption', 'Keterangan', { placeholder: 'mis. Gedung kantor, Surabaya', maxLength: 80 })],
          12,
        ),
      ],
    },
    {
      key: 'testimonials',
      label: 'Testimoni',
      toggleable: true,
      fields: [
        eyebrow('mis. Testimoni'),
        title('mis. Kata klien kami'),
        listField(
          'items',
          'Testimoni',
          'Testimoni',
          [
            t('name', 'Nama', { placeholder: 'mis. Budi Santoso', maxLength: 60 }),
            t('role', 'Jabatan / perusahaan', { placeholder: 'mis. Direktur, PT Contoh', maxLength: 80 }),
            ta('quote', 'Testimoni', { placeholder: 'Tulis kesan klien...', maxLength: 400 }),
            img('photo', 'Foto (opsional)', 'Foto persegi. Kosongkan untuk memakai inisial.'),
          ],
          9,
        ),
      ],
    },
    {
      key: 'cta',
      label: 'Ajakan (CTA)',
      description: 'Blok ajakan berwarna aksen sebelum bagian Kontak.',
      toggleable: true,
      fields: [
        t('title', 'Judul', { placeholder: 'mis. Siap memulai proyek Anda?', maxLength: 100 }),
        ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
        t('button_label', 'Teks tombol', { placeholder: 'mis. Hubungi Kami', maxLength: 30 }),
        url('button_url', 'Tautan tombol', { placeholder: 'https://...', help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      ],
    },
    {
      key: 'contact',
      label: 'Kontak',
      toggleable: true,
      fields: [
        eyebrow('mis. Kontak'),
        title('mis. Mari berdiskusi'),
        subtitle('Kalimat pengantar singkat.'),
        ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
        { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@perusahaan.co.id', maxLength: 120 },
        { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0123', maxLength: 30 },
        { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk tombol WhatsApp di seluruh halaman.' },
        t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang layanan Anda.', maxLength: 160 }),
        t('hours', 'Jam operasional', { placeholder: 'mis. Senin–Jumat, 08.00–17.00 WIB', maxLength: 80 }),
        url('maps_url', 'Link Google Maps', {
          placeholder: 'https://maps.app.goo.gl/...',
          help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
        }),
      ],
    },
    {
      key: 'footer',
      label: 'Footer',
      toggleable: true,
      fields: [
        ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang perusahaan.', maxLength: 220 }),
        t('copyright', 'Teks hak cipta', { placeholder: '© 2026 PT Contoh. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama perusahaan.' }),
        url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
        url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
        url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
        url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
        url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
      ],
    },
  ];
}
