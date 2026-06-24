import * as vm from 'vm';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
    PluginManifest,
    PluginInfo,
    PluginHookType,
    PluginHookResult,
    RequestConfig,
    ResponseData,
} from '@api-platform/core';

const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins');

// In-memory plugin state
interface PluginState {
    manifest: PluginManifest;
    enabled: boolean;
    settings: Record<string, any>;
    code: string;
}

const plugins = new Map<string, PluginState>();

// Ensure plugins directory exists
function ensurePluginsDir(): void {
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }
}

function getPluginPath(id: string): string {
    return path.join(PLUGINS_DIR, `${id}.json`);
}

// ─── Public API ─────────────────────────────────────────────

export function loadPlugins(): void {
    ensurePluginsDir();
    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, file), 'utf-8'));
            plugins.set(data.manifest.id, {
                manifest: data.manifest,
                enabled: data.enabled ?? false,
                settings: data.settings ?? {},
                code: data.code ?? '',
            });
        } catch {
            // Skip corrupted plugin files
        }
    }
}

export function getAllPlugins(): PluginInfo[] {
    return Array.from(plugins.values()).map(p => ({
        manifest: p.manifest,
        enabled: p.enabled,
        installed: true,
        settingsValues: p.settings,
    }));
}

export function installPlugin(manifest: PluginManifest, code: string): void {
    ensurePluginsDir();
    const state: PluginState = {
        manifest,
        enabled: true,
        settings: Object.fromEntries(
            (manifest.settings || []).map(s => [s.key, s.default])
        ),
        code,
    };
    plugins.set(manifest.id, state);
    savePlugin(manifest.id);
}

export function uninstallPlugin(id: string): void {
    plugins.delete(id);
    const filePath = getPluginPath(id);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

export function enablePlugin(id: string): void {
    const plugin = plugins.get(id);
    if (plugin) {
        plugin.enabled = true;
        savePlugin(id);
    }
}

export function disablePlugin(id: string): void {
    const plugin = plugins.get(id);
    if (plugin) {
        plugin.enabled = false;
        savePlugin(id);
    }
}

export function updatePluginSettings(id: string, settings: Record<string, any>): void {
    const plugin = plugins.get(id);
    if (plugin) {
        plugin.settings = { ...plugin.settings, ...settings };
        savePlugin(id);
    }
}

function savePlugin(id: string): void {
    ensurePluginsDir();
    const plugin = plugins.get(id);
    if (!plugin) return;
    fs.writeFileSync(
        getPluginPath(id),
        JSON.stringify({
            manifest: plugin.manifest,
            enabled: plugin.enabled,
            settings: plugin.settings,
            code: plugin.code,
        }, null, 2),
    );
}

// ─── Hook execution ─────────────────────────────────────────

export function runHook(
    hookType: PluginHookType,
    data: { request?: RequestConfig; response?: ResponseData },
    settings?: Record<string, any>,
): PluginHookResult {
    const enabledPlugins = Array.from(plugins.values())
        .filter(p => p.enabled && p.manifest.hooks.includes(hookType));

    if (enabledPlugins.length === 0) {
        return { modified: false };
    }

    let currentData = { ...data };
    const allLogs: string[] = [];
    let wasModified = false;

    for (const plugin of enabledPlugins) {
        try {
            const logs: string[] = [];
            const sandbox = {
                request: currentData.request ? { ...currentData.request } : undefined,
                response: currentData.response ? { ...currentData.response } : undefined,
                settings: { ...plugin.settings },
                console: {
                    log: (...args: any[]) => logs.push(args.map(String).join(' ')),
                    warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
                    error: (...args: any[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
                },
                modified: false,
                require: undefined,
                process: undefined,
            };

            // Use runInNewContext: creates a temporary context that's released
            // more efficiently than persistent vm.createContext contexts
            vm.runInNewContext(plugin.code, sandbox, {
                timeout: 3000,
                filename: `plugin-${plugin.manifest.id}.js`,
            });

            if (sandbox.modified) {
                wasModified = true;
                if (sandbox.request) currentData.request = sandbox.request as RequestConfig;
                if (sandbox.response) currentData.response = sandbox.response as ResponseData;
            }

            allLogs.push(...logs.map(l => `[${plugin.manifest.name}] ${l}`));
        } catch (err: any) {
            allLogs.push(`[${plugin.manifest.name}] Error: ${err.message}`);
        }
    }

    return {
        modified: wasModified,
        data: currentData,
        logs: allLogs.length > 0 ? allLogs : undefined,
    };
}

// ─── Built-in plugin catalog ────────────────────────────────

export function getPluginCatalog(): PluginManifest[] {
    return [
        {
            id: 'plugin-timestamp-header',
            name: 'Timestamp Header',
            version: '1.0.0',
            description: 'Automatically adds an X-Timestamp header with the current UTC time to every request.',
            author: 'API Platform',
            category: 'utility',
            hooks: ['pre-request'],
            settings: [
                { key: 'headerName', label: 'Header Name', type: 'string', default: 'X-Timestamp', description: 'Name of the timestamp header' },
                { key: 'format', label: 'Format', type: 'select', default: 'iso', options: ['iso', 'unix', 'unix-ms'], description: 'Timestamp format' },
            ],
        },
        {
            id: 'plugin-response-time-check',
            name: 'Response Time Guard',
            version: '1.0.0',
            description: 'Warns in the console if response time exceeds a threshold.',
            author: 'API Platform',
            category: 'testing',
            hooks: ['post-response'],
            settings: [
                { key: 'threshold', label: 'Threshold (ms)', type: 'number', default: 2000, description: 'Max acceptable response time' },
            ],
        },
        {
            id: 'plugin-json-formatter',
            name: 'JSON Body Formatter',
            version: '1.0.0',
            description: 'Automatically formats/prettifies JSON request bodies before sending.',
            author: 'API Platform',
            category: 'transform',
            hooks: ['request-transform'],
        },
        {
            id: 'plugin-auth-refresh',
            name: 'Auto Auth Header',
            version: '1.0.0',
            description: 'Adds a configurable Authorization header to every request.',
            author: 'API Platform',
            category: 'auth',
            hooks: ['pre-request'],
            settings: [
                { key: 'scheme', label: 'Scheme', type: 'select', default: 'Bearer', options: ['Bearer', 'Basic', 'Token'], description: 'Auth scheme prefix' },
                { key: 'token', label: 'Token', type: 'string', default: '', description: 'Auth token value' },
            ],
        },
        {
            id: 'plugin-correlation-id',
            name: 'Correlation ID',
            version: '1.0.0',
            description: 'Adds a unique X-Correlation-ID header to every request for tracing.',
            author: 'API Platform',
            category: 'utility',
            hooks: ['pre-request'],
        },
        {
            id: 'plugin-response-size-warn',
            name: 'Response Size Monitor',
            version: '1.0.0',
            description: 'Logs a warning when response body exceeds a configurable size limit.',
            author: 'API Platform',
            category: 'testing',
            hooks: ['post-response'],
            settings: [
                { key: 'maxSizeKB', label: 'Max Size (KB)', type: 'number', default: 500, description: 'Max response size before warning' },
            ],
        },
    ];
}

// Default code for catalog plugins
export function getPluginDefaultCode(id: string): string {
    const codeMap: Record<string, string> = {
        'plugin-timestamp-header': `
// Add timestamp header to request
if (request) {
  const ts = settings.format === 'unix' ? Math.floor(Date.now() / 1000).toString()
           : settings.format === 'unix-ms' ? Date.now().toString()
           : new Date().toISOString();
  const headerName = settings.headerName || 'X-Timestamp';
  request.headers = [...(request.headers || []), { id: 'ts-plugin', key: headerName, value: ts, enabled: true }];
  modified = true;
}`,
        'plugin-response-time-check': `
// Check response time against threshold
if (response && response.time > (settings.threshold || 2000)) {
  console.warn('Response time ' + response.time + 'ms exceeds threshold of ' + settings.threshold + 'ms');
}`,
        'plugin-json-formatter': `
// Auto-format JSON body
if (request && request.body && request.body.type === 'json' && request.body.raw) {
  try {
    request.body.raw = JSON.stringify(JSON.parse(request.body.raw), null, 2);
    modified = true;
  } catch (e) { /* not valid JSON, skip */ }
}`,
        'plugin-auth-refresh': `
// Add authorization header
if (request && settings.token) {
  const value = (settings.scheme || 'Bearer') + ' ' + settings.token;
  request.headers = [...(request.headers || []), { id: 'auth-plugin', key: 'Authorization', value: value, enabled: true }];
  modified = true;
}`,
        'plugin-correlation-id': `
// Add correlation ID header
if (request) {
  const id = 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
  request.headers = [...(request.headers || []), { id: 'corr-plugin', key: 'X-Correlation-ID', value: id, enabled: true }];
  modified = true;
}`,
        'plugin-response-size-warn': `
// Monitor response size
if (response) {
  const sizeKB = response.size / 1024;
  if (sizeKB > (settings.maxSizeKB || 500)) {
    console.warn('Response size ' + sizeKB.toFixed(1) + 'KB exceeds limit of ' + settings.maxSizeKB + 'KB');
  }
}`,
    };
    return codeMap[id] || '// Plugin code';
}
