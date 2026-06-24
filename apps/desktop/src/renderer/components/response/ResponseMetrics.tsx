import React from 'react';
import { ResponseData } from '@api-platform/core';

interface ResponseMetricsProps {
    response: ResponseData;
}

function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'var(--status-success)';
    if (status >= 300 && status < 400) return 'var(--status-redirect)';
    if (status >= 400 && status < 500) return 'var(--status-client-error)';
    if (status >= 500) return 'var(--status-server-error)';
    return 'var(--text-secondary)';
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResponseMetrics({ response }: ResponseMetricsProps) {
    const color = getStatusColor(response.status);

    return (
        <div className="response-metrics">
            <div className="metric">
                <span className="metric-label">Status:</span>
                <span
                    className="status-badge"
                    style={{
                        color: color,
                        background: `${color}15`,
                    }}
                >
                    {response.status} {response.statusText}
                </span>
            </div>
            <div className="metric">
                <span className="metric-label">Time:</span>
                <span className="metric-value" style={{ color: 'var(--method-get)' }}>
                    {response.time} ms
                </span>
            </div>
            <div className="metric">
                <span className="metric-label">Size:</span>
                <span className="metric-value" style={{ color: 'var(--method-put)' }}>
                    {formatSize(response.size)}
                </span>
            </div>
        </div>
    );
}
