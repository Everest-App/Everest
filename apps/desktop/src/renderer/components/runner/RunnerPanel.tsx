import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRunnerStore } from '../../store/runner-store';
import { useCollectionStore } from '../../store/collection-store';
import { useEnvironmentStore } from '../../store/environment-store';
import { RunnerItemResult, parseCsv } from '@api-platform/core';
import { generateJSONReport, generateTextReport, downloadReport } from '../../utils/runner-report';
import { JsonTreeViewer } from '../response/JsonTreeViewer';
import { SaveToFolderModal } from '../collections/SaveToFolderModal';

const METHOD_COLORS: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)',
    DELETE: 'var(--method-delete)',
    OPTIONS: 'var(--method-options)',
    HEAD: 'var(--method-head)',
};

const CSV_PREVIEW_MAX_ROWS = 50;

type DetailTab = 'request' | 'response' | 'tests' | 'console' | 'timeline';

export function RunnerPanel({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const { collections, fetchCollections } = useCollectionStore();
    const { environments, activeEnvironmentId } = useEnvironmentStore();
    const {
        config, updateConfig,
        isRunning, setRunning,
        progress, setProgress,
        result, setResult,
        liveResults, addLiveResult,
        expandedItems, toggleItem, expandAll, collapseAll,
        reset,
        folderId, folderName,
        csvFileName, csvFileSize, csvData, csvError,
        setCsvFile, setCsvError, clearCsv, csvRawContent,
        resultFilter, setResultFilter,
    } = useRunnerStore();

    const [isDragOver, setIsDragOver] = useState(false);
    const [detailTabs, setDetailTabs] = useState<Record<number, DetailTab>>({});
    const [saveModalItem, setSaveModalItem] = useState<RunnerItemResult | null>(null);
    const liveListRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    // Default to active environment
    useEffect(() => {
        if (activeEnvironmentId && !config.environmentId) {
            updateConfig({ environmentId: activeEnvironmentId });
        }
    }, [activeEnvironmentId]);

    // Set up IPC listeners when running
    useEffect(() => {
        if (isRunning) {
            window.api.onRunnerProgress((p) => setProgress(p));
            window.api.onRunnerItemResult((item: RunnerItemResult) => addLiveResult(item));
            return () => {
                window.api.removeRunnerProgressListener();
                window.api.removeRunnerItemResultListener();
            };
        }
    }, [isRunning]);

    // Auto-scroll live results
    useEffect(() => {
        if (liveListRef.current) {
            liveListRef.current.scrollTop = liveListRef.current.scrollHeight;
        }
    }, [liveResults.length]);

    // ── CSV File Handling ──

    const handleCsvFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setCsvError('Only .csv files are supported');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) {
                setCsvError('Failed to read file');
                return;
            }

            const parsed = parseCsv(content);
            const fatalErrors = parsed.errors.filter(err =>
                err.message.includes('missing header') ||
                err.message.includes('empty') ||
                err.message.includes('unreadable')
            );

            if (fatalErrors.length > 0) {
                setCsvError(fatalErrors[0].message);
                return;
            }

            if (parsed.totalRows === 0) {
                setCsvError('CSV file contains no data rows');
                return;
            }

            setCsvFile(file.name, file.size, content, parsed);
        };
        reader.onerror = () => {
            setCsvError('Failed to read file');
        };
        reader.readAsText(file);
    }, [setCsvFile, setCsvError]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleCsvFile(file);
    }, [handleCsvFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleCsvFile(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    }, [handleCsvFile]);

    // ── Run / Cancel ──

    const handleRun = async () => {
        if (!config.collectionId) return;
        setRunning(true);

        try {
            const finalConfig = {
                ...config,
                csvData: csvRawContent || undefined,
            };
            const res = await window.api.runCollection(finalConfig);
            setResult(res);
        } catch (err: any) {
            setResult({
                collectionId: config.collectionId,
                collectionName: 'Error',
                totalRequests: 0, totalPassed: 0, totalFailed: 0,
                totalAssertions: 0, passedAssertions: 0, failedAssertions: 0,
                totalDuration: 0, iterations: 0, results: [],
                startedAt: Date.now(), completedAt: Date.now(),
            });
        } finally {
            setRunning(false);
        }
    };

    const handleCancel = async () => {
        try {
            await window.api.cancelRunner();
        } catch {
            // Best effort
        }
    };


    const handleExportJSON = () => {
        if (!result) return;
        const report = generateJSONReport(result);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadReport(report, `runner-report-${ts}.json`, 'application/json');
    };

    const handleExportText = () => {
        if (!result) return;
        const report = generateTextReport(result);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadReport(report, `runner-report-${ts}.txt`, 'text/plain');
    };

    const handleExportSingleItem = (item: RunnerItemResult) => {
        const data = JSON.stringify({
            itemName: item.itemName,
            iteration: item.iteration,
            passed: item.passed,
            duration: item.duration,
            request: {
                method: item.request?.method,
                url: item.request?.url,
                headers: item.requestHeaders,
                body: item.request?.body,
            },
            response: item.response ? {
                status: item.response.status,
                statusText: item.response.statusText,
                time: item.response.time,
                size: item.response.size,
                headers: item.responseHeaders,
                body: item.response.body,
            } : null,
            testResults: item.testResults,
            consoleOutput: item.consoleOutput,
            error: item.error,
            scriptError: item.scriptError,
            csvVariables: item.csvVariables,
        }, null, 2);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadReport(data, `${item.itemName}-${ts}.json`, 'application/json');
    };

    // Compute live stats
    const livePassedCount = liveResults.filter(r => r.passed).length;
    const liveFailedCount = liveResults.filter(r => !r.passed).length;
    const liveTotalTests = liveResults.reduce((a, r) => a + r.testResults.length, 0);
    const livePassedTests = liveResults.reduce((a, r) => a + r.testResults.filter(t => t.passed).length, 0);

    const allItems = result?.results || liveResults;
    const showConfig = !isRunning && !result;
    const showLive = isRunning;
    const showResults = !!result;

    // Filter items
    const items = useMemo(() => {
        if (resultFilter === 'all') return allItems;
        if (resultFilter === 'passed') return allItems.filter(i => i.passed);
        return allItems.filter(i => !i.passed);
    }, [allItems, resultFilter]);

    const getDetailTab = (idx: number): DetailTab => detailTabs[idx] || 'response';
    const setDetailTab = (idx: number, tab: DetailTab) => {
        setDetailTabs(prev => ({ ...prev, [idx]: tab }));
    };

    return (
        <div className="runner-page">
            {/* Header */}
            <div className="runner-page-header">
                <div className="runner-page-header-left">
                    <button className="runner-back-btn" onClick={onClose} title={t('runner.closeRunner')}>
                        <span>←</span>
                    </button>
                    <div className="runner-page-title-group">
                        <h2 className="runner-page-title">
                            {folderName
                                ? `${t('runner.title')} — 📁 ${folderName}`
                                : t('runner.title')
                            }
                        </h2>
                        {isRunning && <span className="runner-status-badge running">{t('runner.running')}</span>}
                        {result && !isRunning && (
                            <span className={`runner-status-badge ${result.aborted ? 'cancelled' : result.totalFailed > 0 ? 'has-failures' : 'all-passed'}`}>
                                {result.aborted ? t('runner.cancelled', { defaultValue: 'Cancelled' }) : result.totalFailed > 0 ? t('runner.completedWithFailures') : t('runner.allPassed')}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isRunning && (
                        <button className="runner-cancel-btn" onClick={handleCancel}>
                            ■ {t('runner.cancelRun', { defaultValue: 'Cancel Run' })}
                        </button>
                    )}
                    {showResults && (
                        <div className="runner-export-group">
                            <button className="runner-export-btn" onClick={handleExportJSON}>
                                <span className="runner-export-icon">{ }</span> {t('runner.exportJSON')}
                            </button>
                            <button className="runner-export-btn" onClick={handleExportText}>
                                <span className="runner-export-icon">📄</span> {t('runner.exportText')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {isRunning && progress && (
                <div className="runner-live-progress">
                    <div className="runner-live-progress-bar">
                        <div
                            className="runner-live-progress-fill"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <div className="runner-live-progress-text">
                        {progress.current} / {progress.total} — <strong>{progress.itemName}</strong>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {(showResults || showLive) && (
                <div className="runner-summary-cards">
                    <div className="runner-card">
                        <div className="runner-card-icon requests">📡</div>
                        <div className="runner-card-content">
                            <div className="runner-card-value">
                                {showResults ? result!.totalRequests : liveResults.length}
                            </div>
                            <div className="runner-card-label">{t('runner.totalRequests')}</div>
                        </div>
                    </div>
                    <div className="runner-card passed">
                        <div className="runner-card-icon">✓</div>
                        <div className="runner-card-content">
                            <div className="runner-card-value">
                                {showResults ? result!.totalPassed : livePassedCount}
                            </div>
                            <div className="runner-card-label">{t('runner.passed')}</div>
                        </div>
                    </div>
                    <div className="runner-card failed">
                        <div className="runner-card-icon">✗</div>
                        <div className="runner-card-content">
                            <div className="runner-card-value">
                                {showResults ? result!.totalFailed : liveFailedCount}
                            </div>
                            <div className="runner-card-label">{t('runner.failed')}</div>
                        </div>
                    </div>
                    <div className="runner-card">
                        <div className="runner-card-icon tests">🧪</div>
                        <div className="runner-card-content">
                            <div className="runner-card-value">
                                {showResults
                                    ? `${result!.passedAssertions}/${result!.totalAssertions}`
                                    : `${livePassedTests}/${liveTotalTests}`
                                }
                            </div>
                            <div className="runner-card-label">{t('runner.testsPassed')}</div>
                        </div>
                    </div>
                    {showResults && (
                        <>
                            <div className="runner-card">
                                <div className="runner-card-icon duration">⏱</div>
                                <div className="runner-card-content">
                                    <div className="runner-card-value">{result!.totalDuration}ms</div>
                                    <div className="runner-card-label">{t('runner.duration')}</div>
                                </div>
                            </div>
                            <div className="runner-card rate">
                                <div className="runner-card-icon">📊</div>
                                <div className="runner-card-content">
                                    <div className="runner-card-value">
                                        {result!.totalRequests > 0
                                            ? Math.round((result!.totalPassed / result!.totalRequests) * 100)
                                            : 0}%
                                    </div>
                                    <div className="runner-card-label">{t('runner.passRate')}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Body */}
            <div className="runner-page-body">
                {/* Configuration */}
                {showConfig && (
                    <div className="runner-config-page">
                        <div className="runner-config-card">
                            <h3 className="runner-config-title">{t('runner.runConfiguration')}</h3>

                            <div className="runner-config-field">
                                <label>{t('runner.collection')}</label>
                                <select
                                    value={config.collectionId}
                                    onChange={(e) => updateConfig({ collectionId: e.target.value })}
                                >
                                    <option value="">{t('runner.selectCollection')}</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="runner-config-field">
                                <label>{t('runner.environment')}</label>
                                <select
                                    value={config.environmentId || ''}
                                    onChange={(e) => updateConfig({ environmentId: e.target.value || undefined })}
                                >
                                    <option value="">{t('runner.noEnvironment')}</option>
                                    {environments.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Folder selector — show folders in the selected collection */}
                            {config.collectionId && (() => {
                                const selectedCol = collections.find(c => c.id === config.collectionId);
                                const folders = selectedCol?.items.filter(i => i.type === 'folder') || [];
                                if (folders.length === 0) return null;
                                return (
                                    <div className="runner-config-field">
                                        <label>{t('runner.folder', { defaultValue: 'Folder' })} <span className="runner-config-optional">{t('runner.dataFileOptional')}</span></label>
                                        <select
                                            value={config.folderId || ''}
                                            onChange={(e) => updateConfig({ folderId: e.target.value || undefined })}
                                        >
                                            <option value="">{t('runner.allRequests', { defaultValue: 'All Requests (entire collection)' })}</option>
                                            {folders.map(f => (
                                                <option key={f.id} value={f.id}>📁 {f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })()}

                            <div className="runner-config-row">
                                <div className="runner-config-field">
                                    <label>
                                        {t('runner.iterations')}
                                        {csvData && (
                                            <span className="runner-csv-locked-hint">
                                                {' '}— {t('runner.csvIterationsLocked', { defaultValue: 'Set to CSV row count' })}
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number" min={1} max={10000}
                                        value={config.iterations}
                                        onChange={(e) => updateConfig({ iterations: parseInt(e.target.value) || 1 })}
                                        disabled={!!csvData}
                                    />
                                </div>
                                <div className="runner-config-field">
                                    <label>{t('runner.delay')}</label>
                                    <input
                                        type="number" min={0} max={60000}
                                        value={config.delayMs}
                                        onChange={(e) => updateConfig({ delayMs: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <label className="runner-config-checkbox">
                                <input
                                    type="checkbox"
                                    checked={config.stopOnError}
                                    onChange={(e) => updateConfig({ stopOnError: e.target.checked })}
                                />
                                <span>{t('runner.stopOnError')}</span>
                            </label>

                            {/* ── CSV File Upload Section ── */}
                            <div className="runner-config-field">
                                <label>
                                    {t('runner.csvFile', { defaultValue: 'Data File (CSV)' })}
                                    <span className="runner-config-optional"> ({t('runner.dataFileOptional')})</span>
                                </label>

                                {!csvFileName ? (
                                    /* Drop zone */
                                    <div
                                        className={`runner-csv-upload ${isDragOver ? 'dragover' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            style={{ display: 'none' }}
                                            onChange={handleFileInput}
                                        />
                                        <div className="runner-csv-upload-icon">📄</div>
                                        <div className="runner-csv-upload-text">
                                            {t('runner.csvUploadHint', { defaultValue: 'Drop a .csv file here or click to browse' })}
                                        </div>
                                        <button
                                            className="runner-csv-browse-btn"
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        >
                                            {t('runner.csvBrowse', { defaultValue: 'Browse' })}
                                        </button>
                                    </div>
                                ) : (
                                    /* File info */
                                    <div className="runner-csv-file-info">
                                        <div className="runner-csv-file-icon">📄</div>
                                        <div className="runner-csv-file-details">
                                            <div className="runner-csv-file-name">{csvFileName}</div>
                                            <div className="runner-csv-file-meta">
                                                {formatBytes(csvFileSize || 0)}
                                                {csvData && ` · ${csvData.totalRows} ${t('runner.csvRows', { count: csvData.totalRows, defaultValue: 'rows' })}`}
                                                {csvData && ` · ${csvData.headers.length} columns`}
                                            </div>
                                        </div>
                                        <button className="runner-csv-remove-btn" onClick={clearCsv}>
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {/* CSV Error */}
                                {csvError && (
                                    <div className="runner-csv-error">
                                        <span className="runner-csv-error-icon">⚠</span>
                                        {csvError}
                                    </div>
                                )}
                            </div>

                            {/* ── CSV Preview ── */}
                            {csvData && csvData.totalRows > 0 && (
                                <div className="runner-csv-preview-section">
                                    <div className="runner-csv-preview-header">
                                        <span className="runner-csv-preview-title">
                                            {t('runner.csvPreview', { defaultValue: 'CSV Data Preview' })}
                                        </span>
                                        <span className="runner-csv-preview-count">
                                            {csvData.totalRows} {t('runner.csvRows', { count: csvData.totalRows, defaultValue: 'rows' })}
                                        </span>
                                    </div>

                                    {/* Available variables */}
                                    <div className="runner-csv-variables">
                                        <span className="runner-csv-variables-label">
                                            {t('runner.csvVariables', { defaultValue: 'Available Variables' })}:
                                        </span>
                                        {csvData.headers.map(h => (
                                            <span key={h} className="runner-csv-variable-chip">{`{{${h}}}`}</span>
                                        ))}
                                    </div>

                                    {/* Preview table */}
                                    <div className="runner-csv-preview-table-wrap">
                                        <table className="runner-csv-table">
                                            <thead>
                                                <tr>
                                                    <th className="runner-csv-th-iter">#</th>
                                                    {csvData.headers.map(h => (
                                                        <th key={h}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvData.rows.slice(0, CSV_PREVIEW_MAX_ROWS).map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="runner-csv-td-iter">{idx + 1}</td>
                                                        {csvData.headers.map(h => (
                                                            <td key={h} className={row[h] === '' || row[h] === undefined ? 'runner-csv-empty-cell' : ''}>
                                                                {row[h] === '' || row[h] === undefined
                                                                    ? <span className="runner-csv-empty-label">{t('runner.csvEmptyValue', { defaultValue: 'empty' })}</span>
                                                                    : row[h]
                                                                }
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {csvData.totalRows > CSV_PREVIEW_MAX_ROWS && (
                                        <div className="runner-csv-more-rows">
                                            {t('runner.csvMoreRows', {
                                                count: csvData.totalRows - CSV_PREVIEW_MAX_ROWS,
                                                defaultValue: `and ${csvData.totalRows - CSV_PREVIEW_MAX_ROWS} more rows...`
                                            })}
                                        </div>
                                    )}

                                    {/* Parse warnings */}
                                    {csvData.errors.length > 0 && (
                                        <div className="runner-csv-warnings">
                                            {csvData.errors.slice(0, 5).map((err, i) => (
                                                <div key={i} className="runner-csv-warning-item">
                                                    ⚠ {err.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="runner-run-btn"
                                onClick={handleRun}
                                disabled={!config.collectionId}
                            >
                                <span className="runner-run-icon">▶</span>
                                {config.folderId
                                    ? t('runner.runFolder', { defaultValue: 'Run Folder' })
                                    : t('runner.runCollection')
                                }
                                {csvData && ` (${csvData.totalRows} iterations)`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Live / Results View */}
                {(showLive || showResults) && (
                    <div className="runner-results-section">
                        <div className="runner-results-toolbar">
                            {showResults && (
                                <button className="runner-toolbar-btn" onClick={() => reset()}>
                                    {t('runner.newRun')}
                                </button>
                            )}
                            {/* Filter bar */}
                            <div className="runner-filter-bar">
                                <button className={`runner-filter-btn ${resultFilter === 'all' ? 'active' : ''}`} onClick={() => setResultFilter('all')}>
                                    All ({allItems.length})
                                </button>
                                <button className={`runner-filter-btn passed ${resultFilter === 'passed' ? 'active' : ''}`} onClick={() => setResultFilter('passed')}>
                                    ✓ Passed ({allItems.filter(i => i.passed).length})
                                </button>
                                <button className={`runner-filter-btn failed ${resultFilter === 'failed' ? 'active' : ''}`} onClick={() => setResultFilter('failed')}>
                                    ✗ Failed ({allItems.filter(i => !i.passed).length})
                                </button>
                            </div>
                            <div className="runner-results-toolbar-right">
                                <button className="runner-toolbar-btn small" onClick={expandAll}>{t('runner.expandAll')}</button>
                                <button className="runner-toolbar-btn small" onClick={collapseAll}>{t('runner.collapseAll')}</button>
                            </div>
                        </div>

                        <div className="runner-results-list" ref={liveListRef}>
                            {items.map((item, idx) => {
                                // Use the original index for expandedItems tracking
                                const originalIdx = allItems.indexOf(item);
                                const isExpanded = expandedItems.has(originalIdx);
                                const activeTab = getDetailTab(originalIdx);

                                return (
                                <div
                                    key={originalIdx}
                                    className={`runner-result-item ${item.passed ? 'passed' : 'failed'} runner-result-animate`}
                                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                                >
                                    <div className="runner-result-header" onClick={() => toggleItem(originalIdx)}>
                                        <span className={`runner-result-status ${item.passed ? 'pass' : 'fail'}`}>
                                            {item.passed ? '✓' : '✗'}
                                        </span>
                                        <span
                                            className="runner-result-method"
                                            style={{ color: METHOD_COLORS[item.request?.method || 'GET'] }}
                                        >
                                            {item.request?.method || 'GET'}
                                        </span>
                                        <span className="runner-result-name">{item.itemName}</span>
                                        {/* Always show iteration badge for CSV runs */}
                                        <span className="runner-result-iter">
                                            {t('runner.iteration', { num: item.iteration + 1, defaultValue: `Iteration ${item.iteration + 1}` })}
                                        </span>
                                        {/* CSV variable badges */}
                                        {item.csvVariables && Object.keys(item.csvVariables).length > 0 && (
                                            <div className="runner-result-csv-vars">
                                                {Object.entries(item.csvVariables).slice(0, 3).map(([k, v]) => (
                                                    <span key={k} className="runner-result-csv-var-badge" title={`${k}=${v}`}>
                                                        {k}={truncate(v, 15)}
                                                    </span>
                                                ))}
                                                {Object.keys(item.csvVariables).length > 3 && (
                                                    <span className="runner-result-csv-var-badge more">
                                                        +{Object.keys(item.csvVariables).length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {item.response && (
                                            <span className={`runner-result-code ${getStatusClass(item.response.status)}`}>
                                                {item.response.status} {item.response.statusText}
                                            </span>
                                        )}
                                        <span className="runner-result-duration">{item.duration}ms</span>
                                        {item.testResults.length > 0 ? (
                                            <span className="runner-result-test-badge">
                                                {item.testResults.filter(t => t.passed).length}/{item.testResults.length} {t('request.tests').toLowerCase()}
                                            </span>
                                        ) : item.passed && item.response ? (
                                            <span className="runner-result-test-badge no-tests">
                                                {t('runner.noTests', { defaultValue: 'No tests defined' })}
                                            </span>
                                        ) : null}
                                        <span className="runner-result-chevron">
                                            {isExpanded ? '▾' : '▸'}
                                        </span>
                                    </div>

                                    {isExpanded && (
                                        <div className="runner-result-detail">
                                            {/* Detail tabs */}
                                            <div className="runner-detail-tabs">
                                                <button className={`runner-detail-tab ${activeTab === 'request' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab(originalIdx, 'request')}>Request</button>
                                                <button className={`runner-detail-tab ${activeTab === 'response' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab(originalIdx, 'response')}>Response</button>
                                                <button className={`runner-detail-tab ${activeTab === 'tests' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab(originalIdx, 'tests')}>
                                                    Tests
                                                    {item.testResults.length > 0 && (
                                                        <span className={`runner-detail-tab-badge ${item.testResults.some(t => !t.passed) ? 'fail' : 'pass'}`}>
                                                            {item.testResults.filter(t => t.passed).length}/{item.testResults.length}
                                                        </span>
                                                    )}
                                                </button>
                                                <button className={`runner-detail-tab ${activeTab === 'console' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab(originalIdx, 'console')}>
                                                    Console
                                                    {item.consoleOutput && item.consoleOutput.length > 0 && (
                                                        <span className="runner-detail-tab-badge neutral">{item.consoleOutput.length}</span>
                                                    )}
                                                </button>
                                                <button className={`runner-detail-tab ${activeTab === 'timeline' ? 'active' : ''}`}
                                                    onClick={() => setDetailTab(originalIdx, 'timeline')}>Timeline</button>
                                                {/* Item actions */}
                                                <div className="runner-item-actions">
                                                    <button className="runner-item-action-btn" title="Save to folder"
                                                        onClick={() => setSaveModalItem(item)}>💾</button>
                                                    <button className="runner-item-action-btn" title="Export as JSON"
                                                        onClick={() => handleExportSingleItem(item)}>📥</button>
                                                </div>
                                            </div>

                                            {/* Tab content */}
                                            <div className="runner-detail-tab-content">
                                                {activeTab === 'request' && (
                                                    <RunnerRequestTab item={item} />
                                                )}
                                                {activeTab === 'response' && (
                                                    <RunnerResponseTab item={item} />
                                                )}
                                                {activeTab === 'tests' && (
                                                    <RunnerTestsTab item={item} />
                                                )}
                                                {activeTab === 'console' && (
                                                    <RunnerConsoleTab item={item} />
                                                )}
                                                {activeTab === 'timeline' && (
                                                    <RunnerTimelineTab item={item} />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                            })}

                            {showLive && items.length === 0 && (
                                <div className="runner-waiting">
                                    <div className="runner-waiting-spinner" />
                                    <span>{t('runner.preparing')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Save to Folder Modal */}
            {saveModalItem && saveModalItem.request && (
                <SaveToFolderModal
                    request={saveModalItem.request}
                    response={saveModalItem.response}
                    requestName={saveModalItem.itemName}
                    onClose={() => setSaveModalItem(null)}
                    onSaved={() => setSaveModalItem(null)}
                />
            )}
        </div>
    );
}

// ── Detail Tab Components ──

function RunnerRequestTab({ item }: { item: RunnerItemResult }) {
    return (
        <div className="runner-request-info">
            <div className="runner-detail-row">
                <span className="runner-detail-label">Method</span>
                <span className="runner-detail-value" style={{ color: METHOD_COLORS[item.request?.method || 'GET'], fontWeight: 700 }}>
                    {item.request?.method || 'GET'}
                </span>
            </div>
            <div className="runner-detail-row">
                <span className="runner-detail-label">URL</span>
                <span className="runner-detail-value mono">{item.request?.url || '—'}</span>
            </div>
            {/* Request Headers */}
            {item.requestHeaders && Object.keys(item.requestHeaders).length > 0 && (
                <div className="runner-detail-section">
                    <div className="runner-detail-section-title">Headers</div>
                    <table className="runner-detail-headers-table">
                        <tbody>
                            {Object.entries(item.requestHeaders).map(([key, value]) => (
                                <tr key={key}>
                                    <td className="runner-header-key">{key}</td>
                                    <td className="runner-header-value">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Request Body */}
            {item.request?.body && item.request.body.type !== 'none' && item.request.body.raw && (
                <div className="runner-detail-section">
                    <div className="runner-detail-section-title">Body ({item.request.body.type})</div>
                    <pre className="runner-response-pre">{formatBody(item.request.body.raw)}</pre>
                </div>
            )}
            {/* CSV Variables used */}
            {item.csvVariables && Object.keys(item.csvVariables).length > 0 && (
                <div className="runner-result-csv-detail">
                    <div className="runner-detail-section-title">CSV Data</div>
                    <div className="runner-result-csv-detail-grid">
                        {Object.entries(item.csvVariables).map(([k, v]) => (
                            <div key={k} className="runner-csv-detail-item">
                                <span className="runner-csv-detail-key">{`{{${k}}}`}</span>
                                <span className="runner-csv-detail-value">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function RunnerResponseTab({ item }: { item: RunnerItemResult }) {
    if (!item.response) {
        return (
            <div className="runner-detail-empty">
                <span className="runner-detail-empty-icon">⚠</span>
                <span>{item.error || 'No response received'}</span>
            </div>
        );
    }

    const resp = item.response;
    let parsedBody: any = null;
    let isJson = false;
    try {
        parsedBody = JSON.parse(resp.body);
        isJson = true;
    } catch { /* not json */ }

    return (
        <div className="runner-response-info">
            {/* Status row */}
            <div className="runner-detail-meta-row">
                <div className="runner-detail-meta-item">
                    <span className="runner-detail-label">Status</span>
                    <span className={`runner-detail-value ${getStatusClass(resp.status)}`}>
                        {resp.status} {resp.statusText}
                    </span>
                </div>
                <div className="runner-detail-meta-item">
                    <span className="runner-detail-label">Time</span>
                    <span className="runner-detail-value">{resp.time}ms</span>
                </div>
                <div className="runner-detail-meta-item">
                    <span className="runner-detail-label">Size</span>
                    <span className="runner-detail-value">{formatBytes(resp.size)}</span>
                </div>
            </div>

            {/* Response Headers */}
            {item.responseHeaders && Object.keys(item.responseHeaders).length > 0 && (
                <details className="runner-detail-section-collapsible">
                    <summary className="runner-detail-section-title clickable">
                        Response Headers ({Object.keys(item.responseHeaders).length})
                    </summary>
                    <table className="runner-detail-headers-table">
                        <tbody>
                            {Object.entries(item.responseHeaders).map(([key, value]) => (
                                <tr key={key}>
                                    <td className="runner-header-key">{key}</td>
                                    <td className="runner-header-value">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </details>
            )}

            {/* Response Body */}
            {resp.body && (
                <div className="runner-detail-section">
                    <div className="runner-detail-section-title">Response Body</div>
                    {isJson ? (
                        <div className="runner-json-tree-wrapper">
                            <JsonTreeViewer data={parsedBody} initialDepth={2} />
                        </div>
                    ) : (
                        <pre className="runner-response-pre">{formatBody(resp.body)}</pre>
                    )}
                </div>
            )}
        </div>
    );
}

function RunnerTestsTab({ item }: { item: RunnerItemResult }) {
    const passed = item.testResults.filter(t => t.passed).length;
    const failed = item.testResults.filter(t => !t.passed).length;
    const total = item.testResults.length;

    if (total === 0 && !item.error && !item.scriptError) {
        return (
            <div className="runner-detail-empty">
                <span className="runner-detail-empty-icon">🧪</span>
                <span>No tests defined for this request</span>
            </div>
        );
    }

    return (
        <div className="runner-tests-info">
            {/* Summary */}
            {total > 0 && (
                <div className="runner-tests-summary">
                    <span className="runner-tests-total">{total} test{total !== 1 ? 's' : ''}</span>
                    {passed > 0 && <span className="runner-tests-badge pass">✓ {passed} passed</span>}
                    {failed > 0 && <span className="runner-tests-badge fail">✗ {failed} failed</span>}
                    <div className="runner-tests-progress-bar">
                        <div className="runner-tests-progress-fill pass" style={{ width: `${(passed / total) * 100}%` }} />
                        <div className="runner-tests-progress-fill fail" style={{ width: `${(failed / total) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* Errors */}
            {item.error && (
                <div className="runner-result-error">
                    <span className="runner-error-icon">⚠</span> {item.error}
                </div>
            )}

            {/* Individual tests */}
            {item.testResults.map((test, ti) => (
                <div key={ti} className={`runner-test-row ${test.passed ? 'pass' : 'fail'}`}>
                    <span className="runner-test-icon">{test.passed ? '✓' : '✗'}</span>
                    <span className="runner-test-name">{test.name}</span>
                    {test.error && (
                        <span className="runner-test-error-msg">{test.error}</span>
                    )}
                </div>
            ))}
        </div>
    );
}

function RunnerConsoleTab({ item }: { item: RunnerItemResult }) {
    const logs = item.consoleOutput || [];
    const hasError = item.scriptError;

    if (logs.length === 0 && !hasError) {
        return (
            <div className="runner-detail-empty">
                <span className="runner-detail-empty-icon">📋</span>
                <span>No console output</span>
            </div>
        );
    }

    return (
        <div className="runner-console-info">
            {hasError && (
                <div className="runner-console-error">
                    <span className="runner-console-error-icon">⚠</span>
                    <pre className="runner-console-error-text">{item.scriptError}</pre>
                </div>
            )}
            {logs.map((log, i) => {
                const level = getLogLevel(log);
                return (
                    <div key={i} className={`runner-console-line ${level}`}>
                        <span className="runner-console-prefix">{getLogPrefix(log)}</span>
                        <span className="runner-console-text">{stripPhaseAndLogPrefix(log)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function RunnerTimelineTab({ item }: { item: RunnerItemResult }) {
    const httpTime = item.response?.time || 0;
    const totalDuration = item.duration || 1;
    const scriptTime = Math.max(0, totalDuration - httpTime);

    // Approximate breakdown
    const httpPercent = Math.round((httpTime / totalDuration) * 100);
    const scriptPercent = 100 - httpPercent;

    return (
        <div className="runner-timeline-info">
            <div className="runner-timeline-total">
                <span className="runner-detail-label">Total Duration</span>
                <span className="runner-detail-value">{totalDuration}ms</span>
            </div>
            <div className="runner-timeline-bar-container">
                {scriptPercent > 0 && (
                    <div
                        className="runner-timeline-bar scripts"
                        style={{ width: `${Math.max(scriptPercent, 5)}%` }}
                        title={`Scripts: ~${scriptTime}ms`}
                    >
                        <span className="runner-timeline-bar-label">Scripts</span>
                    </div>
                )}
                {httpPercent > 0 && (
                    <div
                        className="runner-timeline-bar http"
                        style={{ width: `${Math.max(httpPercent, 5)}%` }}
                        title={`HTTP: ${httpTime}ms`}
                    >
                        <span className="runner-timeline-bar-label">HTTP {httpTime}ms</span>
                    </div>
                )}
            </div>
            <div className="runner-timeline-legend">
                <div className="runner-timeline-legend-item">
                    <span className="runner-timeline-legend-color scripts" />
                    <span>Scripts & Tests (~{scriptTime}ms)</span>
                </div>
                <div className="runner-timeline-legend-item">
                    <span className="runner-timeline-legend-color http" />
                    <span>HTTP Request ({httpTime}ms)</span>
                </div>
            </div>
            {item.response && (
                <div className="runner-timeline-details">
                    <div className="runner-timeline-event">
                        <span className="runner-timeline-event-dot sent" />
                        <span>Request Sent</span>
                    </div>
                    <div className="runner-timeline-event">
                        <span className="runner-timeline-event-dot received" />
                        <span>Response Received ({item.response.status} {item.response.statusText})</span>
                    </div>
                    {item.testResults.length > 0 && (
                        <div className="runner-timeline-event">
                            <span className="runner-timeline-event-dot tests" />
                            <span>Tests Executed ({item.testResults.filter(t => t.passed).length}/{item.testResults.length} passed)</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Helpers ──

function getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'status-2xx';
    if (status >= 300 && status < 400) return 'status-3xx';
    if (status >= 400 && status < 500) return 'status-4xx';
    if (status >= 500) return 'status-5xx';
    return 'status-err';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatBody(body: string): string {
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body.length > 5000 ? body.slice(0, 5000) + '\n... (truncated)' : body;
    }
}

function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function getLogLevel(log: string): string {
    const stripped = log.replace(/^\[(pre-request|test)\]\s*/, '');
    if (stripped.startsWith('[ERROR]')) return 'error';
    if (stripped.startsWith('[WARN]')) return 'warn';
    if (stripped.startsWith('[INFO]')) return 'info';
    return 'log';
}

function getLogPrefix(log: string): string {
    const stripped = log.replace(/^\[(pre-request|test)\]\s*/, '');
    if (stripped.startsWith('[ERROR]')) return '✗';
    if (stripped.startsWith('[WARN]')) return '⚠';
    if (stripped.startsWith('[INFO]')) return 'ℹ';
    return '›';
}

function stripPhaseAndLogPrefix(log: string): string {
    return log
        .replace(/^\[(pre-request|test)\]\s*/, '')
        .replace(/^\[(ERROR|WARN|INFO)\]\s*/, '');
}
