import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ResponseData } from '@api-platform/core';
import { JsonTreeViewer } from './JsonTreeViewer';
import { ResponseSearchBar } from './ResponseSearchBar';

interface ResponseBodyProps {
    response: ResponseData;
}

type ViewMode = 'pretty' | 'raw' | 'preview';

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

/**
 * Find all match indices in text (case-insensitive)
 */
function findMatches(text: string, query: string): { start: number; end: number }[] {
    if (!query || !text) return [];
    const results: { start: number; end: number }[] = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let idx = 0;
    while (idx < lowerText.length) {
        const found = lowerText.indexOf(lowerQuery, idx);
        if (found === -1) break;
        results.push({ start: found, end: found + lowerQuery.length });
        idx = found + 1;
    }
    return results;
}

/**
 * Render text with highlighted matches
 */
function HighlightedText({ text, matches, currentMatch }: {
    text: string;
    matches: { start: number; end: number }[];
    currentMatch: number;
}) {
    if (matches.length === 0) return <>{text}</>;

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        if (m.start > lastEnd) {
            parts.push(text.substring(lastEnd, m.start));
        }
        parts.push(
            <mark
                key={i}
                className={`search-highlight ${i === currentMatch ? 'current' : ''}`}
                data-match-index={i}
            >
                {text.substring(m.start, m.end)}
            </mark>
        );
        lastEnd = m.end;
    }

    if (lastEnd < text.length) {
        parts.push(text.substring(lastEnd));
    }

    return <>{parts}</>;
}

export function ResponseBody({ response }: ResponseBodyProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('pretty');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatch, setCurrentMatch] = useState(0);

    const bodyRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(searchQuery, 150);

    const isJson = response.contentType.includes('json');
    const isHtml = response.contentType.includes('html');
    const isXml = response.contentType.includes('xml');

    const formattedBody = useMemo(() => {
        if (viewMode === 'raw') return response.body;

        if (isJson) {
            try {
                return JSON.stringify(JSON.parse(response.body), null, 2);
            } catch {
                return response.body;
            }
        }

        if (isXml) {
            try {
                let formatted = '';
                let indent = 0;
                response.body.split(/>\s*</).forEach((node) => {
                    if (node.match(/^\/\w/)) indent--;
                    formatted += '  '.repeat(Math.max(indent, 0)) + '<' + node + '>\n';
                    if (node.match(/^<?\w[^>]*[^/]$/) && !node.startsWith('?')) indent++;
                });
                return formatted.substring(1, formatted.length - 2);
            } catch {
                return response.body;
            }
        }

        return response.body;
    }, [response.body, viewMode, isJson, isXml]);

    // Compute matches
    const matches = useMemo(() => {
        if (!debouncedQuery) return [];
        // For pretty JSON tree mode, we search the formatted text
        const textToSearch = (viewMode === 'pretty' && isJson) ? formattedBody : formattedBody;
        return findMatches(textToSearch, debouncedQuery);
    }, [formattedBody, debouncedQuery, viewMode, isJson]);

    // Reset current match when query or matches change
    useEffect(() => {
        setCurrentMatch(0);
    }, [matches.length, debouncedQuery]);

    // Scroll to current match
    useEffect(() => {
        if (matches.length === 0) return;
        const el = bodyRef.current?.querySelector(`[data-match-index="${currentMatch}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [currentMatch, matches.length]);

    const goToNextMatch = useCallback(() => {
        if (matches.length === 0) return;
        setCurrentMatch(prev => (prev + 1) % matches.length);
    }, [matches.length]);

    const goToPrevMatch = useCallback(() => {
        if (matches.length === 0) return;
        setCurrentMatch(prev => (prev - 1 + matches.length) % matches.length);
    }, [matches.length]);



    // Keyboard shortcut for search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = bodyRef.current?.closest('.response-panel')?.querySelector('.response-search-input') as HTMLInputElement;
                searchInput?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Determine if we should render tree view
    const showJsonTree = viewMode === 'pretty' && isJson && !debouncedQuery;
    let parsedJson: any = null;
    if (showJsonTree) {
        try { parsedJson = JSON.parse(response.body); } catch { /* fall through to text */ }
    }

    return (
        <div ref={bodyRef}>
            {/* Search bar */}
            <ResponseSearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                matchCount={matches.length}
                currentMatch={currentMatch}
                onNext={goToNextMatch}
                onPrev={goToPrevMatch}
            />

            {/* View mode + copy buttons */}
            <div className="response-toolbar">
                <div className="response-view-modes">
                    <button
                        className={`body-type-btn ${viewMode === 'pretty' ? 'active' : ''}`}
                        onClick={() => setViewMode('pretty')}
                    >
                        Pretty
                    </button>
                    <button
                        className={`body-type-btn ${viewMode === 'raw' ? 'active' : ''}`}
                        onClick={() => setViewMode('raw')}
                    >
                        Raw
                    </button>
                    {isHtml && (
                        <button
                            className={`body-type-btn ${viewMode === 'preview' ? 'active' : ''}`}
                            onClick={() => setViewMode('preview')}
                        >
                            Preview
                        </button>
                    )}
                </div>


            </div>

            {/* Response content */}
            {viewMode === 'preview' && isHtml ? (
                <iframe
                    srcDoc={response.body}
                    style={{
                        width: '100%',
                        height: '400px',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        background: 'white',
                    }}
                    sandbox="allow-same-origin"
                    title="Response Preview"
                />
            ) : showJsonTree && parsedJson !== null ? (
                <div className="json-tree-container">
                    <JsonTreeViewer data={parsedJson} />
                </div>
            ) : (
                <pre className="response-pre">
                    <HighlightedText
                        text={formattedBody}
                        matches={matches}
                        currentMatch={currentMatch}
                    />
                </pre>
            )}
        </div>
    );
}
