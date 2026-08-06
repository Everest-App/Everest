import en from './locales/en.json';

export function useTranslation() {
    const t = (key: string, options?: Record<string, any>): string => {
        const parts = key.split('.');
        let res: any = en;
        for (const p of parts) {
            if (res && typeof res === 'object') {
                res = res[p];
            } else {
                return options?.defaultValue || key;
            }
        }
        if (typeof res === 'string') {
            if (options) {
                return res.replace(/\{\{(\w+)\}\}/g, (_, k) => String(options[k] ?? ''));
            }
            return res;
        }
        return options?.defaultValue || key;
    };

    return { t };
}
