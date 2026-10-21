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

const initialTheme: 'light' | 'dark' =
  (localStorage.getItem('theme') as 'light' | 'dark') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

// Pasang kelas tema sebelum render pertama agar tidak berkedip gelap → terang
document.body.classList.toggle('light-theme', initialTheme === 'light');

export const useStore = create<AppState>((set) => ({
  theme: initialTheme,
  isSearchActive: false,
  isSidebarCollapsed: localStorage.getItem('adminSidebarCollapsed') === '1',
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
