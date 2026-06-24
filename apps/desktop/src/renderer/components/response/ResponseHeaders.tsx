import React from 'react';

interface ResponseHeadersProps {
    headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
    const entries = Object.entries(headers);

    if (entries.length === 0) {
        return (
            <div className="empty-state" style={{ height: 100 }}>
                <div className="empty-state-text" style={{ fontSize: 12 }}>
                    No response headers
                </div>
            </div>
        );
    }

    return (
        <table className="response-headers-table">
            <thead>
                <tr>
                    <th>Key</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                {entries.map(([key, value]) => (
                    <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
