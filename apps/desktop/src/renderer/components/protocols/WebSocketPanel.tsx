import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage } from '@everest/core';
import { SFIcon } from '../common/SFIcon';

export function WebSocketPanel() {
    const [url, setUrl] = useState('');
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.api.onWsMessage((msg) => {
            setMessages(prev => [...prev, msg]);
            if (msg.type === 'open') setConnected(true);
            if (msg.type === 'close' || msg.type === 'error') setConnected(false);
        });
        return () => { window.api.removeWsListeners(); };
    }, []);

    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages, autoScroll]);

    const handleConnect = async () => {
        if (!url) return;
        setMessages([]);
        try {
            await window.api.wsConnect({ url, headers: [] });
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: uuidv4(), direction: 'received', data: `Error: ${err.message}`,
                timestamp: Date.now(), type: 'error',
            }]);
        }
    };

    const handleDisconnect = async () => {
        await window.api.wsDisconnect();
    };

    const handleSend = async () => {
        if (!messageInput.trim()) return;
        try {
            await window.api.wsSend(messageInput);
            setMessageInput('');
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: uuidv4(), direction: 'received', data: `Send error: ${err.message}`,
                timestamp: Date.now(), type: 'error',
            }]);
        }
    };

    const msgTypeColors: Record<string, string> = {
        open: 'var(--method-get)',
        close: 'var(--text-tertiary)',
        error: 'var(--method-delete)',
        sent: 'var(--method-post)',
        received: 'var(--accent-primary)',
    };

    return (
        <div className="protocol-panel">
            {/* Connection & Sender Island */}
            <div className="request-section" style={{ minHeight: 140, display: 'flex', flexDirection: 'column' }}>
                <div className="url-bar">
                    <span className="protocol-badge ws">WS</span>
                    <input
                        className="url-input"
                        placeholder="wss://echo.websocket.org"
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
                            Connect
                        </button>
                    )}
                </div>

                {/* Message Composition Bar */}
                <div className="ws-send-bar" style={{ padding: 'var(--space-md)', flex: 1, borderTop: 'none' }}>
                    <textarea
                        className="script-textarea"
                        style={{ flex: 1, minHeight: 60, height: '100%', resize: 'none', background: 'var(--bg-input)' }}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={connected ? "Type message and press Enter (Shift+Enter for new line)..." : "Connect to a WebSocket server to send messages"}
                        disabled={!connected}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!connected || !messageInput.trim()}
                        style={{ height: 60, padding: '0 24px' }}
                    >
                        <SFIcon name="paperplane.fill" size={13} style={{ marginRight: 6 }} />
                        Send
                    </button>
                </div>
            </div>

            <div style={{ height: 8 }} />

            {/* Message Stream Island */}
            <div className="response-section" style={{ flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                <div className="response-header" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <SFIcon name="antenna.radiowaves.left.and.right" size={14} />
                        <span>Live Stream</span>
                        {messages.length > 0 && <span className="badge">{messages.length}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="mock-status-badge" style={{
                            color: connected ? 'var(--method-get)' : 'var(--text-tertiary)',
                            background: connected ? 'rgba(74, 222, 128, 0.1)' : 'var(--surface)'
                        }}>
                            ● {connected ? 'Connected' : 'Disconnected'}
                        </span>
                        {messages.length > 0 && (
                            <button
                                className="toolbar-btn"
                                onClick={() => setMessages([])}
                                title="Clear message log"
                                style={{ fontSize: 11 }}
                            >
                                <SFIcon name="trash" size={11} style={{ marginRight: 4 }} />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Log Area */}
                <div className="ws-log" ref={logRef} style={{ flex: 1, padding: 'var(--space-md)' }}>
                    {messages.length === 0 && (
                        <div className="empty-state" style={{ height: 160 }}>
                            <div className="empty-state-icon"><SFIcon name="powerplug.fill" size={28} /></div>
                            <div className="empty-state-sub">Connect to a WebSocket server to view live frames</div>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`ws-message ${msg.direction}`}>
                            <div className="ws-message-meta">
                                <span className="ws-message-dir" style={{
                                    color: msgTypeColors[msg.type] || msgTypeColors[msg.direction] || 'var(--text-secondary)',
                                }}>
                                    {msg.type === 'open' ? <SFIcon name="bolt.fill" size={11} /> :
                                     msg.type === 'close' ? <SFIcon name="powerplug.fill" size={11} /> :
                                     msg.type === 'error' ? <SFIcon name="xmark.circle.fill" size={11} /> :
                                     msg.direction === 'sent' ? '↑' : '↓'}
                                </span>
                                <span className="ws-message-type">{msg.type || msg.direction}</span>
                                <span className="ws-message-time">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <pre className="ws-message-data">{msg.data}</pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
