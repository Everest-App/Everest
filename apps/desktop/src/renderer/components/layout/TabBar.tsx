import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

export function TabBar() {
    const { t } = useTranslation();
    const { tabs, activeTabId, setActiveTab, addTab, removeTab } = useTabStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);

    // Auto-scroll active tab into view when it changes
    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            });
        }
    }, [activeTabId]);

    // Translate vertical mouse wheel to horizontal scroll.
    // Native horizontal scroll (trackpad gestures) works automatically.
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!scrollContainerRef.current) return;
        // Only intercept vertical scroll and convert to horizontal
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            scrollContainerRef.current.scrollLeft += e.deltaY;
        }
    }, []);

    return (
        <div className="tab-bar">
            <div
                className="tab-scroll-container"
                ref={scrollContainerRef}
                onWheel={handleWheel}
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        ref={tab.id === activeTabId ? (activeTabRef as any) : undefined}
                        className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        role="button"
                        tabIndex={0}
                    >
                        <span
                            className="tab-method"
                            style={{ color: METHOD_COLORS[tab.request.method] || 'var(--text-secondary)' }}
                        >
                            {tab.request.method}
                        </span>
                        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tab.request.url
                                ? tab.request.url.replace(/^https?:\/\//, '').substring(0, 30)
                                : t('request.newRequest')}
                        </span>
                        {tab.loading && <span className="loading-spinner" />}
                        <button
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                            title={t('common.close')}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <button className="tab-add" onClick={addTab} title={`${t('request.newTab')} (⌘T)`}>
                +
            </button>
        </div>
    );
}
