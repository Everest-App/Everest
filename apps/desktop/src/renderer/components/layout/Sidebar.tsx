import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoryPanel } from '../history/HistoryPanel';
import { CollectionPanel } from '../collections/CollectionPanel';
import { EnvironmentPanel } from '../environments/EnvironmentPanel';
import { ImportExportModal } from '../import-export/ImportExportModal';
import { appEvents, NAVIGATE_TO_VARIABLE } from '../../utils/event-bus';

type SidebarTab = 'collections' | 'environments' | 'history';

interface SidebarProps {
    onOpenRunner: (collectionId?: string, folderId?: string, folderName?: string) => void;
}

export function Sidebar({ onOpenRunner }: SidebarProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SidebarTab>('collections');
    const [showImportExport, setShowImportExport] = useState(false);
    const [highlightVarName, setHighlightVarName] = useState<string | null>(null);

    // Listen for "navigate to variable" events from the URL bar
    useEffect(() => {
        const unsubscribe = appEvents.on(NAVIGATE_TO_VARIABLE, (varName: string) => {
            // Switch to environments tab
            setActiveTab('environments');
            // Set highlight target (EnvironmentPanel will handle the rest)
            setHighlightVarName(varName);
            // Clear highlight after animation
            setTimeout(() => setHighlightVarName(null), 2500);
        });
        return unsubscribe;
    }, []);

    return (
        <>
            <div className="sidebar-tabs">
                <button className={`sidebar-tab ${activeTab === 'collections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('collections')}>{t('sidebar.collections')}</button>
                <button className={`sidebar-tab ${activeTab === 'environments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('environments')}>{t('sidebar.environments')}</button>
                <button className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}>{t('sidebar.history')}</button>
            </div>

            {activeTab === 'collections' && (
                <div style={{ padding: '6px 12px 0', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 4 }}>
                    <button className="toolbar-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                        onClick={() => setShowImportExport(true)}>{t('sidebar.import')}</button>
                    <button className="toolbar-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                        onClick={() => onOpenRunner()}>{t('sidebar.runner')}</button>
                </div>
            )}

            <div className="sidebar-content">
                {activeTab === 'collections' && (
                    <CollectionPanel
                        onRunCollection={(id) => onOpenRunner(id)}
                        onRunFolder={(colId, folderId, folderName) => onOpenRunner(colId, folderId, folderName)}
                    />
                )}
                {activeTab === 'environments' && (
                    <EnvironmentPanel highlightVarName={highlightVarName} />
                )}
                {activeTab === 'history' && <HistoryPanel />}
            </div>

            {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
        </>
    );
}
