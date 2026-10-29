// Model panel "Bot WhatsApp (WAHA)" di tab Tanya Nexa (WhatsAppBotPanel.tsx): bentuk respons aksi waha_* dan teks yang
// ditampilkan. Backend: backend/modules/waha.php = waha.js (docs/platform/WHATSAPP-BOT-SPEC.md).
import type { Tone } from '../../../components/admin/ui/styles';

/** Toast halaman Pengaturan website (showNotify), sama dengan GuidesNotify. */
export type WhatsAppNotify = (type: 'success' | 'error' | 'warning', message: string, description: string) => void;

/** Konfigurasi dari waha_get_config: isian tersimpan, nilai .env sebagai petunjuk (tanpa kunci), dan yang berlaku. */
export interface WahaConfig {
  enabled: boolean;
  url: string;
  url_env: string;
  session: string;
  session_env: string;
  admin_number: string;
  admin_number_env: string;
  pause_hours: number;
  key_masked: string;
  key_env: boolean;
  hmac_env: boolean;
  effective: { url: string; session: string; admin_number: string; key: boolean };
}

/** Satu baris log alih ke admin (waha_handoffs). */
export interface WahaHandoff {
  id: number;
  chat_id: string;
  phone: string;
  name: string;
  reason: string;
  reason_label: string;
  message: string;
  status: string;
  notified: boolean;
  paused: boolean;
  created_at: string;
}

export interface WahaState {
  config: WahaConfig;
  handoffs: WahaHandoff[];
  tables_ready: boolean;
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');

/** Respons aksi waha_* → state; null bila bentuknya tidak sesuai (dianggap gagal muat). */
export function parseWahaState(data: unknown): WahaState | null {
  if (!data || typeof data !== 'object') return null;
  const { config, handoffs, tables_ready: tablesReady } = data as Record<string, unknown>;
  if (!config || typeof config !== 'object' || !Array.isArray(handoffs)) return null;
  const c = config as Record<string, unknown>;
  const e = (c.effective && typeof c.effective === 'object' ? c.effective : {}) as Record<string, unknown>;
  return {
    config: {
      enabled: c.enabled !== false,
      url: str(c.url),
      url_env: str(c.url_env),
      session: str(c.session),
      session_env: str(c.session_env),
      admin_number: str(c.admin_number),
      admin_number_env: str(c.admin_number_env),
      pause_hours: Number(c.pause_hours) > 0 ? Number(c.pause_hours) : 12,
      key_masked: str(c.key_masked),
      key_env: c.key_env === true,
      hmac_env: c.hmac_env === true,
      effective: { url: str(e.url), session: str(e.session), admin_number: str(e.admin_number), key: e.key === true },
    },
    handoffs: handoffs
      .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
      .map((h) => ({
        id: Number(h.id) || 0,
        chat_id: str(h.chat_id),
        phone: str(h.phone),
        name: str(h.name),
        reason: str(h.reason),
        reason_label: str(h.reason_label) || str(h.reason),
        message: str(h.message),
        status: str(h.status),
        notified: h.notified === true,
        paused: h.paused === true,
        created_at: str(h.created_at),
      })),
    tables_ready: tablesReady !== false,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-10-29 14:05:09" (waktu database) → "29 Okt 2026, 14.05"; selain itu apa adanya. */
export function formatHandoffTime(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}, ${m[4]}.${m[5]}`;
}

/** Status yang ditampilkan: jeda yang sudah habis berarti bot sudah menjawab lagi walau log belum ditutup. */
export function handoffStatus(h: WahaHandoff): { label: string; tone: Tone } {
  if (h.status === 'selesai') return { label: 'Selesai', tone: 'mint' };
  if (!h.paused) return { label: 'Jeda habis, bot aktif', tone: 'mist' };
  if (h.status === 'ditangani') return { label: 'Ditangani admin', tone: 'cobalt' };
  return { label: 'Menunggu admin', tone: 'warning' };
}
