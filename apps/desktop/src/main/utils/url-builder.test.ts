/**
 * Automated tests for buildFinalUrl — the centralized URL builder.
 *
 * Run with: npx tsx src/main/utils/url-builder.test.ts
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

function expect(actual: string) {
    return {
        toBe(expected: string) {
            if (actual !== expected) {
                throw new Error(`Expected: "${expected}"\n     Got:      "${actual}"`);
            }
        },
        toContain(substr: string) {
            if (!actual.includes(substr)) {
                throw new Error(`Expected "${actual}" to contain "${substr}"`);
            }
        },
        not: {
            toContain(substr: string) {
                if (actual.includes(substr)) {
                    throw new Error(`Expected "${actual}" NOT to contain "${substr}"`);
                }
            },
        },
    };
}

// ── Import the module under test ─────────────────────────────────
import { buildFinalUrl } from './url-builder';
import { RequestConfig } from '@api-platform/core';

function makeConfig(overrides: Partial<RequestConfig> = {}): RequestConfig {
    return {
        id: 'test-id',
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
console.log('\n🧪 URL Builder Tests\n');

// ── 1. Basic param append (no URL query) ─────────────────────────
console.log('── Basic functionality ──');

test('GET with params, no existing URL query', () => {
    const config = makeConfig({
        url: 'https://api.example.com/users',
        params: [
            { id: '1', key: 'page', value: '1', enabled: true },
            { id: '2', key: 'limit', value: '10', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.example.com/users?page=1&limit=10');
});

test('POST with params', () => {
    const config = makeConfig({
        method: 'POST',
        url: 'https://api.example.com/data',
        params: [
            { id: '1', key: 'format', value: 'json', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.example.com/data?format=json');
});

test('PUT with params', () => {
    const config = makeConfig({
        method: 'PUT',
        url: 'https://api.example.com/data',
        params: [
            { id: '1', key: 'id', value: '42', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.example.com/data?id=42');
});

test('PATCH with params', () => {
    const config = makeConfig({
        method: 'PATCH',
        url: 'https://api.example.com/data',
        params: [
            { id: '1', key: 'field', value: 'name', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.example.com/data?field=name');
});

test('DELETE with params', () => {
    const config = makeConfig({
        method: 'DELETE',
        url: 'https://api.example.com/data',
        params: [
            { id: '1', key: 'force', value: 'true', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.example.com/data?force=true');
});

// ── 2. Duplicate prevention (THE BUG) ───────────────────────────
console.log('\n── Duplicate prevention (core bug fix) ──');

test('URL already contains same params → NO duplication', () => {
    const config = makeConfig({
        url: 'https://reporting.pod.ir/bi/api/xxx?V_Business_Id=481',
        params: [
            { id: '1', key: 'V_Business_Id', value: '481', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    // Must appear exactly ONCE
    const count = (result.match(/V_Business_Id/g) || []).length;
    if (count !== 1) {
        throw new Error(`V_Business_Id appears ${count} times, expected 1. URL: ${result}`);
    }
});

test('URL with multiple inline params matching config.params → all deduplicated', () => {
    const config = makeConfig({
        url: 'https://api.com/data?page=1&limit=10',
        params: [
            { id: '1', key: 'page', value: '1', enabled: true },
            { id: '2', key: 'limit', value: '10', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.com/data?page=1&limit=10');
});

test('URL params + different config.params → merge without duplication', () => {
    const config = makeConfig({
        url: 'https://api.com/data?existing=yes',
        params: [
            { id: '1', key: 'new_param', value: 'hello', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toContain('existing=yes');
    expect(result).toContain('new_param=hello');
    // Make sure each appears once
    const existingCount = (result.match(/existing/g) || []).length;
    const newCount = (result.match(/new_param/g) || []).length;
    if (existingCount !== 1 || newCount !== 1) {
        throw new Error(`Counts wrong: existing=${existingCount}, new_param=${newCount}`);
    }
});

// ── 3. Disabled / empty params ───────────────────────────────────
console.log('\n── Disabled and empty params ──');

test('Disabled params are excluded', () => {
    const config = makeConfig({
        url: 'https://api.com/data',
        params: [
            { id: '1', key: 'active', value: '1', enabled: true },
            { id: '2', key: 'hidden', value: 'secret', enabled: false },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toContain('active=1');
    expect(result).not.toContain('hidden');
});

test('Empty key params are excluded', () => {
    const config = makeConfig({
        url: 'https://api.com/data',
        params: [
            { id: '1', key: 'valid', value: '1', enabled: true },
            { id: '2', key: '', value: 'orphan', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toContain('valid=1');
    expect(result).not.toContain('orphan');
});

// ── 4. Edge cases ────────────────────────────────────────────────
console.log('\n── Edge cases ──');

test('No params at all → plain URL', () => {
    const config = makeConfig({
        url: 'https://api.com/users',
        params: [],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.com/users');
});

test('Empty URL → empty string', () => {
    const config = makeConfig({ url: '', params: [] });
    const result = buildFinalUrl(config);
    expect(result).toBe('');
});

test('URL with trailing ? and no query → no trailing ?', () => {
    const config = makeConfig({
        url: 'https://api.com/users?',
        params: [
            { id: '1', key: 'page', value: '1', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.com/users?page=1');
});

test('URL without protocol gets http:// prepended', () => {
    const config = makeConfig({
        url: 'api.com/data',
        params: [{ id: '1', key: 'q', value: 'test', enabled: true }],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('http://api.com/data?q=test');
});

test('Param values with special characters are encoded', () => {
    const config = makeConfig({
        url: 'https://api.com/search',
        params: [
            { id: '1', key: 'q', value: 'hello world', enabled: true },
            { id: '2', key: 'tag', value: 'a&b', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toContain('q=hello%20world');
    expect(result).toContain('tag=a%26b');
});

test('Param with empty value generates key-only param', () => {
    const config = makeConfig({
        url: 'https://api.com/data',
        params: [
            { id: '1', key: 'verbose', value: '', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe('https://api.com/data?verbose');
});

// ── 5. cURL generation scenario ──────────────────────────────────
console.log('\n── cURL / codegen scenario ──');

test('Exact bug scenario: V_Business_Id=481 not duplicated', () => {
    const config = makeConfig({
        url: 'https://reporting.pod.ir/bi/api/a2eba920-6f58-4393-84b6-21c59d93bc46?V_Business_Id=481',
        params: [
            { id: '1', key: 'V_Business_Id', value: '481', enabled: true },
        ],
        headers: [
            { id: 'h1', key: 'accessToken', value: 'xxx', enabled: true },
        ],
    });
    const result = buildFinalUrl(config);
    expect(result).toBe(
        'https://reporting.pod.ir/bi/api/a2eba920-6f58-4393-84b6-21c59d93bc46?V_Business_Id=481'
    );
});

// ── Summary ──────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
    console.log('\n⚠️  Some tests FAILED!\n');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!\n');
}
