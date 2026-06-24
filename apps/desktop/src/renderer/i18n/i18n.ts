import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fa from './locales/fa.json';

const LANGUAGE_KEY = 'api-platform-language';

function getSavedLanguage(): string {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (saved === 'en' || saved === 'fa') return saved;
    } catch {}
    return 'en';
}

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        fa: { translation: fa },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false, // React already escapes
    },
    react: {
        useSuspense: false,
    },
});

export default i18n;
