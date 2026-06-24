import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLRequest, GraphQLResponse, GraphQLIntrospection, GraphQLSchemaField } from '@api-platform/core';

export function GraphQLPanel() {
    const [url, setUrl] = useState('');
    const [query, setQuery] = useState('{\n  \n}');
    const [variables, setVariables] = useState('');
    const [headers, setHeaders] = useState([{ id: uuidv4(), key: '', value: '', enabled: true }]);
    const [response, setResponse] = useState<GraphQLResponse | null>(null);
    const [schema, setSchema] = useState<GraphQLIntrospection | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'response' | 'schema'>('response');

    const handleSend = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const req: GraphQLRequest = { url, query, variables: variables || undefined, headers };
            const res = await window.api.sendGraphQL(req);
            setResponse(res);
            setActiveTab('response');
        } catch (err: any) {
            setResponse({ data: null, errors: [{ message: err.message }], status: 0, time: 0, size: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleIntrospect = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const result = await window.api.introspectGraphQL(url, headers);
            setSchema(result);
            setActiveTab('schema');
        } catch (err: any) {
            setSchema(null);
        } finally {
            setLoading(false);
        }
    };

    const renderField = (field: GraphQLSchemaField) => (
        <div key={field.name} className="gql-field">
            <span className="gql-field-name">{field.name}</span>
            {field.args && field.args.length > 0 && (
                <span className="gql-field-args">
                    ({field.args.map(a => `${a.name}: ${a.type}`).join(', ')})
                </span>
            )}
            <span className="gql-field-type">: {field.type}</span>
        </div>
    );

    return (
        <div className="protocol-panel">
            {/* URL Bar */}
            <div className="url-bar">
                <span style={{ fontWeight: 700, color: 'var(--method-post)', fontSize: 13 }}>GQL</span>
                <input className="url-input" placeholder="https://api.example.com/graphql"
                    value={url} onChange={(e) => setUrl(e.target.value)} />
                <button className="send-btn" onClick={handleSend} disabled={loading || !url}>
                    {loading ? '...' : 'Send'}
                </button>
                <button className="toolbar-btn" onClick={handleIntrospect}
                    disabled={loading || !url} style={{ border: '1px solid var(--border-primary)' }}>
                    Schema
                </button>
            </div>

            {/* Query & Variables */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-primary)' }}>
                    <div style={{ padding: '4px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-primary)' }}>Query</div>
                    <textarea className="script-textarea" style={{ flex: 1, borderRadius: 0, border: 'none', minHeight: 120 }}
                        value={query} onChange={(e) => setQuery(e.target.value)} spellCheck={false} />
                </div>
                <div style={{ width: 250, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '4px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-primary)' }}>Variables</div>
                    <textarea className="script-textarea" style={{ flex: 1, borderRadius: 0, border: 'none', minHeight: 120 }}
                        value={variables} onChange={(e) => setVariables(e.target.value)} spellCheck={false}
                        placeholder='{"key": "value"}' />
                </div>
            </div>

            {/* Response / Schema Tabs */}
            <div style={{ borderTop: '1px solid var(--border-primary)' }}>
                <div className="response-tabs">
                    <button className={`response-tab ${activeTab === 'response' ? 'active' : ''}`}
                        onClick={() => setActiveTab('response')}>Response</button>
                    <button className={`response-tab ${activeTab === 'schema' ? 'active' : ''}`}
                        onClick={() => setActiveTab('schema')}>Schema</button>
                    {response && (
                        <div className="response-metrics" style={{ marginLeft: 'auto', borderBottom: 'none', padding: 0 }}>
                            <span className="metric"><span className="metric-label">Status</span> <span className="metric-value" style={{ color: response.status >= 200 && response.status < 300 ? 'var(--method-get)' : 'var(--method-delete)' }}>{response.status}</span></span>
                            <span className="metric"><span className="metric-label">Time</span> <span className="metric-value">{response.time}ms</span></span>
                        </div>
                    )}
                </div>

                <div style={{ maxHeight: 300, overflow: 'auto', padding: 'var(--space-md)' }}>
                    {activeTab === 'response' && response && (
                        <div>
                            {response.errors && (
                                <div style={{ marginBottom: 8 }}>
                                    {response.errors.map((e, i) => (
                                        <div key={i} style={{ color: 'var(--method-delete)', fontSize: 12, padding: '2px 0' }}>⚠ {e.message}</div>
                                    ))}
                                </div>
                            )}
                            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                                {JSON.stringify(response.data, null, 2)}
                            </pre>
                        </div>
                    )}

                    {activeTab === 'schema' && schema && (
                        <div className="gql-schema">
                            {schema.queryType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Query</div>
                                    {schema.queryType.fields.map(renderField)}
                                </div>
                            )}
                            {schema.mutationType && schema.mutationType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Mutation</div>
                                    {schema.mutationType.fields.map(renderField)}
                                </div>
                            )}
                            {schema.subscriptionType && schema.subscriptionType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Subscription</div>
                                    {schema.subscriptionType.fields.map(renderField)}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'response' && !response && (
                        <div className="empty-state" style={{ height: 100 }}>
                            <div className="empty-state-sub">Send a query to see the response</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
