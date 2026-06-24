import React, { useState, useEffect, useRef } from 'react';
import { SSEEvent } from '@api-platform/core';

export function SSEPanel() {
    const [url, setUrl] = useState('');
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState<SSEEvent[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.api.onSseEvent((event) => {
            setEvents(prev => [...prev, event]);
            if (event.eventType === 'open') setConnected(true);
            if (event.eventType === 'close' || event.eventType === 'error') setConnected(false);
        });
        return () => { window.api.removeSseListeners(); };
    }, []);

    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [events, autoScroll]);

    const handleConnect = async () => {
        if (!url) return;
        setEvents([]);
        try {
            await window.api.sseConnect({ url, headers: [] });
        } catch (err: any) {
            setEvents(prev => [...prev, {
                id: Date.now().toString(), eventType: 'error', data: err.message, timestamp: Date.now(),
            }]);
        }
    };

    const handleDisconnect = async () => {
        await window.api.sseDisconnect();
        setConnected(false);
    };

    const eventColors: Record<string, string> = {
        open: 'var(--method-get)',
        close: 'var(--text-tertiary)',
        error: 'var(--method-delete)',
        message: 'var(--accent-primary)',
    };

    return (
        <div className="protocol-panel">
            <div className="url-bar">
                <span style={{ fontWeight: 700, color: 'var(--method-options)', fontSize: 13 }}>SSE</span>
                <input className="url-input" placeholder="https://api.example.com/events"
                    value={url} onChange={(e) => setUrl(e.target.value)} disabled={connected} />
                {connected ? (
                    <button className="send-btn" style={{ background: 'var(--method-delete)' }} onClick={handleDisconnect}>
                        Disconnect
                    </button>
                ) : (
                    <button className="send-btn" onClick={handleConnect} disabled={!url}>Connect</button>
                )}
            </div>

            {/* Event log */}
            <div className="ws-log" ref={logRef}>
                {events.length === 0 && (
                    <div className="empty-state" style={{ height: 150 }}>
                        <div className="empty-state-icon">📡</div>
                        <div className="empty-state-sub">Connect to an SSE endpoint</div>
                    </div>
                )}
                {events.map((event) => (
                    <div key={event.id} className="ws-message received">
                        <div className="ws-message-meta">
                            <span className="ws-message-dir" style={{
                                color: eventColors[event.eventType] || 'var(--accent-primary)',
                            }}>
                                {event.eventType === 'open' ? '⚡' : event.eventType === 'close' ? '🔌' :
                                    event.eventType === 'error' ? '❌' : '↓'}
                            </span>
                            <span className="ws-message-type">{event.eventType}</span>
                            {event.lastEventId && <span className="ws-message-type" style={{ opacity: 0.6 }}>id: {event.lastEventId}</span>}
                            <span className="ws-message-time">
                                {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <pre className="ws-message-data">{event.data}</pre>
                    </div>
                ))}
            </div>

            {/* Stats bar */}
            {events.length > 0 && (
                <div style={{
                    padding: '4px 12px', borderTop: '1px solid var(--border-primary)',
                    fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', gap: 16,
                }}>
                    <span>Events: <strong>{events.filter(e => !['open', 'close', 'error'].includes(e.eventType)).length}</strong></span>
                    <span>Status: <strong style={{ color: connected ? 'var(--method-get)' : 'var(--text-tertiary)' }}>{connected ? 'Connected' : 'Disconnected'}</strong></span>
                </div>
            )}
        </div>
    );
}
