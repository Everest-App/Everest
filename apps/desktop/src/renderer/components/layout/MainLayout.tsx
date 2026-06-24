import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { RequestPanel } from '../request/RequestPanel';
import { ResponsePanel } from '../response/ResponsePanel';
import { GraphQLPanel } from '../protocols/GraphQLPanel';
import { WebSocketPanel } from '../protocols/WebSocketPanel';
import { SSEPanel } from '../protocols/SSEPanel';
import { MockServerPanel } from '../mock/MockServerPanel';
import { RunnerPanel } from '../runner/RunnerPanel';
import { useThemeStore } from '../../store/theme-store';
import { useRunnerStore } from '../../store/runner-store';
import { useLanguageStore } from '../../store/language-store';
import { AppIcon } from '../common/AppIcon';

type ProtocolMode = 'http' | 'graphql' | 'websocket' | 'sse' | 'mock';

// ── Response Panel Resize Constants ──
const RESPONSE_HEIGHT_KEY = 'response-panel-height';
const MIN_RESPONSE_HEIGHT = 180;
const MAX_RESPONSE_RATIO = 0.85;

// ── Sidebar Resize Constants ──
const SIDEBAR_WIDTH_KEY = 'sidebar-panel-width';
const DEFAULT_SIDEBAR_WIDTH = 300;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 600;
const SNAP_COLLAPSE_THRESHOLD = 180; // snap to min if dragged below this

function getStoredHeight(): number {
    try {
        const stored = localStorage.getItem(RESPONSE_HEIGHT_KEY);
        if (stored) {
            const val = parseInt(stored, 10);
            if (!isNaN(val) && val >= MIN_RESPONSE_HEIGHT) return val;
        }
    } catch {}
    return 320;
}

function getStoredSidebarWidth(): number {
    try {
        const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
        if (stored) {
            const val = parseInt(stored, 10);
            if (!isNaN(val) && val >= MIN_SIDEBAR_WIDTH && val <= MAX_SIDEBAR_WIDTH) return val;
        }
    } catch {}
    return DEFAULT_SIDEBAR_WIDTH;
}

export function MainLayout() {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useThemeStore();
    const { language, setLanguage } = useLanguageStore();
    const [protocolMode, setProtocolMode] = useState<ProtocolMode>('http');
    const { isOpen: runnerOpen, openRunner, closeRunner } = useRunnerStore();

    // ── Response panel resize state ──
    const [responseHeight, setResponseHeight] = useState(getStoredHeight);
    const isResizingResponse = useRef(false);
    const responseStartY = useRef(0);
    const responseStartH = useRef(0);
    const responseRafId = useRef<number>(0);

    // ── Sidebar resize state ──
    const [sidebarWidth, setSidebarWidth] = useState(getStoredSidebarWidth);
    const isResizingSidebar = useRef(false);
    const sidebarStartX = useRef(0);
    const sidebarStartW = useRef(0);
    const sidebarRafId = useRef<number>(0);

    const handleOpenRunner = (collectionId?: string, folderId?: string, folderName?: string) => {
        openRunner(collectionId, folderId, folderName);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'fa' : 'en');
    };

    // ── Response resize: mouse down ──
    const handleResponseMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingResponse.current = true;
        responseStartY.current = e.clientY;
        responseStartH.current = responseHeight;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, [responseHeight]);

    // ── Sidebar resize: mouse down ──
    const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingSidebar.current = true;
        sidebarStartX.current = e.clientX;
        sidebarStartW.current = sidebarWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [sidebarWidth]);

    // ── Sidebar resize: double-click to reset ──
    const handleSidebarDoubleClick = useCallback(() => {
        setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
        try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(DEFAULT_SIDEBAR_WIDTH)); } catch {}
    }, []);

    // ── Global mouse move / up ──
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Response panel resize
            if (isResizingResponse.current) {
                if (responseRafId.current) cancelAnimationFrame(responseRafId.current);
                responseRafId.current = requestAnimationFrame(() => {
                    const delta = responseStartY.current - e.clientY;
                    const maxH = window.innerHeight * MAX_RESPONSE_RATIO;
                    const newHeight = Math.min(maxH, Math.max(MIN_RESPONSE_HEIGHT, responseStartH.current + delta));
                    setResponseHeight(newHeight);
                });
                return;
            }

            // Sidebar resize
            if (isResizingSidebar.current) {
                if (sidebarRafId.current) cancelAnimationFrame(sidebarRafId.current);
                sidebarRafId.current = requestAnimationFrame(() => {
                    const delta = e.clientX - sidebarStartX.current;
                    let newWidth = sidebarStartW.current + delta;

                    // Snap to minimum if dragged below threshold
                    if (newWidth < SNAP_COLLAPSE_THRESHOLD) {
                        newWidth = MIN_SIDEBAR_WIDTH;
                    }

                    newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth));
                    setSidebarWidth(newWidth);
                });
                return;
            }
        };

        const handleMouseUp = () => {
            if (isResizingResponse.current) {
                isResizingResponse.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                setResponseHeight((h) => {
                    try { localStorage.setItem(RESPONSE_HEIGHT_KEY, String(Math.round(h))); } catch {}
                    return h;
                });
            }

            if (isResizingSidebar.current) {
                isResizingSidebar.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                setSidebarWidth((w) => {
                    try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(w))); } catch {}
                    return w;
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (responseRafId.current) cancelAnimationFrame(responseRafId.current);
            if (sidebarRafId.current) cancelAnimationFrame(sidebarRafId.current);
        };
    }, []);

    return (
        <>
            <div className="titlebar-drag-region" />
            <div className="app-layout">
                <div
                    className="sidebar"
                    style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                >
                    <div className="sidebar-header">
                        <AppIcon size={24} className="brand-icon" />
                        <span className="sidebar-title">{t('app.title')}</span>
                        <div className="sidebar-header-actions">
                            <button className="lang-toggle" onClick={toggleLanguage} title={t('settings.language')}>
                                {language === 'en' ? 'FA' : 'EN'}
                            </button>
                            <button className="theme-toggle" onClick={toggleTheme} title={t('settings.toggleTheme')}>
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                    <Sidebar onOpenRunner={handleOpenRunner} />
                </div>

                {/* ── Sidebar Resizer ── */}
                <div
                    className="sidebar-resizer"
                    onMouseDown={handleSidebarMouseDown}
                    onDoubleClick={handleSidebarDoubleClick}
                    title="Drag to resize sidebar — double-click to reset"
                />

                <div className="main-content">
                    {runnerOpen ? (
                        <RunnerPanel onClose={closeRunner} />
                    ) : (
                        <>
                            {/* Protocol mode selector */}
                            <div className="protocol-selector">
                                <button className={`protocol-btn ${protocolMode === 'http' ? 'active' : ''}`}
                                    onClick={() => setProtocolMode('http')}>{t('protocol.http')}</button>
                                <button className={`protocol-btn ${protocolMode === 'graphql' ? 'active' : ''}`}
                                    onClick={() => setProtocolMode('graphql')}>{t('protocol.graphql')}</button>
                                <button className={`protocol-btn ${protocolMode === 'websocket' ? 'active' : ''}`}
                                    onClick={() => setProtocolMode('websocket')}>{t('protocol.websocket')}</button>
                                <button className={`protocol-btn ${protocolMode === 'sse' ? 'active' : ''}`}
                                    onClick={() => setProtocolMode('sse')}>{t('protocol.sse')}</button>
                                <button className={`protocol-btn ${protocolMode === 'mock' ? 'active' : ''}`}
                                    onClick={() => setProtocolMode('mock')}>{t('protocol.mockServer')}</button>
                            </div>

                            {protocolMode === 'http' && (
                                <>
                                    <TabBar />
                                    <div className="content-area">
                                        <div className="request-section">
                                            <RequestPanel />
                                        </div>
                                        <div
                                            className="resizer"
                                            onMouseDown={handleResponseMouseDown}
                                        />
                                        <div style={{ height: responseHeight, minHeight: MIN_RESPONSE_HEIGHT, flexShrink: 0 }}>
                                            <ResponsePanel />
                                        </div>
                                    </div>
                                </>
                            )}

                            {protocolMode === 'graphql' && (
                                <div className="content-area">
                                    <GraphQLPanel />
                                </div>
                            )}

                            {protocolMode === 'websocket' && (
                                <div className="content-area">
                                    <WebSocketPanel />
                                </div>
                            )}

                            {protocolMode === 'sse' && (
                                <div className="content-area">
                                    <SSEPanel />
                                </div>
                            )}

                            {protocolMode === 'mock' && (
                                <div className="content-area">
                                    <MockServerPanel />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
