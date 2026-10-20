// Tipe & helper proyek klien (tabel project_client), dipakai halaman Project Clients dan Dashboard.

export type ProjectStatus = 'active' | 'pending' | 'completed' | 'canceled';
export type ServiceType = 'website' | 'mobile_app' | 'ui_ux' | 'other';

export interface Project {
  id: number;
  name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_type: ServiceType | string;
  status: ProjectStatus | string;
  /** null = belum ada penawaran (mis. pesanan custom dari website) */
  price: number | null;
  start_date: string;
  end_date: string;
  image: string;
  /** JSON string [{name, type, size, data|path}] */
  project_files: string;
  description: string;
  assigned_user: string;
  show_on_website: number;
  source: 'admin' | 'website' | string;
  created_at?: string;
}

/** Baris mentah get_projects (PHP mengirim id/angka sebagai string, kolom kosong sebagai null). */
export type RawProject = Partial<Record<keyof Project, unknown>> & { id: unknown };

const str = (v: unknown) => (v == null ? '' : String(v));

export function normalizeProject(row: RawProject): Project {
  const price = row.price == null || row.price === '' ? null : Number(row.price);
  return {
    id: Number(row.id),
    name: str(row.name),
    client_name: str(row.client_name),
    client_email: str(row.client_email),
    client_phone: str(row.client_phone),
    service_type: str(row.service_type) || 'other',
    status: str(row.status) || 'pending',
    price: price != null && Number.isFinite(price) ? price : null,
    start_date: str(row.start_date),
    end_date: str(row.end_date),
    image: str(row.image),
    project_files: str(row.project_files) || '[]',
    description: str(row.description),
    assigned_user: str(row.assigned_user),
    show_on_website: Number(row.show_on_website) === 1 ? 1 : 0,
    source: str(row.source) || 'admin',
    created_at: row.created_at == null ? undefined : str(row.created_at),
  };
}

/** Satu entri project_files: file baru membawa `data` (base64), file tersimpan membawa `path`. */
export interface ProjectFile {
  id?: string;
  name: string;
  type?: string;
  size?: string | number;
  data?: string;
  path?: string;
}

export function parseProjectFiles(json: string | null | undefined): ProjectFile[] {
  try {
    const files = JSON.parse(json || '[]');
    return Array.isArray(files) ? (files as ProjectFile[]) : [];
  } catch {
    return [];
  }
}

/** Pengguna untuk pilihan penanggung jawab (get_users). */
export interface UserLite {
  id: number;
  name: string;
  avatar?: string;
  role?: string;
}

export const SERVICE_LABEL: Record<string, string> = {
  website: 'Website',
  mobile_app: 'Aplikasi mobile',
  ui_ux: 'Desain UI/UX',
  other: 'Lainnya',
};
export const serviceLabel = (type: string) => SERVICE_LABEL[type] ?? type.replace(/_/g, ' ');

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  pending: 'Menunggu',
  completed: 'Selesai',
  canceled: 'Dibatalkan',
};

/** Pesanan custom baru dari form website yang belum ditinjau. */
export const isNewWebsiteSubmission = (p: Pick<Project, 'source' | 'status'>) => p.source === 'website' && p.status === 'pending';

export const formatProjectPrice = (p: Pick<Project, 'price'>) => (p.price == null ? null : `Rp ${Number(p.price).toLocaleString('id-ID')}`);

/** Durasi & sisa hari proyek (perhitungan sama seperti sebelumnya). */
export function projectTimeline(project: Pick<Project, 'start_date' | 'end_date'>) {
  const s = project.start_date ? new Date(project.start_date) : null;
  const e = project.end_date ? new Date(project.end_date) : null;
  const duration = s && e ? Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = project.end_date ? new Date(project.end_date) : null;
  if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);
  const deadline = deadlineDate ? Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return {
    durationLabel: duration !== null ? `${duration} hari` : '-',
    deadline,
    deadlineLabel:
      deadline === null ? 'Tanpa tenggat' : deadline < 0 ? `Terlambat ${Math.abs(deadline)} hari` : deadline === 0 ? 'Tenggat hari ini' : `Sisa ${deadline} hari`,
  };
}

/** Tanggal untuk <input type="date"> (YYYY-MM-DD). */
export const toDateInput = (value: string | null | undefined) => (value ? (value.includes('T') ? value.split('T')[0] : value.split(' ')[0]) : '');
