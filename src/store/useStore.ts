import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  isSearchActive: boolean;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSearch: (active?: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: (open?: boolean) => void;
}

// Modul ini juga diimpor saat prerender di Node (scripts/prerender.mjs): tanpa window/localStorage nilainya bawaan
// ('dark', sidebar terbuka). Tema hanya memasang kelas di <body> (panel admin), tidak mengubah markup React, jadi
// hidrasi halaman publik tetap identik dengan HTML prerender.
const isBrowser = typeof window !== 'undefined';
const readStorage = (key: string): string | null => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // penyimpanan diblokir browser
  }
};

const initialTheme: 'light' | 'dark' =
  (readStorage('theme') as 'light' | 'dark' | null) ||
  (isBrowser && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

// Pasang kelas tema sebelum render pertama agar tidak berkedip gelap → terang
if (isBrowser) document.body.classList.toggle('light-theme', initialTheme === 'light');

export const useStore = create<AppState>((set) => ({
  theme: initialTheme,
  isSearchActive: false,
  isSidebarCollapsed: readStorage('adminSidebarCollapsed') === '1',
  isMobileSidebarOpen: false,
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    return { theme: newTheme };
  }),
  
  toggleSearch: (active) => set((state) => ({
    isSearchActive: active !== undefined ? active : !state.isSearchActive
  })),

  toggleSidebar: () => set((state) => {
    const collapsed = !state.isSidebarCollapsed;
    localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
    return { isSidebarCollapsed: collapsed };
  }),

  toggleMobileSidebar: (open) => set((state) => ({
    isMobileSidebarOpen: open !== undefined ? open : !state.isMobileSidebarOpen
  })),
}));
