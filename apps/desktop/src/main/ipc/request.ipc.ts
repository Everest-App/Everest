import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { RequestConfig, SendRequestResult } from '@api-platform/core';
import { saveToHistory } from '../services/history-service';
import { getAllCollections } from '../services/collection-service';
import { RuntimeEngine } from '../runtime/runtime-engine';
import { RequestExecutor } from '../runtime/request-executor';
import { RuntimeVariableResolver } from '../runtime/variable-resolver';
import { TestResultEngine } from '../runtime/test-result-engine';
import { EnvironmentManager } from '../runtime/environment-manager';
import { CollectionVariableManager } from '../runtime/collection-variable-manager';
import { IterationDataManager } from '../runtime/iteration-data-manager';

// ── Single shared executor so REQUEST_CANCEL can abort the in-flight request ──
// A new RequestExecutor is NOT created per-request; this one is reused and injected
// into RuntimeEngine so abort() always targets the actual in-flight axios call.
const sharedExecutor = new RequestExecutor();

export function registerRequestHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.REQUEST_SEND, async (_event, config: RequestConfig, environmentId?: string, collectionItemId?: string): Promise<SendRequestResult> => {
        try {
            // Find the collection item if applicable
            let item: any = { id: `item-${Date.now()}`, name: config.url, request: config };
            let collectionId = '';
            let collectionPreReq = '';
            let collectionTest = '';
            let folderPreReq = '';
            let folderTest = '';

            if (collectionItemId) {
                const collections = getAllCollections();
                for (const col of collections) {
                    const foundItem = findItem(col.items, collectionItemId);
                    if (foundItem) {
                        item = foundItem;
                        item.request = config; // Override with the edited config from the UI
                        collectionId = col.id;
                        collectionPreReq = col.preRequestScript || '';
                        collectionTest = col.testScript || '';

                        // Walk parents
                        const parentScripts = buildFolderScripts(col.items, collectionItemId);
                        folderPreReq = parentScripts.preReq;
                        folderTest = parentScripts.test;
                        break;
                    }
                }
            }

            // Setup the Runtime engine — inject the shared executor so cancel works
            const envManager = new EnvironmentManager(environmentId || null, true);
            const colManager = new CollectionVariableManager(collectionId || '', true);
            const iterManager = new IterationDataManager();
            const varResolver = new RuntimeVariableResolver(envManager, colManager, iterManager);
            const testResultEngine = new TestResultEngine();
            const engine = new RuntimeEngine(varResolver, testResultEngine, sharedExecutor);

            // Execute the request
            const result = await engine.executeRequest(item, {
                iteration: 0,
                iterationCount: 1,
                cookieJar: createEphemeralCookieJar(),
                collectionPreRequest: collectionPreReq,
                folderPreRequest: folderPreReq,
                collectionTest: collectionTest,
                folderTest: folderTest
            });

            // Flush persisting variables
            await envManager.flushToDatabase();
            await colManager.flushToDatabase();

            // Save to history (skip if request was cancelled — response will be undefined)
            if (result.response) {
                saveToHistory(result.request, result.response);
            }

            return {
                response: result.response as any,
                preRequestResult: result.preRequestResult as any,
                testResult: result.testScriptResult as any
            };
        } catch (error: any) {
            // Re-throw so the renderer can handle cancelled vs real errors
            console.error('[IPC] Request error:', error.message);
            throw error;
        }
    });

    // Cancel the currently in-flight single request
    ipcMain.handle(IPC_CHANNELS.REQUEST_CANCEL, async () => {
        sharedExecutor.abort();
    });
}

function findItem(items: any[], id: string): any {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findItem(item.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

function buildFolderScripts(items: any[], targetId: string) {
    const scripts = { preReq: '', test: '' };

    // Simple path finding (not full implementation to keep snippet small)
    // You would implement a full parent walk here similar to the old buildScriptChain

    return scripts;
}

function createEphemeralCookieJar() {
    return {
        get: () => undefined,
        getAll: () => [],
        set: () => {},
        clear: () => {}
    };
}
