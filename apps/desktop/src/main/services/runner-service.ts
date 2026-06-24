import { Collection, RunnerConfig, RunnerResult, RunnerItemResult } from '@api-platform/core';
import { CollectionRunner } from '../runtime/collection-runner';
import { createFolderRunner } from '../runtime/folder-runner';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';

// Map of running collections
const runners = new Map<string, CollectionRunner>();

export async function runCollection(collection: Collection, config: RunnerConfig): Promise<RunnerResult> {
    return new Promise((resolve) => {
        // We use the runtime config format
        const runtimeConfig = {
            ...config,
            persistVariables: false // Default to false for legacy API
        };

        const hooks = {
            onProgress: (status: any) => {
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send(IPC_CHANNELS.RUNNER_PROGRESS, {
                    current: status.currentItemIndex + (status.currentIteration * status.totalItems),
                    total: status.totalItems * status.totalIterations,
                    itemName: status.currentItemName,
                }));
            },
            onItemComplete: (result: any) => {
                // Map RuntimeRunnerItemResult to RunnerItemResult for the live feed
                const mapped: RunnerItemResult = {
                    itemId: result.itemId,
                    itemName: result.itemName,
                    iteration: result.iteration ?? 0,
                    passed: result.testSummary ? result.testSummary.failed === 0 : !result.error,
                    duration: result.timing?.totalMs ?? result.duration ?? 0,
                    request: result.request,
                    response: result.response,
                    error: result.error,
                    testResults: result.testScriptResult?.assertions || result.testResults || [],
                    consoleOutput: result.consoleLogs || result.consoleOutput || [],
                    csvVariables: result.csvVariables,
                    requestHeaders: result.requestHeaders,
                    responseHeaders: result.responseHeaders,
                };
                BrowserWindow.getAllWindows().forEach(w => w.webContents.send(IPC_CHANNELS.RUNNER_ITEM_RESULT, mapped));
            },
            onComplete: (status: any, results: any[]) => {
                // Map RuntimeRunnerItemResult back to RunnerItemResult
                const mappedResults: RunnerItemResult[] = results.map(r => ({
                    itemId: r.itemId,
                    itemName: r.itemName,
                    iteration: r.iteration ?? 0,
                    passed: r.testSummary ? r.testSummary.failed === 0 : !r.error,
                    duration: r.timing?.totalMs ?? r.duration ?? 0,
                    request: r.request,
                    response: r.response,
                    error: r.error,
                    testResults: r.testScriptResult?.assertions || r.testResults || [],
                    consoleOutput: r.consoleLogs || r.consoleOutput || [],
                    csvVariables: r.csvVariables,
                    requestHeaders: r.requestHeaders,
                    responseHeaders: r.responseHeaders,
                }));

                const totalPassed = mappedResults.filter(r => r.passed).length;
                const totalFailed = mappedResults.filter(r => !r.passed).length;
                const allAssertions = mappedResults.flatMap(r => r.testResults);
                const passedAssertions = allAssertions.filter(a => a.passed).length;

                const finalResult: RunnerResult = {
                    collectionId: collection.id,
                    collectionName: collection.name,
                    totalRequests: mappedResults.length,
                    totalPassed,
                    totalFailed,
                    totalAssertions: allAssertions.length,
                    passedAssertions,
                    failedAssertions: allAssertions.length - passedAssertions,
                    totalDuration: Math.round(status.elapsedMs),
                    iterations: status.totalIterations,
                    results: mappedResults,
                    startedAt: Date.now() - Math.round(status.elapsedMs),
                    completedAt: Date.now(),
                    aborted: status.state === 'cancelled',
                };
                
                runners.delete(collection.id);
                resolve(finalResult);
            },
            onError: (err: Error) => {
                runners.delete(collection.id);
                // Return an error result instead of throwing
                resolve({
                    collectionId: collection.id,
                    collectionName: collection.name,
                    totalRequests: 0,
                    totalPassed: 0,
                    totalFailed: 0,
                    totalAssertions: 0,
                    passedAssertions: 0,
                    failedAssertions: 0,
                    totalDuration: 0,
                    iterations: config.iterations || 1,
                    results: [],
                    startedAt: Date.now(),
                    completedAt: Date.now(),
                });
            }
        };

        let runner: CollectionRunner;

        if (config.folderId) {
            // Run only a specific folder within the collection
            runner = createFolderRunner(collection, config.folderId, runtimeConfig, hooks);
        } else {
            // Run entire collection
            runner = new CollectionRunner(collection, runtimeConfig, hooks);
        }

        runners.set(collection.id, runner);
        runner.start();
    });
}

export function cancelRun(collectionId: string): void {
    const runner = runners.get(collectionId);
    if (runner) {
        runner.cancel();
    }
}

export function cancelAllRuns(): void {
    for (const [id, runner] of runners) {
        runner.cancel();
    }
}

// Export the internal map for the IPC handlers
export function getRunner(collectionId: string) {
    return runners.get(collectionId);
}
