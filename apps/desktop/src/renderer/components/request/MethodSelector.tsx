import React from 'react';
import { useTabStore } from '../../store/tab-store';

export function MethodSelector() {
    // This component is integrated directly in UrlBar
    // Kept as placeholder for potential standalone usage
    const { tabs, activeTabId } = useTabStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    return null;
}
