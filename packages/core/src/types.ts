// ─── HTTP Methods ────────────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

// ─── Body Types ──────────────────────────────────────────────────
export type BodyType = 'none' | 'json' | 'xml' | 'form-data' | 'x-www-form-urlencoded' | 'binary' | 'raw';

// ─── Auth Types ──────────────────────────────────────────────────
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';

// ─── Key-Value Pair ──────────────────────────────────────────────
export interface KeyValuePair {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

// ─── Auth Config ─────────────────────────────────────────────────
export interface AuthConfig {
    type: AuthType;
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
    oauth2?: {
        grantType: 'client_credentials' | 'authorization_code';
        accessTokenUrl: string;
        clientId: string;
        clientSecret: string;
        scope?: string;
        authUrl?: string;
        callbackUrl?: string;
        token?: string;
    };
}

// ─── Request Config ──────────────────────────────────────────────
export interface RequestConfig {
    id: string;
    method: HttpMethod;
    url: string;
    params: KeyValuePair[];
    headers: KeyValuePair[];
    body: {
        type: BodyType;
        raw?: string;
        formData?: KeyValuePair[];
        urlencoded?: KeyValuePair[];
        binaryPath?: string;
    };
    auth: AuthConfig;
    preRequestScript?: string;
    testScript?: string;
}

// ─── Response Data ───────────────────────────────────────────────
export interface ResponseData {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    size: number;
    time: number;
    contentType: string;
}

// ─── History Entry ───────────────────────────────────────────────
export interface HistoryEntry {
    id: string;
    timestamp: number;
    request: RequestConfig;
    response: ResponseData;
}

// ─── Code Generation ─────────────────────────────────────────────
export type CodeGenTarget = 'curl' | 'fetch' | 'axios' | 'python-requests'
    | 'csharp' | 'dotnet' | 'restsharp' | 'java' | 'go' | 'php' | 'dart';

export interface CodeGenResult {
    target: CodeGenTarget;
    code: string;
}

// ─── Tab ─────────────────────────────────────────────────────────
export interface Tab {
    id: string;
    title: string;
    request: RequestConfig;
    response: ResponseData | null;
    loading: boolean;
    scriptResults?: {
        preRequest?: ScriptResult;
        test?: ScriptResult;
    };
    /** Tracks whether this tab's request is persisted in a collection */
    savedToCollection?: {
        collectionId: string;
        itemId: string;
    };
}

// ─── Collection ──────────────────────────────────────────────────
export interface CollectionItem {
    id: string;
    name: string;
    type: 'folder' | 'request';
    parentId: string | null; // null = root level
    collectionId: string;
    sortOrder: number;
    request?: RequestConfig; // only for type === 'request'
    children?: CollectionItem[]; // populated at runtime for tree
    preRequestScript?: string; // folder-level pre-request script
    testScript?: string; // folder-level test script
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    variables?: Variable[];
    preRequestScript?: string; // collection-level pre-request script
    testScript?: string; // collection-level test script
    createdAt: number;
    updatedAt: number;
    items: CollectionItem[];
}

// ─── Environment & Variables ─────────────────────────────────────
export interface Variable {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    secret?: boolean;
}

export interface Environment {
    id: string;
    name: string;
    variables: Variable[];
    createdAt: number;
    updatedAt: number;
}

export type VariableScope = 'local' | 'data' | 'environment' | 'collection' | 'global';

// ─── Import / Export ─────────────────────────────────────────────
export type ImportFormat = 'postman-v2.1' | 'postman-env' | 'openapi' | 'curl';
export type ExportFormat = 'postman-v2.1' | 'json';

export interface ImportResult {
    success: boolean;
    collection?: Collection;
    environment?: Environment;
    errors?: string[];
}

// ─── Scripts & Testing ───────────────────────────────────────────
export interface ScriptContext {
    request: RequestConfig;
    response?: ResponseData;
    variables: Record<string, string>;
    globals: Record<string, string>;
    environment: Record<string, string>;
    collectionVariables: Record<string, string>;
    iterationData?: Record<string, any>;
}

export interface TestAssertion {
    name: string;
    passed: boolean;
    error?: string;
}

export interface ScriptResult {
    success: boolean;
    assertions: TestAssertion[];
    consoleOutput: string[];
    error?: string;
    updatedVariables?: Record<string, string>;
    updatedRequest?: Partial<RequestConfig>;
}

export interface SendRequestResult {
    response: ResponseData;
    preRequestResult?: ScriptResult;
    testResult?: ScriptResult;
}

// ─── Collection Runner ───────────────────────────────────────────
export interface RunnerConfig {
    collectionId: string;
    folderId?: string; // optional — when set, only run requests within this folder
    environmentId?: string;
    iterations: number;
    delayMs: number;
    dataFile?: string; // JSON array of row objects for data-driven runs
    csvData?: string;  // Raw CSV file content for CSV-driven iteration
    stopOnError: boolean;
}

export interface RunnerItemResult {
    itemId: string;
    itemName: string;
    iteration: number;
    request: RequestConfig;
    response?: ResponseData;
    testResults: TestAssertion[];
    passed: boolean;
    error?: string;
    duration: number;
    csvVariables?: Record<string, string>; // CSV row values used in this iteration
    // ── Structured log fields ──
    consoleOutput?: string[];               // merged console.log output from pre-request + test scripts
    scriptError?: string;                   // structured script error (pre-request or test)
    requestHeaders?: Record<string, string>; // final interpolated headers that were sent
    responseHeaders?: Record<string, string>; // response headers received
}

export interface RunnerResult {
    collectionId: string;
    collectionName: string;
    totalRequests: number;
    totalPassed: number;
    totalFailed: number;
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
    totalDuration: number;
    iterations: number;
    results: RunnerItemResult[];
    startedAt: number;
    completedAt: number;
    aborted?: boolean; // true if user cancelled mid-run
}

// ─── Collection Management (Drag & Drop, Save-to-Folder) ─────────
export interface MoveItemRequest {
    itemId: string;
    newParentId: string | null;
    newSortOrder: number;
}

export interface SaveToFolderMetadata {
    lastStatus?: number;
    lastStatusText?: string;
    lastResponseTime?: number;
    lastResponseSize?: number;
    savedAt: number;
}

// ─── GraphQL ─────────────────────────────────────────────────────
export interface GraphQLRequest {
    url: string;
    query: string;
    variables?: string;
    operationName?: string;
    headers: KeyValuePair[];
}

export interface GraphQLResponse {
    data: any;
    errors?: Array<{ message: string; locations?: any[]; path?: any[] }>;
    status: number;
    time: number;
    size: number;
}

export interface GraphQLSchemaField {
    name: string;
    type: string;
    args?: Array<{ name: string; type: string }>;
    description?: string;
}

export interface GraphQLIntrospection {
    queryType: { fields: GraphQLSchemaField[] };
    mutationType?: { fields: GraphQLSchemaField[] };
    subscriptionType?: { fields: GraphQLSchemaField[] };
    types: Array<{ name: string; kind: string; fields?: GraphQLSchemaField[] }>;
}

// ─── WebSocket ───────────────────────────────────────────────────
export interface WebSocketMessage {
    id: string;
    direction: 'sent' | 'received';
    data: string;
    timestamp: number;
    type: 'text' | 'binary' | 'ping' | 'pong' | 'open' | 'close' | 'error';
}

export interface WebSocketConfig {
    url: string;
    protocols?: string[];
    headers?: KeyValuePair[];
}

// ─── SSE ─────────────────────────────────────────────────────────
export interface SSEEvent {
    id: string;
    eventType: string;
    data: string;
    timestamp: number;
    lastEventId?: string;
}

export interface SSEConfig {
    url: string;
    headers?: KeyValuePair[];
    withCredentials?: boolean;
}

// ─── Plugins ─────────────────────────────────────────────────────
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    icon?: string;
    category: 'auth' | 'transform' | 'testing' | 'utility' | 'visualization' | 'other';
    hooks: PluginHookType[];
    settings?: PluginSetting[];
}

export type PluginHookType = 'pre-request' | 'post-response' | 'request-transform' | 'response-transform';

export interface PluginSetting {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    default: any;
    options?: string[]; // for select type
    description?: string;
}

export interface PluginInfo {
    manifest: PluginManifest;
    enabled: boolean;
    installed: boolean;
    settingsValues: Record<string, any>;
}

export interface PluginHookResult {
    modified: boolean;
    data?: any;
    logs?: string[];
}

// ─── Mock Server ─────────────────────────────────────────────────
export interface MockRoute {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
    delay: number;
    enabled: boolean;
    description?: string;
}

export interface MockServerConfig {
    port: number;
    routes: MockRoute[];
    cors: boolean;
}

export interface MockServerStatus {
    running: boolean;
    port: number;
    routeCount: number;
    requestCount: number;
}

export interface MockRequestLog {
    id: string;
    method: string;
    path: string;
    matchedRouteId: string | null;
    statusCode: number;
    timestamp: number;
    duration: number;
}

// ─── IPC API exposed via contextBridge ───────────────────────────
export interface ElectronAPI {
    // Request
    sendRequest: (config: RequestConfig, environmentId?: string) => Promise<SendRequestResult>;
    cancelRequest: () => Promise<void>;
    // History
    getHistory: () => Promise<HistoryEntry[]>;
    searchHistory: (query: string) => Promise<HistoryEntry[]>;
    deleteHistoryEntry: (id: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    // Code Gen
    generateCode: (config: RequestConfig, target: CodeGenTarget) => Promise<CodeGenResult>;
    // Collections
    getCollections: () => Promise<Collection[]>;
    createCollection: (name: string, description?: string) => Promise<Collection>;
    updateCollection: (id: string, name: string, description?: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    addCollectionItem: (collectionId: string, parentId: string | null, item: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'>) => Promise<CollectionItem>;
    updateCollectionItem: (item: CollectionItem) => Promise<void>;
    deleteCollectionItem: (id: string) => Promise<void>;
    duplicateCollection: (id: string) => Promise<Collection>;
    moveCollectionItem: (itemId: string, newParentId: string | null, newSortOrder: number) => Promise<void>;
    reorderCollectionItems: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>;
    // Environments
    getEnvironments: () => Promise<Environment[]>;
    createEnvironment: (name: string) => Promise<Environment>;
    updateEnvironment: (env: Environment) => Promise<void>;
    deleteEnvironment: (id: string) => Promise<void>;
    getGlobalVariables: () => Promise<Variable[]>;
    setGlobalVariables: (vars: Variable[]) => Promise<void>;
    // Import / Export
    importData: (content: string, format: ImportFormat, customName?: string) => Promise<ImportResult>;
    exportCollection: (id: string, format: ExportFormat) => Promise<string>;
    importFile: (format?: ImportFormat) => Promise<ImportResult>;
    // Scripts
    runScript: (script: string, context: ScriptContext, phase: 'pre-request' | 'test') => Promise<ScriptResult>;
    // Runner
    runCollection: (config: RunnerConfig) => Promise<RunnerResult>;
    cancelRunner: () => Promise<void>;
    onRunnerProgress: (callback: (progress: { current: number; total: number; itemName: string }) => void) => void;
    removeRunnerProgressListener: () => void;
    onRunnerItemResult: (callback: (item: RunnerItemResult) => void) => void;
    removeRunnerItemResultListener: () => void;
    // GraphQL
    sendGraphQL: (req: GraphQLRequest) => Promise<GraphQLResponse>;
    introspectGraphQL: (url: string, headers: KeyValuePair[]) => Promise<GraphQLIntrospection>;
    // WebSocket
    wsConnect: (config: WebSocketConfig) => Promise<void>;
    wsSend: (data: string) => Promise<void>;
    wsDisconnect: () => Promise<void>;
    onWsMessage: (callback: (msg: WebSocketMessage) => void) => void;
    removeWsListeners: () => void;
    // SSE
    sseConnect: (config: SSEConfig) => Promise<void>;
    sseDisconnect: () => Promise<void>;
    onSseEvent: (callback: (event: SSEEvent) => void) => void;
    removeSseListeners: () => void;
    // Mock Server
    mockStart: (config: MockServerConfig) => Promise<MockServerStatus>;
    mockStop: () => Promise<void>;
    mockGetStatus: () => Promise<MockServerStatus>;
    mockGetRoutes: () => Promise<MockRoute[]>;
    mockSetRoutes: (routes: MockRoute[]) => Promise<void>;
    onMockRequest: (callback: (log: MockRequestLog) => void) => void;
    removeMockListeners: () => void;
    // System
    onMenuAction: (callback: (action: string) => void) => void;
    removeMenuActionListener: () => void;
}

declare global {
    interface Window {
        api: ElectronAPI;
    }
}

// ─── Script Execution Phase ──────────────────────────────────────
export type ScriptPhase = 'pre-request' | 'test';
export type ScriptLevel = 'collection' | 'folder' | 'request';

// ─── Enhanced Script Context ─────────────────────────────────────
export interface RuntimeScriptContext {
    request: RequestConfig;
    response?: ResponseData;
    /** 5-tier variable scopes */
    scopes: VariableScopeMap;
    /** Current execution metadata */
    info: ExecutionInfo;
    /** Cookie jar for the session */
    cookies?: CookieJar;
}

export interface VariableScopeMap {
    local: Record<string, any>;
    data: Record<string, any>;
    environment: Record<string, string>;
    collection: Record<string, string>;
    global: Record<string, string>;
}

export interface ExecutionInfo {
    eventName: ScriptPhase;
    iteration: number;
    iterationCount: number;
    requestName: string;
    requestId: string;
}

// ─── Enhanced Script Result ──────────────────────────────────────
export interface RuntimeScriptResult {
    success: boolean;
    assertions: RuntimeTestAssertion[];
    consoleOutput: ConsoleEntry[];
    error?: string;
    /** Per-scope variable mutations */
    mutations?: VariableMutations;
    /** Request modifications from pre-request scripts */
    requestOverrides?: Partial<RequestConfig>;
    /** Execution timing */
    executionTimeMs: number;
}

export interface ConsoleEntry {
    level: 'log' | 'info' | 'warn' | 'error';
    args: string[];
    timestamp: number;
}

export interface VariableMutations {
    local: VariableMutation[];
    environment: VariableMutation[];
    collection: VariableMutation[];
    global: VariableMutation[];
}

export interface VariableMutation {
    operation: 'set' | 'unset';
    key: string;
    value?: any;
}

// ─── Enhanced Test Assertion ─────────────────────────────────────
export interface RuntimeTestAssertion extends TestAssertion {
    /** Execution time of this specific test */
    durationMs: number;
    /** Stack trace on failure */
    stack?: string;
}

// ─── Cookie Jar ──────────────────────────────────────────────────
export interface CookieJar {
    get(url: string, name: string): Cookie | undefined;
    getAll(url: string): Cookie[];
    set(url: string, cookie: Cookie): void;
    clear(url: string, name?: string): void;
}

export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
}

// ─── Enhanced Runner Config ──────────────────────────────────────
export interface RuntimeRunnerConfig extends RunnerConfig {
    /** JSON data source (future) */
    jsonData?: string;
    /** Persist variables after run */
    persistVariables: boolean;
    /** Timeout per request (ms) */
    requestTimeout?: number;
    /** Timeout per script (ms) */
    scriptTimeout?: number;
}

// ─── Runner State Machine ────────────────────────────────────────
export type RunnerState = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';

export interface RunnerStatus {
    state: RunnerState;
    currentIteration: number;
    totalIterations: number;
    currentItemIndex: number;
    totalItems: number;
    currentItemName: string;
    elapsedMs: number;
}

// ─── Enhanced Runner Item Result ─────────────────────────────────
export interface RuntimeRunnerItemResult extends RunnerItemResult {
    /** Pre-request script result */
    preRequestResult?: RuntimeScriptResult;
    /** Test script result */
    testScriptResult?: RuntimeScriptResult;
    /** Timing breakdown */
    timing: ExecutionTiming;
    /** Test summary */
    testSummary: { total: number, passed: number, failed: number };
    /** Console logs */
    consoleLogs: string[];
}

export interface ExecutionTiming {
    preRequestScriptMs: number;
    variableResolutionMs: number;
    httpRequestMs: number;
    testScriptMs: number;
    totalMs: number;
}

// ─── Report Model ────────────────────────────────────────────────
export type ReportFormat = 'json' | 'markdown' | 'text';

export interface RunReport {
    summary: RunReportSummary;
    iterations: RunReportIteration[];
    environment?: string;
    collectionName: string;
    exportedAt: number;
}

export interface RunReportSummary {
    totalRequests: number;
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
    totalDurationMs: number;
    avgResponseTimeMs: number;
}

export interface RunReportIteration {
    iteration: number;
    items: RunReportItem[];
}

export interface RunReportItem {
    name: string;
    request: { method: string; url: string };
    response: { status: number; time: number; size: number };
    tests: Array<{ name: string; passed: boolean; error?: string }>;
    consoleLogs: string[];
}
