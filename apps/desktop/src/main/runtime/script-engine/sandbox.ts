import * as vm from 'vm';
import { 
    RuntimeScriptContext, 
    RuntimeScriptResult, 
    VariableMutation 
} from '@api-platform/core';
import { PmApiBuilder } from './pm-api';
import { ConsoleCapture } from './console-capture';

export interface SandboxOptions {
    timeoutMs?: number;
    sendRequestHandler: (req: any, cb?: (err: any, res: any) => void) => any;
}

export class ScriptSandbox {
    private defaultTimeout = 5000;

    public async execute(
        script: string, 
        context: RuntimeScriptContext, 
        options: SandboxOptions
    ): Promise<RuntimeScriptResult> {
        if (!script || !script.trim()) {
            return {
                success: true,
                assertions: [],
                consoleOutput: [],
                executionTimeMs: 0
            };
        }

        const startTime = performance.now();
        const consoleCapture = new ConsoleCapture();
        const sandboxConsole = consoleCapture.createSandboxConsole();
        
        const pmBuilder = new PmApiBuilder(context, options.sendRequestHandler);
        const pm = pmBuilder.build();

        // Polyfill crypto for $guid
        const crypto = {
            randomUUID: () => require('crypto').randomUUID()
        };

        const sandbox: any = {
            pm,
            console: sandboxConsole,
            JSON,
            Date,
            Math,
            Array,
            Object,
            String,
            Number,
            Boolean,
            RegExp,
            Error,
            Map,
            Set,
            Symbol,
            btoa,
            atob,
            parseInt,
            parseFloat,
            encodeURIComponent,
            decodeURIComponent,
            crypto,
            // Promise support requires specific handling in VM, but we provide it here
            Promise,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            Buffer
        };

        const vmContext = vm.createContext(sandbox);

        // Wrap script in an async IIFE to support await and isolate variables
        const wrappedScript = `
            (async function() {
                try {
                    ${script}
                } catch (err) {
                    throw err;
                }
            })();
        `;

        try {
            const vmScript = new vm.Script(wrappedScript);
            
            // Wait for the async IIFE to complete
            const promise = vmScript.runInContext(vmContext, {
                timeout: options.timeoutMs || this.defaultTimeout,
                displayErrors: true
            });
            
            await promise;

            const endTime = performance.now();
            const mutatedScopes = pmBuilder.getMutatedScopes();
            
            // Calculate diffs for variable mutations
            const mutations = this.calculateMutations(context.scopes, mutatedScopes);
            
            return {
                success: true,
                assertions: pmBuilder.getAssertions(),
                consoleOutput: consoleCapture.getEntries(),
                mutations,
                requestOverrides: pmBuilder.getRequestMutations(),
                executionTimeMs: endTime - startTime
            };

        } catch (error: any) {
            const endTime = performance.now();
            
            // Even on error, we might have partial assertions and console logs
            return {
                success: false,
                error: error.message || String(error),
                assertions: pmBuilder.getAssertions(),
                consoleOutput: consoleCapture.getEntries(),
                executionTimeMs: endTime - startTime
            };
        }
    }

    private calculateMutations(original: any, mutated: any) {
        const result: any = {
            local: [],
            environment: [],
            collection: [],
            global: []
        };

        for (const scope of Object.keys(result)) {
            const origScope = original[scope] || {};
            const mutScope = mutated[scope] || {};

            // Find additions and updates
            for (const key of Object.keys(mutScope)) {
                if (origScope[key] !== mutScope[key]) {
                    result[scope].push({
                        operation: 'set',
                        key,
                        value: mutScope[key]
                    });
                }
            }

            // Find deletions
            for (const key of Object.keys(origScope)) {
                if (!(key in mutScope)) {
                    result[scope].push({
                        operation: 'unset',
                        key
                    });
                }
            }
        }

        return result;
    }
}
