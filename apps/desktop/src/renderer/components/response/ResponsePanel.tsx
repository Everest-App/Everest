import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import { ResponseMetrics } from './ResponseMetrics';
import { TestResultsPanel, ConsoleOutputPanel } from '../scripts/TestResultsPanel';
import { useTabStore } from '../../store/tab-store';

type ResponseTab = 'body' | 'headers' | 'test-results' | 'console';

export function ResponsePanel() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ResponseTab>('body');
    const [copied, setCopied] = useState(false);
    const { tabs, activeTabId } = useTabStore();

    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return null;

    const { response, loading, scriptResults } = tab;

    // Compute test result stats for badges
    const testAssertions = scriptResults?.test?.assertions || [];
    const passedCount = testAssertions.filter(a => a.passed).length;
    const failedCount = testAssertions.filter(a => !a.passed).length;
    const hasTestResults = scriptResults?.test || scriptResults?.preRequest;

    const consoleLogs = [
        ...(scriptResults?.preRequest?.consoleOutput || []),
        ...(scriptResults?.test?.consoleOutput || []),
    ];

    // Auto-switch to Response body tab when a new response arrives (after manual send)
    const prevResponseRef = React.useRef<typeof response>(response);
    React.useEffect(() => {
        // When response transitions from null to a value, focus the body tab
        if (response && !prevResponseRef.current) {
            setActiveTab('body');
        }
        prevResponseRef.current = response;
    }, [response]);

    const handleCopy = useCallback(async () => {
        if (!response) return;
        try {
            await navigator.clipboard.writeText(response.body);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = response.body;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    }, [response]);

    if (loading) {
        return (
            <div className="response-panel">
                <div className="empty-state" style={{ minHeight: 200 }}>
                    <span className="loading-spinner" />
                    <div className="empty-state-text">{t('request.sendingRequest')}</div>
                </div>
            </div>
        );
    }

    if (!response) {
        return (
            <div className="response-panel">
                <div className="empty-state" style={{ minHeight: 200 }}>
                    <div className="empty-state-icon">⚡</div>
                    <div className="empty-state-text">{t('request.enterUrlAndSend')}</div>
                    <div className="empty-state-sub">{t('request.responseWillAppear')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="response-panel">
            <ResponseMetrics response={response} />
            <div className="response-tabs">
                <button
                    className={`response-tab ${activeTab === 'body' ? 'active' : ''}`}
                    onClick={() => setActiveTab('body')}
                >
                    {t('response.body')}
                </button>
                <button
                    className={`response-tab ${activeTab === 'headers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('headers')}
                >
                    {t('response.headers')} ({Object.keys(response.headers).length})
                </button>
                <button
                    className={`response-tab ${activeTab === 'test-results' ? 'active' : ''}`}
                    onClick={() => setActiveTab('test-results')}
                >
                    {t('response.testResults')}
                    {testAssertions.length > 0 && (
                        <span className={`response-tab-badge ${failedCount > 0 ? 'fail' : 'pass'}`}>
                            {failedCount > 0 ? `${failedCount} ✗` : `${passedCount} ✓`}
                        </span>
                    )}
                </button>
                <button
                    className={`response-tab ${activeTab === 'console' ? 'active' : ''}`}
                    onClick={() => setActiveTab('console')}
                >
                    {t('response.console')}
                    {consoleLogs.length > 0 && (
                        <span className="response-tab-badge neutral">
                            {consoleLogs.length}
                        </span>
                    )}
                </button>

                <button
                    className="response-copy-icon"
                    onClick={handleCopy}
                    title={t('response.copyResponse')}
                >
                    {copied ? '✓' : '📋'}
                    {copied && <span className="copy-tooltip">{t('common.copied')}</span>}
                </button>
            </div>
            <div className="response-body">
                {activeTab === 'body' && <ResponseBody response={response} />}
                {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
                {activeTab === 'test-results' && (
                    <TestResultsPanel
                        testResult={scriptResults?.test}
                        preRequestResult={scriptResults?.preRequest}
                    />
                )}
                {activeTab === 'console' && (
                    <ConsoleOutputPanel
                        preRequestResult={scriptResults?.preRequest}
                        testResult={scriptResults?.test}
                    />
                )}
            </div>
        </div>
    );
}
