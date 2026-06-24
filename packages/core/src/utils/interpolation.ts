import { Variable } from '../types';

/**
 * Resolve all {{variable}} placeholders in a string.
 * Priority: environment > collection > global (same as Postman).
 * Supports recursive variable interpolation up to a depth of 5.
 */
export function interpolateVariables(
    input: string,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[]
): string {
    if (!input || typeof input !== 'string') return input;

    // Build combined variable map with priority
    const varMap = new Map<string, string>();

    // Global (lowest priority)
    for (const v of globalVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }
    // Collection
    for (const v of collectionVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }
    // Environment (highest priority)
    for (const v of environmentVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }

    let result = input;
    let depth = 0;
    const MAX_DEPTH = 5;
    const regex = /\{\{([\w.-]+)\}\}/g;

    while (depth < MAX_DEPTH) {
        let hasReplacements = false;
        
        result = result.replace(regex, (match, key) => {
            if (varMap.has(key)) {
                hasReplacements = true;
                return varMap.get(key)!;
            }
            // Keep original if not found
            return match;
        });

        // If no variables were found or replaced in this pass, we are done.
        if (!hasReplacements) {
            break;
        }
        
        depth++;
    }

    if (depth === MAX_DEPTH) {
        console.warn(`Max interpolation depth (${MAX_DEPTH}) reached. Possible circular reference in: ${input}`);
    }

    return result;
}

/**
 * Interpolate all fields in a RequestConfig.
 * Returns a new config with all variables resolved.
 */
export function interpolateRequestConfig(
    config: any,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[]
): any {
    const interpolate = (val: string) =>
        interpolateVariables(val, globalVars, environmentVars, collectionVars);

    return {
        ...config,
        url: interpolate(config.url || ''),
        params: (config.params || []).map((p: any) => ({
            ...p,
            key: interpolate(p.key || ''),
            value: interpolate(p.value || ''),
        })),
        headers: (config.headers || []).map((h: any) => ({
            ...h,
            key: interpolate(h.key || ''),
            value: interpolate(h.value || ''),
        })),
        body: {
            ...config.body,
            raw: config.body?.raw ? interpolate(config.body.raw) : config.body?.raw,
            formData: (config.body?.formData || []).map((f: any) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
            urlencoded: (config.body?.urlencoded || []).map((f: any) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
        },
        auth: {
            ...config.auth,
            // Basic auth
            ...(config.auth?.basic ? {
                basic: {
                    username: interpolate(config.auth.basic.username || ''),
                    password: interpolate(config.auth.basic.password || ''),
                }
            } : {}),
            // Only update token for bearer if it exists
            ...(config.auth?.bearer ? {
                bearer: { token: interpolate(config.auth.bearer.token || '') }
            } : {}),
            // Only update API key details if present
            ...(config.auth?.apiKey ? {
                apiKey: {
                    ...config.auth.apiKey,
                    key: interpolate(config.auth.apiKey.key || ''),
                    value: interpolate(config.auth.apiKey.value || ''),
                }
            } : {}),
        },
    };
}

/**
 * Warning for an unresolved variable placeholder.
 */
export interface InterpolationWarning {
    variable: string;
    message: string;
}

/**
 * Resolve all {{variable}} placeholders in a string and collect warnings
 * for any variables that could not be resolved.
 */
export function interpolateWithWarnings(
    input: string,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[]
): { result: string; warnings: InterpolationWarning[] } {
    if (!input || typeof input !== 'string') return { result: input, warnings: [] };

    // Build combined variable map with priority
    const varMap = new Map<string, string>();

    // Global (lowest priority)
    for (const v of globalVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }
    // Collection
    for (const v of collectionVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }
    // Environment (highest priority)
    for (const v of environmentVars) {
        if (v.enabled && v.key) varMap.set(v.key, v.value);
    }

    let result = input;
    let depth = 0;
    const MAX_DEPTH = 5;
    const regex = /\{\{([\w.-]+)\}\}/g;
    const warnings: InterpolationWarning[] = [];
    const warnedVars = new Set<string>();

    while (depth < MAX_DEPTH) {
        let hasReplacements = false;

        result = result.replace(regex, (match, key) => {
            if (varMap.has(key)) {
                hasReplacements = true;
                return varMap.get(key)!;
            }
            // Track unresolved variable (warn once per name)
            if (!warnedVars.has(key)) {
                warnedVars.add(key);
                warnings.push({
                    variable: key,
                    message: `Environment variable not found: ${key}`,
                });
            }
            return match;
        });

        if (!hasReplacements) break;
        depth++;
    }

    if (depth === MAX_DEPTH) {
        console.warn(`Max interpolation depth (${MAX_DEPTH}) reached. Possible circular reference in: ${input}`);
    }

    return { result, warnings };
}

/**
 * Convenience alias: interpolate a single string value.
 * Same as interpolateVariables but with a clearer name for external use.
 */
export function interpolateString(
    input: string,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[]
): string {
    return interpolateVariables(input, globalVars, environmentVars, collectionVars);
}

/**
 * Interpolate all {{variable}} placeholders in a string, with an additional
 * overrides map that takes the **highest** priority (above environment vars).
 * Used for CSV data row variables in the Collection Runner.
 */
export function interpolateStringWithOverrides(
    input: string,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[],
    overrides: Record<string, string>
): string {
    if (!input || typeof input !== 'string') return input;

    // Convert overrides to synthetic Variable entries so we can reuse the
    // existing interpolation engine. We add them *after* environment vars
    // in a separate pass that takes highest priority.
    const overrideVars: Variable[] = Object.entries(overrides).map(([key, value]) => ({
        id: `csv-${key}`,
        key,
        value,
        enabled: true,
    }));

    // Build a combined variable list. The engine processes in this order
    // (last write wins inside the Map): global → collection → env → overrides
    return interpolateVariables(input, globalVars, [...environmentVars, ...overrideVars], collectionVars);
}

/**
 * Like interpolateRequestConfig but accepts an additional overrides map
 * that takes the **highest** priority (used for CSV data row variables).
 * Priority: overrides > environment > collection > global
 */
export function interpolateRequestConfigWithOverrides(
    config: any,
    globalVars: Variable[],
    environmentVars: Variable[],
    collectionVars: Variable[],
    overrides: Record<string, string>
): any {
    const interpolate = (val: string) =>
        interpolateStringWithOverrides(val, globalVars, environmentVars, collectionVars, overrides);

    return {
        ...config,
        url: interpolate(config.url || ''),
        params: (config.params || []).map((p: any) => ({
            ...p,
            key: interpolate(p.key || ''),
            value: interpolate(p.value || ''),
        })),
        headers: (config.headers || []).map((h: any) => ({
            ...h,
            key: interpolate(h.key || ''),
            value: interpolate(h.value || ''),
        })),
        body: {
            ...config.body,
            raw: config.body?.raw ? interpolate(config.body.raw) : config.body?.raw,
            formData: (config.body?.formData || []).map((f: any) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
            urlencoded: (config.body?.urlencoded || []).map((f: any) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
        },
        auth: {
            ...config.auth,
            ...(config.auth?.basic ? {
                basic: {
                    username: interpolate(config.auth.basic.username || ''),
                    password: interpolate(config.auth.basic.password || ''),
                }
            } : {}),
            ...(config.auth?.bearer ? {
                bearer: { token: interpolate(config.auth.bearer.token || '') }
            } : {}),
            ...(config.auth?.apiKey ? {
                apiKey: {
                    ...config.auth.apiKey,
                    key: interpolate(config.auth.apiKey.key || ''),
                    value: interpolate(config.auth.apiKey.value || ''),
                }
            } : {}),
        },
    };
}
