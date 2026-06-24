import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import {
  RequestConfig, ResponseData, HistoryEntry, CodeGenTarget, CodeGenResult,
  Collection, CollectionItem, Environment, Variable,
  ImportFormat, ExportFormat, ImportResult,
  ScriptContext, ScriptResult, SendRequestResult, RunnerConfig, RunnerResult,
  GraphQLRequest, GraphQLResponse, GraphQLIntrospection, KeyValuePair,
  WebSocketConfig, WebSocketMessage, SSEConfig, SSEEvent,
  MockServerConfig, MockServerStatus, MockRoute, MockRequestLog,
  ElectronAPI,
} from '@api-platform/core';

const api: ElectronAPI = {
  sendRequest: (config: RequestConfig, environmentId?: string): Promise<SendRequestResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.REQUEST_SEND, config, environmentId),
  cancelRequest: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REQUEST_CANCEL),
  getHistory: (): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_ALL),
  searchHistory: (query: string): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_SEARCH, query),
  deleteHistoryEntry: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id),
  clearHistory: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
  generateCode: (config: RequestConfig, target: CodeGenTarget): Promise<CodeGenResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.CODEGEN_GENERATE, config, target),
  getCollections: (): Promise<Collection[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_GET_ALL),
  createCollection: (name: string, description?: string): Promise<Collection> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_CREATE, name, description),
  updateCollection: (id: string, name: string, description?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_UPDATE, id, name, description),
  deleteCollection: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DELETE, id),
  addCollectionItem: (collectionId: string, parentId: string | null, item: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'>): Promise<CollectionItem> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_ADD_ITEM, collectionId, parentId, item),
  updateCollectionItem: (item: CollectionItem): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_UPDATE_ITEM, item),
  deleteCollectionItem: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DELETE_ITEM, id),
  duplicateCollection: (id: string): Promise<Collection> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_DUPLICATE, id),
  moveCollectionItem: (itemId: string, newParentId: string | null, newSortOrder: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_MOVE_ITEM, itemId, newParentId, newSortOrder),
  reorderCollectionItems: (items: Array<{ id: string; sortOrder: number }>): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLLECTIONS_REORDER, items),
  getEnvironments: (): Promise<Environment[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENTS_GET_ALL),
  createEnvironment: (name: string): Promise<Environment> =>
    ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENTS_CREATE, name),
  updateEnvironment: (env: Environment): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENTS_UPDATE, env),
  deleteEnvironment: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.ENVIRONMENTS_DELETE, id),
  getGlobalVariables: (): Promise<Variable[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GLOBALS_GET),
  setGlobalVariables: (vars: Variable[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.GLOBALS_SET, vars),
  importData: (content: string, format: ImportFormat, customName?: string): Promise<ImportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_DATA, content, format, customName),
  exportCollection: (id: string, format: ExportFormat): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_COLLECTION, id, format),
  importFile: (format?: ImportFormat): Promise<ImportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILE, format),
  runScript: (script: string, context: ScriptContext, phase: 'pre-request' | 'test'): Promise<ScriptResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCRIPT_RUN, script, context, phase),
  runCollection: (config: RunnerConfig): Promise<RunnerResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNNER_RUN, config),
  cancelRunner: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUNNER_CANCEL),
  onRunnerProgress: (cb) => { ipcRenderer.on(IPC_CHANNELS.RUNNER_PROGRESS, (_e, p) => cb(p)); },
  removeRunnerProgressListener: () => { ipcRenderer.removeAllListeners(IPC_CHANNELS.RUNNER_PROGRESS); },
  onRunnerItemResult: (cb) => { ipcRenderer.on(IPC_CHANNELS.RUNNER_ITEM_RESULT, (_e, item) => cb(item)); },
  removeRunnerItemResultListener: () => { ipcRenderer.removeAllListeners(IPC_CHANNELS.RUNNER_ITEM_RESULT); },
  sendGraphQL: (req: GraphQLRequest): Promise<GraphQLResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.GRAPHQL_SEND, req),
  introspectGraphQL: (url: string, headers: KeyValuePair[]): Promise<GraphQLIntrospection> =>
    ipcRenderer.invoke(IPC_CHANNELS.GRAPHQL_INTROSPECT, url, headers),
  wsConnect: (config: WebSocketConfig): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WS_CONNECT, config),
  wsSend: (data: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WS_SEND, data),
  wsDisconnect: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WS_DISCONNECT),
  onWsMessage: (cb) => { ipcRenderer.on(IPC_CHANNELS.WS_MESSAGE, (_e, m) => cb(m)); },
  removeWsListeners: () => { ipcRenderer.removeAllListeners(IPC_CHANNELS.WS_MESSAGE); },
  sseConnect: (config: SSEConfig): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SSE_CONNECT, config),
  sseDisconnect: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SSE_DISCONNECT),
  onSseEvent: (cb) => { ipcRenderer.on(IPC_CHANNELS.SSE_EVENT, (_e, ev) => cb(ev)); },
  removeSseListeners: () => { ipcRenderer.removeAllListeners(IPC_CHANNELS.SSE_EVENT); },
  // Mock Server
  mockStart: (config: MockServerConfig): Promise<MockServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOCK_START, config),
  mockStop: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOCK_STOP),
  mockGetStatus: (): Promise<MockServerStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOCK_STATUS),
  mockGetRoutes: (): Promise<MockRoute[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOCK_GET_ROUTES),
  mockSetRoutes: (routes: MockRoute[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOCK_SET_ROUTES, routes),
  onMockRequest: (cb) => { ipcRenderer.on(IPC_CHANNELS.MOCK_REQUEST, (_e, log) => cb(log)); },
  removeMockListeners: () => { ipcRenderer.removeAllListeners(IPC_CHANNELS.MOCK_REQUEST); },
  // System
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.MENU_ACTION, (_event, action) => callback(action));
  },
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.MENU_ACTION);
  },
};

contextBridge.exposeInMainWorld('api', api);
