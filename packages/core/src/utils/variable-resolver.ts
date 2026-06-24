import { VariableScopeMap } from '../types';

/**
 * Advanced variable resolver with 5-tier scoping and recursive resolution.
 * Priority: local > data > environment > collection > global
 */
export class VariableResolver {
    private scopes: VariableScopeMap;

    constructor(initialScopes?: Partial<VariableScopeMap>) {
        this.scopes = {
            local: initialScopes?.local || {},
            data: initialScopes?.data || {},
            environment: initialScopes?.environment || {},
            collection: initialScopes?.collection || {},
            global: initialScopes?.global || {}
        };
    }

    /**
     * Get a variable by key, checking scopes in priority order.
     */
    public get(key: string): any {
        // Dynamic variables (Postman compatibility)
        if (key.startsWith('$')) {
            const dynamicVar = this.resolveDynamicVariable(key);
            if (dynamicVar !== undefined) {
                return dynamicVar;
            }
        }

        if (key in this.scopes.local) return this.scopes.local[key];
        if (key in this.scopes.data) return this.scopes.data[key];
        if (key in this.scopes.environment) return this.scopes.environment[key];
        if (key in this.scopes.collection) return this.scopes.collection[key];
        if (key in this.scopes.global) return this.scopes.global[key];
        return undefined;
    }

    /**
     * Set a variable in a specific scope (defaults to local).
     */
    public set(key: string, value: any, scope: keyof VariableScopeMap = 'local'): void {
        this.scopes[scope][key] = value;
    }

    /**
     * Unset a variable in a specific scope (defaults to local).
     */
    public unset(key: string, scope: keyof VariableScopeMap = 'local'): void {
        delete this.scopes[scope][key];
    }

    /**
     * Check if a variable exists in any scope.
     */
    public has(key: string): boolean {
        return (
            key in this.scopes.local ||
            key in this.scopes.data ||
            key in this.scopes.environment ||
            key in this.scopes.collection ||
            key in this.scopes.global
        );
    }

    /**
     * Interpolate a string containing {{variable}} placeholders.
     */
    public replaceIn(input: string, maxDepth: number = 10): string {
        if (!input || typeof input !== 'string') return input;

        let result = input;
        let depth = 0;
        const regex = /\{\{([\w.-]+)\}\}/g;

        while (depth < maxDepth) {
            let hasReplacements = false;

            result = result.replace(regex, (match, key) => {
                const value = this.get(key);
                if (value !== undefined) {
                    hasReplacements = true;
                    return typeof value === 'string' ? value : String(value);
                }
                return match;
            });

            if (!hasReplacements) break;
            depth++;
        }

        if (depth === maxDepth) {
            console.warn(`Max interpolation depth (${maxDepth}) reached. Possible circular reference in: ${input}`);
        }

        return result;
    }

    /**
     * Replace placeholders in an object recursively.
     */
    public replaceInObject<T>(obj: T): T {
        if (obj === null || obj === undefined) return obj;
        
        if (typeof obj === 'string') {
            return this.replaceIn(obj) as any;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.replaceInObject(item)) as any;
        }

        if (typeof obj === 'object') {
            const result: any = {};
            for (const [k, v] of Object.entries(obj)) {
                // We also interpolate keys if they contain {{}}
                const newKey = this.replaceIn(k);
                result[newKey] = this.replaceInObject(v);
            }
            return result as T;
        }

        return obj;
    }

    /**
     * Resolve Postman dynamic variables.
     */
    private resolveDynamicVariable(key: string): string | number | undefined {
        switch (key) {
            case '$guid':
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            case '$timestamp':
                return Math.floor(Date.now() / 1000);
            case '$isoTimestamp':
                return new Date().toISOString();
            case '$randomInt':
                return Math.floor(Math.random() * 1000);
            // Add more as needed
            default:
                return undefined;
        }
    }

    /**
     * Get a snapshot of all current scopes.
     */
    public getScopes(): VariableScopeMap {
        return {
            local: { ...this.scopes.local },
            data: { ...this.scopes.data },
            environment: { ...this.scopes.environment },
            collection: { ...this.scopes.collection },
            global: { ...this.scopes.global }
        };
    }
}
