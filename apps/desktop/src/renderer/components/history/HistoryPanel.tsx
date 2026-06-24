import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistoryStore } from '../../store/history-store';
import { useTabStore } from '../../store/tab-store';

const METHOD_COLORS: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)',
    DELETE: 'var(--method-delete)',
    OPTIONS: 'var(--method-options)',
    HEAD: 'var(--method-head)',
};

function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'var(--status-success)';
    if (status >= 300 && status < 400) return 'var(--status-redirect)';
    if (status >= 400 && status < 500) return 'var(--status-client-error)';
    if (status >= 500) return 'var(--status-server-error)';
    return 'var(--text-secondary)';
}

function useTimeAgo() {
    const { t } = useTranslation();
    return (timestamp: number): string => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return t('history.justNow');
        if (seconds < 3600) return t('history.minutesAgo', { count: Math.floor(seconds / 60) });
        if (seconds < 86400) return t('history.hoursAgo', { count: Math.floor(seconds / 3600) });
        return t('history.daysAgo', { count: Math.floor(seconds / 86400) });
    };
}

export function HistoryPanel() {
    const { t } = useTranslation();
    const timeAgo = useTimeAgo();
    const { entries, loading, searchQuery, fetchHistory, searchHistory, setSearchQuery } =
        useHistoryStore();
    const { loadRequest } = useTabStore();

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleSearch = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const query = e.target.value;
            setSearchQuery(query);

            // Debounce
            const timer = setTimeout(() => {
                searchHistory(query);
            }, 300);

            return () => clearTimeout(timer);
        },
        [searchHistory, setSearchQuery]
    );

    const handleClick = (entry: typeof entries[0]) => {
        loadRequest(entry.request);
    };

    return (
        <div>
            <div className="history-search">
                <input
                    type="text"
                    placeholder={t('history.searchPlaceholder')}
                    value={searchQuery}
                    onChange={handleSearch}
                />
            </div>

            {loading && entries.length === 0 && (
                <div className="empty-state" style={{ height: 100 }}>
                    <span className="loading-spinner" />
                </div>
            )}

            {!loading && entries.length === 0 && (
                <div className="empty-state" style={{ height: 150 }}>
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">{t('history.noHistory')}</div>
                    <div className="empty-state-sub">{t('history.sendToSee')}</div>
                </div>
            )}

            {entries.map((entry) => (
                <div key={entry.id} className="history-item" onClick={() => handleClick(entry)}>
                    <span
                        className="history-method"
                        style={{ color: METHOD_COLORS[entry.request.method] || 'var(--text-secondary)' }}
                    >
                        {entry.request.method}
                    </span>
                    <span className="history-url">{entry.request.url}</span>
                    <span
                        className="history-status"
                        style={{ color: getStatusColor(entry.response.status) }}
                    >
                        {entry.response.status}
                    </span>
                    <span className="history-time">{timeAgo(entry.timestamp)}</span>
                </div>
            ))}
        </div>
    );
}
