/**
 * Automated tests for cURL import query parameter parsing.
 *
 * Run with: npx tsx src/renderer/utils/curl-import-params.test.ts
 * (from the apps/desktop directory)
 */

// ── Inline test harness ──────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (err: any) {
        failed++;
        console.log(`  ❌ ${name}`);
        console.log(`     ${err.message}`);
    }
}

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
}

// ── Imports ──────────────────────────────────────────────────────
import { parseCurl } from './curl-parser';
import { normalizeRequestParams, parseUrlParams } from './url-params-sync';
import { RequestConfig } from '@api-platform/core';
import { v4 as uuidv4 } from 'uuid';

function makeConfig(overrides: Partial<RequestConfig> = {}): RequestConfig {
    return {
        id: 'test',
        method: 'GET',
        url: '',
        params: [],
        headers: [],
        body: { type: 'none' },
        auth: { type: 'none' },
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────
console.log('\n🧪 cURL Import Query Param Tests\n');

// ── 1. cURL import with params ───────────────────────────────────
console.log('── cURL parser param extraction ──');

test('cURL with single query param', () => {
    const result = parseCurl(`curl 'https://api.example.com/users?page=1'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    // URL should be base only
    assert(!req.url.includes('?'), `URL should not contain ?, got: ${req.url}`);
    assert(req.url === 'https://api.example.com/users', `URL mismatch: ${req.url}`);

    // Params should contain the param
    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 1, `Expected 1 param, got ${realParams.length}`);
    assert(realParams[0].key === 'page', `Key mismatch: ${realParams[0].key}`);
    assert(realParams[0].value === '1', `Value mismatch: ${realParams[0].value}`);
});

test('cURL with multiple query params', () => {
    const result = parseCurl(`curl 'https://api.example.com/users?page=1&status=active&limit=50'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    assert(!req.url.includes('?'), `URL should not contain ?`);

    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 3, `Expected 3 params, got ${realParams.length}`);
    assert(realParams[0].key === 'page' && realParams[0].value === '1', 'First param mismatch');
    assert(realParams[1].key === 'status' && realParams[1].value === 'active', 'Second param mismatch');
    assert(realParams[2].key === 'limit' && realParams[2].value === '50', 'Third param mismatch');
});

test('cURL with encoded params', () => {
    const result = parseCurl(`curl 'https://api.example.com/search?q=hello%20world&tag=a%26b'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 2, `Expected 2 params, got ${realParams.length}`);
    assert(realParams[0].key === 'q', `Key mismatch: ${realParams[0].key}`);
    assert(realParams[0].value === 'hello world', `Encoded value not decoded: ${realParams[0].value}`);
    assert(realParams[1].key === 'tag', `Key mismatch: ${realParams[1].key}`);
    assert(realParams[1].value === 'a&b', `Encoded value not decoded: ${realParams[1].value}`);
});

test('cURL with env variable params ({{variable}})', () => {
    const result = parseCurl(`curl 'https://api.example.com/users?id={{userId}}&token={{apiToken}}'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    assert(!req.url.includes('?'), `URL should not contain ?`);

    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 2, `Expected 2 params, got ${realParams.length}`);
    assert(realParams[0].key === 'id', `Key mismatch: ${realParams[0].key}`);
    assert(realParams[0].value === '{{userId}}', `Variable not preserved: ${realParams[0].value}`);
    assert(realParams[1].key === 'token', `Key mismatch: ${realParams[1].key}`);
    assert(realParams[1].value === '{{apiToken}}', `Variable not preserved: ${realParams[1].value}`);
});

test('cURL with duplicate params', () => {
    const result = parseCurl(`curl 'https://api.example.com/data?id=1&id=2'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 2, `Expected 2 params (duplicates preserved), got ${realParams.length}`);
    assert(realParams[0].value === '1', `First value: ${realParams[0].value}`);
    assert(realParams[1].value === '2', `Second value: ${realParams[1].value}`);
});

test('cURL with no params → URL unchanged', () => {
    const result = parseCurl(`curl 'https://api.example.com/users'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    assert(req.url === 'https://api.example.com/users', `URL mismatch: ${req.url}`);
    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 0, `Expected 0 params, got ${realParams.length}`);
});

test('cURL with -X POST and params in URL', () => {
    const result = parseCurl(`curl -X POST 'https://api.example.com/data?format=json' -H 'Content-Type: application/json' -d '{"name":"test"}'`);
    assert(result.success, 'Parse should succeed');
    const req = result.request!;

    assert(req.method === 'POST', `Method should be POST, got ${req.method}`);
    assert(!req.url.includes('?'), `URL should not contain ?`);
    const realParams = req.params.filter(p => p.key);
    assert(realParams.length === 1, `Expected 1 param, got ${realParams.length}`);
    assert(realParams[0].key === 'format' && realParams[0].value === 'json', 'Param mismatch');
});

// ── 2. normalizeRequestParams ────────────────────────────────────
console.log('\n── normalizeRequestParams() ──');

test('Normalizes URL with params into base URL + params array', () => {
    const config = makeConfig({
        url: 'https://api.com/users?page=1&status=active',
        params: [{ id: '1', key: '', value: '', enabled: true }],
    });
    const normalized = normalizeRequestParams(config);

    assert(normalized.url === 'https://api.com/users', `URL: ${normalized.url}`);
    const realParams = normalized.params.filter(p => p.key);
    assert(realParams.length === 2, `Expected 2 params, got ${realParams.length}`);
    assert(realParams[0].key === 'page', `Key: ${realParams[0].key}`);
    assert(realParams[1].key === 'status', `Key: ${realParams[1].key}`);
});

test('Normalizes URL with {{variable}} params', () => {
    const config = makeConfig({
        url: 'https://api.com/data?id={{userId}}',
        params: [],
    });
    const normalized = normalizeRequestParams(config);

    assert(normalized.url === 'https://api.com/data', `URL: ${normalized.url}`);
    const realParams = normalized.params.filter(p => p.key);
    assert(realParams.length === 1, `Expected 1 param, got ${realParams.length}`);
    assert(realParams[0].value === '{{userId}}', `Variable not preserved: ${realParams[0].value}`);
});

test('Does not duplicate params already present', () => {
    const config = makeConfig({
        url: 'https://api.com/data?page=1',
        params: [
            { id: '1', key: 'page', value: '1', enabled: true },
            { id: '2', key: '', value: '', enabled: true },
        ],
    });
    const normalized = normalizeRequestParams(config);

    const realParams = normalized.params.filter(p => p.key);
    assert(realParams.length === 1, `Expected 1 param (deduped), got ${realParams.length}`);
});

test('Merges URL params with existing different params', () => {
    const config = makeConfig({
        url: 'https://api.com/data?new_param=hello',
        params: [
            { id: '1', key: 'existing', value: 'yes', enabled: true },
        ],
    });
    const normalized = normalizeRequestParams(config);

    const realParams = normalized.params.filter(p => p.key);
    assert(realParams.length === 2, `Expected 2 params, got ${realParams.length}`);
    assert(realParams.some(p => p.key === 'existing'), 'Existing param should be preserved');
    assert(realParams.some(p => p.key === 'new_param'), 'URL param should be added');
});

test('No-op when URL has no query string', () => {
    const config = makeConfig({
        url: 'https://api.com/users',
        params: [{ id: '1', key: 'x', value: '1', enabled: true }],
    });
    const normalized = normalizeRequestParams(config);

    assert(normalized.url === 'https://api.com/users', `URL unchanged`);
    assert(normalized === config, 'Should return same object (no-op)');
});

test('Always includes empty row for editor', () => {
    const config = makeConfig({
        url: 'https://api.com/data?x=1',
        params: [],
    });
    const normalized = normalizeRequestParams(config);

    const emptyRows = normalized.params.filter(p => !p.key && !p.value);
    assert(emptyRows.length >= 1, 'Should have at least one empty row');
});

// ── 3. parseUrlParams ────────────────────────────────────────────
console.log('\n── parseUrlParams() ──');

test('Parses encoded values correctly', () => {
    const result = parseUrlParams('https://api.com/search?q=hello%20world');
    assert(result.baseUrl === 'https://api.com/search', `Base: ${result.baseUrl}`);
    assert(result.params.length === 1, `Params count: ${result.params.length}`);
    assert(result.params[0].value === 'hello world', `Decoded value: ${result.params[0].value}`);
});

test('Preserves {{variables}} in params', () => {
    const result = parseUrlParams('https://api.com/data?id={{myVar}}&name={{userName}}');
    assert(result.params.length === 2, `Params count: ${result.params.length}`);
    assert(result.params[0].value === '{{myVar}}', `Var preserved: ${result.params[0].value}`);
    assert(result.params[1].value === '{{userName}}', `Var preserved: ${result.params[1].value}`);
});

// ── Summary ──────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
    console.log('\n⚠️  Some tests FAILED!\n');
    // @ts-ignore
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!\n');
}
