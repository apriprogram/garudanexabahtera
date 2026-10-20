// Admin session: the token from the `login` action is kept in localStorage and attached to every
// same-origin API request by one fetch wrapper, installed once in main.tsx. Admin pages keep calling
// fetch('/api.php?...') as before; the server checks the token and the role.

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';
const LOGIN_PATH = '/login';
const CUSTOMER_LOGIN_PATH = '/masuk';
const CUSTOMER_HOME_PATH = '/akun';

interface TokenClaims {
  sub: number;
  role: string;
  exp: number;
}

function readClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as TokenClaims;
  } catch {
    return null;
  }
}

/** The stored token, or null when there is none or it has expired. */
export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const claims = readClaims(token);
  if (!claims || claims.exp * 1000 <= Date.now()) return null;
  return token;
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function setSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Profile saved at login (the `user` object of the login / customer_register response). */
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  [key: string]: unknown;
}

/** The logged-in user, or null when there is no valid session. */
export function getCurrentUser(): SessionUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null') as SessionUser | null;
    if (!user || typeof user !== 'object') return null;
    // The role inside the signed token wins over the stored profile
    const role = readClaims(token)?.role || (typeof user.role === 'string' ? user.role : '');
    return { ...user, role };
  } catch {
    return null;
  }
}

/** Role of the logged-in user ('admin' | 'user' | 'customer'), or null when logged out. */
export function getRole(): string | null {
  const token = getToken();
  if (!token) return null;
  return readClaims(token)?.role ?? getCurrentUser()?.role ?? null;
}

/** Template buyer (role customer). */
export function isCustomer(): boolean {
  return getRole() === 'customer';
}

/** Staff (admin or regular user of the admin panel). */
export function isStaff(): boolean {
  const role = getRole();
  return role === 'admin' || role === 'user';
}

/** Where a role lands after login: customers → /akun, staff → /admin. */
export function homePathForRole(role: string | null | undefined): string {
  return role === 'customer' ? CUSTOMER_HOME_PATH : '/admin';
}

/**
 * A `?next=` redirect target that is safe to follow: only same-site relative paths ("/akun", "/pesan/x?a=1"),
 * never "//host", "/\host", "https://…" or "javascript:". Anything else gives the fallback.
 */
export function safeNextPath(next: string | null | undefined, fallback = CUSTOMER_HOME_PATH): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /\p{Cc}/u.test(value)) {
    return fallback;
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Customer login page with a `next` back to the given path (default: the current page). */
export function customerLoginPath(next?: string, extra?: Record<string, string>): string {
  const target = next ?? `${window.location.pathname}${window.location.search}`;
  const query = new URLSearchParams({ ...extra, next: target });
  return `${CUSTOMER_LOGIN_PATH}?${query.toString()}`;
}

/**
 * Ends the session and goes to the login page (use from the admin Sidebar/Header logout buttons).
 * Customers go to the customer login page (/masuk), staff to /login.
 */
export function logout(reason?: 'expired'): void {
  const path = getRole() === 'customer' || window.location.pathname.startsWith('/akun') ? CUSTOMER_LOGIN_PATH : LOGIN_PATH;
  clearSession();
  window.location.assign(reason ? `${path}?${reason}=1` : path);
}

function isApiUrl(url: string): boolean {
  const target = new URL(url, window.location.href);
  return target.origin === window.location.origin && (target.pathname === '/api.php' || target.pathname.startsWith('/api/'));
}

let installed = false;

export function installAuthFetch(): void {
  if (installed) return;
  installed = true;

  // No valid token (expired, or a profile left from before tokens existed): clear it up front so the
  // admin guard, which only looks at currentUser, sends the user to the login page
  if (!getToken()) clearSession();

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!isApiUrl(url)) return nativeFetch(input, init);

    const token = getToken();
    let options = init;
    if (token) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      options = { ...init, headers };
    }

    const response = await nativeFetch(input, options);
    // Expired/invalid token or deactivated account: back to login (only from the admin panel and the
    // customer account pages; other public pages handle a 401 themselves)
    if (response.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        logout('expired');
      } else if (path.startsWith('/akun')) {
        clearSession();
        window.location.assign(customerLoginPath(undefined, { expired: '1' }));
      }
    }
    return response;
  };
}
