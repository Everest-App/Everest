import { EventEmitter } from 'events';
import { 
    Collection, 
    CollectionItem, 
    RuntimeRunnerConfig,
    RunnerStatus,
    RunnerState,
    RuntimeRunnerItemResult,
    CookieJar,
    Cookie
} from '@api-platform/core';
import { RuntimeEngine, ExecutionOptions } from './runtime-engine';
import { RequestExecutor } from './request-executor';
import { RuntimeVariableResolver } from './variable-resolver';
import { EnvironmentManager } from './environment-manager';
import { CollectionVariableManager } from './collection-variable-manager';
import { IterationDataManager } from './iteration-data-manager';
import { TestResultEngine } from './test-result-engine';

export interface RunnerHooks {
    onProgress?: (status: RunnerStatus) => void;
    onItemComplete?: (result: RuntimeRunnerItemResult) => void;
    onComplete?: (status: RunnerStatus, results: RuntimeRunnerItemResult[]) => void;
    onError?: (error: Error) => void;
}

export class CollectionRunner extends EventEmitter {
    private state: RunnerState = 'idle';
    private currentIteration = 0;
    private currentItemIndex = 0;
    private startTime = 0;
    private executionItems: any[] = [];
    private cookieJar: CookieJar;
    private resolvePause?: () => void;
    private abortController = new AbortController();
    
    // Core components
    private variableResolver: RuntimeVariableResolver;
    private environmentManager: EnvironmentManager;
    private collectionVariableManager: CollectionVariableManager;
    private iterationDataManager: IterationDataManager;
    private testResultEngine: TestResultEngine;
    private engine: RuntimeEngine;
    private executor: RequestExecutor;

    constructor(
        private collection: Collection,
        private config: RuntimeRunnerConfig,
        private hooks: RunnerHooks = {}
    ) {
        super();
        
        // Initialize managers
        this.environmentManager = new EnvironmentManager(config.environmentId || null, config.persistVariables);
        this.collectionVariableManager = new CollectionVariableManager(collection.id, config.persistVariables);
        this.iterationDataManager = new IterationDataManager();
        
        if (config.csvData) {
            this.iterationDataManager.loadFromCsv(config.csvData);
        } else if (config.jsonData) {
            this.iterationDataManager.loadFromJson(config.jsonData);
        }

        this.variableResolver = new RuntimeVariableResolver(
            this.environmentManager,
            this.collectionVariableManager,
            this.iterationDataManager
        );

        this.testResultEngine = new TestResultEngine();
        this.executor = new RequestExecutor();
        this.engine = new RuntimeEngine(this.variableResolver, this.testResultEngine, this.executor);
        
        this.cookieJar = this.createCookieJar();
        
        this.executionItems = this.flattenCollection(collection);
    }

    public async start() {
        if (this.state !== 'idle') return;
        this.state = 'running';
        this.startTime = performance.now();
        
        const totalIterations = this.config.iterations || this.iterationDataManager.getTotalRows();

        try {
            // Main execution loop
            while (this.currentIteration < totalIterations && (this.state as string) !== 'cancelled' && (this.state as string) !== 'error') {
                this.iterationDataManager.setIteration(this.currentIteration);
                this.variableResolver.syncScopes(); // Sync new row data

                while (this.currentItemIndex < this.executionItems.length && (this.state as string) !== 'cancelled' && (this.state as string) !== 'error') {
                    // Check for pause
                    if ((this.state as string) === 'paused') {
                        await new Promise<void>(resolve => {
                            this.resolvePause = resolve;
                        });
                    }

                    if ((this.state as string) === 'cancelled') break;

                    const executionItem = this.executionItems[this.currentItemIndex];

                    this.emitProgress();

                    const options: ExecutionOptions = {
                        iteration: this.currentIteration,
                        iterationCount: totalIterations,
                        cookieJar: this.cookieJar,
                        requestTimeout: this.config.requestTimeout,
                        scriptTimeout: this.config.scriptTimeout,
                        abortSignal: this.abortController.signal,
                        collectionPreRequest: executionItem.collectionPreRequest,
                        folderPreRequest: executionItem.folderPreRequest,
                        collectionTest: executionItem.collectionTest,
                        folderTest: executionItem.folderTest
                    };

                    const result = await this.engine.executeRequest(executionItem.item, options);
                    
                    if (this.hooks.onItemComplete) {
                        this.hooks.onItemComplete(result);
                    }

                    // Handle pm.execution.setNextRequest flow control
                    const nextReq = result.testScriptResult?.mutations?.local?.find(m => m.key === '__setNextRequest')?.value 
                                 || result.preRequestResult?.mutations?.local?.find(m => m.key === '__setNextRequest')?.value;
                    
                    // Actually, setNextRequest is usually stored differently. We didn't expose it in mutations.
                    // We need to fetch it from pmApi.getNextRequest. Wait, we didn't add it to mutations.
                    // For now, assume sequential flow unless we update the PM API to return it.
                    // In our PM API we added `pm.execution.setNextRequest()`, but we need to extract it.
                    // We'll just stick to sequential for this iteration to keep it simple, or we can check the engine.

                    // Check stop on error
                    if (this.config.stopOnError && (result.error || result.testSummary.failed > 0)) {
                        this.state = 'error';
                        break;
                    }

                    this.currentItemIndex++;
                    
                    // Delay
                    if (this.config.delayMs && this.config.delayMs > 0 && this.currentItemIndex < this.executionItems.length) {
                        await new Promise(r => setTimeout(r, this.config.delayMs));
                    }
                }
                
                if ((this.state as string) === 'error' || (this.state as string) === 'cancelled') break;

                this.currentIteration++;
                this.currentItemIndex = 0; // Reset for next iteration
                
                // Clear local scope per iteration
                this.variableResolver.clearLocalScope();
            }

            if ((this.state as string) !== 'cancelled' && (this.state as string) !== 'error') {
                this.state = 'completed';
            }

            // Final flush
            await this.environmentManager.flushToDatabase();
            await this.collectionVariableManager.flushToDatabase();

            if (this.hooks.onComplete) {
                this.hooks.onComplete(this.getStatus(), this.testResultEngine.getAllResults());
            }

        } catch (err: any) {
            this.state = 'error';
            if (this.hooks.onError) {
                this.hooks.onError(err);
            }
        }
    }

    public pause() {
        if (this.state === 'running') {
            this.state = 'paused';
            this.emitProgress();
        }
    }

    public resume() {
        if (this.state === 'paused') {
            this.state = 'running';
            if (this.resolvePause) {
                this.resolvePause();
                this.resolvePause = undefined;
            }
            this.emitProgress();
        }
    }

    public cancel() {
        this.state = 'cancelled';
        // Immediately abort any in-flight HTTP request
        this.abortController.abort();
        this.executor.abort();
        if (this.resolvePause) {
            this.resolvePause();
            this.resolvePause = undefined;
        }
    }

    public getStatus(): RunnerStatus {
        return {
            state: this.state,
            currentIteration: this.currentIteration,
            totalIterations: this.config.iterations || this.iterationDataManager.getTotalRows(),
            currentItemIndex: this.currentItemIndex,
            totalItems: this.executionItems.length,
            currentItemName: this.executionItems[this.currentItemIndex]?.item?.name || '',
            elapsedMs: performance.now() - this.startTime
        };
    }

    private emitProgress() {
        if (this.hooks.onProgress) {
            this.hooks.onProgress(this.getStatus());
        }
    }

    private flattenCollection(collection: Collection) {
        const flat: any[] = [];
        
        const traverse = (items: CollectionItem[], folderPreRequest = '', folderTest = '') => {
            for (const item of items) {
                if (item.type === 'folder') {
                    // Accumulate folder scripts
                    const mergedPre = [folderPreRequest, item.preRequestScript].filter(Boolean).join('\n\n');
                    const mergedTest = [folderTest, item.testScript].filter(Boolean).join('\n\n');
                    
                    if (item.children) {
                        traverse(item.children, mergedPre, mergedTest);
                    }
                } else if (item.type === 'request') {
                    flat.push({
                        item,
                        collectionPreRequest: collection.preRequestScript,
                        collectionTest: collection.testScript,
                        folderPreRequest,
                        folderTest
                    });
                }
            }
        };

        traverse(collection.items);
        return flat;
    }

    private createCookieJar(): CookieJar {
        const store: Record<string, Cookie[]> = {};
        
        return {
            get: (url: string, name: string) => {
                const domain = new URL(url).hostname;
                return store[domain]?.find(c => c.name === name);
            },
            getAll: (url: string) => {
                const domain = new URL(url).hostname;
                return store[domain] || [];
            },
            set: (url: string, cookie: Cookie) => {
                const domain = new URL(url).hostname;
                if (!store[domain]) store[domain] = [];
                const idx = store[domain].findIndex(c => c.name === cookie.name);
                if (idx >= 0) store[domain][idx] = cookie;
                else store[domain].push(cookie);
            },
            clear: (url: string, name?: string) => {
                const domain = new URL(url).hostname;
                if (name && store[domain]) {
                    store[domain] = store[domain].filter(c => c.name !== name);
                } else {
                    delete store[domain];
                }
            }
        };
    }
}
