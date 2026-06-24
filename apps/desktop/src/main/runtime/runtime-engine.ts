import { 
    RequestConfig, 
    CollectionItem,
    RuntimeScriptContext,
    RuntimeRunnerItemResult,
    CookieJar,
    ScriptPhase,
    ScriptLevel
} from '@api-platform/core';
import { ScriptSandbox } from './script-engine/sandbox';
import { createSendRequestHandler } from './script-engine/send-request';
import { RequestExecutor } from './request-executor';
import { RuntimeVariableResolver } from './variable-resolver';
import { TestResultEngine } from './test-result-engine';

export interface ExecutionOptions {
    iteration: number;
    iterationCount: number;
    cookieJar: CookieJar;
    requestTimeout?: number;
    scriptTimeout?: number;
    abortSignal?: AbortSignal;
    // Context scripts
    collectionPreRequest?: string;
    folderPreRequest?: string;
    collectionTest?: string;
    folderTest?: string;
}

export class RuntimeEngine {
    private sandbox: ScriptSandbox;
    private executor: RequestExecutor;

    constructor(
        private variableResolver: RuntimeVariableResolver,
        private testResultEngine: TestResultEngine,
        executor?: RequestExecutor
    ) {
        this.sandbox = new ScriptSandbox();
        this.executor = executor ?? new RequestExecutor();
    }

    public async executeRequest(
        item: CollectionItem,
        options: ExecutionOptions
    ): Promise<RuntimeRunnerItemResult> {
        if (!item.request) {
            throw new Error('Item does not have a request');
        }

        const timing = {
            preRequestScriptMs: 0,
            variableResolutionMs: 0,
            httpRequestMs: 0,
            testScriptMs: 0,
            totalMs: 0
        };

        const startTime = performance.now();
        let interpolatedRequest = { ...item.request }; // Clone
        
        // Setup pm.sendRequest handler for this context
        const sendRequestHandler = createSendRequestHandler(
            async (config: RequestConfig) => {
                // Interpolate variables before sending sub-request
                const resolvedConfig = this.variableResolver.getCoreResolver().replaceInObject(config);
                return this.executor.execute(resolvedConfig, { cookieJar: options.cookieJar });
            }
        );

        // --- Phase 1: Pre-request Scripts ---
        const preReqStartTime = performance.now();
        const preReqContext: RuntimeScriptContext = {
            request: interpolatedRequest,
            scopes: this.variableResolver.getCurrentScopes(),
            cookies: options.cookieJar,
            info: {
                eventName: 'pre-request',
                iteration: options.iteration,
                iterationCount: options.iterationCount,
                requestName: item.name,
                requestId: item.id
            }
        };

        // Run Collection Level
        if (options.collectionPreRequest) {
            await this.runScript(options.collectionPreRequest, preReqContext, options, sendRequestHandler);
        }
        
        // Run Folder Level
        if (options.folderPreRequest) {
            await this.runScript(options.folderPreRequest, preReqContext, options, sendRequestHandler);
        }
        
        // Run Request Level
        let preReqResult;
        if (item.preRequestScript) {
            preReqResult = await this.runScript(item.preRequestScript, preReqContext, options, sendRequestHandler);
        }
        
        timing.preRequestScriptMs = performance.now() - preReqStartTime;

        // Apply any request overrides made by scripts
        if (preReqResult?.requestOverrides) {
            interpolatedRequest = { ...interpolatedRequest, ...preReqResult.requestOverrides } as RequestConfig;
        }

        // --- Phase 2: Variable Resolution ---
        const varResStartTime = performance.now();
        interpolatedRequest = this.variableResolver.getCoreResolver().replaceInObject(interpolatedRequest);
        timing.variableResolutionMs = performance.now() - varResStartTime;

        // --- Phase 3: HTTP Request ---
        const reqStartTime = performance.now();
        let response;
        let requestError;
        try {
            response = await this.executor.execute(interpolatedRequest, {
                cookieJar: options.cookieJar,
                timeoutMs: options.requestTimeout,
                signal: options.abortSignal,
            });
        } catch (err: any) {
            requestError = err;
        }
        timing.httpRequestMs = performance.now() - reqStartTime;

        // --- Phase 4: Test Scripts ---
        const testStartTime = performance.now();
        const testContext: RuntimeScriptContext = {
            request: interpolatedRequest,
            response,
            scopes: this.variableResolver.getCurrentScopes(),
            cookies: options.cookieJar,
            info: {
                eventName: 'test',
                iteration: options.iteration,
                iterationCount: options.iterationCount,
                requestName: item.name,
                requestId: item.id
            }
        };

        // Run Request Level Test
        let testResult;
        if (item.testScript) {
            testResult = await this.runScript(item.testScript, testContext, options, sendRequestHandler);
            if (testResult.assertions) {
                this.testResultEngine.recordAssertions(item, testResult.assertions, 'request');
            }
        }

        // Run Folder Level Test
        if (options.folderTest) {
            const folderRes = await this.runScript(options.folderTest, testContext, options, sendRequestHandler);
            if (folderRes.assertions) {
                this.testResultEngine.recordAssertions(item, folderRes.assertions, 'folder');
            }
        }

        // Run Collection Level Test
        if (options.collectionTest) {
            const collRes = await this.runScript(options.collectionTest, testContext, options, sendRequestHandler);
            if (collRes.assertions) {
                this.testResultEngine.recordAssertions(item, collRes.assertions, 'collection');
            }
        }
        
        timing.testScriptMs = performance.now() - testStartTime;
        timing.totalMs = performance.now() - startTime;

        // Collect all console logs
        const allLogs = [];
        if (preReqResult?.consoleOutput) allLogs.push(...preReqResult.consoleOutput);
        if (testResult?.consoleOutput) allLogs.push(...testResult.consoleOutput);

        // Aggregate test results
        const assertions = this.testResultEngine.getAssertionsForRequest(item.id, options.iteration);
        const passed = assertions.filter(a => a.passed).length;
        const failed = assertions.filter(a => !a.passed).length;

        // Record overall result
        const result: RuntimeRunnerItemResult = {
            itemId: item.id,
            itemName: item.name,
            iteration: options.iteration,
            request: interpolatedRequest,
            response,
            error: requestError ? String(requestError) : undefined,
            testResults: assertions,
            passed: failed === 0,
            duration: timing.totalMs,
            testSummary: {
                total: assertions.length,
                passed,
                failed
            },
            consoleLogs: allLogs.map(l => `[${l.level.toUpperCase()}] ${l.args.join(' ')}`),
            
            // Runtime specific extensions
            preRequestResult: preReqResult,
            testScriptResult: testResult,
            timing
        };

        this.testResultEngine.recordResult(result);
        return result;
    }

    private async runScript(
        script: string, 
        context: RuntimeScriptContext, 
        options: ExecutionOptions,
        sendRequestHandler: any
    ) {
        // Refresh scopes to ensure latest mutations from previous scripts are visible
        context.scopes = this.variableResolver.getCurrentScopes();
        
        const result = await this.sandbox.execute(script, context, {
            timeoutMs: options.scriptTimeout,
            sendRequestHandler
        });

        if (result.mutations) {
            this.variableResolver.applyMutations(result.mutations);
        }
        
        return result;
    }
}
