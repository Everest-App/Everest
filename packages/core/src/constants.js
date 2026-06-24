"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_COLORS = exports.CODEGEN_TARGETS = exports.AUTH_TYPES = exports.BODY_TYPES = exports.HTTP_METHODS = exports.DEFAULT_AUTH_TYPE = exports.DEFAULT_BODY_TYPE = exports.DEFAULT_HTTP_METHOD = exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    REQUEST_SEND: 'request:send',
    HISTORY_GET_ALL: 'history:getAll',
    HISTORY_SEARCH: 'history:search',
    HISTORY_DELETE: 'history:delete',
    HISTORY_CLEAR: 'history:clear',
    CODEGEN_GENERATE: 'codegen:generate',
    COLLECTIONS_GET_ALL: 'collections:getAll',
    COLLECTIONS_CREATE: 'collections:create',
    COLLECTIONS_UPDATE: 'collections:update',
    COLLECTIONS_DELETE: 'collections:delete',
    COLLECTIONS_DUPLICATE: 'collections:duplicate',
    COLLECTIONS_ADD_ITEM: 'collections:addItem',
    COLLECTIONS_UPDATE_ITEM: 'collections:updateItem',
    COLLECTIONS_DELETE_ITEM: 'collections:deleteItem',
    ENVIRONMENTS_GET_ALL: 'environments:getAll',
    ENVIRONMENTS_CREATE: 'environments:create',
    ENVIRONMENTS_UPDATE: 'environments:update',
    ENVIRONMENTS_DELETE: 'environments:delete',
    GLOBALS_GET: 'globals:get',
    GLOBALS_SET: 'globals:set',
    IMPORT_DATA: 'import:data',
    EXPORT_COLLECTION: 'export:collection',
    IMPORT_FILE: 'import:file',
    SCRIPT_RUN: 'script:run',
    RUNNER_RUN: 'runner:run',
    RUNNER_PROGRESS: 'runner:progress',
    RUNNER_ITEM_RESULT: 'runner:item-result',
    GRAPHQL_SEND: 'graphql:send',
    GRAPHQL_INTROSPECT: 'graphql:introspect',
    WS_CONNECT: 'ws:connect',
    WS_SEND: 'ws:send',
    WS_DISCONNECT: 'ws:disconnect',
    WS_MESSAGE: 'ws:message',
    SSE_CONNECT: 'sse:connect',
    SSE_DISCONNECT: 'sse:disconnect',
    SSE_EVENT: 'sse:event',
    PLUGINS_GET_ALL: 'plugins:get-all',
    PLUGINS_INSTALL: 'plugins:install',
    PLUGINS_UNINSTALL: 'plugins:uninstall',
    PLUGINS_ENABLE: 'plugins:enable',
    PLUGINS_DISABLE: 'plugins:disable',
    PLUGINS_UPDATE_SETTINGS: 'plugins:update-settings',
    PLUGINS_CATALOG: 'plugins:catalog',
    MOCK_START: 'mock:start',
    MOCK_STOP: 'mock:stop',
    MOCK_STATUS: 'mock:status',
    MOCK_GET_ROUTES: 'mock:get-routes',
    MOCK_SET_ROUTES: 'mock:set-routes',
    MOCK_REQUEST: 'mock:request',
};
exports.DEFAULT_HTTP_METHOD = 'GET';
exports.DEFAULT_BODY_TYPE = 'none';
exports.DEFAULT_AUTH_TYPE = 'none';
exports.HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
exports.BODY_TYPES = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'form-data', label: 'Form Data' },
    { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
    { value: 'binary', label: 'Binary' },
    { value: 'raw', label: 'Raw' },
];
exports.AUTH_TYPES = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'api-key', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' },
];
exports.CODEGEN_TARGETS = [
    { value: 'curl', label: 'cURL' },
    { value: 'fetch', label: 'JavaScript Fetch' },
    { value: 'axios', label: 'Axios' },
    { value: 'python-requests', label: 'Python Requests' },
];
exports.STATUS_COLORS = {
    '2': '#22c55e',
    '3': '#3b82f6',
    '4': '#f59e0b',
    '5': '#ef4444',
};
