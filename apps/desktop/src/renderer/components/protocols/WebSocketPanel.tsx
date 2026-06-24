import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage } from '@api-platform/core';

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
            <div className="url-bar">
                <span style={{ fontWeight: 700, color: 'var(--method-get)', fontSize: 13 }}>WS</span>
                <input className="url-input" placeholder="wss://echo.websocket.org"
                    value={url} onChange={(e) => setUrl(e.target.value)} disabled={connected} />
                {connected ? (
                    <button className="send-btn" style={{ background: 'var(--method-delete)' }} onClick={handleDisconnect}>
                        Disconnect
                    </button>
                ) : (
                    <button className="send-btn" onClick={handleConnect} disabled={!url}>Connect</button>
                )}
            </div>

            {/* Message log */}
            <div className="ws-log" ref={logRef}>
                {messages.length === 0 && (
                    <div className="empty-state" style={{ height: 150 }}>
                        <div className="empty-state-icon">🔌</div>
                        <div className="empty-state-sub">Connect to a WebSocket server</div>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`ws-message ${msg.direction}`}>
                        <div className="ws-message-meta">
                            <span className="ws-message-dir" style={{
                                color: msgTypeColors[msg.type] || msgTypeColors[msg.direction] || 'var(--text-secondary)',
                            }}>
                                {msg.type === 'open' ? '⚡' : msg.type === 'close' ? '🔌' : msg.type === 'error' ? '❌' :
                                    msg.direction === 'sent' ? '↑' : '↓'}
                            </span>
                            <span className="ws-message-type">{msg.type}</span>
                            <span className="ws-message-time">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <pre className="ws-message-data">{msg.data}</pre>
                    </div>
                ))}
            </div>

            {/* Send bar */}
            {connected && (
                <div className="ws-send-bar">
                    <textarea
                        className="body-textarea"
                        style={{ minHeight: 50, flex: 1, resize: 'none' }}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message and press Enter..."
                    />
                    <button className="send-btn" onClick={handleSend} disabled={!messageInput.trim()}>Send</button>
                </div>
            )}
        </div>
    );
}
