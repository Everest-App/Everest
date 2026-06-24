import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import {
    getAllHistory,
    searchHistory,
    deleteHistoryEntry,
    clearAllHistory,
} from '../services/history-service';

export function registerHistoryHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
        return getAllHistory();
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, async (_event, query: string) => {
        return searchHistory(query);
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_event, id: string) => {
        deleteHistoryEntry(id);
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
        clearAllHistory();
    });
}
