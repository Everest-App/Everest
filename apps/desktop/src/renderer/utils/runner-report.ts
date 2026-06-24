import { RunnerResult } from '@api-platform/core';

/**
 * Generate a structured JSON report from runner results.
 */
export function generateJSONReport(result: RunnerResult): string {
    const detailedResults = result.results.map((r) => ({
        name: r.itemName,
        iteration: r.iteration,
        passed: r.passed,
        duration: r.duration,
        error: r.error || undefined,
        request: {
            method: r.request?.method,
            url: r.request?.url,
            headers: r.requestHeaders || {},
            body: r.request?.body?.raw || undefined,
        },
        response: r.response ? {
            status: r.response.status,
            statusText: r.response.statusText,
            time: r.response.time,
            size: r.response.size,
            headers: r.responseHeaders || {},
            body: r.response.body,
        } : null,
        tests: r.testResults.map(t => ({
            name: t.name,
            passed: t.passed,
            error: t.error || undefined
        })),
        consoleLogs: r.consoleOutput || [],
        scriptErrors: r.scriptError ? {
            phase: 'execution',
            message: r.scriptError,
            line: 0
        } : undefined
    }));

    const report = {
        collectionName: result.collectionName,
        executedAt: new Date(result.startedAt).toISOString(),
        summary: {
            totalRequests: result.totalRequests,
            successRequests: result.totalPassed,
            failedRequests: result.totalFailed,
            totalTests: result.totalAssertions,
            passedTests: result.passedAssertions,
            failedTests: result.failedAssertions,
            totalDuration: result.totalDuration,
            iterations: result.iterations,
            passRate: result.totalRequests > 0
                ? Math.round((result.totalPassed / result.totalRequests) * 100)
                : 0,
            testPassRate: result.totalAssertions > 0
                ? Math.round((result.passedAssertions / result.totalAssertions) * 100)
                : 0,
        },
        results: detailedResults,
    };

    return JSON.stringify(report, null, 2);
}

/**
 * Generate a human-readable text log report from runner results.
 */
export function generateTextReport(result: RunnerResult): string {
    const lines: string[] = [];
    const divider = '═'.repeat(80);
    const subDivider = '─'.repeat(80);

    lines.push(divider);
    lines.push(`  COLLECTION RUNNER DETAILED REPORT`);
    lines.push(`  Collection:   ${result.collectionName}`);
    lines.push(`  Executed At:  ${new Date(result.startedAt).toLocaleString()}`);
    lines.push(`  Duration:     ${result.totalDuration}ms`);
    lines.push(`  Iterations:   ${result.iterations}`);
    lines.push(divider);
    lines.push('');

    lines.push(`  SUMMARY`);
    lines.push(`  Requests:     ${result.totalPassed} passed / ${result.totalFailed} failed / ${result.totalRequests} total`);
    lines.push(`  Assertions:   ${result.passedAssertions} passed / ${result.failedAssertions} failed / ${result.totalAssertions} total`);
    
    const passRate = result.totalRequests > 0 ? Math.round((result.totalPassed / result.totalRequests) * 100) : 0;
    lines.push(`  Pass Rate:    ${passRate}%`);
    lines.push('');

    lines.push(divider);
    lines.push(`  DETAILED RESULTS`);
    lines.push(divider);

    for (const item of result.results) {
        const icon = item.passed ? '✅' : '❌';
        const method = item.request?.method || '???';
        const url = item.request?.url || '';
        const status = item.response?.status || 'ERR';
        const time = item.duration;

        lines.push('');
        lines.push(`${icon} Iteration ${item.iteration} — ${method} ${item.itemName}`);
        lines.push(subDivider);
        lines.push(`URL:      ${url}`);
        lines.push(`Status:   ${status} ${item.response?.statusText || ''}`);
        lines.push(`Time:     ${time}ms`);
        if (item.response) lines.push(`Size:     ${item.response.size} bytes`);
        if (item.error) lines.push(`Error:    ${item.error}`);

        if (item.scriptError) {
            lines.push(`Script Error: ${item.scriptError}`);
        }

        if (item.testResults.length > 0) {
            lines.push('');
            lines.push(`Tests:`);
            for (const test of item.testResults) {
                const testIcon = test.passed ? '  ✓' : '  ✗';
                lines.push(`${testIcon} ${test.name}${test.error ? ` — ${test.error}` : ''}`);
            }
        }

        if (item.consoleOutput && item.consoleOutput.length > 0) {
            lines.push('');
            lines.push(`Console:`);
            for (const log of item.consoleOutput) {
                lines.push(`  ${log}`);
            }
        }

        if (item.response?.body) {
            lines.push('');
            lines.push(`Response Body:`);
            const bodyPreview = item.response.body;
            // Optionally we don't truncate in detailed export, but let's at least indent it
            const indentedBody = bodyPreview.split('\\n').map(l => `  ${l}`).join('\\n');
            lines.push(indentedBody);
        }
        
        lines.push('');
    }

    lines.push(divider);
    lines.push(`  END OF REPORT`);
    lines.push(divider);

    return lines.join('\\n');
}

/**
 * Trigger a file download in the browser via Blob URL.
 */
export function downloadReport(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
