import React, { useState, useRef, useEffect } from 'react';

interface ImportNameModalProps {
    onConfirm: (name: string) => void;
    onCancel: () => void;
    defaultName: string;
    title: string;
    subtitle?: string;
}

/**
 * Modal to ask for a custom name during cURL/Collection import.
 * Keyboard-friendly: Enter = confirm, Escape = cancel, auto-focus input.
 */
export function ImportNameModal({
    onConfirm,
    onCancel,
    defaultName,
    title,
    subtitle,
}: ImportNameModalProps) {
    const [name, setName] = useState(defaultName);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus and select all text
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 50);
    }, []);

    const handleConfirm = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Name cannot be empty');
            return;
        }
        onConfirm(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onCancel();
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal import-name-modal">
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <button className="modal-close" onClick={onCancel}>×</button>
                </div>
                <div className="modal-body">
                    {subtitle && (
                        <p className="import-name-subtitle">{subtitle}</p>
                    )}
                    <div className="import-name-field">
                        <label className="import-name-label">Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            className={`import-name-input ${error ? 'has-error' : ''}`}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter a name..."
                            spellCheck={false}
                        />
                        {error && <span className="import-name-error">{error}</span>}
                    </div>
                    <div className="import-name-suggestion">
                        <span className="import-name-suggestion-label">Suggested:</span>
                        <button
                            className="import-name-suggestion-btn"
                            onClick={() => setName(defaultName)}
                        >
                            {defaultName}
                        </button>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
                    <button
                        className="send-btn"
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        style={{ padding: '6px 24px' }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
