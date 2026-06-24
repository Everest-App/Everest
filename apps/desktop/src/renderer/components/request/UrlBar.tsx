import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTabStore } from '../../store/tab-store';
import { useHistoryStore } from '../../store/history-store';
import { useEnvironmentStore } from '../../store/environment-store';
import { HTTP_METHODS } from '@api-platform/core';
import { HttpMethod } from '@api-platform/core';
import { isCurlCommand } from '../../utils/curl-parser';
import { tokenizeUrl, resolveVariable, findVariableLocation, ResolvedVariable } from '../../utils/env-resolver';

interface UrlBarProps {
    onCodeGen: () => void;
    onImportCurl: (curlText?: string) => void;
    onNavigateToVariable?: (varName: string) => void;
}

export function UrlBar({ onCodeGen, onImportCurl, onNavigateToVariable }: UrlBarProps) {
    const { t } = useTranslation();
    const { tabs, activeTabId, updateMethod, updateUrl, setLoading, setResponse, setScriptResults } = useTabStore();
    const { fetchHistory } = useHistoryStore();
    const { environments, activeEnvironmentId, globalVariables } = useEnvironmentStore();

    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        data: ResolvedVariable | null;
    }>({ visible: false, x: 0, y: 0, data: null });

    const [isFocused, setIsFocused] = useState(false);

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { request, loading } = activeTab;

    // Tokenize URL for overlay rendering
    const tokens = useMemo(
        () => tokenizeUrl(request.url),
        [request.url]
    );

    const hasVariables = tokens.some(t => t.type === 'variable');

    // Sync overlay scroll with input scroll
    const syncScroll = useCallback(() => {
        if (inputRef.current && overlayRef.current) {
            overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    }, []);

    const handleSend = async () => {
        if (!request.url || loading) return;

        setLoading(true);
        setResponse(null);
        setScriptResults(undefined);

        try {
            const envStore = useEnvironmentStore.getState();
            const result = await window.api.sendRequest(request, envStore.activeEnvironmentId || undefined);
            setResponse(result.response);
            setScriptResults({
                preRequest: result.preRequestResult,
                test: result.testResult,
            });
            fetchHistory();
        } catch (error: any) {
            // If the request was cancelled by the user, just clear the UI silently
            if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
                setResponse(null);
            } else {
                setResponse({
                    status: 0,
                    statusText: error.message || 'Error',
                    headers: {},
                    body: JSON.stringify({ error: error.message }, null, 2),
                    size: 0,
                    time: 0,
                    contentType: 'application/json',
                });
            }
        } finally {
            setLoading(false);
        }
    };


    const handleCancel = async () => {
        try {
            await window.api.cancelRequest();
        } catch {
            // Best effort — request may have already completed
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (isCurlCommand(pastedText)) {
            e.preventDefault();
            onImportCurl(pastedText);
        }
    };

    const handleVariableHover = useCallback((
        e: React.MouseEvent<HTMLSpanElement>,
        varName: string
    ) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const resolved = resolveVariable(varName);
        setTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 6,
            data: resolved,
        });
    }, []);

    const handleVariableLeave = useCallback(() => {
        setTooltip(prev => ({ ...prev, visible: false }));
    }, []);

    const handleVariableClick = useCallback((varName: string) => {
        if (onNavigateToVariable) {
            onNavigateToVariable(varName);
        }
    }, [onNavigateToVariable]);

    return (
        <div className="url-bar">
            <div className="method-selector">
                <select
                    value={request.method}
                    onChange={(e) => updateMethod(e.target.value as HttpMethod)}
                >
                    {HTTP_METHODS.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>

            <div className="url-input-wrapper">
                <input
                    ref={inputRef}
                    className="url-input"
                    type="text"
                    value={request.url}
                    onChange={(e) => updateUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onScroll={syncScroll}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={t('request.urlPlaceholder')}
                    spellCheck={false}
                />

                {/* Variable overlay — only rendered when URL contains {{variables}} */}
                {hasVariables && (
                    <div
                        ref={overlayRef}
                        className={`url-var-overlay ${isFocused ? 'editing' : ''}`}
                        aria-hidden="true"
                    >
                        {tokens.map((token, i) => {
                            if (token.type === 'variable') {
                                // Resolve on render for styling (found vs not-found)
                                const resolved = resolveVariable(token.value);
                                return (
                                    <span
                                        key={i}
                                        className={`url-var-token ${resolved.found ? 'resolved' : 'unresolved'}`}
                                        onMouseEnter={(e) => handleVariableHover(e, token.value)}
                                        onMouseLeave={handleVariableLeave}
                                        onClick={() => handleVariableClick(token.value)}
                                    >
                                        {token.raw}
                                    </span>
                                );
                            }
                            return (
                                <span key={i} className="url-text-token">
                                    {token.raw}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Variable tooltip */}
                {tooltip.visible && tooltip.data && (
                    <div
                        className="url-var-tooltip"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                        }}
                    >
                        {tooltip.data.found ? (
                            <>
                                <div className="url-var-tooltip-row">
                                    <span className="url-var-tooltip-label">Variable</span>
                                    <span className="url-var-tooltip-value var-name">{tooltip.data.name}</span>
                                </div>
                                <div className="url-var-tooltip-row">
                                    <span className="url-var-tooltip-label">Value</span>
                                    <span className="url-var-tooltip-value">{tooltip.data.value}</span>
                                </div>
                                <div className="url-var-tooltip-row">
                                    <span className="url-var-tooltip-label">{tooltip.data.scope === 'global' ? 'Scope' : 'Environment'}</span>
                                    <span className="url-var-tooltip-value env-name">{tooltip.data.environmentName}</span>
                                </div>
                                <div className="url-var-tooltip-hint">Click to jump to variable</div>
                            </>
                        ) : (
                            <div className="url-var-tooltip-warning">
                                <span className="url-var-tooltip-warning-icon">⚠</span>
                                Variable "{tooltip.data.name}" not found
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <button className="cancel-btn" onClick={handleCancel} title={t('common.cancel', { defaultValue: 'Cancel' })}>
                    <span className="cancel-icon">■</span> {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
            ) : (
                <button className="send-btn" onClick={handleSend} disabled={!request.url}>
                    {t('common.send')}
                </button>
            )}

            <button className="toolbar-btn" onClick={() => onImportCurl()} title={t('request.importCurl')}>
                📋
            </button>

            <button className="toolbar-btn" onClick={onCodeGen} title={t('request.generateCode')}>
                {'</>'}
            </button>
        </div>
    );
}
