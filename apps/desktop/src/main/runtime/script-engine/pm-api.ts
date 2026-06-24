import { 
    RuntimeScriptContext, 
    RuntimeTestAssertion, 
    VariableScopeMap 
} from '@api-platform/core';
import { VariableResolver } from '@api-platform/core';
import { createExpectChain } from './expect-chain';

export class PmApiBuilder {
    private assertions: RuntimeTestAssertion[] = [];
    private resolver: VariableResolver;
    
    // Track next request manually for the runner to pick up
    private nextRequest: string | null = null;
    
    constructor(
        private context: RuntimeScriptContext,
        private sendRequestHandler: (req: any, cb?: (err: any, res: any) => void) => any
    ) {
        // Initialize resolver with the passed scopes
        this.resolver = new VariableResolver(context.scopes);
    }

    public getAssertions() {
        return this.assertions;
    }

    public getMutatedScopes(): VariableScopeMap {
        return this.resolver.getScopes();
    }
    
    public getNextRequest(): string | null {
        return this.nextRequest;
    }

    // Capture the request mutations (headers added/removed)
    public getRequestMutations() {
        // We will mutate context.request directly through the API, 
        // so returning the modified headers/body
        return {
            headers: this.context.request.headers,
            body: this.context.request.body,
            url: this.context.request.url,
            method: this.context.request.method
        };
    }

    public build() {
        const pm: any = {
            info: {
                eventName: this.context.info.eventName,
                iteration: this.context.info.iteration,
                iterationCount: this.context.info.iterationCount,
                requestName: this.context.info.requestName,
                requestId: this.context.info.requestId
            },
            
            // Testing
            test: (name: string, fn: () => void) => {
                const startTime = performance.now();
                try {
                    fn();
                    this.assertions.push({
                        name,
                        passed: true,
                        durationMs: performance.now() - startTime
                    });
                } catch (err: any) {
                    this.assertions.push({
                        name,
                        passed: false,
                        error: err.message || String(err),
                        stack: err.stack,
                        durationMs: performance.now() - startTime
                    });
                }
            },
            expect: (value: any) => createExpectChain(value, this.assertions),
            
            // Scope APIs
            variables: this.createScopeApi('local', true), // reads cascade, writes local
            environment: this.createScopeApi('environment'),
            collectionVariables: this.createScopeApi('collection'),
            globals: this.createScopeApi('global'),
            iterationData: this.createReadOnlyScopeApi('data'),
            
            // Execution Control
            execution: {
                setNextRequest: (requestNameOrId: string | null) => {
                    this.nextRequest = requestNameOrId;
                }
            },
            
            // Send Request
            sendRequest: this.sendRequestHandler
        };

        // pm.request
        pm.request = {
            url: this.context.request.url,
            method: this.context.request.method,
            headers: this.createHeaderList(this.context.request.headers),
            body: this.context.request.body,
            addHeader: (header: { key: string, value: string } | string) => {
                if (typeof header === 'string') {
                    const colonIdx = header.indexOf(':');
                    if (colonIdx > 0) {
                        this.context.request.headers.push({
                            id: `script-${Date.now()}`,
                            key: header.substring(0, colonIdx).trim(),
                            value: header.substring(colonIdx + 1).trim(),
                            enabled: true
                        });
                    }
                } else if (header && header.key) {
                    this.context.request.headers.push({
                        id: `script-${Date.now()}`,
                        key: header.key,
                        value: header.value || '',
                        enabled: true
                    });
                }
            },
            removeHeader: (key: string) => {
                this.context.request.headers = this.context.request.headers.filter(
                    h => h.key.toLowerCase() !== key.toLowerCase()
                );
            }
        };

        // pm.response (only available in test scripts)
        if (this.context.response) {
            const res = this.context.response;
            let jsonBody: any = undefined;
            let jsonParsed = false;
            
            pm.response = {
                code: res.status,
                status: res.statusText,
                headers: this.createResponseHeaderList(res.headers),
                responseTime: res.time,
                responseSize: res.size,
                text: () => res.body,
                json: () => {
                    if (!jsonParsed) {
                        try {
                            jsonBody = JSON.parse(res.body);
                        } catch {
                            throw new Error('Response body is not valid JSON');
                        }
                        jsonParsed = true;
                    }
                    return jsonBody;
                },
                to: {
                    get be() { return createExpectChain(pm.response, pm.assertions).to.be; },
                    get have() { return createExpectChain(pm.response, pm.assertions).to.have; }
                }
            };
        }

        // pm.cookies
        if (this.context.cookies) {
            const url = this.context.request.url;
            pm.cookies = {
                has: (name: string) => !!this.context.cookies?.get(url, name),
                get: (name: string) => this.context.cookies?.get(url, name)?.value,
                jar: () => this.context.cookies
            };
        }

        return pm;
    }

    private createScopeApi(scope: keyof VariableScopeMap, cascadeRead = false) {
        return {
            get: (key: string) => cascadeRead ? this.resolver.get(key) : this.resolver.getScopes()[scope][key],
            set: (key: string, value: any) => this.resolver.set(key, this.toStringValue(value), scope),
            unset: (key: string) => this.resolver.unset(key, scope),
            has: (key: string) => cascadeRead ? this.resolver.has(key) : key in this.resolver.getScopes()[scope],
            clear: () => {
                const keys = Object.keys(this.resolver.getScopes()[scope]);
                for (const k of keys) this.resolver.unset(k, scope);
            },
            toObject: () => ({ ...this.resolver.getScopes()[scope] })
        };
    }

    private createReadOnlyScopeApi(scope: keyof VariableScopeMap) {
        return {
            get: (key: string) => this.resolver.getScopes()[scope][key],
            has: (key: string) => key in this.resolver.getScopes()[scope],
            toObject: () => ({ ...this.resolver.getScopes()[scope] })
        };
    }

    private createHeaderList(headers: {key: string, value: string, enabled: boolean}[]) {
        const list = headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: h.value }));
        return {
            has: (key: string) => list.some(h => h.key.toLowerCase() === key.toLowerCase()),
            get: (key: string) => list.find(h => h.key.toLowerCase() === key.toLowerCase())?.value,
            all: () => list,
            add: (header: {key: string, value: string}) => list.push(header),
            remove: (key: string) => {
                const idx = list.findIndex(h => h.key.toLowerCase() === key.toLowerCase());
                if (idx >= 0) list.splice(idx, 1);
            }
        };
    }

    private createResponseHeaderList(headers: Record<string, string>) {
        return {
            has: (key: string) => Object.keys(headers).some(k => k.toLowerCase() === key.toLowerCase()),
            get: (key: string) => {
                const actualKey = Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());
                return actualKey ? headers[actualKey] : undefined;
            },
            all: () => Object.keys(headers).map(k => ({ key: k, value: headers[k] }))
        };
    }

    private toStringValue(value: any): string {
        if (typeof value === 'string') return value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
            try { return JSON.stringify(value); } catch { return String(value); }
        }
        return String(value);
    }
}
