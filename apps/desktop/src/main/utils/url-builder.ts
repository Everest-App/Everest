/**
 * Centralized URL builder — the SINGLE SOURCE OF TRUTH for final URL
 * construction before HTTP execution and code/cURL generation.
 *
 * Problem it solves:
 *   The frontend URL↔Params sync embeds query params into `config.url`.
 *   When the backend then appends `config.params` to that URL, every
 *   param appears twice.
 *
 * Solution:
 *   1. Strip any existing query params from `config.url` (extract base).
 *   2. Use `config.params` as the canonical list of query parameters.
 *   3. Merge: any URL-embedded param NOT already in `config.params` is
 *      preserved (handles edge cases like manually-typed URLs).
 *   4. Serialize the final URL exactly once.
 */

import { RequestConfig, KeyValuePair } from '@api-platform/core';

/**
 * Build the final request URL from a RequestConfig.
 *
 * This function is the ONLY place where query parameters should be
 * appended to a URL. All other code (request-engine, codegen-service,
 * runner-service) must call this instead of building their own URL.
 *
 * @param config  The full RequestConfig (needs `.url` and `.params`).
 * @returns       The fully-qualified URL with deduplicated query params.
 */
export function buildFinalUrl(config: RequestConfig): string {
    let { url, params } = config;
    if (!url) return '';

    // ── 1. Separate base URL from any inline query string ────────
    const qIndex = url.indexOf('?');
    let baseUrl = qIndex === -1 ? url : url.slice(0, qIndex);
    const inlineQuery = qIndex === -1 ? '' : url.slice(qIndex + 1);

    // ── 2. Parse inline query params (if any) ────────────────────
    const inlineParams: { key: string; value: string }[] = [];
    if (inlineQuery) {
        for (const pair of inlineQuery.split('&')) {
            if (!pair) continue;
            const eqIdx = pair.indexOf('=');
            if (eqIdx === -1) {
                inlineParams.push({ key: pair, value: '' });
            } else {
                inlineParams.push({
                    key: pair.slice(0, eqIdx),
                    value: pair.slice(eqIdx + 1),
                });
            }
        }
    }

    // ── 3. Collect enabled params from the params table ──────────
    const enabledParams = (params || []).filter(
        (p: KeyValuePair) => p.enabled && p.key
    );

    // ── 4. Merge: config.params is authoritative. ────────────────
    //    Any inline param whose key already exists in config.params
    //    is dropped (config.params wins). This prevents duplication.
    const paramKeys = new Set(
        enabledParams.map((p: KeyValuePair) => encodeURIComponent(p.key))
    );

    // Inline params that are NOT already covered by config.params
    const extraInline = inlineParams.filter(ip => !paramKeys.has(ip.key));

    // ── 5. Build final query string ──────────────────────────────
    const allParts: string[] = [];

    // First: extra inline params (preserve original encoding)
    for (const ip of extraInline) {
        allParts.push(ip.value ? `${ip.key}=${ip.value}` : ip.key);
    }

    // Then: config.params (encode fresh)
    for (const p of enabledParams) {
        const ek = encodeURIComponent(p.key);
        const ev = encodeURIComponent(p.value);
        allParts.push(p.value ? `${ek}=${ev}` : ek);
    }

    // ── 6. Assemble URL ──────────────────────────────────────────
    let finalUrl = baseUrl;
    if (allParts.length > 0) {
        finalUrl += '?' + allParts.join('&');
    }

    // ── 7. Ensure protocol ───────────────────────────────────────
    if (finalUrl && !finalUrl.match(/^https?:\/\//i)) {
        finalUrl = `http://${finalUrl}`;
    }

    return finalUrl;
}
