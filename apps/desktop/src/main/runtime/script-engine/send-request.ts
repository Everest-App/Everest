import { RequestConfig } from '@api-platform/core';

// This is a placeholder for the actual RequestExecutor implementation
// which we will build in Phase 3. 
export type SendRequestExecutor = (config: RequestConfig) => Promise<any>;

export function createSendRequestHandler(
    executor: SendRequestExecutor,
    defaultMethod: string = 'GET'
) {
    return function sendRequest(req: string | any, callback?: (err: any, res: any) => void): any {
        let config: RequestConfig;

        // Parse arguments: pm.sendRequest('http://example.com', cb)
        if (typeof req === 'string') {
            config = {
                id: `sub-req-${Date.now()}`,
                method: defaultMethod as any,
                url: req,
                headers: [],
                params: [],
                auth: { type: 'none' },
                body: { type: 'none' }
            };
        } 
        // pm.sendRequest({ url: '...', method: 'POST', header: 'X-Foo: Bar' }, cb)
        else if (typeof req === 'object' && req !== null) {
            config = {
                id: `sub-req-${Date.now()}`,
                method: (req.method || defaultMethod) as any,
                url: req.url || '',
                headers: [],
                params: [],
                auth: { type: 'none' },
                body: { type: 'none' }
            };

            // Parse headers
            if (req.header) {
                let headersArray: any[] = [];
                if (typeof req.header === 'string') {
                    const lines = req.header.split('\n');
                    headersArray = lines.map((line: string) => {
                        const colon = line.indexOf(':');
                        if (colon > 0) {
                            return {
                                key: line.substring(0, colon).trim(),
                                value: line.substring(colon + 1).trim()
                            };
                        }
                        return null;
                    }).filter(Boolean);
                } else if (Array.isArray(req.header)) {
                    headersArray = req.header;
                } else if (typeof req.header === 'object') {
                    for (const [key, value] of Object.entries(req.header)) {
                        headersArray.push({ key, value });
                    }
                }
                
                config.headers = headersArray.map((h: any, i: number) => ({
                    id: `h${i}`,
                    key: h.key || '',
                    value: String(h.value || ''),
                    enabled: true
                }));
            }

            // Parse body
            if (req.body) {
                if (req.body.mode === 'raw') {
                    config.body = { type: 'raw', raw: req.body.raw };
                } else if (req.body.mode === 'urlencoded') {
                    // ... parsing urlencoded
                } else if (req.body.mode === 'formdata') {
                    // ... parsing formdata
                } else if (req.body.mode === 'graphql') {
                     // ...
                } else if (typeof req.body === 'string') {
                    config.body = { type: 'raw', raw: req.body };
                }
            }
        } else {
            throw new Error('Invalid request argument to pm.sendRequest');
        }

        const promise = executor(config).then(res => {
            // Map the internal response format to the pm.response format
            const pmRes = {
                code: res.status,
                status: res.statusText,
                headers: {
                    all: () => Object.keys(res.headers || {}).map(k => ({ key: k, value: res.headers[k] })),
                    get: (key: string) => res.headers ? res.headers[key.toLowerCase()] : undefined,
                    has: (key: string) => res.headers ? !!res.headers[key.toLowerCase()] : false
                },
                responseTime: res.time,
                responseSize: res.size,
                text: () => res.body,
                json: () => {
                    try {
                        return JSON.parse(res.body);
                    } catch {
                        return undefined;
                    }
                }
            };

            if (callback) {
                callback(null, pmRes);
            }
            return pmRes;
        }).catch(err => {
            if (callback) {
                callback(err, null);
            }
            throw err;
        });

        // Return the promise so script can await pm.sendRequest() if they want
        return promise;
    };
}
