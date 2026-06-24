import { create } from 'zustand';
import i18next from 'i18next';

export type AppLanguage = 'en' | 'fa';
export type AppDirection = 'ltr';

const LANGUAGE_KEY = 'api-platform-language';

function getSavedLanguage(): AppLanguage {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (saved === 'en' || saved === 'fa') return saved;
    } catch {}
    return 'en';
}

interface LanguageStore {
    language: AppLanguage;
    direction: AppDirection;
    setLanguage: (lang: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => {
    const initialLang = getSavedLanguage();

    // Always LTR — developer tools should keep standard layout
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', initialLang);
    }

    return {
        language: initialLang,
        direction: 'ltr',

        setLanguage: (lang: AppLanguage) => {
            // Persist
            try {
                localStorage.setItem(LANGUAGE_KEY, lang);
            } catch {}

            // Update i18next (translates text only)
            i18next.changeLanguage(lang);

            // Update lang attribute (for font selection) but NEVER change dir
            document.documentElement.setAttribute('lang', lang);

            set({ language: lang, direction: 'ltr' });
        },
    };
});
