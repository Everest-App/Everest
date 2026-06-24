import { registerRequestHandlers } from './request.ipc';
import { registerHistoryHandlers } from './history.ipc';
import { registerCodegenHandlers } from './codegen.ipc';
import { registerCollectionHandlers } from './collection.ipc';
import { registerEnvironmentHandlers } from './environment.ipc';
import { registerImportExportHandlers } from './import-export.ipc';
import { registerScriptAndRunnerHandlers } from './script-runner.ipc';
import { registerProtocolHandlers } from './protocol.ipc';
import { registerMockHandlers } from './mock.ipc';

export function registerAllIpcHandlers(): void {
    registerRequestHandlers();
    registerHistoryHandlers();
    registerCodegenHandlers();
    registerCollectionHandlers();
    registerEnvironmentHandlers();
    registerImportExportHandlers();
    registerScriptAndRunnerHandlers();
    registerProtocolHandlers();
    registerMockHandlers();
}
