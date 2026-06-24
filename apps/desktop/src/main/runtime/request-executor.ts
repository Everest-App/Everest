import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RequestConfig, ResponseData, CookieJar } from '@api-platform/core';
import { buildFinalUrl } from '../utils/url-builder';
import * as http from 'http';
import * as https from 'https';

export interface ExecutorOptions {
    cookieJar?: CookieJar;
    timeoutMs?: number;
    followRedirects?: boolean;
    signal?: AbortSignal;
}

export class RequestExecutor {
    // Shared agents to avoid creating new ones per request (prevents socket leaks)
    private static httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5 });
    private static httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, rejectUnauthorized: false });

    // Active abort controller for the current request (single-request mode)
    private currentAbortController: AbortController | null = null;

    /**
     * Abort the currently running request (if any).
     */
    public abort(): void {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }

    /**
     * Destroy shared agents to release all open sockets.
     * Call this on app quit.
     */
    public static destroyAgents(): void {
        RequestExecutor.httpAgent.destroy();
        RequestExecutor.httpsAgent.destroy();
    }

    public async execute(config: RequestConfig, options: ExecutorOptions = {}): Promise<ResponseData> {
        const url = buildFinalUrl(config);
        const method = config.method;

        // Build headers
        const headers: Record<string, string> = {};
        for (const h of config.headers) {
            if (h.enabled && h.key) {
                headers[h.key] = h.value;
            }
        }

        // Apply Auth
        if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
            headers['Authorization'] = `Bearer ${config.auth.bearer.token}`;
        } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
            const up = `${config.auth.basic.username}:${config.auth.basic.password || ''}`;
            headers['Authorization'] = `Basic ${Buffer.from(up).toString('base64')}`;
        } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
            if (config.auth.apiKey.addTo === 'header') {
                headers[config.auth.apiKey.key] = config.auth.apiKey.value || '';
            }
        }

        // Append cookies from Jar
        if (options.cookieJar) {
            const cookies = options.cookieJar.getAll(url);
            if (cookies.length > 0) {
                const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                if (headers['Cookie']) {
                    headers['Cookie'] += `; ${cookieStr}`;
                } else {
                    headers['Cookie'] = cookieStr;
                }
            }
        }

        // Build Data
        let data: any = undefined;
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            if (config.body.type === 'json' && config.body.raw) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/json';
                data = config.body.raw;
            } else if (config.body.type === 'xml' && config.body.raw) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/xml';
                data = config.body.raw;
            } else if (config.body.type === 'raw' && config.body.raw) {
                data = config.body.raw;
            } else if (config.body.type === 'form-data' && config.body.formData) {
                // Not perfectly supported without FormData polyfill in node, but using URLSearchParams as simple shim for text
                // Advanced form-data requires form-data package
                const params = new URLSearchParams();
                for (const f of config.body.formData.filter(f => f.enabled && f.key)) {
                    params.append(f.key, f.value);
                }
                data = params;
            } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
                headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
                const params = new URLSearchParams();
                for (const f of config.body.urlencoded.filter(f => f.enabled && f.key)) {
                    params.append(f.key, f.value);
                }
                data = params;
            }
        }

        const startTime = performance.now();
        let endTime = 0;
        let responseSize = 0;

        // Create a new AbortController for this request.
        // If an external signal is provided, we tie them together.
        const localController = new AbortController();
        this.currentAbortController = localController;

        // If caller passed an external signal (e.g. from CollectionRunner), forward it
        if (options.signal) {
            options.signal.addEventListener('abort', () => localController.abort(), { once: true });
        }

        const axiosConfig: AxiosRequestConfig = {
            url,
            method,
            headers,
            data,
            timeout: options.timeoutMs || 0, // 0 = no timeout
            maxRedirects: options.followRedirects === false ? 0 : 5,
            validateStatus: () => true, // Don't throw on 4xx/5xx
            signal: localController.signal,
            transformResponse: [
                (data, headers) => {
                    // Measure size before parsing
                    responseSize = data ? Buffer.byteLength(data, 'utf8') : 0;
                    return data;
                }
            ],
            // Reuse shared agents (prevents socket leaks from per-request Agent creation)
            httpAgent: RequestExecutor.httpAgent,
            httpsAgent: RequestExecutor.httpsAgent,
        };

        try {
            const axiosResponse = await axios.request(axiosConfig);
            endTime = performance.now();
            this.currentAbortController = null;

            // Extract set-cookies into Jar
            if (options.cookieJar && axiosResponse.headers['set-cookie']) {
                const setCookies = axiosResponse.headers['set-cookie'];
                for (const cookieStr of setCookies) {
                    this.parseAndSetCookie(url, cookieStr, options.cookieJar);
                }
            }

            return {
                status: axiosResponse.status,
                statusText: axiosResponse.statusText,
                headers: axiosResponse.headers as Record<string, string>,
                body: typeof axiosResponse.data === 'string' ? axiosResponse.data : JSON.stringify(axiosResponse.data),
                contentType: (axiosResponse.headers['content-type'] as string) || '',
                time: Math.round(endTime - startTime),
                size: responseSize,
            };

        } catch (error: any) {
            endTime = performance.now();
            this.currentAbortController = null;

            // Treat abort/cancel as a user-initiated cancellation, not a hard error
            if (
                error.code === 'ERR_CANCELED' ||
                error.name === 'CanceledError' ||
                error.name === 'AbortError'
            ) {
                throw new Error('Request cancelled');
            }

            let errorMessage = error.message;
            if (error.code === 'ECONNABORTED') {
                errorMessage = `Request timed out after ${options.timeoutMs}ms`;
            } else if (error.response) {
                 // It returned a response but our validateStatus rejected it (if we changed it)
            } else if (error.request) {
                errorMessage = `No response received: ${error.message}`;
            }

            throw new Error(`Request execution failed: ${errorMessage}`);
        }
    }

    private parseAndSetCookie(url: string, cookieStr: string, jar: CookieJar) {
        // Very basic Set-Cookie parsing
        const parts = cookieStr.split(';').map(p => p.trim());
        const [nameValue, ...attributes] = parts;
        const [name, ...valueParts] = nameValue.split('=');
        const value = valueParts.join('=');

        const cookie: any = { name, value };

        for (const attr of attributes) {
            const lower = attr.toLowerCase();
            if (lower.startsWith('domain=')) cookie.domain = attr.substring(7);
            else if (lower.startsWith('path=')) cookie.path = attr.substring(5);
            else if (lower.startsWith('expires=')) cookie.expires = new Date(attr.substring(8)).getTime();
            else if (lower === 'httponly') cookie.httpOnly = true;
            else if (lower === 'secure') cookie.secure = true;
        }

        jar.set(url, cookie);
    }
}
