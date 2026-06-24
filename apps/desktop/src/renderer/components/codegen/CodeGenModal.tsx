import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTabStore } from '../../store/tab-store';
import { useEnvironmentStore } from '../../store/environment-store';
import { CODEGEN_TARGETS } from '@api-platform/core';
import { CodeGenTarget } from '@api-platform/core';
import { interpolateRequestConfig } from '@api-platform/core';

interface CodeGenModalProps {
    onClose: () => void;
}

// ─── Language Groups for Dropdown ─────────────────────────────
const LANGUAGE_GROUPS = [
    { group: 'Shell', targets: ['curl'] },
    { group: 'JavaScript', targets: ['fetch', 'axios'] },
    { group: 'Python', targets: ['python-requests'] },
    { group: 'C# / .NET', targets: ['csharp', 'dotnet', 'restsharp'] },
    { group: 'Java', targets: ['java'] },
    { group: 'Go', targets: ['go'] },
    { group: 'PHP', targets: ['php'] },
    { group: 'Dart', targets: ['dart'] },
];

// ─── Syntax Highlighting ──────────────────────────────────────

interface HighlightRule {
    pattern: RegExp;
    className: string;
}

function getHighlightRules(target: CodeGenTarget): HighlightRule[] {
    const commonString: HighlightRule = { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'code-string' };
    const commonNumber: HighlightRule = { pattern: /\b(\d+(?:\.\d+)?)\b/g, className: 'code-number' };

    switch (target) {
        case 'curl':
            return [
                commonString,
                { pattern: /\b(curl)\b/g, className: 'code-keyword' },
                { pattern: /(-X|-H|-d|-F|-u|--data|--data-raw|--header|--request|--compressed|--location)\b/g, className: 'code-flag' },
            ];
        case 'fetch':
        case 'axios':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(const|let|var|function|async|await|return|try|catch|throw|new|import|require|from|of|in|if|else)\b/g, className: 'code-keyword' },
                { pattern: /\b(fetch|axios|console|FormData|URLSearchParams|JSON|Promise)\b/g, className: 'code-builtin' },
                { pattern: /\.(then|catch|log|error|stringify|parse|append|writeText)\b/g, className: 'code-method' },
            ];
        case 'python-requests':
            return [
                { pattern: /(#.*$)/gm, className: 'code-comment' },
                { pattern: /("""[\s\S]*?""")/g, className: 'code-string' },
                commonString,
                commonNumber,
                { pattern: /\b(import|from|def|return|if|else|True|False|None|print|class)\b/g, className: 'code-keyword' },
                { pattern: /\b(requests|json|headers|response|payload|files|url)\b/g, className: 'code-builtin' },
            ];
        case 'csharp':
        case 'dotnet':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(using|var|new|await|async|string|void|class|public|private|static|return|if|else|null|true|false)\b/g, className: 'code-keyword' },
                { pattern: /\b(HttpClient|HttpRequestMessage|HttpMethod|StringContent|FormUrlEncodedContent|MultipartFormDataContent|JsonContent|Console|Convert|Encoding|Dictionary)\b/g, className: 'code-builtin' },
            ];
        case 'restsharp':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(using|var|new|await|async|string|void|class|public|private|static|return|if|else|null|true|false)\b/g, className: 'code-keyword' },
                { pattern: /\b(RestClient|RestClientOptions|RestRequest|RestResponse|Method|ParameterType|ContentType|Console|Convert|System)\b/g, className: 'code-builtin' },
                { pattern: /\.(AddHeader|AddQueryParameter|AddJsonBody|AddXmlBody|AddStringBody|AddParameter|ExecuteAsync|AlwaysMultipartFormData|Content)\b/g, className: 'code-method' },
            ];
        case 'java':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(import|new|public|private|static|void|class|return|if|else|try|catch|throws|null|true|false)\b/g, className: 'code-keyword' },
                { pattern: /\b(OkHttpClient|Request|RequestBody|Response|MediaType|MultipartBody|FormBody|Credentials|System)\b/g, className: 'code-builtin' },
            ];
        case 'go':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(package|import|func|var|if|else|return|defer|nil|err|string|map|interface)\b/g, className: 'code-keyword' },
                { pattern: /\b(fmt|http|io|json|url|bytes|strings|multipart)\b/g, className: 'code-builtin' },
            ];
        case 'php':
            return [
                { pattern: /(\/\/.*$|#.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /(<\?php|\?>)/g, className: 'code-keyword' },
                { pattern: /\b(use|require|new|echo|function|return|if|else|null|true|false|class|array|array_merge)\b/g, className: 'code-keyword' },
                { pattern: /(\$\w+)/g, className: 'code-variable' },
                { pattern: /\b(Client|GuzzleHttp)\b/g, className: 'code-builtin' },
            ];
        case 'dart':
            return [
                { pattern: /(\/\/.*$)/gm, className: 'code-comment' },
                commonString,
                commonNumber,
                { pattern: /\b(import|void|main|async|await|final|var|try|catch|return|if|else|new|null|true|false|print)\b/g, className: 'code-keyword' },
                { pattern: /\b(Dio|Options|FormData|Response)\b/g, className: 'code-builtin' },
            ];
        default:
            return [commonString, commonNumber];
    }
}

function highlightCode(code: string, target: CodeGenTarget): string {
    const rules = getHighlightRules(target);

    // Tokenize: collect all matched ranges first, without modifying the string.
    // Each token: { start, end, className }
    interface Token { start: number; end: number; className: string }
    const tokens: Token[] = [];

    for (const rule of rules) {
        // Reset lastIndex for global regexes
        rule.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = rule.pattern.exec(code)) !== null) {
            tokens.push({ start: match.index, end: match.index + match[0].length, className: rule.className });
            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) rule.pattern.lastIndex++;
        }
    }

    // Sort tokens by start position; earlier and longer matches take priority
    tokens.sort((a, b) => a.start - b.start || b.end - a.end);

    // Remove overlapping tokens (greedy, first-match wins)
    const accepted: Token[] = [];
    let lastEnd = 0;
    for (const tok of tokens) {
        if (tok.start >= lastEnd) {
            accepted.push(tok);
            lastEnd = tok.end;
        }
    }

    // Build the HTML by iterleaving plain text and highlighted spans.
    // Escape HTML per-segment so entities are never broken by regex.
    function escapeHtml(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let result = '';
    let pos = 0;
    for (const tok of accepted) {
        // Plain text before this token
        if (tok.start > pos) {
            result += escapeHtml(code.slice(pos, tok.start));
        }
        // Highlighted token
        result += `<span class="${tok.className}">${escapeHtml(code.slice(tok.start, tok.end))}</span>`;
        pos = tok.end;
    }
    // Remaining plain text
    if (pos < code.length) {
        result += escapeHtml(code.slice(pos));
    }

    return result;
}

// ─── Component ────────────────────────────────────────────────

export function CodeGenModal({ onClose }: CodeGenModalProps) {
    const { tabs, activeTabId } = useTabStore();
    const { environments, activeEnvironmentId, globalVariables } = useEnvironmentStore();

    const [target, setTarget] = useState<CodeGenTarget>('curl');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [resolveVars, setResolveVars] = useState(false);

    const activeTab = tabs.find((t) => t.id === activeTabId);

    // Resolve variables in request config if toggle is on
    const requestConfig = useMemo(() => {
        if (!activeTab) return null;
        if (!resolveVars) return activeTab.request;

        const activeEnv = activeEnvironmentId
            ? environments.find(e => e.id === activeEnvironmentId)
            : undefined;

        return interpolateRequestConfig(
            activeTab.request,
            globalVariables,
            activeEnv?.variables || [],
            []
        );
    }, [activeTab, resolveVars, environments, activeEnvironmentId, globalVariables]);

    useEffect(() => {
        if (!requestConfig) return;

        const generate = async () => {
            setLoading(true);
            try {
                const result = await window.api.generateCode(requestConfig, target);
                setCode(result.code);
            } catch (error: any) {
                setCode(`// Error generating code: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        generate();
    }, [target, requestConfig]);

    const highlightedCode = useMemo(() => {
        if (loading || !code) return '';
        return highlightCode(code, target);
    }, [code, target, loading]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [code]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const targetLabel = CODEGEN_TARGETS.find(t => t.value === target)?.label || target;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal codegen-modal">
                <div className="modal-header">
                    <span className="modal-title">Code Snippet</span>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    {/* Controls row */}
                    <div className="codegen-controls">
                        <div className="codegen-select-wrapper">
                            <label className="codegen-select-label">Language</label>
                            <select
                                className="codegen-select"
                                value={target}
                                onChange={(e) => setTarget(e.target.value as CodeGenTarget)}
                            >
                                {LANGUAGE_GROUPS.map((group) => (
                                    <optgroup key={group.group} label={group.group}>
                                        {group.targets.map((t) => {
                                            const info = CODEGEN_TARGETS.find(ct => ct.value === t);
                                            return info ? (
                                                <option key={info.value} value={info.value}>
                                                    {info.label}
                                                </option>
                                            ) : null;
                                        })}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <label className="codegen-toggle">
                            <input
                                type="checkbox"
                                checked={resolveVars}
                                onChange={(e) => setResolveVars(e.target.checked)}
                            />
                            <span className="codegen-toggle-label">{'Resolve {{variables}}'}</span>
                        </label>
                    </div>

                    {/* Code output */}
                    <div className="code-output codegen-output">
                        <div className="codegen-output-header">
                            <span className="codegen-lang-badge">{targetLabel}</span>
                            <button
                                className="copy-btn codegen-copy-btn"
                                onClick={handleCopy}
                            >
                                {copied ? '✓ Copied!' : '⧉ Copy'}
                            </button>
                        </div>
                        {loading ? (
                            <div className="codegen-loading">
                                <div className="loading-spinner" />
                                <span>Generating...</span>
                            </div>
                        ) : (
                            <pre
                                className="codegen-pre"
                                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
