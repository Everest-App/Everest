import React, { useRef, useEffect } from 'react';
import { SFIcon } from '../common/SFIcon';

interface ResponseSearchBarProps {
    query: string;
    onQueryChange: (q: string) => void;
    matchCount: number;
    currentMatch: number;
    onNext: () => void;
    onPrev: () => void;
}

export function ResponseSearchBar({
    query,
    onQueryChange,
    matchCount,
    currentMatch,
    onNext,
    onPrev,
}: ResponseSearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle keyboard shortcuts within the search input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onPrev();
            } else {
                onNext();
            }
        }
        if (e.key === 'Escape') {
            onQueryChange('');
            inputRef.current?.blur();
        }
    };

    // Global Cmd/Ctrl+F
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="response-search-bar">
            <div className="response-search-wrapper">
                <span className="response-search-icon"><SFIcon name="magnifyingglass" size={11} /></span>
                <input
                    ref={inputRef}
                    className="response-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search response... (Ctrl+F)"
                    spellCheck={false}
                />
                {query && (
                    <div className="response-search-controls">
                        <span className="response-search-count">
                            {matchCount > 0
                                ? `${currentMatch + 1}/${matchCount}`
                                : 'No results'}
                        </span>
                        <button
                            className="response-search-nav"
                            onClick={onPrev}
                            disabled={matchCount === 0}
                            title="Previous match (Shift+Enter)"
                        >
                            <SFIcon name="chevron.down" size={10} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button
                            className="response-search-nav"
                            onClick={onNext}
                            disabled={matchCount === 0}
                            title="Next match (Enter)"
                        >
                            <SFIcon name="chevron.down" size={10} />
                        </button>
                        <button
                            className="response-search-clear"
                            onClick={() => onQueryChange('')}
                            title="Clear search"
                        >
                            <SFIcon name="xmark" size={10} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
