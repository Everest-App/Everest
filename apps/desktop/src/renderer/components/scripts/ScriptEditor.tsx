import React, { useRef, useCallback } from 'react';

interface ScriptEditorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SNIPPETS = [
    {
        label: 'Test',
        icon: '🧪',
        code: `pm.test("Test name", () => {\n  \n});`,
        description: 'Add a test assertion',
    },
    {
        label: 'Status 200',
        icon: '✓',
        code: `pm.test("Status is 200", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});`,
        description: 'Assert status code is 200',
    },
    {
        label: 'JSON Body',
        icon: '{ }',
        code: `const json = pm.response.json();\npm.test("Has data property", () => {\n  pm.expect(json).to.have.property("data");\n});`,
        description: 'Parse JSON and assert property',
    },
    {
        label: 'Set Env',
        icon: '📌',
        code: `pm.environment.set("key", "value");`,
        description: 'Set an environment variable',
    },
    {
        label: 'Get Env',
        icon: '📎',
        code: `const val = pm.environment.get("key");`,
        description: 'Get an environment variable',
    },
    {
        label: 'Save Token',
        icon: '🔑',
        code: `const json = pm.response.json();\npm.environment.set("token", json.token);`,
        description: 'Save token from response',
    },
    {
        label: 'Log',
        icon: '📋',
        code: `console.log("Debug:", pm.response.json());`,
        description: 'Log to console',
    },
];

export function ScriptEditor({ label, value, onChange, placeholder }: ScriptEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Count lines for the line number gutter
    const lines = value ? value.split('\n') : [''];
    const lineCount = Math.max(lines.length, 1);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = value.substring(0, start) + '  ' + value.substring(end);
            onChange(newValue);

            // Restore cursor position after React re-renders
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            });
        }
    }, [value, onChange]);

    const insertSnippet = useCallback((code: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            onChange(value ? value + '\n' + code : code);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // If inserting at the end or cursor is at position 0 with empty value
        const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
        const suffix = end < value.length && value[end] !== '\n' ? '\n' : '';

        const newValue = value.substring(0, start) + prefix + code + suffix + value.substring(end);
        onChange(newValue);

        requestAnimationFrame(() => {
            textarea.focus();
            const newPos = start + prefix.length + code.length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
        });
    }, [value, onChange]);

    const handleScroll = useCallback(() => {
        const textarea = textareaRef.current;
        const gutter = document.getElementById(`gutter-${label.replace(/\s/g, '-')}`);
        if (textarea && gutter) {
            gutter.scrollTop = textarea.scrollTop;
        }
    }, [label]);

    return (
        <div className="script-editor-enhanced">
            {/* Header */}
            <div className="script-editor-header">
                <span className="script-editor-label">{label}</span>
                <span className="script-editor-hint">JavaScript · Postman-compatible pm API</span>
            </div>

            {/* Snippet toolbar */}
            <div className="script-snippet-toolbar">
                {SNIPPETS.map((snippet, idx) => (
                    <button
                        key={idx}
                        className="script-snippet-btn"
                        onClick={() => insertSnippet(snippet.code)}
                        title={snippet.description}
                    >
                        <span className="script-snippet-icon">{snippet.icon}</span>
                        <span className="script-snippet-label">{snippet.label}</span>
                    </button>
                ))}
            </div>

            {/* Editor with line numbers */}
            <div className="script-editor-container">
                <div
                    className="script-line-numbers"
                    id={`gutter-${label.replace(/\s/g, '-')}`}
                    aria-hidden="true"
                >
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} className="script-line-number">{i + 1}</div>
                    ))}
                </div>
                <textarea
                    ref={textareaRef}
                    className="script-textarea-enhanced"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    placeholder={placeholder || `// Write your ${label.toLowerCase()} here\n// Available: pm.test(), pm.expect(), pm.response, pm.variables, console.log()`}
                    spellCheck={false}
                    wrap="off"
                />
            </div>

            {/* API Reference */}
            <div className="script-api-reference">
                <details>
                    <summary>API Reference</summary>
                    <div className="script-api-content">
                        <div className="script-api-section">
                            <strong>Testing</strong>
                            <code>pm.test("name", () =&gt; {'{ ... }'})</code>
                            <code>pm.expect(value).to.equal(expected)</code>
                            <code>pm.expect(value).to.have.property("key")</code>
                            <code>pm.expect(value).to.include("text")</code>
                        </div>
                        <div className="script-api-section">
                            <strong>Response</strong>
                            <code>pm.response.code</code>
                            <code>pm.response.status</code>
                            <code>pm.response.json()</code>
                            <code>pm.response.text()</code>
                            <code>pm.response.headers</code>
                            <code>pm.response.responseTime</code>
                        </div>
                        <div className="script-api-section">
                            <strong>Variables</strong>
                            <code>pm.variables.get("key")</code>
                            <code>pm.variables.set("key", "value")</code>
                            <code>pm.environment.get("key")</code>
                            <code>pm.environment.set("key", "value")</code>
                            <code>pm.globals.get("key")</code>
                        </div>
                        <div className="script-api-section">
                            <strong>Request</strong>
                            <code>pm.request.url</code>
                            <code>pm.request.method</code>
                            <code>pm.request.headers</code>
                            <code>pm.request.addHeader("key", "val")</code>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
}
