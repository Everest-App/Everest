import React from 'react';
import { highlightText, TextSegment } from '../../utils/search-utils';

interface HighlightedTextProps {
    text: string;
    query: string;
    className?: string;
}

/**
 * Renders text with highlighted matching segments.
 * When query is empty, renders plain text.
 */
export const HighlightedText = React.memo(function HighlightedText({
    text,
    query,
    className,
}: HighlightedTextProps) {
    if (!query || !text) {
        return <span className={className}>{text}</span>;
    }

    const segments = highlightText(text, query);

    return (
        <span className={className}>
            {segments.map((seg, i) =>
                seg.highlight ? (
                    <mark key={i} className="search-highlight">
                        {seg.text}
                    </mark>
                ) : (
                    <span key={i}>{seg.text}</span>
                )
            )}
        </span>
    );
});
