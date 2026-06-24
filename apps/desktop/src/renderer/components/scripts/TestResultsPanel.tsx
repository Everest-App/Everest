import React from 'react';
import { ScriptResult, TestAssertion } from '@api-platform/core';

interface TestResultsPanelProps {
    testResult?: ScriptResult;
    preRequestResult?: ScriptResult;
}

export function TestResultsPanel({ testResult, preRequestResult }: TestResultsPanelProps) {
    const assertions = testResult?.assertions || [];
    const passed = assertions.filter(a => a.passed).length;
    const failed = assertions.filter(a => !a.passed).length;
    const total = assertions.length;

    const preRequestError = preRequestResult && !preRequestResult.success ? preRequestResult.error : undefined;
    const testScriptError = testResult && !testResult.success ? testResult.error : undefined;

    if (!testResult && !preRequestResult) {
        return (
            <div className="test-results-panel">
                <div className="test-results-empty">
                    <div className="test-results-empty-icon">🧪</div>
                    <div className="test-results-empty-title">No Test Results Yet</div>
                    <div className="test-results-empty-sub">
                        Write test scripts in the <strong>Tests</strong> tab and send a request to see results here.
                    </div>
                    <div className="test-results-example">
                        <code>
                            {`pm.test("Status is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});`}
                        </code>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="test-results-panel">
            {/* Pre-request script error */}
            {preRequestError && (
                <div className="test-results-script-error">
                    <div className="test-results-script-error-header">
                        <span className="test-results-error-icon">⚠</span>
                        <span>Pre-request Script Error</span>
                    </div>
                    <pre className="test-results-script-error-body">{preRequestError}</pre>
                </div>
            )}

            {/* Test script error */}
            {testScriptError && (
                <div className="test-results-script-error">
                    <div className="test-results-script-error-header">
                        <span className="test-results-error-icon">⚠</span>
                        <span>Test Script Error</span>
                    </div>
                    <pre className="test-results-script-error-body">{testScriptError}</pre>
                </div>
            )}

            {/* Summary bar */}
            {total > 0 && (
                <div className="test-results-summary">
                    <div className="test-results-summary-total">
                        {total} test{total !== 1 ? 's' : ''}
                    </div>
                    <div className="test-results-summary-counts">
                        {passed > 0 && (
                            <span className="test-results-badge pass">
                                <span className="test-results-badge-icon">✓</span>
                                {passed} passed
                            </span>
                        )}
                        {failed > 0 && (
                            <span className="test-results-badge fail">
                                <span className="test-results-badge-icon">✗</span>
                                {failed} failed
                            </span>
                        )}
                    </div>
                    <div className="test-results-progress-bar">
                        <div
                            className="test-results-progress-fill pass"
                            style={{ width: total > 0 ? `${(passed / total) * 100}%` : '0%' }}
                        />
                        <div
                            className="test-results-progress-fill fail"
                            style={{ width: total > 0 ? `${(failed / total) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            )}

            {/* Individual test results */}
            {assertions.length > 0 && (
                <div className="test-results-list">
                    {assertions.map((assertion, idx) => (
                        <div
                            key={idx}
                            className={`test-result-row ${assertion.passed ? 'pass' : 'fail'} test-result-animate`}
                            style={{ animationDelay: `${idx * 40}ms` }}
                        >
                            <span className={`test-result-icon ${assertion.passed ? 'pass' : 'fail'}`}>
                                {assertion.passed ? '✓' : '✗'}
                            </span>
                            <span className="test-result-name">{assertion.name}</span>
                            {assertion.error && (
                                <span className="test-result-error">{assertion.error}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* No assertions but script ran successfully */}
            {total === 0 && !testScriptError && !preRequestError && (
                <div className="test-results-no-assertions">
                    <span className="test-results-info-icon">ℹ</span>
                    Script executed successfully, but no <code>pm.test()</code> assertions were defined.
                </div>
            )}
        </div>
    );
}

interface ConsoleOutputPanelProps {
    preRequestResult?: ScriptResult;
    testResult?: ScriptResult;
}

export function ConsoleOutputPanel({ preRequestResult, testResult }: ConsoleOutputPanelProps) {
    const preLogs = preRequestResult?.consoleOutput || [];
    const testLogs = testResult?.consoleOutput || [];
    const hasLogs = preLogs.length > 0 || testLogs.length > 0;

    if (!hasLogs) {
        return (
            <div className="console-panel">
                <div className="console-empty">
                    <div className="console-empty-icon">📋</div>
                    <div className="console-empty-title">Console is Empty</div>
                    <div className="console-empty-sub">
                        Use <code>console.log()</code> in your scripts to see output here.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="console-panel">
            <div className="console-output">
                {preLogs.length > 0 && (
                    <>
                        <div className="console-section-header">Pre-request Script</div>
                        {preLogs.map((log, idx) => (
                            <div key={`pre-${idx}`} className={`console-line ${getLogLevel(log)}`}>
                                <span className="console-line-prefix">{getLogPrefix(log)}</span>
                                <span className="console-line-text">{stripLogPrefix(log)}</span>
                            </div>
                        ))}
                    </>
                )}
                {testLogs.length > 0 && (
                    <>
                        <div className="console-section-header">Test Script</div>
                        {testLogs.map((log, idx) => (
                            <div key={`test-${idx}`} className={`console-line ${getLogLevel(log)}`}>
                                <span className="console-line-prefix">{getLogPrefix(log)}</span>
                                <span className="console-line-text">{stripLogPrefix(log)}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

function getLogLevel(log: string): string {
    if (log.startsWith('[ERROR]')) return 'error';
    if (log.startsWith('[WARN]')) return 'warn';
    if (log.startsWith('[INFO]')) return 'info';
    return 'log';
}

function getLogPrefix(log: string): string {
    if (log.startsWith('[ERROR]')) return '✗';
    if (log.startsWith('[WARN]')) return '⚠';
    if (log.startsWith('[INFO]')) return 'ℹ';
    return '›';
}

function stripLogPrefix(log: string): string {
    return log.replace(/^\[(ERROR|WARN|INFO)\]\s*/, '');
}
