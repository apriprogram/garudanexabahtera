// @vitest-environment jsdom
// Konten & performa beranda (paket "beranda-konten"): syarat proyek layak tampil di #projects (tanpa teks uji, cadangan
// portofolio), kartu proyek datar, strip layanan (ikon + tanda SVG ringan, ejaan i-School), toggle & "Lihat Demo" hero,
// tombol jeda tayangan, rail langkah, dan peringatan syarat tampil di form proyek admin.
// Jalankan: npx vitest run --dir src/components/sections
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import Projects from '../Projects';
import LogoTicker from '../LogoTicker';
import { HeroIntro } from '../hero/HeroIntro';
import { HeroShowcase } from '../hero/HeroShowcase';
import type { ShowcaseItem } from '../hero/showcase';
import { isPresentableProject, projectIssues } from '../projects/presentable';
import { t } from '../../../hooks/useTranslation';
import { ProjectFormDrawer } from '../../../pages/admin/project-clients/ProjectFormDrawer';
import type { Project } from '../../../pages/admin/project-clients/projectShared';

// Setting website per tes (tanpa cache modul useCachedJson); helper lain (readList, dst.) tetap asli
let mockSettings: SiteSettings = {};
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => ({ settings: mockSettings, loaded: true }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LONG = 'Website profil perusahaan dengan halaman layanan, galeri proyek, dan formulir kontak.';

let publicProjects: unknown[] = [];
let showcaseStats: Record<string, { likes: number; views: number }> = {};
let posts: { action: string | null; body: Record<string, unknown> }[] = [];
// Jawaban per aksi bisa ditahan (gates) atau dibuat gagal (failing), mis. statistik yang datang belakangan
let gates: Partial<Record<string, Promise<void>>> = {};
let failing: Set<string> = new Set();

beforeEach(() => {
  mockSettings = {};
  publicProjects = [];
  showcaseStats = {};
  posts = [];
  gates = {};
  failing = new Set();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
        delete body.action; // apiPost repeats the action in the body; the query string already carries it
        posts.push({ action, body });
      }
      if (action && gates[action]) await gates[action];
      if (action && failing.has(action)) return json(429, { success: false, error: 'Terlalu banyak permintaan' });
      if (init?.method === 'POST') {
        if (action === 'showcase_like') return json(200, { success: true, like_count: 8 });
        if (action === 'showcase_view') return json(200, { success: true, view_count: 13 });
      }
      if (action === 'get_public_projects') return json(200, { projects: publicProjects });
      if (action === 'get_showcase_stats') return json(200, { success: true, stats: showcaseStats });
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderAt = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('syarat proyek layak tampil (B-01)', () => {
  it('menolak teks uji, deskripsi pendek, dan proyek tanpa gambar', () => {
    const ok = { name: 'Website Perusahaan', image: '/a.jpg', description: LONG };
    expect(isPresentableProject(ok)).toBe(true);
    expect(isPresentableProject({ ...ok, description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Coba text yang cukup panjang untuk lolos batas empat puluh karakter.' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Test deskripsi yang cukup panjang untuk lolos batas empat puluh.' })).toBe(false);
    expect(isPresentableProject({ ...ok, name: '[TEST verif-ui] Aplikasi' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Terlalu pendek.' })).toBe(false);
    expect(isPresentableProject({ ...ok, image: null })).toBe(false);
    expect(projectIssues({ name: 'Undangan Digital', image: '', description: 'Coba text' })).toEqual([
      'belum ada gambar',
      'deskripsi kurang dari 40 karakter',
      'judul atau deskripsi masih berisi teks uji',
    ]);
  });
});

describe('Projects (#projects)', () => {
  it('hanya menampilkan proyek yang layak; kartu gaya template + "Pesan Serupa", gambar dekoratif, aksi header "Pesan Custom"', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Undangan Digital', service_type: 'website', image: '/p2.jpg', description: `${LONG} Versi undangan.` },
      { id: 3, name: 'Undangan Lama', service_type: 'mobile_app', image: '/p3.jpg', description: 'Lorem Ipsum is simply dummy text of the printing industry.' },
      { id: 4, name: 'Profil', service_type: 'website', image: '/p4.jpg', description: 'Coba text' },
    ];
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    await waitFor(() => expect(within(section).getByRole('heading', { name: 'Website Perusahaan' })).toBeInTheDocument());
    expect(within(section).getByRole('heading', { name: 'Undangan Digital' })).toBeInTheDocument();
    expect(section).not.toHaveTextContent(/Lorem Ipsum|Coba text|Undangan Lama/);

    // Kartu gaya kartu template: gambar 4:3 dekoratif (judul dari h3) yang sedikit membesar saat di-hover, tanpa kartu
    // sorotan; lapisan hover = deskripsi + "Pesan Serupa" ke form custom; di bawah gambar judul lalu jenis proyek
    const images = section.querySelectorAll('img');
    expect(images).toHaveLength(2);
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt', '');
      expect(img.className).toContain('motion-safe:group-hover/shot:scale-[1.04]');
      expect(img.closest('.aspect-\\[4\\/3\\]')).not.toBeNull();
    });
    const cards = section.querySelectorAll('article');
    expect(cards).toHaveLength(2);
    expect(section).not.toHaveTextContent('Proyek pilihan');
    const card = within(section).getByRole('heading', { level: 3, name: 'Website Perusahaan' }).closest('article') as HTMLElement;
    expect(card.className).not.toMatch(/\b(card-flat|lift)\b/);
    // Deskripsi: salinan visual di lapisan hover (aria-hidden) + satu salinan sesudah judul (terlihat di layar sentuh,
    // sr-only di perangkat ber-mouse), jadi terbaca di setiap perangkat dan dibacakan sesudah h3
    const [inOverlay, belowTitle] = within(card).getAllByText(LONG);
    const overlay = inOverlay.closest('.pointer-events-none') as HTMLElement;
    expect(overlay.className).toContain('[@media(hover:hover)]:opacity-0');
    expect(overlay.className).toContain('group-focus-within/shot:opacity-100');
    expect(overlay.className).toContain('from-fg/90');
    expect(inOverlay.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(belowTitle.closest('.pointer-events-none')).toBeNull();
    expect(belowTitle.className).toContain('[@media(hover:hover)]:sr-only');
    const heading = within(card).getByRole('heading', { level: 3 });
    expect(heading.compareDocumentPosition(belowTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // line-clamp di span dalam tombol judul: overflow di h3 akan memotong garis fokus tombol
    expect(heading.className).not.toContain('line-clamp');
    expect(within(heading).getByRole('button').querySelector('.line-clamp-2')).not.toBeNull();
    const similar = within(card).getByRole('link', { name: 'Pesan Serupa Website Perusahaan' });
    expect(similar).toHaveAttribute('href', '/pesan-custom');
    expect(similar.className).toContain('btn-primary');
    expect(similar.className).toContain('focus-visible:outline-white');
    expect(within(card).getByText('Website').closest('p')).toHaveTextContent(/^Jenis proyek Website$/);

    const action = within(section).getByRole('link', { name: /Pesan Custom/ });
    expect(action).toHaveAttribute('href', '/pesan-custom');
    expect(action.querySelector('svg')?.getAttribute('class')).toContain('motion-reduce:transition-none');
  });

  it('kategori di bawah judul (pemilik 2026-10-24): chip jenis proyek menyaring kartu; satu kategori saja → tanpa chip', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Aplikasi Kasir', service_type: 'mobile_app', image: '/p2.jpg', description: `${LONG} Versi aplikasi.` },
      { id: 3, name: 'Website Klinik', service_type: 'website', image: '/p3.jpg', description: `${LONG} Versi klinik.` },
    ];
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    const group = await within(section).findByRole('group', { name: 'Kategori proyek' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Website', 'Aplikasi Mobile']);
    expect(within(group).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(section.querySelectorAll('article')).toHaveLength(3);
    // "Pesan Custom" sebaris dengan chip kategori, setinggi chip (btn-sm), tidak lagi di samping judul
    const custom = within(section).getByRole('link', { name: /Pesan Custom/ });
    expect(custom.parentElement).toContainElement(group);
    expect(custom.className).toContain('btn-sm');

    fireEvent.click(within(group).getByRole('button', { name: 'Aplikasi Mobile' }));
    expect(within(group).getByRole('button', { name: 'Aplikasi Mobile' })).toHaveAttribute('aria-pressed', 'true');
    expect([...section.querySelectorAll('article h3')].map((h) => h.textContent)).toEqual(['Aplikasi Kasir']);
    // Kolom grid tetap mengikuti semua proyek (ukuran kartu tidak berubah)
    expect((section.querySelector('ul') as HTMLElement).className).toContain('lg:grid-cols-3');

    cleanup();
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Undangan Digital', service_type: 'website', image: '/p2.jpg', description: `${LONG} Versi undangan.` },
    ];
    renderAt(<Projects />);
    const single = document.getElementById('projects') as HTMLElement;
    await within(single).findByRole('heading', { name: 'Undangan Digital' });
    expect(within(single).queryByRole('group', { name: 'Kategori proyek' })).toBeNull();
    // Tanpa chip: tombol kembali ke samping judul, ukuran biasa
    const action = within(single).getByRole('link', { name: /Pesan Custom/ });
    expect(action.className).not.toContain('btn-sm');
    expect(action).toHaveAttribute('href', '/pesan-custom');
  });

  it('♥ suka & 👁 dilihat (pemilik 2026-10-24): angka dari get_showcase_stats, suka di-toggle, membuka detail = dilihat sekali', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Aplikasi Kasir', service_type: 'mobile_app', image: '/p2.jpg', description: `${LONG} Versi aplikasi.` },
    ];
    showcaseStats = { 'p-1': { likes: 7, views: 12 } };
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    const like = await within(section).findByRole('button', { name: 'Suka Website Perusahaan, 7 suka' });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(within(section).getByRole('button', { name: 'Suka Aplikasi Kasir, 0 suka' })).toBeInTheDocument();
    const card = like.closest('article') as HTMLElement;
    expect(card).toHaveTextContent(/12 kali dilihat/);

    // Suka: angka dari server, status disimpan di browser
    fireEvent.click(like);
    await waitFor(() => expect(within(card).getByRole('button', { name: 'Batal suka Website Perusahaan, 8 suka' })).toHaveAttribute('aria-pressed', 'true'));
    expect(posts).toContainEqual({ action: 'showcase_like', body: { key: 'p-1', liked: true } });

    // Membuka detail (judul) = dilihat, sekali per sesi; dialog modal dengan judul, deskripsi & Pesan Serupa
    fireEvent.click(within(card).getByRole('button', { name: 'Website Perusahaan' }));
    const dialog = screen.getByRole('dialog', { name: 'Website Perusahaan' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent(LONG);
    expect(within(dialog).getByRole('link', { name: /Pesan Serupa/ })).toHaveAttribute('href', '/pesan-custom');
    expect(card).toHaveTextContent(/13 kali dilihat/);
    expect(posts.filter((p) => p.action === 'showcase_view')).toEqual([{ action: 'showcase_view', body: { key: 'p-1' } }]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Tutup detail proyek' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: 'Website Perusahaan' }));
    expect(posts.filter((p) => p.action === 'showcase_view')).toHaveLength(1);
  });

  it('statistik datang belakangan: klik sebelumnya tidak membekukan angka; fokus kembali ke judul; ♥ tetap memegang fokus', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Aplikasi Kasir', service_type: 'mobile_app', image: '/p2.jpg', description: `${LONG} Versi aplikasi.` },
    ];
    showcaseStats = { 'p-1': { likes: 7, views: 40 } };
    let releaseStats = () => {};
    gates.get_showcase_stats = new Promise<void>((resolve) => (releaseStats = resolve));
    failing = new Set(['showcase_like', 'showcase_view']);
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    const like = await within(section).findByRole('button', { name: 'Suka Website Perusahaan, 0 suka' });
    const card = like.closest('article') as HTMLElement;

    // Suka gagal sebelum statistik tiba: dikembalikan; dibuka dari gambar (bukan judul), hitungan gagal terkirim
    fireEvent.click(like);
    await waitFor(() => expect(within(card).getByRole('button', { name: 'Suka Website Perusahaan, 0 suka' })).toHaveAttribute('aria-pressed', 'false'));
    fireEvent.click(card.querySelector('button[aria-hidden]') as HTMLElement);
    await waitFor(() => expect(posts.filter((p) => p.action === 'showcase_view')).toHaveLength(1));
    expect(card).toHaveTextContent(/1 kali dilihat/);

    // Tutup: fokus ke tombol judul (pemicu yang terlihat), bukan <body> atau gambar aria-hidden
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tutup detail proyek' }));
    expect(within(card).getByRole('button', { name: 'Website Perusahaan' })).toHaveFocus();

    // Statistik tiba: angka server + kunjungan sesi ini (bukan beku di 1), suka = angka server
    releaseStats();
    await waitFor(() => expect(card).toHaveTextContent(/41 kali dilihat/));
    expect(within(card).getByRole('button', { name: 'Suka Website Perusahaan, 7 suka' })).toBeInTheDocument();

    // Selama permintaan suka berjalan: aria-disabled (bukan disabled), fokus tetap di tombol
    failing = new Set();
    let releaseLike = () => {};
    gates.showcase_like = new Promise<void>((resolve) => (releaseLike = resolve));
    const heart = within(card).getByRole('button', { name: /Suka Website Perusahaan/ });
    heart.focus();
    fireEvent.click(heart);
    expect(heart).toHaveAttribute('aria-disabled', 'true');
    expect(heart).not.toBeDisabled();
    expect(heart).toHaveFocus();
    releaseLike();
    await waitFor(() => expect(heart).toHaveAttribute('aria-disabled', 'false'));
    expect(heart).toHaveAccessibleName('Batal suka Website Perusahaan, 8 suka');
  });

  it('portofolio cadangan: kunci suka/dilihat = f-{slug judul}', async () => {
    mockSettings = { portfolio_data: JSON.stringify([{ title: 'Sistem Informasi Desa', desc: 'GOVERNMENT / WEB', image: '/assets/product/pos.png' }]) };
    showcaseStats = { 'f-sistem-informasi-desa': { likes: 3, views: 5 } };
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    fireEvent.click(await within(section).findByRole('button', { name: 'Suka Sistem Informasi Desa, 3 suka' }));
    await waitFor(() => expect(posts).toContainEqual({ action: 'showcase_like', body: { key: 'f-sistem-informasi-desa', liked: true } }));
  });

  it('kurang dari 2 proyek layak → portofolio cadangan, teks uji tidak pernah tampil', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Undangan Digital', service_type: 'mobile_app', image: '/p2.jpg', description: 'Lorem Ipsum is simply dummy text of the printing industry.' },
    ];
    mockSettings = { portfolio_data: JSON.stringify([{ title: 'Sistem Informasi Desa', desc: 'GOVERNMENT / WEB', image: '/assets/product/pos.png' }]) };
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    await waitFor(() => expect(within(section).getByRole('heading', { name: 'Sistem Informasi Desa' })).toBeInTheDocument());
    expect(section).not.toHaveTextContent(/Website Perusahaan|Lorem Ipsum/);
  });
});

describe('strip layanan (LogoTicker)', () => {
  it('bawaan: ikon layanan + tanda SVG ringan, ejaan i-School/i-Santri, tanpa PNG raksasa', () => {
    const { container } = render(<LogoTicker />);
    expect(screen.getByText(/Produk dan layanan kami:/)).toHaveTextContent(
      'Template Company Profile, Website Custom, Aplikasi Mobile, i-School, i-Santri, Kasir POS, Absensi Digital, Digital Invitation.',
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/\.png/);
    expect(container.innerHTML).toContain('/assets/logo/ischool-mark.svg');
    const first = container.querySelector('[data-ticker-item]') as HTMLElement;
    expect(first.querySelector('svg')).not.toBeNull(); // ikon lucide, bukan logo Garuda Nexa berulang
    expect(first.lastElementChild?.className).not.toMatch(/uppercase/);
  });

  it('setting admin lama: PNG 4-6k px diganti tanda SVG, logo Garuda Nexa diganti ikon, ejaan dirapikan', () => {
    mockSettings = {
      hero_logos: JSON.stringify([
        { name: 'I-SCHOOL', src: 'https://garudanexa.com/assets/logo/ischool.png' },
        { name: 'Digital Invitation', src: '/assets/logo/logoweddingputih.png' },
        { name: 'Kasir POS', src: '/assets/logo/logogarudanexa.png' },
      ]),
    };
    const { container } = render(<LogoTicker />);
    expect(screen.getByText(/Produk dan layanan kami:/)).toHaveTextContent('i-School, Digital Invitation, Kasir POS.');
    expect(container.innerHTML).not.toMatch(/\.png/);
    expect(container.innerHTML).toContain('/assets/logo/ischool-mark.svg');
    expect(container.innerHTML).toContain('/assets/logo/invitation-mark.svg');
  });
});

const ITEM: ShowcaseItem = {
  key: 'tpl-1-corporate-nexa',
  slug: 'corporate-nexa',
  name: 'Corporate Nexa',
  category: 'Company Profile',
  price: 1500000,
  image: '/assets/templates/corporate-nexa-preview.svg',
  fallbackImage: null,
  demoHref: '/demo/corporate-nexa',
  demoExternal: false,
};

describe('HeroIntro', () => {
  it('toggle gaya Dribbble: label kapital kecil tanpa ikon, terpilih teks gelap di pill putih; label pendek HP jelas', () => {
    renderAt(<HeroIntro mode="template" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const [template, custom] = screen.getAllByRole('tab');
    expect(template).toHaveTextContent('Template siap pakai');
    expect(custom).toHaveTextContent('Website & aplikasi custom');
    expect(template.className).toMatch(/uppercase/);
    expect(template.className).toContain('text-fg');
    expect(template.querySelector('svg')).toBeNull();
    expect(t('home-hero-mode-template-short')).toBe('Siap pakai');
    expect(t('home-hero-mode-custom-short')).toBe('Jasa custom');
    expect(t('nav-projects')).toBe('Projects'); // keputusan pemilik: label nav tetap
  });

  it('mode Template hanya "Pilih Template" (tanpa "Lihat Demo"); mode Custom "Start Your Project Brief"', () => {
    const { unmount } = renderAt(<HeroIntro mode="template" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const panels = screen.getAllByRole('tabpanel');
    expect(within(panels[0]).getByRole('link', { name: /Pilih Template/ })).toBeInTheDocument();
    expect(screen.queryByText(/Lihat Demo/)).toBeNull();
    unmount();

    renderAt(<HeroIntro mode="custom" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const brief = screen.getByRole('link', { name: 'Start Your Project Brief' });
    expect(brief).toHaveAttribute('href', '/pesan-custom');
    expect(brief.querySelector('svg')).not.toBeNull();
  });
});

describe('HeroShowcase', () => {
  const props = {
    step: 0,
    onStep: () => {},
    items: [ITEM, { ...ITEM, key: 'tpl-2', slug: 'startup-clean', name: 'Startup Clean' }],
    sample: false,
    slide: 0,
    onNext: () => {},
    templatesHidden: false,
  };

  it('tombol jeda: label tetap "Jeda tayangan", status lewat aria-pressed', () => {
    renderAt(<HeroShowcase mode="template" {...props} />);
    const pause = screen.getByRole('button', { name: 'Jeda tayangan' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Jeda tayangan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Putar tayangan' })).not.toBeInTheDocument();
  });

  it('hold menghentikan tayangan; label semua langkah tampil mulai xl', () => {
    const { container, rerender } = renderAt(<HeroShowcase mode="template" {...props} />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).not.toContain('is-paused');
    rerender(
      <MemoryRouter>
        <HeroShowcase mode="template" {...props} hold />
      </MemoryRouter>,
    );
    expect(wrap.className).toContain('is-paused');

    const rail = screen.getByRole('list', { name: 'Alur pemesanan template' });
    const labels = within(rail).getAllByText(/Pilih template|Bayar via Midtrans|Domain aktif|Kelola lewat CMS/);
    expect(labels).toHaveLength(4);
    labels.slice(1).forEach((label) => expect(label.className).toContain('xl:inline'));
  });

  it('mode Custom diberi keterangan "Contoh tampilan"; metode pembayaran tidak dirinci', () => {
    const { rerender } = renderAt(<HeroShowcase mode="custom" {...props} />);
    expect(screen.getByText('Contoh tampilan')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <HeroShowcase mode="template" {...props} step={1} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Contoh tampilan')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/QRIS|Virtual Account|E-wallet/);
  });
});

describe('form proyek admin', () => {
  it('memberi tahu kenapa proyek yang dicentang "Tampilkan di website" belum tampil di beranda', () => {
    const project = {
      id: 2,
      name: 'Undangan Digital',
      client_name: 'Klien',
      client_email: '',
      client_phone: '',
      service_type: 'website',
      status: 'active',
      price: null,
      start_date: '',
      end_date: '',
      image: '',
      project_files: '[]',
      description: 'Coba text',
      assigned_user: '',
      show_on_website: 1,
      source: 'admin',
    } satisfies Project;
    render(<ProjectFormDrawer open project={project} usersList={[]} onClose={() => {}} onSaved={() => {}} onError={() => {}} />);
    expect(screen.getByText('Belum tampil di beranda')).toBeInTheDocument();
    expect(screen.getByText(/belum ada gambar, deskripsi kurang dari 40 karakter, judul atau deskripsi masih berisi teks uji/)).toBeInTheDocument();
    // Pratinjau unggahan 4:3 = kartu proyek beranda
    expect(screen.getByText(/Disarankan 1600×1200 px/)).toBeInTheDocument();
    expect(screen.getByText('Taruh gambar proyek di sini').closest('.aspect-\\[4\\/3\\]')).not.toBeNull();
  });
});
