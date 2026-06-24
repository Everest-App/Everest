import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { tokenizeUrl, resolveVariable, ResolvedVariable } from '../../utils/env-resolver';
import { appEvents, NAVIGATE_TO_VARIABLE } from '../../utils/event-bus';

interface VariableHighlightTextareaProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    className?: string;
}

/**
 * Textarea with inline environment variable highlighting overlay.
 * Variables in {{varName}} format are highlighted with hover tooltips.
 *
 * Architecture: The overlay sits ABOVE the textarea and passes through
 * pointer events for normal text, but captures hover/click on variable tokens.
 * When the textarea is focused for editing, the overlay fades to let the
 * caret and selection work normally.
 */
export function VariableHighlightTextarea({
    value,
    placeholder,
    onChange,
    className,
}: VariableHighlightTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        data: ResolvedVariable | null;
    }>({ visible: false, x: 0, y: 0, data: null });

    // Tokenize the entire text value
    const tokens = useMemo(() => tokenizeUrl(value || ''), [value]);
    const hasVariables = useMemo(() => tokens.some(t => t.type === 'variable'), [tokens]);

    // Sync scroll between textarea and backdrop
    const syncScroll = useCallback(() => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    // Also sync on value change
    useEffect(() => {
        syncScroll();
    }, [value, syncScroll]);

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
        appEvents.emit(NAVIGATE_TO_VARIABLE, varName);
    }, []);

    // When user clicks on the backdrop (non-variable area), focus the textarea
    const handleBackdropClick = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    // Build highlighted content for the overlay
    const highlightedContent = useMemo(() => {
        if (!hasVariables) return null;

        return tokens.map((token, i) => {
            if (token.type === 'variable') {
                const resolved = resolveVariable(token.value);
                return (
                    <span
                        key={i}
                        className={`body-var-token ${resolved.found ? 'resolved' : 'unresolved'}`}
                        onMouseEnter={(e) => handleVariableHover(e, token.value)}
                        onMouseLeave={handleVariableLeave}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleVariableClick(token.value);
                        }}
                    >
                        {token.raw}
                    </span>
                );
            }
            return (
                <span key={i} className="body-text-token">
                    {token.raw}
                </span>
            );
        });
    }, [tokens, hasVariables, handleVariableHover, handleVariableLeave, handleVariableClick]);

    return (
        <div className={`var-textarea-wrapper ${className || ''}`}>
            {/* Actual textarea — always rendered first (bottom layer) */}
            <textarea
                ref={textareaRef}
                className={`body-textarea ${hasVariables ? 'has-variables' : ''}`}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onScroll={syncScroll}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                spellCheck={false}
            />

            {/* Overlay with highlighted variables — sits ABOVE textarea.
                When NOT focused: overlay is interactive (hover/click on tokens).
                When focused: overlay becomes transparent to let editing work. */}
            {hasVariables && (
                <div
                    ref={backdropRef}
                    className={`var-textarea-overlay ${isFocused ? 'editing' : ''}`}
                    aria-hidden="true"
                    onClick={handleBackdropClick}
                >
                    <div className="var-textarea-overlay-content">
                        {highlightedContent}
                    </div>
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
    );
}
