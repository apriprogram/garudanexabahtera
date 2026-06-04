import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  language: 'id' | 'en';
  isSearchActive: boolean;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleTheme: () => void;
  setLanguage: (lang: 'id' | 'en') => void;
  toggleSearch: (active?: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: (open?: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  language: (localStorage.getItem('language') as 'id' | 'en') || 'id',
  isSearchActive: false,
  isSidebarCollapsed: false,
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
  
  setLanguage: (lang) => set(() => {
    localStorage.setItem('language', lang);
    return { language: lang };
  }),
  
  toggleSearch: (active) => set((state) => ({
    isSearchActive: active !== undefined ? active : !state.isSearchActive
  })),

  toggleSidebar: () => set((state) => ({
    isSidebarCollapsed: !state.isSidebarCollapsed
  })),

  toggleMobileSidebar: (open) => set((state) => ({
    isMobileSidebarOpen: open !== undefined ? open : !state.isMobileSidebarOpen
  })),
}));
