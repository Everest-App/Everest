import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MockRoute, MockServerStatus, MockRequestLog } from '@api-platform/core';

const METHOD_COLORS: Record<string, string> = {
    GET: 'var(--method-get)', POST: 'var(--method-post)', PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)', DELETE: 'var(--method-delete)',
};

function createEmptyRoute(): MockRoute {
    return {
        id: uuidv4(), method: 'GET', path: '/api/example', statusCode: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: '{\n  "message": "Hello from mock!"\n}',
        delay: 0, enabled: true, description: '',
    };
}

export function MockServerPanel() {
    const [port, setPort] = useState(3456);
    const [cors, setCors] = useState(true);
    const [routes, setRoutes] = useState<MockRoute[]>([createEmptyRoute()]);
    const [status, setStatus] = useState<MockServerStatus | null>(null);
    const [logs, setLogs] = useState<MockRequestLog[]>([]);
    const [activeTab, setActiveTab] = useState<'routes' | 'logs'>('routes');
    const [editingRoute, setEditingRoute] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.api.mockGetStatus().then(setStatus);
    }, []);

    useEffect(() => {
        window.api.onMockRequest((log) => {
            setLogs(prev => [...prev.slice(-199), log]);
            setStatus(s => s ? { ...s, requestCount: s.requestCount + 1 } : s);
        });
        return () => { window.api.removeMockListeners(); };
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs]);

    const handleStart = async () => {
        try {
            const s = await window.api.mockStart({ port, routes, cors });
            setStatus(s);
            setLogs([]);
        } catch (err: any) {
            alert('Failed to start: ' + err.message);
        }
    };

    const handleStop = async () => {
        await window.api.mockStop();
        setStatus({ running: false, port, routeCount: 0, requestCount: 0 });
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
            {/* Control bar */}
            <div className="mock-control-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)' }}>🖥 Mock Server</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Port:</span>
                    <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value) || 3456)}
                        disabled={status?.running} style={{
                            width: 70, padding: '3px 6px', fontSize: 12,
                            background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)'
                        }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                        <input type="checkbox" checked={cors} onChange={(e) => setCors(e.target.checked)}
                            disabled={status?.running} />
                        CORS
                    </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {status?.running && (
                        <span className="mock-status-badge running">
                            ● Running on :{status.port} — {status.requestCount} requests
                        </span>
                    )}
                    {status?.running ? (
                        <button className="send-btn" style={{ background: 'var(--method-delete)', padding: '4px 16px' }}
                            onClick={handleStop}>Stop</button>
                    ) : (
                        <button className="send-btn" style={{ padding: '4px 16px' }}
                            onClick={handleStart} disabled={routes.length === 0}>▶ Start</button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="response-tabs" style={{ paddingLeft: 'var(--space-md)' }}>
                <button className={`response-tab ${activeTab === 'routes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('routes')}>
                    Routes ({routes.length})
                </button>
                <button className={`response-tab ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}>
                    Request Log ({logs.length})
                </button>
            </div>

            {/* Routes tab */}
            {activeTab === 'routes' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
                    {routes.map(route => (
                        <div key={route.id} className="mock-route-card">
                            <div className="mock-route-header">
                                <input type="checkbox" checked={route.enabled}
                                    onChange={(e) => updateRoute(route.id, { enabled: e.target.checked })} />
                                <select value={route.method} onChange={(e) => updateRoute(route.id, { method: e.target.value })}
                                    style={{
                                        fontWeight: 700, fontSize: 11, color: METHOD_COLORS[route.method] || 'var(--text-primary)',
                                        background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-sm)', padding: '2px 4px'
                                    }}>
                                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(m =>
                                        <option key={m} value={m}>{m}</option>
                                    )}
                                </select>
                                <input type="text" value={route.path}
                                    onChange={(e) => updateRoute(route.id, { path: e.target.value })}
                                    placeholder="/api/resource/:id"
                                    style={{
                                        flex: 1, padding: '3px 8px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                        background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)'
                                    }} />
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>→</span>
                                <input type="number" value={route.statusCode}
                                    onChange={(e) => updateRoute(route.id, { statusCode: parseInt(e.target.value) || 200 })}
                                    style={{
                                        width: 55, padding: '3px 6px', fontSize: 12, fontFamily: 'var(--font-mono)',
                                        background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-sm)', color: route.statusCode < 400 ? 'var(--method-get)' : 'var(--method-delete)'
                                    }} />
                                <button className="toolbar-btn" style={{ fontSize: 10 }}
                                    onClick={() => setEditingRoute(editingRoute === route.id ? null : route.id)}>
                                    {editingRoute === route.id ? '▾' : '▸'}
                                </button>
                                <button className="toolbar-btn" style={{ fontSize: 10, color: 'var(--method-delete)' }}
                                    onClick={() => removeRoute(route.id)}>✕</button>
                            </div>

                            {editingRoute === route.id && (
                                <div className="mock-route-detail">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div className="auth-field" style={{ flex: 1 }}>
                                            <label>Delay (ms)</label>
                                            <input type="number" value={route.delay} min={0}
                                                onChange={(e) => updateRoute(route.id, { delay: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="auth-field" style={{ flex: 2 }}>
                                            <label>Description</label>
                                            <input type="text" value={route.description || ''}
                                                onChange={(e) => updateRoute(route.id, { description: e.target.value })}
                                                placeholder="Optional description" />
                                        </div>
                                    </div>
                                    <div className="auth-field">
                                        <label>Response Body</label>
                                        <textarea className="body-textarea" style={{ minHeight: 100, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                                            value={route.responseBody}
                                            onChange={(e) => updateRoute(route.id, { responseBody: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <button className="toolbar-btn" onClick={addRoute}
                        style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                        + Add Route
                    </button>
                </div>
            )}

            {/* Logs tab */}
            {activeTab === 'logs' && (
                <div className="ws-log" ref={logRef}>
                    {logs.length === 0 && (
                        <div className="empty-state" style={{ height: 150 }}>
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-sub">No requests received yet</div>
                        </div>
                    )}
                    {logs.map(log => (
                        <div key={log.id} className={`ws-message ${log.matchedRouteId ? 'received' : 'sent'}`}>
                            <div className="ws-message-meta">
                                <span className="ws-message-dir" style={{
                                    color: log.matchedRouteId ? 'var(--method-get)' : 'var(--method-delete)',
                                }}>
                                    {log.matchedRouteId ? '✓' : '✗'}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 11, color: METHOD_COLORS[log.method] || 'var(--text-primary)' }}>
                                    {log.method}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                                    {log.path}
                                </span>
                                <span style={{ fontSize: 11, color: log.statusCode < 400 ? 'var(--method-get)' : 'var(--method-delete)' }}>
                                    {log.statusCode}
                                </span>
                                <span className="ws-message-time">
                                    {log.duration}ms · {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
