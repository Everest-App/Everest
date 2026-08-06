/**
 * Deep, standalone JSON & variable formatting module.
 * Optimized with pre-compiled regular expressions for high performance.
 */

// Pre-compiled regular expressions (compiled ONCE module-level to avoid GC pressure)
const QUOTED_VAR_REGEX = /"\{\{\s*[^}\s]+\s*\}\}"/g;
const EMBEDDED_VAR_REGEX = /\{\{\s*[^}\s]+\s*\}\}/g;
const UNESCAPED_QUOTE_REGEX = /(?<!\\)"/g;
const SINGLE_QUOTE_REGEX = /'/g;
const TRAILING_COMMA_REGEX = /,\s*([\}\]])/g;
const UNQUOTED_KEY_REGEX = /([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g;

export function formatJsonWithVariables(text: string): string | null {
    if (!text || !text.trim()) return null;
    const raw = text.trim();

    const replacements: { placeholder: string; original: string }[] = [];

    // 1. Mask exact quoted variables first: "{{var}}" -> "__VAR_Q_0__"
    let masked = raw.replace(QUOTED_VAR_REGEX, (match) => {
        const placeholder = `"__VAR_Q_${replacements.length}__"`;
        replacements.push({ placeholder, original: match });
        return placeholder;
    });

    // 2. Mask remaining unquoted or embedded variables: {{var}}
    masked = masked.replace(EMBEDDED_VAR_REGEX, (match, offset) => {
        const prefix = masked.slice(0, offset);
        const quoteCount = (prefix.match(UNESCAPED_QUOTE_REGEX) || []).length;
        const isInsideString = quoteCount % 2 === 1;

        if (isInsideString) {
            const placeholder = `__VAR_EMB_${replacements.length}__`;
            replacements.push({ placeholder, original: match });
            return placeholder;
        } else {
            const placeholder = `"__VAR_UNQ_${replacements.length}__"`;
            replacements.push({ placeholder, original: match });
            return placeholder;
        }
    });

    const restoreVars = (str: string): string => {
        let restored = str;
        for (let i = replacements.length - 1; i >= 0; i--) {
            const { placeholder, original } = replacements[i];
            restored = restored.replaceAll(placeholder, original);
        }
        return restored;
    };

    const tryFormat = (jsonStr: string): string | null => {
        try {
            const parsed = JSON.parse(jsonStr);
            const formatted = JSON.stringify(parsed, null, 2);
            return restoreVars(formatted);
        } catch {
            return null;
        }
    };

    // Attempt 1: Standard JSON format after masking
    const res1 = tryFormat(masked);
    if (res1 !== null) return res1;

    // Attempt 2: Clean loose JSON syntax (single quotes, trailing commas, unquoted keys)
    const cleaned = masked
        .replace(SINGLE_QUOTE_REGEX, '"')
        .replace(TRAILING_COMMA_REGEX, '$1')
        .replace(UNQUOTED_KEY_REGEX, '$1"$2":');

    const res2 = tryFormat(cleaned);
    if (res2 !== null) return res2;

    // Attempt 3: URL or Query String
    if (raw.startsWith('http://') || raw.startsWith('https://') || (raw.includes('?') && raw.includes('=')) || (raw.includes('=') && raw.includes('&'))) {
        try {
            let queryString = raw;
            if (raw.includes('?')) {
                queryString = raw.split('?')[1] || '';
            }
            if (queryString) {
                const searchParams = new URLSearchParams(queryString);
                const paramsObj: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    paramsObj[key] = value;
                });
                if (Object.keys(paramsObj).length > 0) {
                    return JSON.stringify(paramsObj, null, 2);
                }
            }
        } catch { /* ignore */ }
    }

    // Attempt 4: URL decoding
    if (raw.includes('%')) {
        try {
            const decoded = decodeURIComponent(raw);
            if (decoded !== raw) {
                const res4 = tryFormat(decoded);
                if (res4 !== null) return res4;
            }
        } catch { /* ignore */ }
    }

    return null;
}
