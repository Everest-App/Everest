import { create } from 'zustand';

const THEME_STORAGE_KEY = 'everest-theme';

function getStoredTheme(): 'dark' | 'light' {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    // Default to light mode on first launch
    return 'light';
}

interface ThemeStore {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
    theme: getStoredTheme(),
    toggleTheme: () =>
        set((state) => {
            const newTheme = state.theme === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            } catch {}
            return { theme: newTheme };
        }),
    setTheme: (newTheme: 'dark' | 'light') =>
        set(() => {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            } catch {}
            return { theme: newTheme };
        }),
}));
