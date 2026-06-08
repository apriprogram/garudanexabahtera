// =============================================
// API Helper for Monitoring Center
// =============================================

const API = '/api.php';

export async function monitorAPI(action: string, data: Record<string, any> = {}, method = 'GET') {
  const params = new URLSearchParams({ action });
  
  if (method === 'GET') {
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
  }

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (method === 'POST') {
    options.body = JSON.stringify({ action, ...data });
  }

  const url = method === 'GET' ? `${API}?${params}` : `${API}?action=${action}`;
  const res = await fetch(url, options);
  return res.json();
}

// Colors
export const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  offline: '#ef4444',
  warning: '#f59e0b',
  critical: '#dc2626',
  success: '#22c55e',
};

export const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export const SEVERITY_BG: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-400',
  warning: 'bg-amber-500/10 text-amber-400',
  critical: 'bg-red-500/10 text-red-400',
};

// Formatters
export const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

export const formatMs = (ms: number | null) => {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatNumber = (n: number) => {
  if (!n) return '0';
  return n.toLocaleString('id-ID');
};

export const formatDate = (d: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};
