import React, { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { useThemeStore } from './store/theme-store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SaveToFolderModal } from './components/collections/SaveToFolderModal';
import { useTabStore } from './store/tab-store';
import { AboutDialog } from './components/common/AboutDialog';
import { DEFAULT_HTTP_METHOD, DEFAULT_BODY_TYPE, DEFAULT_AUTH_TYPE } from '@everest/core';

export default function App() {
    const { theme, setTheme } = useThemeStore();
    const { tabs, activeTabId, markAsSaved, addTab, removeTab } = useTabStore();
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
    }, [theme]);

    useEffect(() => {
        if (!window.api?.onMenuAction) return;

        // Remove any previous listener before attaching a new one
        window.api.removeMenuActionListener?.();

        window.api.onMenuAction((action) => {
            switch (action) {
                case 'show-about':
                    setShowAboutModal(true);
                    break;
                case 'new-request':
                    addTab();
                    break;
                case 'save-request':
                    setShowSaveModal(true);
                    break;
                case 'close-tab':
                    if (activeTabId) removeTab(activeTabId);
                    break;
                case 'theme-light':
                    setTheme('light');
                    break;
                case 'theme-dark':
                    setTheme('dark');
                    break;
                // Add more handlers as needed
            }
        });

        // Cleanup: remove listener when dependencies change or component unmounts
        return () => {
            window.api.removeMenuActionListener?.();
        };
    }, [activeTabId, addTab, removeTab, setTheme]);

    useKeyboardShortcuts(() => setShowSaveModal(true));

    const activeTab = tabs.find(t => t.id === activeTabId);

    return (
        <>
            <MainLayout />
            {showSaveModal && activeTab && (
                <SaveToFolderModal
                    request={activeTab.request}
                    response={activeTab.response || undefined}
                    onClose={() => setShowSaveModal(false)}
                    onSaved={(collectionId, itemId) => {
                        if (collectionId && itemId) {
                            markAsSaved(activeTab.id, collectionId, itemId);
                        }
                    }}
                />
            )}
            {showAboutModal && <AboutDialog onClose={() => setShowAboutModal(false)} />}
        </>
    );
}
