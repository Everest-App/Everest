import React, { useState, useCallback, memo } from 'react';

interface JsonTreeViewerProps {
    data: any;
    initialDepth?: number;
}

/**
 * Collapsible JSON Tree Viewer with syntax highlighting.
 * Renders objects/arrays as expandable nodes with color-coded values.
 */
export function JsonTreeViewer({ data, initialDepth = 2 }: JsonTreeViewerProps) {
    return (
        <div className="json-tree">
            <JsonNode value={data} keyName={null} depth={0} initialDepth={initialDepth} isLast={true} />
        </div>
    );
}

interface JsonNodeProps {
    keyName: string | null;
    value: any;
    depth: number;
    initialDepth: number;
    isLast: boolean;
}

const JsonNode = memo(function JsonNode({ keyName, value, depth, initialDepth, isLast }: JsonNodeProps) {
    const [expanded, setExpanded] = useState(depth < initialDepth);

    const toggle = useCallback(() => setExpanded(prev => !prev), []);

    const type = getType(value);
    const indent = depth * 16;

    // Primitive values
    if (type !== 'object' && type !== 'array') {
        return (
            <div className="json-line" style={{ paddingLeft: indent }}>
                {keyName !== null && (
                    <>
                        <span className="json-key">"{keyName}"</span>
                        <span className="json-colon">: </span>
                    </>
                )}
                <span className={`json-value json-${type}`}>
                    {formatValue(value, type)}
                </span>
                {!isLast && <span className="json-comma">,</span>}
            </div>
        );
    }

    // Object or Array
    const isArray = type === 'array';
    const entries = isArray
        ? (value as any[]).map((v, i) => [String(i), v] as [string, any])
        : Object.entries(value);
    const bracketOpen = isArray ? '[' : '{';
    const bracketClose = isArray ? ']' : '}';
    const isEmpty = entries.length === 0;

    if (isEmpty) {
        return (
            <div className="json-line" style={{ paddingLeft: indent }}>
                {keyName !== null && (
                    <>
                        <span className="json-key">"{keyName}"</span>
                        <span className="json-colon">: </span>
                    </>
                )}
                <span className="json-bracket">{bracketOpen}{bracketClose}</span>
                {!isLast && <span className="json-comma">,</span>}
            </div>
        );
    }

    return (
        <>
            <div className="json-line json-collapsible" style={{ paddingLeft: indent }} onClick={toggle}>
                <span className={`json-toggle ${expanded ? 'expanded' : ''}`}>▶</span>
                {keyName !== null && (
                    <>
                        <span className="json-key">"{keyName}"</span>
                        <span className="json-colon">: </span>
                    </>
                )}
                <span className="json-bracket">{bracketOpen}</span>
                {!expanded && (
                    <>
                        <span className="json-collapsed-info">
                            {isArray ? `${entries.length} items` : `${entries.length} keys`}
                        </span>
                        <span className="json-bracket">{bracketClose}</span>
                        {!isLast && <span className="json-comma">,</span>}
                    </>
                )}
            </div>
            {expanded && (
                <>
                    {entries.map(([k, v], i) => (
                        <JsonNode
                            key={k}
                            keyName={isArray ? null : k}
                            value={v}
                            depth={depth + 1}
                            initialDepth={initialDepth}
                            isLast={i === entries.length - 1}
                        />
                    ))}
                    <div className="json-line" style={{ paddingLeft: indent }}>
                        <span className="json-bracket">{bracketClose}</span>
                        {!isLast && <span className="json-comma">,</span>}
                    </div>
                </>
            )}
        </>
    );
});

function getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function formatValue(value: any, type: string): string {
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    if (type === 'undefined') return 'undefined';
    if (type === 'boolean') return value ? 'true' : 'false';
    return String(value);
}
