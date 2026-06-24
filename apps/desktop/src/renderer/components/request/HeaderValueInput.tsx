import React, { useState, useRef, useCallback, useMemo } from 'react';
import { tokenizeUrl, resolveVariable, ResolvedVariable } from '../../utils/env-resolver';
import { appEvents, NAVIGATE_TO_VARIABLE } from '../../utils/event-bus';

interface HeaderValueInputProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
}

/**
 * Header value input with inline environment variable hover preview.
 * Variables in {{varName}} format are highlighted with hover tooltips
 * showing resolved value and environment info. Clicking navigates to the variable.
 */
export function HeaderValueInput({ value, placeholder, onChange }: HeaderValueInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        data: ResolvedVariable | null;
    }>({ visible: false, x: 0, y: 0, data: null });

    // Tokenize value for overlay rendering
    const tokens = useMemo(() => tokenizeUrl(value), [value]);
    const hasVariables = tokens.some(t => t.type === 'variable');

    // Sync overlay scroll with input scroll
    const syncScroll = useCallback(() => {
        if (inputRef.current && overlayRef.current) {
            overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    }, []);

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

    return (
        <div className="header-value-wrapper">
            <input
                ref={inputRef}
                type="text"
                className="header-value-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={syncScroll}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                spellCheck={false}
            />

            {/* Variable overlay — only rendered when value contains {{variables}} */}
            {hasVariables && (
                <div
                    ref={overlayRef}
                    className={`header-var-overlay ${isFocused ? 'editing' : ''}`}
                    aria-hidden="true"
                >
                    {tokens.map((token, i) => {
                        if (token.type === 'variable') {
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
    );
}
