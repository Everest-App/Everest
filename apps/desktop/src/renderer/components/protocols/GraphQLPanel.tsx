import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLRequest, GraphQLResponse, GraphQLIntrospection, GraphQLSchemaField } from '@api-platform/core';
import { SFIcon } from '../common/SFIcon';

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
            {/* Request Section Island */}
            <div className="request-section" style={{ flex: 1.2, minHeight: 240, display: 'flex', flexDirection: 'column' }}>
                <div className="url-bar">
                    <span className="protocol-badge gql">GQL</span>
                    <input
                        className="url-input"
                        placeholder="https://api.example.com/graphql"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                    />
                    <button className="send-btn" onClick={handleSend} disabled={loading || !url}>
                        <SFIcon name="paperplane.fill" size={12} style={{ marginRight: 6 }} />
                        {loading ? 'Executing...' : 'Send'}
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={handleIntrospect}
                        disabled={loading || !url}
                        title="Introspect Schema"
                    >
                        <SFIcon name="sparkles" size={13} style={{ marginRight: 4 }} />
                        Schema
                    </button>
                </div>

                {/* Editor Split: Query & Variables */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-primary)' }}>
                        <div className="section-tab-header">
                            <SFIcon name="code" size={12} />
                            <span>Query</span>
                        </div>
                        <div className="config-panel" style={{ padding: 0 }}>
                            <textarea
                                className="script-textarea"
                                style={{ flex: 1, width: '100%', height: '100%', borderRadius: 0, border: 'none', resize: 'none', background: 'transparent' }}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                spellCheck={false}
                                placeholder="query { ... }"
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="section-tab-header">
                            <SFIcon name="gearshape" size={12} />
                            <span>Variables (JSON)</span>
                        </div>
                        <div className="config-panel" style={{ padding: 0 }}>
                            <textarea
                                className="script-textarea"
                                style={{ flex: 1, width: '100%', height: '100%', borderRadius: 0, border: 'none', resize: 'none', background: 'transparent' }}
                                value={variables}
                                onChange={(e) => setVariables(e.target.value)}
                                spellCheck={false}
                                placeholder='{\n  "variable": "value"\n}'
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ height: 8 }} />

            {/* Response Section Island */}
            <div className="response-section" style={{ flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column' }}>
                <div className="response-header" style={{ padding: '4px 12px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center' }}>
                    <div className="config-tabs" style={{ borderBottom: 'none', padding: 0 }}>
                        <button
                            className={`config-tab ${activeTab === 'response' ? 'active' : ''}`}
                            onClick={() => setActiveTab('response')}
                        >
                            Response
                        </button>
                        <button
                            className={`config-tab ${activeTab === 'schema' ? 'active' : ''}`}
                            onClick={() => setActiveTab('schema')}
                        >
                            Schema {schema ? '✓' : ''}
                        </button>
                    </div>

                    {response && (
                        <div className="response-metrics" style={{ marginLeft: 'auto', borderBottom: 'none', padding: 0 }}>
                            <span className="metric">
                                <span className="metric-label">Status</span>
                                <span className="metric-value" style={{ color: response.status >= 200 && response.status < 300 ? 'var(--method-get)' : 'var(--method-delete)' }}>
                                    {response.status || 'ERR'}
                                </span>
                            </span>
                            <span className="metric">
                                <span className="metric-label">Time</span>
                                <span className="metric-value">{response.time}ms</span>
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
                    {activeTab === 'response' && response && (
                        <div>
                            {response.errors && response.errors.length > 0 && (
                                <div style={{ marginBottom: 12, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {response.errors.map((e, i) => (
                                        <div key={i} style={{ color: 'var(--method-delete)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <SFIcon name="exclamationmark.triangle.fill" size={12} />
                                            <span>{e.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {response.data && (
                                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                                    {JSON.stringify(response.data, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}

                    {activeTab === 'schema' && schema && (
                        <div className="gql-schema">
                            {schema.queryType?.fields && schema.queryType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Query</div>
                                    {schema.queryType.fields.map(renderField)}
                                </div>
                            )}
                            {schema.mutationType?.fields && schema.mutationType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Mutation</div>
                                    {schema.mutationType.fields.map(renderField)}
                                </div>
                            )}
                            {schema.subscriptionType?.fields && schema.subscriptionType.fields.length > 0 && (
                                <div>
                                    <div className="gql-type-header">Subscription</div>
                                    {schema.subscriptionType.fields.map(renderField)}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'response' && !response && (
                        <div className="empty-state" style={{ height: 120 }}>
                            <div className="empty-state-icon"><SFIcon name="paperplane.fill" size={24} /></div>
                            <div className="empty-state-sub">Send a query to inspect response payload</div>
                        </div>
                    )}

                    {activeTab === 'schema' && !schema && (
                        <div className="empty-state" style={{ height: 120 }}>
                            <div className="empty-state-icon"><SFIcon name="sparkles" size={24} /></div>
                            <div className="empty-state-sub">Click "Schema" button above to fetch GraphQL introspection</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
