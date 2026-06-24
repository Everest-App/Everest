import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase } from './storage/database';
import { registerAllIpcHandlers } from './ipc';
import { createAppMenu } from './menu';
import { RequestExecutor } from './runtime/request-executor';
import { wsDisconnect } from './services/websocket-service';
import { sseDisconnect } from './services/sse-service';
import { mockStop } from './services/mock-service';
import { cancelAllRuns } from './services/runner-service';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    const isDev = !app.isPackaged;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'Everest',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#0f0f14',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
        },
    });

    Menu.setApplicationMenu(createAppMenu(mainWindow));

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
    }

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (level >= 2) { // warnings and errors
            console.error(`[Renderer Error/Warn] ${message} (${sourceId}:${line})`);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- Data Migration (API Platform -> Everest) ---
const possibleOldNames = ['api-platform-desktop', 'API Platform', 'api-platform'];
const migrationFlagPath = path.join(app.getPath('userData'), '.migrated');

if (!fs.existsSync(migrationFlagPath)) {
    for (const oldName of possibleOldNames) {
        const oldDbPath = path.join(app.getPath('appData'), oldName, 'data', 'api-platform.db');

        if (fs.existsSync(oldDbPath)) {
            const oldUserDataPath = path.join(app.getPath('appData'), oldName);
            const newUserDataPath = app.getPath('userData');
            
            // Skip if somehow the src and dest are exactly the same (e.g. in dev mode)
            if (oldUserDataPath === newUserDataPath) continue;

            if (!fs.existsSync(newUserDataPath)) {
                fs.mkdirSync(newUserDataPath, { recursive: true });
            }

            try {
                // Only copy essential user data folders to avoid locked Cache files
                const foldersToMigrate = ['data', 'Local Storage'];
                
                for (const folder of foldersToMigrate) {
                    const srcFolder = path.join(oldUserDataPath, folder);
                    const destFolder = path.join(newUserDataPath, folder);
                    if (fs.existsSync(srcFolder)) {
                        fs.cpSync(srcFolder, destFolder, { recursive: true, force: true });
                    }
                }
                
                fs.writeFileSync(migrationFlagPath, 'migrated');
                console.log(`[Migration] Successfully migrated essential data from ${oldName} to Everest.`);
                break; // Stop after first successful migration
            } catch (err) {
                console.error(`[Migration] Failed to migrate data from ${oldName}:`, err);
            }
        }
    }
}

app.whenReady().then(async () => {
    // Initialize database (async for sql.js WASM init)
    await initDatabase();

    // Register IPC handlers
    registerAllIpcHandlers();

    // Create the main window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup all open resources before quitting
app.on('before-quit', () => {
    // Cancel any running collections
    cancelAllRuns();
    // Disconnect open protocol connections
    wsDisconnect();
    sseDisconnect();
    mockStop();
    // Release HTTP agent sockets
    RequestExecutor.destroyAgents();
});
