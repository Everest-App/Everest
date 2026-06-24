import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { MockServerConfig, MockRoute } from '@api-platform/core';
import { mockStart, mockStop, getStatus, getRoutes, setRoutes } from '../services/mock-service';

export function registerMockHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.MOCK_START, async (event, config: MockServerConfig) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        return mockStart(config, window);
    });

    ipcMain.handle(IPC_CHANNELS.MOCK_STOP, async () => {
        mockStop();
    });

    ipcMain.handle(IPC_CHANNELS.MOCK_STATUS, async () => {
        return getStatus();
    });

    ipcMain.handle(IPC_CHANNELS.MOCK_GET_ROUTES, async () => {
        return getRoutes();
    });

    ipcMain.handle(IPC_CHANNELS.MOCK_SET_ROUTES, async (_event, routes: MockRoute[]) => {
        setRoutes(routes);
    });
}
