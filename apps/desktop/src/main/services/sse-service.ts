import { BrowserWindow } from 'electron';
import { randomUUID as uuidv4 } from 'crypto';
import http from 'http';
import https from 'https';
import { SSEConfig, SSEEvent } from '@api-platform/core';
import { IPC_CHANNELS } from '@api-platform/core';

let activeRequest: http.ClientRequest | null = null;
let senderWindow: BrowserWindow | null = null;

function emitEvent(event: SSEEvent) {
    if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send(IPC_CHANNELS.SSE_EVENT, event);
    }
}

export function sseConnect(config: SSEConfig, window: BrowserWindow | null): void {
    sseDisconnect();
    senderWindow = window;

    const url = new URL(config.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
    };
    for (const h of config.headers || []) {
        if (h.enabled && h.key) headers[h.key] = h.value;
    }

    const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers,
    };

    activeRequest = lib.request(options, (res) => {
        if (res.statusCode !== 200) {
            emitEvent({
                id: uuidv4(),
                eventType: 'error',
                data: `HTTP ${res.statusCode} ${res.statusMessage}`,
                timestamp: Date.now(),
            });
            return;
        }

        emitEvent({
            id: uuidv4(),
            eventType: 'open',
            data: `Connected to ${config.url}`,
            timestamp: Date.now(),
        });

        let buffer = '';
        let currentEvent: Partial<SSEEvent> = {};

        res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete last line

            for (const line of lines) {
                if (line === '') {
                    // Empty line = dispatch event
                    if (currentEvent.data !== undefined) {
                        emitEvent({
                            id: uuidv4(),
                            eventType: currentEvent.eventType || 'message',
                            data: currentEvent.data || '',
                            timestamp: Date.now(),
                            lastEventId: currentEvent.lastEventId,
                        });
                    }
                    currentEvent = {};
                } else if (line.startsWith('data:')) {
                    const val = line.slice(5).trimStart();
                    currentEvent.data = currentEvent.data ? currentEvent.data + '\n' + val : val;
                } else if (line.startsWith('event:')) {
                    currentEvent.eventType = line.slice(6).trimStart();
                } else if (line.startsWith('id:')) {
                    currentEvent.lastEventId = line.slice(3).trimStart();
                }
                // Ignore retry: and comments (:)
            }
        });

        res.on('end', () => {
            emitEvent({
                id: uuidv4(),
                eventType: 'close',
                data: 'Connection closed by server',
                timestamp: Date.now(),
            });
            activeRequest = null;
        });

        res.on('error', (err: Error) => {
            emitEvent({
                id: uuidv4(),
                eventType: 'error',
                data: err.message,
                timestamp: Date.now(),
            });
        });
    });

    activeRequest.on('error', (err: Error) => {
        emitEvent({
            id: uuidv4(),
            eventType: 'error',
            data: err.message,
            timestamp: Date.now(),
        });
    });

    activeRequest.end();
}

export function sseDisconnect(): void {
    if (activeRequest) {
        try { activeRequest.destroy(); } catch { /* ignore */ }
        activeRequest = null;
    }
    senderWindow = null;
}
