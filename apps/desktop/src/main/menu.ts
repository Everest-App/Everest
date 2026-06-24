import { app, Menu, MenuItemConstructorOptions, shell, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';

const isMac = process.platform === 'darwin';

export function createAppMenu(mainWindow: BrowserWindow): Menu {
    const sendAction = (action: string) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.MENU_ACTION, action);
        }
    };

    const template: MenuItemConstructorOptions[] = [
        // App Menu (macOS only)
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { label: 'About Everest', click: () => sendAction('show-about') },
                    { type: 'separator' },
                    { label: 'Preferences', click: () => sendAction('show-preferences') },
                    { type: 'separator' },
                    { role: 'services' as const },
                    { type: 'separator' },
                    { role: 'hide' as const },
                    { role: 'hideOthers' as const },
                    { role: 'unhide' as const },
                    { type: 'separator' },
                    { role: 'quit' as const },
                ],
            } as MenuItemConstructorOptions]
            : []),
        
        {
            label: 'File',
            submenu: [
                { label: 'New Request', click: () => sendAction('new-request') },
                { label: 'New Collection', click: () => sendAction('new-collection') },
                { label: 'New Folder', click: () => sendAction('new-folder') },
                { type: 'separator' },
                { label: 'Import cURL', click: () => sendAction('import-curl') },
                { label: 'Import Collection', click: () => sendAction('import-collection') },
                { label: 'Import Environment', click: () => sendAction('import-environment') },
                { type: 'separator' },
                { label: 'Export Collection', click: () => sendAction('export-collection') },
                { label: 'Export Environment', click: () => sendAction('export-environment') },
                { label: 'Export Runner Report', click: () => sendAction('export-runner-report') },
                { type: 'separator' },
                { label: 'Save Request', accelerator: 'CmdOrCtrl+S', click: () => sendAction('save-request') },
                { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendAction('save-as') },
                { type: 'separator' },
                { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => sendAction('close-tab') },
                isMac ? { role: 'close' as const } : { role: 'quit' as const },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' as const },
                { role: 'redo' as const },
                { type: 'separator' },
                { role: 'cut' as const },
                { role: 'copy' as const },
                { role: 'paste' as const },
                { type: 'separator' },
                { label: 'Duplicate Request', click: () => sendAction('duplicate-request') },
                { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendAction('find') },
                { label: 'Find in Collection', click: () => sendAction('find-in-collection') },
                ...(!isMac
                    ? [
                        { type: 'separator' },
                        { label: 'Preferences', click: () => sendAction('show-preferences') },
                    ] as MenuItemConstructorOptions[]
                    : []),
            ],
        },
        {
            label: 'View',
            submenu: [
                { label: 'Light Theme', click: () => sendAction('theme-light') },
                { label: 'Dark Theme', click: () => sendAction('theme-dark') },
                { type: 'separator' },
                { role: 'zoomIn' as const },
                { role: 'zoomOut' as const },
                { role: 'resetZoom' as const },
                { type: 'separator' },
                { role: 'toggleDevTools' as const },
                { type: 'separator' },
                { label: 'Show Collections', click: () => sendAction('show-collections') },
                { label: 'Show Environments', click: () => sendAction('show-environments') },
                { label: 'Show Runner', click: () => sendAction('show-runner') },
                { label: 'Reset Layout', click: () => sendAction('reset-layout') },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { label: 'New Window', click: () => sendAction('new-window') },
                { role: 'minimize' as const },
                ...(isMac ? [
                    { role: 'zoom' as const },
                    { type: 'separator' },
                    { role: 'front' as const },
                ] as MenuItemConstructorOptions[] : [
                    { role: 'zoom' as const }
                ] as MenuItemConstructorOptions[]),
                { type: 'separator' },
                { label: 'Next Tab', accelerator: 'Control+Tab', click: () => sendAction('next-tab') },
                { label: 'Previous Tab', accelerator: 'Control+Shift+Tab', click: () => sendAction('previous-tab') },
            ],
        },
        {
            label: 'Help',
            submenu: [
                { label: 'Documentation', click: () => shell.openExternal('https://github.com/api-platform') },
                { label: 'Keyboard Shortcuts', click: () => sendAction('show-shortcuts') },
                { type: 'separator' },
                { label: 'Release Notes', click: () => shell.openExternal('https://github.com/api-platform/releases') },
                { label: 'Check for Updates', click: () => sendAction('check-updates') },
                { label: 'GitHub Repository', click: () => shell.openExternal('https://github.com/api-platform') },
                { label: 'Report Issue', click: () => shell.openExternal('https://github.com/api-platform/issues') },
                ...(!isMac
                    ? [
                        { type: 'separator' },
                        { label: 'About Everest', click: () => sendAction('show-about') },
                    ] as MenuItemConstructorOptions[]
                    : []),
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
}
