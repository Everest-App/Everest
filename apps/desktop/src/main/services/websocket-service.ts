import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import { randomUUID as uuidv4 } from 'crypto';
import { WebSocketConfig, WebSocketMessage } from '@api-platform/core';
import { IPC_CHANNELS } from '@api-platform/core';

let activeSocket: WebSocket | null = null;
let senderWindow: BrowserWindow | null = null;

function emitMessage(msg: WebSocketMessage) {
    if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send(IPC_CHANNELS.WS_MESSAGE, msg);
    }
}

export function wsConnect(config: WebSocketConfig, window: BrowserWindow | null): void {
    // Disconnect any existing connection
    wsDisconnect();

    senderWindow = window;
    const headers: Record<string, string> = {};
    for (const h of config.headers || []) {
        if (h.enabled && h.key) headers[h.key] = h.value;
    }

    activeSocket = new WebSocket(config.url, config.protocols || [], { headers });

    activeSocket.on('open', () => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: `Connected to ${config.url}`,
            timestamp: Date.now(),
            type: 'open',
        });
    });

    activeSocket.on('message', (data: WebSocket.Data) => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: data.toString(),
            timestamp: Date.now(),
            type: 'text',
        });
    });

    activeSocket.on('ping', (data: Buffer) => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: `PING: ${data.toString()}`,
            timestamp: Date.now(),
            type: 'ping',
        });
    });

    activeSocket.on('pong', (data: Buffer) => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: `PONG: ${data.toString()}`,
            timestamp: Date.now(),
            type: 'pong',
        });
    });

    activeSocket.on('close', (code: number, reason: Buffer) => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: `Disconnected (code: ${code}, reason: ${reason.toString() || 'none'})`,
            timestamp: Date.now(),
            type: 'close',
        });
        activeSocket = null;
    });

    activeSocket.on('error', (err: Error) => {
        emitMessage({
            id: uuidv4(),
            direction: 'received',
            data: `Error: ${err.message}`,
            timestamp: Date.now(),
            type: 'error',
        });
    });
}

export function wsSend(data: string): void {
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
    }
    activeSocket.send(data);
    emitMessage({
        id: uuidv4(),
        direction: 'sent',
        data,
        timestamp: Date.now(),
        type: 'text',
    });
}

export function wsDisconnect(): void {
    if (activeSocket) {
        try { activeSocket.close(); } catch { /* ignore */ }
        activeSocket = null;
    }
    senderWindow = null;
}
