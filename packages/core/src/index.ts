// ─── @api-platform/core ──────────────────────────────────────────
// Barrel export — all public types, constants, and utilities

// ── Types ────────────────────────────────────────────────────────
export type {
  HttpMethod, BodyType, AuthType, KeyValuePair, AuthConfig,
  RequestConfig, ResponseData, HistoryEntry, CodeGenTarget, CodeGenResult,
  Tab, CollectionItem, Collection, Variable, Environment, VariableScope,
  ImportFormat, ExportFormat, ImportResult,
  ScriptContext, TestAssertion, ScriptResult, SendRequestResult,
  RunnerConfig, RunnerItemResult, RunnerResult,
  MoveItemRequest, SaveToFolderMetadata,
  GraphQLRequest, GraphQLResponse, GraphQLSchemaField, GraphQLIntrospection,
  WebSocketMessage, WebSocketConfig, SSEEvent, SSEConfig,
  PluginManifest, PluginHookType, PluginSetting, PluginInfo, PluginHookResult,
  MockRoute, MockServerConfig, MockServerStatus, MockRequestLog,
  ElectronAPI,
  ScriptPhase, ScriptLevel, RuntimeScriptContext, VariableScopeMap,
  ExecutionInfo, RuntimeScriptResult, ConsoleEntry, VariableMutations,
  VariableMutation, RuntimeTestAssertion, CookieJar, Cookie,
  RuntimeRunnerConfig, RunnerState, RunnerStatus, RuntimeRunnerItemResult,
  ExecutionTiming, ReportFormat, RunReport, RunReportSummary,
  RunReportIteration, RunReportItem,
} from './types';

// ── Constants ────────────────────────────────────────────────────
export {
  IPC_CHANNELS,
  DEFAULT_HTTP_METHOD, DEFAULT_BODY_TYPE, DEFAULT_AUTH_TYPE,
  HTTP_METHODS, BODY_TYPES, AUTH_TYPES, CODEGEN_TARGETS, STATUS_COLORS,
} from './constants';

// ── Utilities ────────────────────────────────────────────────────
export {
  interpolateVariables, interpolateRequestConfig, interpolateWithWarnings, interpolateString,
  interpolateStringWithOverrides, interpolateRequestConfigWithOverrides,
} from './utils/interpolation';
export type { InterpolationWarning } from './utils/interpolation';
export { VariableResolver } from './utils/variable-resolver';
export {
  extractScriptsFromEvents,
  mergeScripts,
  scriptToExecArray,
  buildPostmanEvents,
} from './utils/script-utils';
export type { ExtractedScripts } from './utils/script-utils';

// ── CSV Parser ───────────────────────────────────────────────────
export { parseCsv } from './utils/csv-parser';
export type { CsvParseResult, CsvParseError } from './utils/csv-parser';
