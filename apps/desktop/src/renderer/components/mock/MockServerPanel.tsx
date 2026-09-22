import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { MockRoute, MockServerStatus, MockRequestLog } from '@everest/core';
import { SFIcon } from '../common/SFIcon';
import { v4 as uuidv4 } from 'uuid';

const METHOD_COLORS: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)',
    DELETE: 'var(--method-delete)',
    OPTIONS: 'var(--method-options)',
    HEAD: 'var(--method-head)',
};

function createEmptyRoute(): MockRoute {
    return {
        id: uuidv4(),
        enabled: true,
        method: 'GET',
        path: '/api/example',
        statusCode: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: '{\n  "message": "Hello from Everest Mock Server!"\n}',
        delay: 0,
    };
}

export function MockServerPanel() {
    const { t } = useTranslation();
    const [port, setPort] = useState(3456);
    const [cors, setCors] = useState(true);
    const [routes, setRoutes] = useState<MockRoute[]>([createEmptyRoute()]);
    const [status, setStatus] = useState<MockServerStatus | null>(null);
    const [logs, setLogs] = useState<MockRequestLog[]>([]);
    const [activeTab, setActiveTab] = useState<'routes' | 'logs'>('routes');
    const [editingRoute, setEditingRoute] = useState<string | null>(null);

    useEffect(() => {
        window.api.mockGetStatus().then(setStatus);

        window.api.onMockRequest((log) => {
            setLogs((prev) => [log, ...prev].slice(0, 100));
        });

        return () => { window.api.removeMockListeners(); };
    }, []);

    const handleStart = async () => {
        try {
            const s = await window.api.mockStart({ port, routes, cors });
            setStatus(s);
        } catch (err: any) {
            console.error('Mock server start failed:', err);
        }
    };

    const handleStop = async () => {
        await window.api.mockStop();
        setStatus({ running: false, port, routeCount: routes.length, requestCount: 0 });
    };

    const updateRoute = (id: string, updates: Partial<MockRoute>) => {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const addRoute = () => {
        const newRoute = createEmptyRoute();
        setRoutes(prev => [...prev, newRoute]);
        setEditingRoute(newRoute.id);
    };

    const removeRoute = (id: string) => {
        setRoutes(prev => prev.filter(r => r.id !== id));
        if (editingRoute === id) setEditingRoute(null);
    };

    return (
        <div className="protocol-panel">
            {/* Control Bar Island */}
            <div className="request-section" style={{ minHeight: 64, display: 'flex', flexDirection: 'column' }}>
                <div className="url-bar" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="protocol-badge mock">MOCK</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>PORT:</span>
                            <input
                                type="number"
                                value={port}
                                onChange={(e) => setPort(parseInt(e.target.value) || 3456)}
                                disabled={status?.running}
                                style={{
                                    width: 75, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                    background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-control)', color: 'var(--text-primary)'
                                }}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input
                                type="checkbox"
                                checked={cors}
                                onChange={(e) => setCors(e.target.checked)}
                                disabled={status?.running}
                            />
                            <span>CORS</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {status?.running && (
                            <span className="mock-status-badge running">
                                ● Running on :{status.port} ({status.requestCount} requests)
                            </span>
                        )}

                        {status?.running ? (
                            <button className="send-btn" style={{ background: 'var(--method-delete)' }} onClick={handleStop}>
                                <SFIcon name="stop.fill" size={11} style={{ marginRight: 6 }} />
                                Stop Server
                            </button>
                        ) : (
                            <button className="send-btn" onClick={handleStart} disabled={routes.length === 0}>
                                <SFIcon name="play.fill" size={11} style={{ marginRight: 6 }} />
                                Start Server
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ height: 8 }} />

            {/* Routes / Logs Island Container */}
            <div className="response-section" style={{ flex: 1, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                <div className="response-header" style={{ padding: '6px 14px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="config-tabs" style={{ borderBottom: 'none', padding: 0 }}>
                        <button
                            className={`config-tab ${activeTab === 'routes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('routes')}
                        >
                            Mock Routes ({routes.length})
                        </button>
                        <button
                            className={`config-tab ${activeTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('logs')}
                        >
                            Request Logs ({logs.length})
                        </button>
                    </div>

                    {activeTab === 'routes' && (
                        <button className="toolbar-btn" onClick={addRoute} style={{ fontSize: 12 }}>
                            <SFIcon name="plus" size={12} style={{ marginRight: 4 }} />
                            Add Route
                        </button>
                    )}

                    {activeTab === 'logs' && logs.length > 0 && (
                        <button className="toolbar-btn" onClick={() => setLogs([])} style={{ fontSize: 11 }}>
                            <SFIcon name="trash" size={11} style={{ marginRight: 4 }} />
                            Clear Logs
                        </button>
                    )}
                </div>

                {/* Tab: Routes */}
                {activeTab === 'routes' && (
                    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
                        {routes.length === 0 && (
                            <div className="empty-state" style={{ height: 180 }}>
                                <div className="empty-state-icon"><SFIcon name="plus" size={28} /></div>
                                <div className="empty-state-sub">No mock routes defined. Click "Add Route" to create one.</div>
                            </div>
                        )}

                        {routes.map(route => (
                            <div key={route.id} className="mock-route-card" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
                                <div className="mock-route-header" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input
                                        type="checkbox"
                                        checked={route.enabled}
                                        onChange={(e) => updateRoute(route.id, { enabled: e.target.checked })}
                                    />
                                    <select
                                        value={route.method}
                                        onChange={(e) => updateRoute(route.id, { method: e.target.value })}
                                        style={{
                                            fontWeight: 700, fontSize: 12, color: METHOD_COLORS[route.method] || 'var(--text-primary)',
                                            background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-control)', padding: '4px 8px'
                                        }}
                                    >
                                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(m =>
                                            <option key={m} value={m}>{m}</option>
                                        )}
                                    </select>
                                    <input
                                        type="text"
                                        value={route.path}
                                        onChange={(e) => updateRoute(route.id, { path: e.target.value })}
                                        placeholder="/api/resource/:id"
                                        style={{
                                            flex: 1, padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                            background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-control)', color: 'var(--text-primary)'
                                        }}
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>→</span>
                                    <input
                                        type="number"
                                        value={route.statusCode}
                                        onChange={(e) => updateRoute(route.id, { statusCode: parseInt(e.target.value) || 200 })}
                                        style={{
                                            width: 65, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                            background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-control)', color: route.statusCode < 400 ? 'var(--method-get)' : 'var(--method-delete)'
                                        }}
                                    />
                                    <button
                                        className="toolbar-btn"
                                        onClick={() => setEditingRoute(editingRoute === route.id ? null : route.id)}
                                        title="Configure details"
                                    >
                                        <SFIcon name={editingRoute === route.id ? "chevron.down" : "chevron.right"} size={11} />
                                    </button>
                                    <button
                                        className="toolbar-btn"
                                        style={{ color: 'var(--method-delete)' }}
                                        onClick={() => removeRoute(route.id)}
                                        title="Delete route"
                                    >
                                        <SFIcon name="trash" size={11} />
                                    </button>
                                </div>

                                {editingRoute === route.id && (
                                    <div className="mock-route-detail" style={{ padding: 14, borderTop: '1px solid var(--border-primary)', background: 'var(--island)' }}>
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                            <div className="auth-field" style={{ flex: 1 }}>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Delay (ms)</label>
                                                <input
                                                    type="number"
                                                    value={route.delay}
                                                    min={0}
                                                    onChange={(e) => updateRoute(route.id, { delay: parseInt(e.target.value) || 0 })}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                            <div className="auth-field" style={{ flex: 2 }}>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label>
                                                <input
                                                    type="text"
                                                    value={route.description || ''}
                                                    onChange={(e) => updateRoute(route.id, { description: e.target.value })}
                                                    placeholder="Optional route description"
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="auth-field">
                                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Response Body</label>
                                            <textarea
                                                className="script-textarea"
                                                style={{ minHeight: 100, width: '100%', resize: 'vertical', background: 'var(--bg-input)' }}
                                                value={route.responseBody}
                                                onChange={(e) => updateRoute(route.id, { responseBody: e.target.value })}
                                                placeholder="Response payload (JSON / Text)"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab: Request Logs */}
                {activeTab === 'logs' && (
                    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
                        {logs.length === 0 && (
                            <div className="empty-state" style={{ height: 180 }}>
                                <div className="empty-state-icon"><SFIcon name="clock.fill" size={28} /></div>
                                <div className="empty-state-sub">No requests received by the mock server yet</div>
                            </div>
                        )}

                        {logs.map((log) => (
                            <div key={log.id} className="ws-message received" style={{ marginBottom: 8 }}>
                                <div className="ws-message-meta">
                                    <span className="ws-message-dir" style={{ color: METHOD_COLORS[log.method] || 'var(--accent-primary)', fontWeight: 700 }}>
                                        {log.method}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                                        {log.path}
                                    </span>
                                    <span className="ws-message-time" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: log.statusCode < 400 ? 'var(--method-get)' : 'var(--method-delete)' }}>
                                            {log.statusCode}
                                        </span>
                                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
