import { randomUUID as uuidv4 } from 'crypto';
import {
    Collection,
    CollectionItem,
    RequestConfig,
    ImportFormat,
    ExportFormat,
    ImportResult,
    KeyValuePair,
    Environment,
    Variable,
} from '@api-platform/core';
import { createCollection, addCollectionItem } from './collection-service';
import { createEnvironment, updateEnvironment } from './environment-service';
import { extractScriptsFromEvents, buildPostmanEvents } from '@api-platform/core';

// ─── Import ──────────────────────────────────────────────────────

export function importData(content: string, format: ImportFormat, customName?: string): ImportResult {
    try {
        switch (format) {
            case 'postman-v2.1':
                return importPostmanV2(content, customName);
            case 'postman-env':
                return importPostmanEnv(content);
            case 'openapi':
                return importOpenAPI(content, customName);
            case 'curl':
                return importCurl(content, customName);
            default:
                return { success: false, errors: [`Unknown format: ${format}`] };
        }
    } catch (error: any) {
        return { success: false, errors: [error.message] };
    }
}

// ─── Postman Environment Import ────────────────────────────────────

function importPostmanEnv(content: string): ImportResult {
    let data;
    try {
        data = JSON.parse(content);
    } catch {
        return { success: false, errors: ['Invalid JSON format'] };
    }

    if (!data.name || !Array.isArray(data.values)) {
        return { success: false, errors: ['Invalid Postman environment format. Expected "name" and "values" array.'] };
    }

    const envName = data.name || 'Imported Environment';
    // createEnvironment will insert right away and return Environment object with a new ID
    const env = createEnvironment(envName);

    const variables: Variable[] = data.values.map((v: any) => ({
        id: uuidv4(),
        key: v.key || '',
        value: typeof v.value === 'string' ? v.value : String(v.value || ''),
        enabled: v.enabled !== false, // default to true
        secret: v.type === 'secret',
    }));

    // Update with variables
    env.variables = variables;
    updateEnvironment(env);

    return { success: true, environment: env };
}

// ─── Postman v2.1 Import ─────────────────────────────────────────

function importPostmanV2(content: string, customName?: string): ImportResult {
    const data = JSON.parse(content);

    if (!data.info || !data.item) {
        return { success: false, errors: ['Invalid Postman collection format'] };
    }

    // Extract collection-level scripts
    const collectionScripts = extractScriptsFromEvents(data.event);

    const collection = createCollection(
        customName || data.info.name || 'Imported Collection',
        data.info.description || '',
        collectionScripts.preRequestScript,
        collectionScripts.testScript
    );

    function processItems(items: any[], parentId: string | null) {
        for (const item of items) {
            if (item.item && Array.isArray(item.item)) {
                // It's a folder — extract folder-level scripts
                const folderScripts = extractScriptsFromEvents(item.event);
                const folder = addCollectionItem(collection.id, parentId, {
                    name: item.name || 'Folder',
                    type: 'folder',
                    parentId,
                    preRequestScript: folderScripts.preRequestScript,
                    testScript: folderScripts.testScript,
                });
                processItems(item.item, folder.id);
            } else if (item.request) {
                // It's a request — extract request-level scripts
                const req = convertPostmanRequest(item);
                addCollectionItem(collection.id, parentId, {
                    name: item.name || 'Request',
                    type: 'request',
                    parentId,
                    request: req,
                });
            }
        }
    }

    processItems(data.item, null);

    return { success: true, collection };
}

function convertPostmanRequest(item: any): RequestConfig {
    const req = item.request;
    let url = typeof req.url === 'string' ? req.url : (req.url?.raw || '');
    const method = (req.method || 'GET').toUpperCase();

    const headers: KeyValuePair[] = (req.header || []).map((h: any) => ({
        id: uuidv4(),
        key: h.key || '',
        value: h.value || '',
        enabled: !h.disabled,
    }));

    const params: KeyValuePair[] = [];
    if (req.url?.query) {
        // Postman structured query params
        for (const q of req.url.query) {
            params.push({
                id: uuidv4(),
                key: q.key || '',
                value: q.value || '',
                enabled: !q.disabled,
            });
        }
    }

    // If no structured query params were found, extract from raw URL string
    if (params.length === 0 && url.includes('?')) {
        const parsed = parseQueryParamsFromUrl(url);
        url = parsed.baseUrl;
        for (const p of parsed.params) {
            params.push(p);
        }
    } else if (params.length > 0 && url.includes('?')) {
        // Structured params exist — normalize URL to base only
        const qIdx = url.indexOf('?');
        url = url.slice(0, qIdx);
    }

    let bodyType: any = 'none';
    let raw = '';
    let formData: KeyValuePair[] = [];
    let urlencoded: KeyValuePair[] = [];

    if (req.body) {
        switch (req.body.mode) {
            case 'raw':
                raw = req.body.raw || '';
                if (req.body.options?.raw?.language === 'json') {
                    bodyType = 'json';
                } else if (req.body.options?.raw?.language === 'xml') {
                    bodyType = 'xml';
                } else {
                    bodyType = 'raw';
                }
                break;
            case 'formdata':
                bodyType = 'form-data';
                formData = (req.body.formdata || []).map((f: any) => ({
                    id: uuidv4(),
                    key: f.key || '',
                    value: f.value || '',
                    enabled: !f.disabled,
                }));
                break;
            case 'urlencoded':
                bodyType = 'x-www-form-urlencoded';
                urlencoded = (req.body.urlencoded || []).map((f: any) => ({
                    id: uuidv4(),
                    key: f.key || '',
                    value: f.value || '',
                    enabled: !f.disabled,
                }));
                break;
        }
    }

    // Extract request-level scripts from item.event
    const scripts = extractScriptsFromEvents(item.event);

    return {
        id: uuidv4(),
        method,
        url,
        params: params.length > 0 ? params : [{ id: uuidv4(), key: '', value: '', enabled: true }],
        headers: headers.length > 0 ? headers : [{ id: uuidv4(), key: '', value: '', enabled: true }],
        body: { type: bodyType, raw, formData, urlencoded },
        auth: { type: 'none' },
        preRequestScript: scripts.preRequestScript || undefined,
        testScript: scripts.testScript || undefined,
    };
}

// ─── OpenAPI / Swagger Import ────────────────────────────────────

function importOpenAPI(content: string, customName?: string): ImportResult {
    const data = JSON.parse(content);

    const title = customName || data.info?.title || 'Imported API';
    const description = data.info?.description || '';
    const basePath = data.servers?.[0]?.url || data.basePath || '';

    const collection = createCollection(title, description);

    const paths = data.paths || {};
    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods as any)) {
            if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
                const detail = details as any;
                const url = `${basePath}${path}`;

                const params: KeyValuePair[] = [];
                if (detail.parameters) {
                    for (const p of detail.parameters) {
                        if (p.in === 'query') {
                            params.push({
                                id: uuidv4(),
                                key: p.name || '',
                                value: '',
                                enabled: true,
                                description: p.description || '',
                            });
                        }
                    }
                }

                const request: RequestConfig = {
                    id: uuidv4(),
                    method: method.toUpperCase() as any,
                    url,
                    params: params.length > 0 ? params : [{ id: uuidv4(), key: '', value: '', enabled: true }],
                    headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
                    body: { type: 'none' },
                    auth: { type: 'none' },
                };

                addCollectionItem(collection.id, null, {
                    name: detail.summary || detail.operationId || `${method.toUpperCase()} ${path}`,
                    type: 'request',
                    parentId: null,
                    request,
                });
            }
        }
    }

    return { success: true, collection };
}

// ─── cURL Import ─────────────────────────────────────────────────

function importCurl(content: string, customName?: string): ImportResult {
    const trimmed = content.trim();
    if (!trimmed.startsWith('curl')) {
        return { success: false, errors: ['Input does not start with "curl"'] };
    }

    // Basic cURL parser
    let method = 'GET';
    let url = '';
    const headers: KeyValuePair[] = [];
    let bodyRaw = '';
    let bodyType: any = 'none';

    // Remove line continuations
    const clean = trimmed.replace(/\\\n\s*/g, ' ');
    const tokens = tokenize(clean);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === 'curl') continue;

        if (token === '-X' || token === '--request') {
            method = tokens[++i]?.toUpperCase() || 'GET';
        } else if (token === '-H' || token === '--header') {
            const header = tokens[++i] || '';
            const colonIdx = header.indexOf(':');
            if (colonIdx > 0) {
                headers.push({
                    id: uuidv4(),
                    key: header.substring(0, colonIdx).trim(),
                    value: header.substring(colonIdx + 1).trim(),
                    enabled: true,
                });
            }
        } else if (token === '-d' || token === '--data' || token === '--data-raw') {
            bodyRaw = tokens[++i] || '';
            if (!method || method === 'GET') method = 'POST';
            // Detect JSON
            try {
                JSON.parse(bodyRaw);
                bodyType = 'json';
            } catch {
                bodyType = 'raw';
            }
        } else if (token === '-u' || token === '--user') {
            const userPass = tokens[++i] || '';
            // Basic auth — add as header
            const encoded = Buffer.from(userPass).toString('base64');
            headers.push({
                id: uuidv4(),
                key: 'Authorization',
                value: `Basic ${encoded}`,
                enabled: true,
            });
        } else if (!token.startsWith('-') && !url) {
            url = token;
        }
    }

    if (!url) {
        return { success: false, errors: ['Could not parse URL from cURL command'] };
    }

    // Parse query params from URL
    const parsed = parseQueryParamsFromUrl(url);
    const params = parsed.params;
    const baseUrl = parsed.baseUrl;

    const collection = createCollection(customName || `cURL Import`);

    const request: RequestConfig = {
        id: uuidv4(),
        method: method as any,
        url: baseUrl,
        params: params.length > 0 ? params : [{ id: uuidv4(), key: '', value: '', enabled: true }],
        headers: headers.length > 0 ? headers : [{ id: uuidv4(), key: '', value: '', enabled: true }],
        body: { type: bodyType, raw: bodyRaw },
        auth: { type: 'none' },
    };

    addCollectionItem(collection.id, null, {
        name: `${method} ${baseUrl}`,
        type: 'request',
        parentId: null,
        request,
    });

    return { success: true, collection };
}

function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes: string | null = null;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];

        if (inQuotes) {
            if (ch === inQuotes) {
                inQuotes = null;
                tokens.push(current);
                current = '';
            } else {
                current += ch;
            }
        } else if (ch === "'" || ch === '"') {
            inQuotes = ch;
        } else if (ch === ' ' || ch === '\t') {
            if (current) {
                tokens.push(current);
                current = '';
            }
        } else {
            current += ch;
        }
    }

    if (current) tokens.push(current);
    return tokens;
}

/**
 * Parse query params from a URL string in the main process.
 * Handles {{variable}} placeholders safely (no new URL() which throws).
 * Returns the base URL and an array of KeyValuePair params.
 */
function parseQueryParamsFromUrl(url: string): { baseUrl: string; params: KeyValuePair[] } {
    if (!url) return { baseUrl: '', params: [] };

    const qIndex = url.indexOf('?');
    if (qIndex === -1) return { baseUrl: url, params: [] };

    const baseUrl = url.slice(0, qIndex);
    const queryString = url.slice(qIndex + 1);
    if (!queryString) return { baseUrl, params: [] };

    const params: KeyValuePair[] = [];
    const pairs = queryString.split('&');

    for (const pair of pairs) {
        if (!pair) continue;
        const eqIndex = pair.indexOf('=');
        let key: string;
        let value: string;

        if (eqIndex === -1) {
            key = safeDecodeComponent(pair);
            value = '';
        } else {
            key = safeDecodeComponent(pair.slice(0, eqIndex));
            value = safeDecodeComponent(pair.slice(eqIndex + 1));
        }

        params.push({ id: uuidv4(), key, value, enabled: true });
    }

    return { baseUrl, params };
}

/**
 * Safely decode a URI component, preserving {{variable}} placeholders.
 * Returns original string if decoding fails.
 */
function safeDecodeComponent(str: string): string {
    try {
        // Preserve {{variable}} placeholders during decoding
        const regex = /(\{\{[^{}]+\}\})/g;
        const parts: string[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(str)) !== null) {
            if (match.index > lastIndex) {
                parts.push(decodeURIComponent(str.slice(lastIndex, match.index)));
            }
            parts.push(match[1]);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < str.length) {
            parts.push(decodeURIComponent(str.slice(lastIndex)));
        }

        return parts.join('');
    } catch {
        return str;
    }
}

// ─── Export ──────────────────────────────────────────────────────

export function exportCollection(collection: Collection, format: ExportFormat): string {
    switch (format) {
        case 'postman-v2.1':
            return exportPostmanV2(collection);
        case 'json':
            return JSON.stringify(collection, null, 2);
        default:
            throw new Error(`Unknown export format: ${format}`);
    }
}

function exportPostmanV2(collection: Collection): string {
    function buildItems(items: CollectionItem[], allItems: CollectionItem[]): any[] {
        const roots = items.filter(i => i.parentId === null);
        return roots.map(item => buildPostmanItem(item, allItems));
    }

    function buildPostmanItem(item: CollectionItem, allItems: CollectionItem[]): any {
        if (item.type === 'folder') {
            const children = allItems.filter(i => i.parentId === item.id);
            const folderObj: any = {
                name: item.name,
                item: children.map(c => buildPostmanItem(c, allItems)),
            };
            // Add folder-level scripts
            const folderEvents = buildPostmanEvents(item.preRequestScript, item.testScript);
            if (folderEvents) folderObj.event = folderEvents;
            return folderObj;
        }

        // Request item
        const req = item.request;
        if (!req) return { name: item.name };

        const requestObj: any = {
            name: item.name,
            request: {
                method: req.method,
                header: req.headers
                    .filter(h => h.key)
                    .map(h => ({ key: h.key, value: h.value, disabled: !h.enabled })),
                url: {
                    raw: req.url,
                    query: req.params
                        .filter(p => p.key)
                        .map(p => ({ key: p.key, value: p.value, disabled: !p.enabled })),
                },
                body: req.body.type !== 'none' ? {
                    mode: req.body.type === 'json' || req.body.type === 'xml' || req.body.type === 'raw' ? 'raw' :
                        req.body.type === 'form-data' ? 'formdata' :
                            req.body.type === 'x-www-form-urlencoded' ? 'urlencoded' : 'raw',
                    raw: req.body.raw || undefined,
                    options: req.body.type === 'json' ? { raw: { language: 'json' } } :
                        req.body.type === 'xml' ? { raw: { language: 'xml' } } : undefined,
                    formdata: req.body.formData?.filter(f => f.key).map(f => ({
                        key: f.key, value: f.value, disabled: !f.enabled,
                    })),
                    urlencoded: req.body.urlencoded?.filter(f => f.key).map(f => ({
                        key: f.key, value: f.value, disabled: !f.enabled,
                    })),
                } : undefined,
            },
        };

        // Add request-level scripts
        const requestEvents = buildPostmanEvents(req.preRequestScript, req.testScript);
        if (requestEvents) requestObj.event = requestEvents;

        return requestObj;
    }

    const output: any = {
        info: {
            name: collection.name,
            description: collection.description || '',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: buildItems(collection.items, collection.items),
    };

    // Add collection-level scripts
    const collectionEvents = buildPostmanEvents(collection.preRequestScript, collection.testScript);
    if (collectionEvents) output.event = collectionEvents;

    return JSON.stringify(output, null, 2);
}
