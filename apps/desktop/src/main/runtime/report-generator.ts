import { 
    RuntimeRunnerItemResult, 
    RunnerStatus, 
    RunReport, 
    ReportFormat,
    RunReportItem
} from '@api-platform/core';

export class ReportGenerator {
    public generate(
        status: RunnerStatus,
        results: RuntimeRunnerItemResult[],
        format: ReportFormat,
        collectionName: string,
        environmentName?: string
    ): string {
        const report = this.buildReportModel(status, results, collectionName, environmentName);

        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'markdown':
                return this.generateMarkdown(report);
            case 'text':
                return this.generateText(report);
            default:
                throw new Error(`Unsupported report format: ${format}`);
        }
    }

    private buildReportModel(
        status: RunnerStatus,
        results: RuntimeRunnerItemResult[],
        collectionName: string,
        environmentName?: string
    ): RunReport {
        let totalAssertions = 0;
        let passedAssertions = 0;
        let failedAssertions = 0;
        let totalDurationMs = 0;
        let totalResponseTimeMs = 0;

        // Group by iteration
        const iterationMap = new Map<number, RunReportItem[]>();

        for (const res of results) {
            totalAssertions += res.testSummary.total;
            passedAssertions += res.testSummary.passed;
            failedAssertions += res.testSummary.failed;
            totalDurationMs += res.timing.totalMs;
            
            if (res.response?.time) {
                totalResponseTimeMs += res.response.time;
            }

            // In our results, we don't have explicit iteration stored on the result item itself currently,
            // but we can infer it or just put them all in iteration 0 for single runs.
            // Ideally `RuntimeRunnerItemResult` would have `iteration`.
            // For now, we put everything in iteration 1.
            const iteration = 1; 

            if (!iterationMap.has(iteration)) {
                iterationMap.set(iteration, []);
            }

            const tests = [];
            if (res.testScriptResult?.assertions) {
                for (const a of res.testScriptResult.assertions) {
                    tests.push({ name: a.name, passed: a.passed, error: a.error });
                }
            }

            iterationMap.get(iteration)!.push({
                name: res.itemName,
                request: { method: res.request.method, url: res.request.url },
                response: { 
                    status: res.response?.status || 0, 
                    time: res.response?.time || 0, 
                    size: res.response?.size || 0 
                },
                tests,
                consoleLogs: res.consoleLogs || []
            });
        }

        const iterations = Array.from(iterationMap.entries()).map(([iter, items]) => ({
            iteration: iter,
            items
        }));

        return {
            collectionName,
            environment: environmentName,
            exportedAt: Date.now(),
            summary: {
                totalRequests: results.length,
                totalAssertions,
                passedAssertions,
                failedAssertions,
                totalDurationMs,
                avgResponseTimeMs: results.length > 0 ? Math.round(totalResponseTimeMs / results.length) : 0
            },
            iterations
        };
    }

    private generateMarkdown(report: RunReport): string {
        let md = `# Run Report: ${report.collectionName}\n\n`;
        md += `**Environment:** ${report.environment || 'None'}\n`;
        md += `**Exported At:** ${new Date(report.exportedAt).toLocaleString()}\n\n`;
        
        md += `## Summary\n\n`;
        md += `| Metric | Value |\n|---|---|\n`;
        md += `| Total Requests | ${report.summary.totalRequests} |\n`;
        md += `| Total Assertions | ${report.summary.totalAssertions} |\n`;
        md += `| Passed | ✅ ${report.summary.passedAssertions} |\n`;
        md += `| Failed | ❌ ${report.summary.failedAssertions} |\n`;
        md += `| Total Duration | ${report.summary.totalDurationMs}ms |\n`;
        md += `| Avg Response Time | ${report.summary.avgResponseTimeMs}ms |\n\n`;

        md += `## Details\n\n`;
        for (const iter of report.iterations) {
            md += `### Iteration ${iter.iteration}\n\n`;
            for (const item of iter.items) {
                md += `#### ${item.name}\n`;
                md += `- **Request:** \`${item.request.method}\` ${item.request.url}\n`;
                md += `- **Response:** ${item.response.status} (${item.response.time}ms, ${item.response.size} bytes)\n\n`;
                
                if (item.tests.length > 0) {
                    md += `**Tests:**\n`;
                    for (const t of item.tests) {
                        md += `- ${t.passed ? '✅' : '❌'} ${t.name}\n`;
                        if (t.error) {
                            md += `  > Error: ${t.error}\n`;
                        }
                    }
                    md += `\n`;
                }

                if (item.consoleLogs.length > 0) {
                    md += `**Console Output:**\n\`\`\`\n`;
                    md += item.consoleLogs.join('\n') + '\n';
                    md += `\`\`\`\n\n`;
                }
            }
        }

        return md;
    }

    private generateText(report: RunReport): string {
        let txt = `RUN REPORT: ${report.collectionName.toUpperCase()}\n`;
        txt += `=====================================================\n`;
        txt += `Environment: ${report.environment || 'None'}\n`;
        txt += `Exported At: ${new Date(report.exportedAt).toLocaleString()}\n\n`;
        
        txt += `SUMMARY\n`;
        txt += `-------\n`;
        txt += `Requests:     ${report.summary.totalRequests}\n`;
        txt += `Assertions:   ${report.summary.totalAssertions} (${report.summary.passedAssertions} passed, ${report.summary.failedAssertions} failed)\n`;
        txt += `Duration:     ${report.summary.totalDurationMs}ms\n`;
        txt += `Avg Response: ${report.summary.avgResponseTimeMs}ms\n\n`;

        txt += `DETAILS\n`;
        txt += `-------\n`;
        for (const iter of report.iterations) {
            txt += `Iteration ${iter.iteration}:\n`;
            for (const item of iter.items) {
                txt += `  [${item.request.method}] ${item.name}\n`;
                txt += `    URL: ${item.request.url}\n`;
                txt += `    Status: ${item.response.status} (${item.response.time}ms)\n`;
                
                for (const t of item.tests) {
                    txt += `    ${t.passed ? 'PASS' : 'FAIL'} - ${t.name}\n`;
                    if (t.error) txt += `      Error: ${t.error}\n`;
                }
                txt += `\n`;
            }
        }

        return txt;
    }
}
