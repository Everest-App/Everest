import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { PluginManifest } from '@api-platform/core';
import {
    getAllPlugins,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    updatePluginSettings,
    getPluginCatalog,
} from '../services/plugin-service';

export function registerPluginHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.PLUGINS_GET_ALL, async () => {
        return getAllPlugins();
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_INSTALL, async (_event, manifest: PluginManifest, code: string) => {
        installPlugin(manifest, code);
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_UNINSTALL, async (_event, id: string) => {
        uninstallPlugin(id);
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_ENABLE, async (_event, id: string) => {
        enablePlugin(id);
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_DISABLE, async (_event, id: string) => {
        disablePlugin(id);
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_UPDATE_SETTINGS, async (_event, id: string, settings: Record<string, any>) => {
        updatePluginSettings(id, settings);
    });

    ipcMain.handle(IPC_CHANNELS.PLUGINS_CATALOG, async () => {
        return getPluginCatalog();
    });
}
