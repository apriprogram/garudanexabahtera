// Teks antarmuka bawaan Portline (tombol, label formulir, pesan galat, label menu cadangan) dalam dua bahasa. Konten
// demo berbahasa Inggris; pembeli Indonesia bisa mengganti `brand.language` ke "id" di CMS sehingga teks bawaan ini
// (dan atribut lang situs) ikut berbahasa Indonesia. Teks lain (judul, isi, tombol bernama) selalu dari CMS.

export type Lang = 'en' | 'id';

const EN = {
  // Menu (cadangan bila label kecil section terlalu panjang)
  nav: {
    newsroom: 'Newsroom',
    divisions: 'Group',
    fleet: 'Fleet',
    network: 'Network',
    sustainability: 'Sustainability',
    careers: 'Careers',
    contact: 'Contact',
  } as Record<string, string>,
  toHome: 'back to the top of the page',
  languageGroup: 'Language',
  // Hero
  slideControls: 'Slide controls',
  slide: (i: number, n: number) => `Slide ${i} of ${n}`,
  pauseSlides: 'Pause slideshow',
  playSlides: 'Play slideshow',
  groupCompanies: 'Group companies',
  // Newsroom
  filterLabel: 'Filter stories by topic',
  readStory: 'Read story',
  closeStory: 'Close story',
  storyOpen: 'Story',
  // Press & carousels
  previous: 'Previous',
  next: 'Next',
  pressList: 'Press coverage',
  // Divisions
  learnMore: 'Talk to this team',
  // Fleet
  showVessel: (name: string) => `Show ${name}`,
  previousVessel: 'Previous vessel class',
  nextVessel: 'Next vessel class',
  specs: 'Key figures',
  // Network
  hubs: 'Main hubs',
  // Leadership
  linkedin: (name: string) => `${name} on LinkedIn`,
  // Contact
  headquarters: 'Headquarters',
  offices: 'Regional offices',
  hours: 'Office hours',
  call: 'Call',
  email: 'Email',
  viewMap: 'View on map',
  form: {
    title: 'Send an enquiry',
    name: 'Full name',
    company: 'Company',
    email: 'Work email',
    phone: 'Phone',
    type: 'Enquiry type',
    typePlaceholder: 'Choose a topic',
    unit: 'Business unit',
    unitPlaceholder: 'Any / not sure',
    message: 'Message',
    messagePlaceholder: 'Cargo, route, volumes, timing…',
    optional: 'optional',
    submit: 'Prepare message',
    errors: {
      name: 'Please enter your full name.',
      email: 'Please enter a valid email address, e.g. name@company.com.',
      phone: 'Please enter a valid phone number or leave it empty.',
      type: 'Please choose an enquiry type.',
      message: 'Please write a short message (at least 10 characters).',
    },
    privacy: 'Nothing is stored on this website: the form only prepares a WhatsApp message or an email for you to send.',
    readyTitle: 'Your message is ready',
    readyText: 'Check the text, then send it by WhatsApp or email.',
    openWhatsapp: 'Open WhatsApp',
    sendEmail: 'Send by email',
    edit: 'Edit details',
    noChannel: 'Contact our team by phone or visit one of our offices.',
    greeting: (company: string) => `Hello ${company}, I would like to make an enquiry.`,
    rows: { name: 'Name', company: 'Company', email: 'Email', phone: 'Phone', type: 'Enquiry', unit: 'Business unit', message: 'Message' },
    thanks: 'Thank you.',
    subject: (type: string, company: string) => `${type || 'Enquiry'} – ${company}`,
  },
  // Footer
  footerCompany: 'Company',
  footerMedia: 'Media',
  footerContact: 'Contact',
  footerLinks: 'Footer links',
  rights: (year: number, name: string) => `© ${year} ${name}. All rights reserved.`,
};

export type UiCopy = typeof EN;

const ID: UiCopy = {
  nav: {
    newsroom: 'Berita',
    divisions: 'Grup',
    fleet: 'Armada',
    network: 'Jaringan',
    sustainability: 'Keberlanjutan',
    careers: 'Karier',
    contact: 'Kontak',
  },
  toHome: 'kembali ke awal halaman',
  languageGroup: 'Bahasa',
  slideControls: 'Kontrol slide',
  slide: (i, n) => `Slide ${i} dari ${n}`,
  pauseSlides: 'Jeda slide otomatis',
  playSlides: 'Putar slide otomatis',
  groupCompanies: 'Perusahaan grup',
  filterLabel: 'Saring berita menurut topik',
  readStory: 'Baca berita',
  closeStory: 'Tutup berita',
  storyOpen: 'Berita',
  previous: 'Sebelumnya',
  next: 'Berikutnya',
  pressList: 'Liputan media',
  learnMore: 'Hubungi tim ini',
  showVessel: (name) => `Tampilkan ${name}`,
  previousVessel: 'Kelas kapal sebelumnya',
  nextVessel: 'Kelas kapal berikutnya',
  specs: 'Data utama',
  hubs: 'Hub utama',
  linkedin: (name) => `${name} di LinkedIn`,
  headquarters: 'Kantor pusat',
  offices: 'Kantor regional',
  hours: 'Jam kantor',
  call: 'Telepon',
  email: 'Email',
  viewMap: 'Lihat peta',
  form: {
    title: 'Kirim pertanyaan',
    name: 'Nama lengkap',
    company: 'Perusahaan',
    email: 'Email kantor',
    phone: 'Telepon',
    type: 'Jenis pertanyaan',
    typePlaceholder: 'Pilih topik',
    unit: 'Unit bisnis',
    unitPlaceholder: 'Semua / belum tahu',
    message: 'Pesan',
    messagePlaceholder: 'Muatan, rute, volume, jadwal…',
    optional: 'opsional',
    submit: 'Susun pesan',
    errors: {
      name: 'Tulis nama lengkap Anda.',
      email: 'Tulis alamat email yang valid, mis. nama@perusahaan.com.',
      phone: 'Tulis nomor telepon yang valid atau kosongkan.',
      type: 'Pilih jenis pertanyaan.',
      message: 'Tulis pesan singkat (minimal 10 karakter).',
    },
    privacy: 'Tidak ada data yang disimpan di website ini: formulir hanya menyusun pesan WhatsApp atau email untuk Anda kirim.',
    readyTitle: 'Pesan siap dikirim',
    readyText: 'Periksa isinya, lalu kirim lewat WhatsApp atau email.',
    openWhatsapp: 'Buka WhatsApp',
    sendEmail: 'Kirim lewat email',
    edit: 'Ubah data',
    noChannel: 'Hubungi tim kami lewat telepon atau kunjungi salah satu kantor kami.',
    greeting: (company) => `Halo ${company}, saya ingin bertanya.`,
    rows: { name: 'Nama', company: 'Perusahaan', email: 'Email', phone: 'Telepon', type: 'Pertanyaan', unit: 'Unit bisnis', message: 'Pesan' },
    thanks: 'Terima kasih.',
    subject: (type, company) => `${type || 'Pertanyaan'} – ${company}`,
  },
  footerCompany: 'Perusahaan',
  footerMedia: 'Media',
  footerContact: 'Kontak',
  footerLinks: 'Tautan footer',
  rights: (year, name) => `© ${year} ${name}. Hak cipta dilindungi.`,
};

/** "id"/"ID"/"in" → Indonesia; lainnya (kosong, "en", nilai aneh) → Inggris. */
export const langOf = (raw: string): Lang => (/^(id|in|ind|indonesia)$/i.test((raw || '').trim()) ? 'id' : 'en');

export const uiCopy = (lang: Lang): UiCopy => (lang === 'id' ? ID : EN);

/** Bulan untuk tanggal tampilan "14 Oct 2026" / "14 Okt 2026". */
export const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
};
