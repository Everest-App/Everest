"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolateVariables = interpolateVariables;
exports.interpolateRequestConfig = interpolateRequestConfig;
function interpolateVariables(input, globalVars, environmentVars, collectionVars) {
    if (!input || typeof input !== 'string')
        return input;
    const varMap = new Map();
    for (const v of globalVars) {
        if (v.enabled && v.key)
            varMap.set(v.key, v.value);
    }
    for (const v of collectionVars) {
        if (v.enabled && v.key)
            varMap.set(v.key, v.value);
    }
    for (const v of environmentVars) {
        if (v.enabled && v.key)
            varMap.set(v.key, v.value);
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
                return varMap.get(key);
            }
            return match;
        });
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
function interpolateRequestConfig(config, globalVars, environmentVars, collectionVars) {
    const interpolate = (val) => interpolateVariables(val, globalVars, environmentVars, collectionVars);
    return {
        ...config,
        url: interpolate(config.url || ''),
        params: (config.params || []).map((p) => ({
            ...p,
            key: interpolate(p.key || ''),
            value: interpolate(p.value || ''),
        })),
        headers: (config.headers || []).map((h) => ({
            ...h,
            key: interpolate(h.key || ''),
            value: interpolate(h.value || ''),
        })),
        body: {
            ...config.body,
            raw: config.body?.raw ? interpolate(config.body.raw) : config.body?.raw,
            formData: (config.body?.formData || []).map((f) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
            urlencoded: (config.body?.urlencoded || []).map((f) => ({
                ...f,
                key: interpolate(f.key || ''),
                value: interpolate(f.value || ''),
            })),
        },
        auth: {
            ...config.auth,
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
