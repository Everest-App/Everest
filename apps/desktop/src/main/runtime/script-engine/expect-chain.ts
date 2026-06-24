import { RuntimeTestAssertion } from '@api-platform/core';

export function createExpectChain(value: any, assertions: RuntimeTestAssertion[]) {
    let negated = false;

    // Track the start time for the assertion
    const startTime = performance.now();

    function captureResult(passed: boolean, errorMsg?: string) {
        // Find the current test context if available (usually pushed by pm.test)
        // If not, we just record a loose assertion
        const durationMs = performance.now() - startTime;
        let stack: string | undefined;

        if (!passed) {
            try {
                throw new Error(errorMsg || 'Assertion failed');
            } catch (e: any) {
                stack = e.stack;
            }
            throw new Error(errorMsg || 'Assertion failed');
        }
        
        return true;
    }

    const chain: any = {
        get to() { return chain; },
        get be() { return chain; },
        get have() { return chain; },
        get a() { return chain; },
        get an() { return chain; },
        get is() { return chain; },
        get that() { return chain; },
        get and() { return chain; },
        get not() { negated = !negated; return chain; },

        // Modifiers
        get empty() {
            const hasLength = value != null && typeof value.length === 'number';
            const hasKeys = typeof value === 'object' && value !== null && Object.keys(value).length === 0;
            const isEmpty = hasLength ? value.length === 0 : hasKeys;
            const passed = negated ? !isEmpty : isEmpty;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be empty`);
            return chain;
        },

        // Core assertions
        equal(expected: any) {
            const passed = negated ? value !== expected : value === expected;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to equal ${formatArg(expected)}`);
            return chain;
        },
        eql(expected: any) {
            const passed = negated
                ? JSON.stringify(value) !== JSON.stringify(expected)
                : JSON.stringify(value) === JSON.stringify(expected);
            captureResult(passed, `Expected deep ${negated ? 'in' : ''}equality`);
            return chain;
        },
        include(expected: any) {
            let has = false;
            if (typeof value === 'string') has = value.includes(expected);
            else if (Array.isArray(value)) has = value.includes(expected);
            else if (typeof value === 'object' && value !== null) has = expected in value;

            const passed = negated ? !has : has;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to include ${formatArg(expected)}`);
            return chain;
        },
        above(expected: number) {
            const passed = negated ? value <= expected : value > expected;
            captureResult(passed, `Expected ${value} ${negated ? 'not ' : ''}to be above ${expected}`);
            return chain;
        },
        below(expected: number) {
            const passed = negated ? value >= expected : value < expected;
            captureResult(passed, `Expected ${value} ${negated ? 'not ' : ''}to be below ${expected}`);
            return chain;
        },
        oneOf(list: any[]) {
            const passed = negated ? !list.includes(value) : list.includes(value);
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be one of [${list.join(', ')}]`);
            return chain;
        },
        property(name: string, val?: any) {
            const has = value != null && name in value;
            if (val !== undefined && has) {
                const passed = negated ? value[name] !== val : value[name] === val;
                captureResult(passed, `Expected object property '${name}' to ${negated ? 'not ' : ''}equal ${val}`);
            } else {
                const passed = negated ? !has : has;
                captureResult(passed, `Expected object ${negated ? 'not ' : ''}to have property '${name}'`);
            }
            return chain;
        },
        length(expected: number) {
            const len = value?.length;
            const passed = negated ? len !== expected : len === expected;
            captureResult(passed, `Expected length ${len} ${negated ? 'not ' : ''}to equal ${expected}`);
            return chain;
        },
        lengthOf(expected: number) {
            return chain.length(expected);
        },
        exist() {
            const passed = negated ? (value === null || value === undefined) : (value !== null && value !== undefined);
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to exist`);
            return chain;
        },
        ok() {
            const passed = negated ? !value : !!value;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be truthy`);
            return chain;
        },
        true() {
            const passed = negated ? value !== true : value === true;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be true`);
            return chain;
        },
        false() {
            const passed = negated ? value !== false : value === false;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be false`);
            return chain;
        },
        null() {
            const passed = negated ? value !== null : value === null;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be null`);
            return chain;
        },
        undefined() {
            const passed = negated ? value !== undefined : value === undefined;
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be undefined`);
            return chain;
        },
        string() {
            const passed = negated ? typeof value !== 'string' : typeof value === 'string';
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be a string`);
            return chain;
        },
        number() {
            const passed = negated ? typeof value !== 'number' : typeof value === 'number';
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be a number`);
            return chain;
        },
        object() {
            const passed = negated ? typeof value !== 'object' : typeof value === 'object';
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be an object`);
            return chain;
        },
        array() {
            const passed = negated ? !Array.isArray(value) : Array.isArray(value);
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to be an array`);
            return chain;
        },
        match(regex: RegExp) {
            const passed = negated ? !regex.test(value) : regex.test(value);
            captureResult(passed, `Expected ${formatArg(value)} ${negated ? 'not ' : ''}to match ${regex}`);
            return chain;
        },
        keys(keys: string[] | string) {
            const keyList = Array.isArray(keys) ? keys : [keys];
            const objKeys = Object.keys(value || {});
            const hasAll = keyList.every(k => objKeys.includes(k));
            const passed = negated ? !hasAll : hasAll;
            captureResult(passed, `Expected object ${negated ? 'not ' : ''}to contain keys [${keyList.join(', ')}]`);
            return chain;
        },
        members(list: any[]) {
            const hasAll = list.every(item => value?.includes(item));
            const passed = negated ? !hasAll : hasAll;
            captureResult(passed, `Expected array ${negated ? 'not ' : ''}to contain members [${list.join(', ')}]`);
            return chain;
        },
        closeTo(expected: number, delta: number) {
            const passed = negated ? Math.abs(value - expected) > delta : Math.abs(value - expected) <= delta;
            captureResult(passed, `Expected ${value} ${negated ? 'not ' : ''}to be close to ${expected} +/- ${delta}`);
            return chain;
        },
        within(min: number, max: number) {
            const passed = negated ? (value < min || value > max) : (value >= min && value <= max);
            captureResult(passed, `Expected ${value} ${negated ? 'not ' : ''}to be within ${min}..${max}`);
            return chain;
        },
        
        // pm.response specific additions
        status(code: number | string) {
            if (value?.code !== undefined) { // Looks like pm.response
                const match = value.code === code || value.status === code;
                const passed = negated ? !match : match;
                captureResult(passed, `Expected response status ${value.code} ${negated ? 'not ' : ''}to be ${code}`);
            } else {
                captureResult(false, `Value is not a response object`);
            }
            return chain;
        },
        header(headerName: string, headerValue?: string) {
            if (value?.headers && typeof value.headers.has === 'function') {
                const has = value.headers.has(headerName);
                if (headerValue !== undefined && has) {
                    const match = value.headers.get(headerName) === headerValue;
                    const passed = negated ? !match : match;
                    captureResult(passed, `Expected response header '${headerName}' to ${negated ? 'not ' : ''}equal '${headerValue}'`);
                } else {
                    const passed = negated ? !has : has;
                    captureResult(passed, `Expected response to ${negated ? 'not ' : ''}have header '${headerName}'`);
                }
            } else {
                captureResult(false, `Value is not a response object or does not support headers`);
            }
            return chain;
        },
        jsonBody(key?: string) {
            if (value?.json && typeof value.json === 'function') {
                try {
                    const body = value.json();
                    if (key) {
                        const passed = negated ? !(key in body) : (key in body);
                        captureResult(passed, `Expected response JSON body to ${negated ? 'not ' : ''}have property '${key}'`);
                    } else {
                        captureResult(!negated, `Response is ${negated ? 'not ' : ''}JSON`);
                    }
                } catch {
                    captureResult(negated, `Expected response to ${negated ? 'not ' : ''}be valid JSON`);
                }
            } else {
                captureResult(false, `Value is not a response object`);
            }
            return chain;
        }
    };

    return chain;
}

function formatArg(arg: any): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch { return String(arg); }
    }
    return String(arg);
}
