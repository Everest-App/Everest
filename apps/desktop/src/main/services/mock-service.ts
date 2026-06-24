import http from 'http';
import { BrowserWindow } from 'electron';
import { randomUUID as uuidv4 } from 'crypto';
import { MockRoute, MockServerConfig, MockServerStatus, MockRequestLog } from '@api-platform/core';
import { IPC_CHANNELS } from '@api-platform/core';

let server: http.Server | null = null;
let senderWindow: BrowserWindow | null = null;
let currentRoutes: MockRoute[] = [];
let currentPort = 3456;
let requestCount = 0;
let corsEnabled = true;

function emitRequestLog(log: MockRequestLog) {
    if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send(IPC_CHANNELS.MOCK_REQUEST, log);
    }
}

export function mockStart(config: MockServerConfig, window: BrowserWindow | null): Promise<MockServerStatus> {
    return new Promise((resolve, reject) => {
        // Stop existing server
        mockStop();

        senderWindow = window;
        currentRoutes = config.routes;
        currentPort = config.port;
        corsEnabled = config.cors;
        requestCount = 0;

        server = http.createServer((req, res) => {
            const startTime = Date.now();
            requestCount++;

            // CORS
            if (corsEnabled) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', '*');
                res.setHeader('Access-Control-Allow-Headers', '*');
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }
            }

            // Match route
            const method = (req.method || 'GET').toUpperCase();
            const urlPath = req.url || '/';

            const matchedRoute = currentRoutes.find(r =>
                r.enabled &&
                r.method.toUpperCase() === method &&
                matchPath(r.path, urlPath)
            );

            const respond = () => {
                if (matchedRoute) {
                    // Set response headers
                    for (const [key, value] of Object.entries(matchedRoute.responseHeaders)) {
                        if (key && value) res.setHeader(key, value);
                    }
                    if (!matchedRoute.responseHeaders['content-type'] && !matchedRoute.responseHeaders['Content-Type']) {
                        res.setHeader('Content-Type', 'application/json');
                    }
                    res.writeHead(matchedRoute.statusCode);
                    res.end(matchedRoute.responseBody);
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'No matching mock route', method, path: urlPath }));
                }

                emitRequestLog({
                    id: uuidv4(),
                    method,
                    path: urlPath,
                    matchedRouteId: matchedRoute?.id || null,
                    statusCode: matchedRoute?.statusCode || 404,
                    timestamp: Date.now(),
                    duration: Date.now() - startTime,
                });
            };

            if (matchedRoute && matchedRoute.delay > 0) {
                setTimeout(respond, matchedRoute.delay);
            } else {
                respond();
            }
        });

        server.on('error', (err) => {
            reject(err);
        });

        server.listen(config.port, () => {
            resolve(getStatus());
        });
    });
}

export function mockStop(): void {
    if (server) {
        try { server.close(); } catch { /* ignore */ }
        server = null;
    }
    senderWindow = null;
}

export function getStatus(): MockServerStatus {
    return {
        running: server !== null && server.listening,
        port: currentPort,
        routeCount: currentRoutes.filter(r => r.enabled).length,
        requestCount,
    };
}

export function getRoutes(): MockRoute[] {
    return currentRoutes;
}

export function setRoutes(routes: MockRoute[]): void {
    currentRoutes = routes;
}

function matchPath(pattern: string, actual: string): boolean {
    // Remove query string from actual
    const actualPath = actual.split('?')[0];

    // Simple path matching with :param support
    const patternParts = pattern.split('/');
    const actualParts = actualPath.split('/');

    if (patternParts.length !== actualParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) continue; // wildcard param
        if (patternParts[i] === '*') continue; // glob
        if (patternParts[i] !== actualParts[i]) return false;
    }

    return true;
}
