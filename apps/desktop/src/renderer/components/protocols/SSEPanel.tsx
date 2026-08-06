import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SSEEvent } from '@api-platform/core';
import { SFIcon } from '../common/SFIcon';

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
            {/* Connection Control Island */}
            <div className="request-section" style={{ minHeight: 64, display: 'flex', flexDirection: 'column' }}>
                <div className="url-bar">
                    <span className="protocol-badge sse">SSE</span>
                    <input
                        className="url-input"
                        placeholder="https://api.example.com/events"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={connected}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !connected) handleConnect(); }}
                    />
                    {connected ? (
                        <button className="send-btn" style={{ background: 'var(--method-delete)' }} onClick={handleDisconnect}>
                            <SFIcon name="powerplug.fill" size={12} style={{ marginRight: 6 }} />
                            Disconnect
                        </button>
                    ) : (
                        <button className="send-btn" onClick={handleConnect} disabled={!url}>
                            <SFIcon name="bolt.fill" size={12} style={{ marginRight: 6 }} />
                            Connect Stream
                        </button>
                    )}
                </div>
            </div>

            <div style={{ height: 8 }} />

            {/* Event Log Island */}
            <div className="response-section" style={{ flex: 1, minHeight: 250, display: 'flex', flexDirection: 'column' }}>
                <div className="response-header" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <SFIcon name="antenna.radiowaves.left.and.right" size={14} />
                        <span>Event Stream Log</span>
                        {events.length > 0 && <span className="badge">{events.length}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="mock-status-badge" style={{
                            color: connected ? 'var(--method-get)' : 'var(--text-tertiary)',
                            background: connected ? 'rgba(74, 222, 128, 0.1)' : 'var(--surface)'
                        }}>
                            ● {connected ? 'Streaming' : 'Disconnected'}
                        </span>
                        {events.length > 0 && (
                            <button
                                className="toolbar-btn"
                                onClick={() => setEvents([])}
                                title="Clear event log"
                                style={{ fontSize: 11 }}
                            >
                                <SFIcon name="trash" size={11} style={{ marginRight: 4 }} />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Event Cards */}
                <div className="ws-log" ref={logRef} style={{ flex: 1, padding: 'var(--space-md)' }}>
                    {events.length === 0 && (
                        <div className="empty-state" style={{ height: 180 }}>
                            <div className="empty-state-icon"><SFIcon name="antenna.radiowaves.left.and.right" size={28} /></div>
                            <div className="empty-state-sub">Connect to an SSE endpoint to receive real-time server events</div>
                        </div>
                    )}
                    {events.map((event) => (
                        <div key={event.id} className="ws-message received">
                            <div className="ws-message-meta">
                                <span className="ws-message-dir" style={{
                                    color: eventColors[event.eventType] || 'var(--accent-primary)',
                                }}>
                                    {event.eventType === 'open' ? <SFIcon name="bolt.fill" size={11} /> :
                                     event.eventType === 'close' ? <SFIcon name="powerplug.fill" size={11} /> :
                                     event.eventType === 'error' ? <SFIcon name="xmark.circle.fill" size={11} /> : '↓'}
                                </span>
                                <span className="ws-message-type">{event.eventType}</span>
                                {event.lastEventId && (
                                    <span className="ws-message-type" style={{ opacity: 0.7, color: 'var(--accent-primary)' }}>
                                        id: {event.lastEventId}
                                    </span>
                                )}
                                <span className="ws-message-time">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <pre className="ws-message-data">{event.data}</pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
