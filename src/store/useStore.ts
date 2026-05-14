import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  language: 'id' | 'en';
  isSearchActive: boolean;
  toggleTheme: () => void;
  setLanguage: (lang: 'id' | 'en') => void;
  toggleSearch: (active?: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  theme: (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  language: (localStorage.getItem('language') as 'id' | 'en') || 'id',
  isSearchActive: false,
  
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
}));
