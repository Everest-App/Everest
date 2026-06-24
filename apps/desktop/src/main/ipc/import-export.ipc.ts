import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { IPC_CHANNELS } from '@api-platform/core';
import { ImportFormat, ExportFormat } from '@api-platform/core';
import { importData, exportCollection } from '../services/import-export-service';
import { getAllCollections } from '../services/collection-service';

export function registerImportExportHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.IMPORT_DATA, async (_event, content: string, format: ImportFormat, customName?: string) => {
        return importData(content, format, customName);
    });

    ipcMain.handle(IPC_CHANNELS.EXPORT_COLLECTION, async (_event, id: string, format: ExportFormat) => {
        const collections = getAllCollections();
        const collection = collections.find(c => c.id === id);
        if (!collection) throw new Error(`Collection not found: ${id}`);
        return exportCollection(collection, format);
    });

    ipcMain.handle(IPC_CHANNELS.IMPORT_FILE, async (event, forceFormat?: ImportFormat) => {
        const window = require('electron').BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(window!, {
            title: 'Import Collection',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'YAML Files', extensions: ['yml', 'yaml'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, errors: ['Import cancelled'] };
        }

        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');

        // Auto-detect format if not forced
        let format: ImportFormat | undefined = forceFormat;
        if (!format) {
            try {
                const parsed = JSON.parse(content);
                if (parsed.openapi || parsed.swagger) {
                    format = 'openapi';
                } else if (parsed.info?.schema?.includes('getpostman')) {
                    format = 'postman-v2.1';
                } else if (parsed.name && Array.isArray(parsed.values)) {
                    format = 'postman-env';
                }
            } catch {
                // If not JSON, try as cURL
                if (content.trim().startsWith('curl')) {
                    format = 'curl';
                }
            }
        }

        if (!format) {
            return { success: false, errors: ['Could not auto-detect format'] };
        }

        return importData(content, format);
    });
}
