import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { GraphQLRequest, KeyValuePair, WebSocketConfig, SSEConfig } from '@api-platform/core';
import { sendGraphQL, introspectGraphQL } from '../services/graphql-service';
import { wsConnect, wsSend, wsDisconnect } from '../services/websocket-service';
import { sseConnect, sseDisconnect } from '../services/sse-service';

export function registerProtocolHandlers(): void {
    // GraphQL
    ipcMain.handle(IPC_CHANNELS.GRAPHQL_SEND, async (_event, req: GraphQLRequest) => {
        return sendGraphQL(req);
    });

    ipcMain.handle(IPC_CHANNELS.GRAPHQL_INTROSPECT, async (_event, url: string, headers: KeyValuePair[]) => {
        return introspectGraphQL(url, headers);
    });

    // WebSocket
    ipcMain.handle(IPC_CHANNELS.WS_CONNECT, async (event, config: WebSocketConfig) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        wsConnect(config, window);
    });

    ipcMain.handle(IPC_CHANNELS.WS_SEND, async (_event, data: string) => {
        wsSend(data);
    });

    ipcMain.handle(IPC_CHANNELS.WS_DISCONNECT, async () => {
        wsDisconnect();
    });

    // SSE
    ipcMain.handle(IPC_CHANNELS.SSE_CONNECT, async (event, config: SSEConfig) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        sseConnect(config, window);
    });

    ipcMain.handle(IPC_CHANNELS.SSE_DISCONNECT, async () => {
        sseDisconnect();
    });
}
