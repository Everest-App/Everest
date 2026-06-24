import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { ScriptContext, RunnerConfig, ReportFormat } from '@api-platform/core';
import { runScript } from '../services/script-sandbox';
import { runCollection, cancelRun, cancelAllRuns, getRunner } from '../services/runner-service';
import { getCollectionById } from '../services/collection-service';
import { ReportGenerator } from '../runtime/report-generator';

export function registerScriptAndRunnerHandlers(): void {
    // Script execution
    ipcMain.handle(
        IPC_CHANNELS.SCRIPT_RUN,
        async (_event, script: string, context: ScriptContext, phase: 'pre-request' | 'test') => {
            // Note: Our shim ignores the phase arg, it maps from context.eventName
            (context as any).eventName = phase;
            return runScript(script, context);
        }
    );

    // Collection runner
    ipcMain.handle(IPC_CHANNELS.RUNNER_RUN, async (event, config: RunnerConfig) => {
        // Fetch the actual collection from the database (with tree-structured items)
        const collection = getCollectionById(config.collectionId);
        if (!collection) {
            throw new Error(`Collection ${config.collectionId} not found`);
        }

        const result = await runCollection(collection, config);
        return result;
    });

    // Cancel a running collection run
    ipcMain.handle(IPC_CHANNELS.RUNNER_CANCEL, async (_event, collectionId?: string) => {
        if (collectionId) {
            cancelRun(collectionId);
        } else {
            // Cancel all active runners (frontend doesn't always pass collectionId)
            cancelAllRuns();
        }
    });

    // Pause runner
    ipcMain.handle(IPC_CHANNELS.RUNNER_PAUSE, async (_event, collectionId: string) => {
        const runner = getRunner(collectionId);
        if (runner) runner.pause();
    });

    // Resume runner
    ipcMain.handle(IPC_CHANNELS.RUNNER_RESUME, async (_event, collectionId: string) => {
        const runner = getRunner(collectionId);
        if (runner) runner.resume();
    });

    // Status runner
    ipcMain.handle(IPC_CHANNELS.RUNNER_STATUS, async (_event, collectionId: string) => {
        const runner = getRunner(collectionId);
        if (runner) return runner.getStatus();
        return null;
    });

    // Export report
    ipcMain.handle(IPC_CHANNELS.RUNNER_EXPORT, async (_event, collectionId: string, format: ReportFormat) => {
        // To export, we ideally need the runner's status and results.
        // We'll need to store results in the shim or use the TestResultEngine directly.
        // This is a stub for future UI integration.
        return null; 
    });
}
