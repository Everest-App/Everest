import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { Environment, Variable } from '@api-platform/core';
import {
    getAllEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    getGlobalVariables,
    setGlobalVariables,
} from '../services/environment-service';

export function registerEnvironmentHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.ENVIRONMENTS_GET_ALL, async () => {
        return getAllEnvironments();
    });

    ipcMain.handle(IPC_CHANNELS.ENVIRONMENTS_CREATE, async (_event, name: string) => {
        return createEnvironment(name);
    });

    ipcMain.handle(IPC_CHANNELS.ENVIRONMENTS_UPDATE, async (_event, env: Environment) => {
        updateEnvironment(env);
    });

    ipcMain.handle(IPC_CHANNELS.ENVIRONMENTS_DELETE, async (_event, id: string) => {
        deleteEnvironment(id);
    });

    ipcMain.handle(IPC_CHANNELS.GLOBALS_GET, async () => {
        return getGlobalVariables();
    });

    ipcMain.handle(IPC_CHANNELS.GLOBALS_SET, async (_event, vars: Variable[]) => {
        setGlobalVariables(vars);
    });
}
