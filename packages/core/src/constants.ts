// IPC Channel Names — single source of truth
export const IPC_CHANNELS = {
    REQUEST_SEND: 'request:send',
    REQUEST_CANCEL: 'request:cancel',
    HISTORY_GET_ALL: 'history:getAll',
    HISTORY_SEARCH: 'history:search',
    HISTORY_DELETE: 'history:delete',
    HISTORY_CLEAR: 'history:clear',
    CODEGEN_GENERATE: 'codegen:generate',
    // Collections
    COLLECTIONS_GET_ALL: 'collections:getAll',
    COLLECTIONS_CREATE: 'collections:create',
    COLLECTIONS_UPDATE: 'collections:update',
    COLLECTIONS_DELETE: 'collections:delete',
    COLLECTIONS_DUPLICATE: 'collections:duplicate',
    COLLECTIONS_ADD_ITEM: 'collections:addItem',
    COLLECTIONS_UPDATE_ITEM: 'collections:updateItem',
    COLLECTIONS_DELETE_ITEM: 'collections:deleteItem',
    COLLECTIONS_MOVE_ITEM: 'collections:moveItem',
    COLLECTIONS_REORDER: 'collections:reorder',
    // Environments
    ENVIRONMENTS_GET_ALL: 'environments:getAll',
    ENVIRONMENTS_CREATE: 'environments:create',
    ENVIRONMENTS_UPDATE: 'environments:update',
    ENVIRONMENTS_DELETE: 'environments:delete',
    GLOBALS_GET: 'globals:get',
    GLOBALS_SET: 'globals:set',
    // Import / Export
    IMPORT_DATA: 'import:data',
    EXPORT_COLLECTION: 'export:collection',
    IMPORT_FILE: 'import:file',
    // Scripts & Runner
    SCRIPT_RUN: 'script:run',
    RUNNER_RUN: 'runner:run',
    RUNNER_PROGRESS: 'runner:progress',
    RUNNER_ITEM_RESULT: 'runner:item-result',
    RUNNER_CANCEL: 'runner:cancel',
    RUNNER_PAUSE: 'runner:pause',
    RUNNER_RESUME: 'runner:resume',
    RUNNER_STATUS: 'runner:status',
    RUNNER_EXPORT: 'runner:export',
    // GraphQL
    GRAPHQL_SEND: 'graphql:send',
    GRAPHQL_INTROSPECT: 'graphql:introspect',
    // WebSocket
    WS_CONNECT: 'ws:connect',
    WS_SEND: 'ws:send',
    WS_DISCONNECT: 'ws:disconnect',
    WS_MESSAGE: 'ws:message',
    // SSE
    SSE_CONNECT: 'sse:connect',
    SSE_DISCONNECT: 'sse:disconnect',
    SSE_EVENT: 'sse:event',
    // Plugins
    PLUGINS_GET_ALL: 'plugins:get-all',
    PLUGINS_INSTALL: 'plugins:install',
    PLUGINS_UNINSTALL: 'plugins:uninstall',
    PLUGINS_ENABLE: 'plugins:enable',
    PLUGINS_DISABLE: 'plugins:disable',
    PLUGINS_UPDATE_SETTINGS: 'plugins:update-settings',
    PLUGINS_CATALOG: 'plugins:catalog',
    // Mock Server
    MOCK_START: 'mock:start',
    MOCK_STOP: 'mock:stop',
    MOCK_STATUS: 'mock:status',
    MOCK_GET_ROUTES: 'mock:get-routes',
    MOCK_SET_ROUTES: 'mock:set-routes',
    MOCK_REQUEST: 'mock:request',
    // System
    MENU_ACTION: 'menu:action',
} as const;

// Default request template
export const DEFAULT_HTTP_METHOD = 'GET' as const;
export const DEFAULT_BODY_TYPE = 'none' as const;
export const DEFAULT_AUTH_TYPE = 'none' as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;

export const BODY_TYPES = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'form-data', label: 'Form Data' },
    { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { value: 'binary', label: 'Binary' },
    { value: 'raw', label: 'Raw' },
] as const;

export const AUTH_TYPES = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'api-key', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' },
] as const;

export const CODEGEN_TARGETS = [
    { value: 'curl', label: 'cURL' },
    { value: 'fetch', label: 'JavaScript Fetch' },
    { value: 'axios', label: 'Axios' },
    { value: 'python-requests', label: 'Python Requests' },
    { value: 'csharp', label: 'C# HttpClient' },
    { value: 'dotnet', label: '.NET HttpClient' },
    { value: 'restsharp', label: 'C# (RestSharp v114)' },
    { value: 'java', label: 'Java OkHttp' },
    { value: 'go', label: 'Go net/http' },
    { value: 'php', label: 'PHP Guzzle' },
    { value: 'dart', label: 'Dart Dio' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
    '2': '#22c55e', // green for 2xx
    '3': '#3b82f6', // blue for 3xx
    '4': '#f59e0b', // amber for 4xx
    '5': '#ef4444', // red for 5xx
};
