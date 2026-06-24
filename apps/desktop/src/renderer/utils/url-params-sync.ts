/**
 * URL ↔ Params bidirectional sync engine.
 * Handles encoding, special characters, unicode, and preserves param order.
 */
import { v4 as uuidv4 } from 'uuid';
import { KeyValuePair, RequestConfig } from '@api-platform/core';

/**
 * Parse a URL string and extract query parameters as KeyValuePair[].
 * Returns the base URL (without query string) and parsed params.
 */
export function parseUrlParams(url: string): { baseUrl: string; params: KeyValuePair[] } {
    if (!url) {
        return { baseUrl: '', params: [] };
    }

    // Find the query string separator
    const qIndex = url.indexOf('?');

    if (qIndex === -1) {
        return { baseUrl: url, params: [] };
    }

    const baseUrl = url.slice(0, qIndex);
    const queryString = url.slice(qIndex + 1);

    if (!queryString) {
        return { baseUrl, params: [] };
    }

    const params: KeyValuePair[] = [];
    const pairs = queryString.split('&');

    for (const pair of pairs) {
        if (!pair) continue;

        const eqIndex = pair.indexOf('=');
        let key: string;
        let value: string;

        if (eqIndex === -1) {
            key = safeDecodeURIComponent(pair);
            value = '';
        } else {
            key = safeDecodeURIComponent(pair.slice(0, eqIndex));
            value = safeDecodeURIComponent(pair.slice(eqIndex + 1));
        }

        params.push({
            id: uuidv4(),
            key,
            value,
            enabled: true,
        });
    }

    return { baseUrl, params };
}

/**
 * Build a URL from a base URL and params array.
 * Only enabled params with non-empty keys are included.
 */
export function buildUrlFromParams(baseUrl: string, params: KeyValuePair[]): string {
    const enabledParams = params.filter(p => p.enabled && p.key.trim());

    if (enabledParams.length === 0) {
        return baseUrl;
    }

    const queryParts = enabledParams.map(p => {
        const encodedKey = safeEncodeURIComponent(p.key);
        const encodedValue = safeEncodeURIComponent(p.value);
        return p.value ? `${encodedKey}=${encodedValue}` : encodedKey;
    });

    return `${baseUrl}?${queryParts.join('&')}`;
}

/**
 * Merge new params parsed from URL with existing params,
 * preserving IDs and disabled params.
 * This allows the params table to update smoothly without losing state.
 */
export function mergeParamsFromUrl(
    existingParams: KeyValuePair[],
    newParams: KeyValuePair[]
): KeyValuePair[] {
    // Keep disabled params (they are user-managed and not in URL)
    const disabledParams = existingParams.filter(p => !p.enabled);

    // Map new params, preserving existing IDs where key matches
    const merged: KeyValuePair[] = newParams.map((np, idx) => {
        // Try to find a matching existing param at the same position
        const existing = existingParams.find(
            (ep, ei) => ep.enabled && ep.key === np.key && ei === idx
        );
        if (existing) {
            return { ...existing, value: np.value };
        }
        return np;
    });

    return [...merged, ...disabledParams];
}

/**
 * Extract the base URL (without query string) from a full URL.
 */
export function getBaseUrl(url: string): string {
    const qIndex = url.indexOf('?');
    return qIndex === -1 ? url : url.slice(0, qIndex);
}

/**
 * Normalize a RequestConfig by extracting query params from the URL
 * into the params array. This is the safety net for all import paths:
 * even if an importer forgets to extract params, this will do it.
 *
 * - Extracts query params from URL using the safe parser (handles {{variables}})
 * - Merges extracted params with any existing params (dedup by key+value)
 * - Sets URL to base URL only (no query string)
 * - Always ensures at least one empty row for editor convenience
 *
 * Returns a new RequestConfig (does not mutate the input).
 */
export function normalizeRequestParams(request: RequestConfig): RequestConfig {
    const { baseUrl, params: urlParams } = parseUrlParams(request.url);

    // If no params in URL, nothing to normalize
    if (urlParams.length === 0) {
        return request;
    }

    // Merge: existing params (from importer) + URL params (dedup)
    const existingReal = (request.params || []).filter(p => p.key);
    const existingKeys = new Set(existingReal.map(p => `${p.key}=${p.value}`));

    const merged: KeyValuePair[] = [...existingReal];
    for (const up of urlParams) {
        const signature = `${up.key}=${up.value}`;
        if (!existingKeys.has(signature)) {
            merged.push(up);
            existingKeys.add(signature);
        }
    }

    // Ensure at least one empty row for editor convenience
    const hasEmptyRow = merged.some(p => !p.key && !p.value);
    if (!hasEmptyRow) {
        merged.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    return {
        ...request,
        url: baseUrl,
        params: merged,
    };
}

/**
 * Safely decode a URI component, returning the original string
 * if decoding fails (malformed encoding). Preserves {{variable}}
 * placeholders that should not be decoded.
 */
function safeDecodeURIComponent(str: string): string {
    try {
        // Preserve {{variable}} placeholders during decoding
        const regex = /(\{\{[^{}]+\}\})/g;
        const parts: string[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(str)) !== null) {
            if (match.index > lastIndex) {
                parts.push(decodeURIComponent(str.slice(lastIndex, match.index).replace(/\+/g, ' ')));
            }
            parts.push(match[1]);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < str.length) {
            parts.push(decodeURIComponent(str.slice(lastIndex).replace(/\+/g, ' ')));
        }

        return parts.join('');
    } catch {
        return str;
    }
}

/**
 * Safely encode a URI component, preserving some common characters
 * that are safe in query strings. Also preserves {{variable}} placeholders
 * so they survive URL sync and can be interpolated later.
 */
function safeEncodeURIComponent(str: string): string {
    // Preserve {{variable}} placeholders during encoding
    // Split into variable segments and text segments
    const parts: string[] = [];
    const regex = /(\{\{[^{}]+\}\})/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
        // Encode the text before this variable
        if (match.index > lastIndex) {
            parts.push(encodeNonVariable(str.slice(lastIndex, match.index)));
        }
        // Keep the variable placeholder as-is
        parts.push(match[1]);
        lastIndex = match.index + match[0].length;
    }

    // Encode any remaining text after the last variable
    if (lastIndex < str.length) {
        parts.push(encodeNonVariable(str.slice(lastIndex)));
    }

    return parts.join('');
}

/**
 * Encode a non-variable text segment for use in query strings.
 */
function encodeNonVariable(str: string): string {
    return encodeURIComponent(str)
        .replace(/%20/g, '+')
        .replace(/%2C/gi, ',')
        .replace(/%3A/gi, ':')
        .replace(/%40/gi, '@');
}
