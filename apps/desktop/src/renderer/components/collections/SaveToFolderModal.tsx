import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollectionStore } from '../../store/collection-store';
import { RequestConfig, ResponseData, CollectionItem } from '@api-platform/core';
import { buildTree } from '../../utils/search-utils';
import { v4 as uuidv4 } from 'uuid';

interface SaveToFolderModalProps {
    request: RequestConfig;
    response?: ResponseData;
    requestName?: string;
    onClose: () => void;
    onSaved?: (collectionId: string, itemId?: string) => void;
}

export function SaveToFolderModal({ request, response, requestName, onClose, onSaved }: SaveToFolderModalProps) {
    const { t } = useTranslation();
    const { collections, addItem, fetchCollections } = useCollectionStore();

    const defaultName = requestName || `${request.method} ${request.url?.split('?')[0]?.split('/').pop() || 'Request'}`;
    const [name, setName] = useState(defaultName);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || '');
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleNode = useCallback((id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const selectedCollection = useMemo(
        () => collections.find(c => c.id === selectedCollectionId),
        [collections, selectedCollectionId]
    );

    const folderTree = useMemo(
        () => selectedCollection ? buildTree(selectedCollection.items).filter(i => i.type === 'folder') : [],
        [selectedCollection]
    );

    const handleSave = async () => {
        if (!selectedCollectionId || !name.trim()) return;
        setSaving(true);

        try {
            const newItemId = uuidv4();
            const itemToSave: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'> = {
                name: name.trim(),
                type: 'request',
                parentId: selectedFolderId,
                request: {
                    ...request,
                    id: newItemId, // new ID to prevent conflicts
                },
            };

            await addItem(selectedCollectionId, selectedFolderId, itemToSave);
            await fetchCollections();
            
            // We need to pass the collectionId and itemId back to the tab store
            // We assume addItem adds it with the new request ID as the item ID or similar, 
            // but let's just find it since we know the new request ID.
            const store = useCollectionStore.getState();
            const col = store.collections.find(c => c.id === selectedCollectionId);
            const createdItem = col?.items.find(i => i.request?.id === newItemId);
            
            if (onSaved) {
                onSaved(selectedCollectionId, createdItem?.id);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save request to folder:', error);
        } finally {
            setSaving(false);
        }
    };

    const renderFolderNode = (item: CollectionItem, depth: number = 0): React.ReactNode => {
        if (item.type !== 'folder') return null;
        const isExpanded = expandedNodes.has(item.id);
        const isSelected = selectedFolderId === item.id;
        const subfolders = item.children?.filter(c => c.type === 'folder') || [];

        return (
            <div key={item.id}>
                <div
                    className={`folder-picker-item ${isSelected ? 'selected' : ''}`}
                    style={{ paddingLeft: 12 + depth * 20 }}
                    onClick={() => setSelectedFolderId(isSelected ? null : item.id)}
                >
                    {subfolders.length > 0 && (
                        <span
                            className="folder-picker-toggle"
                            onClick={(e) => { e.stopPropagation(); toggleNode(item.id); }}
                        >
                            {isExpanded ? '▾' : '▸'}
                        </span>
                    )}
                    <span className="folder-picker-icon">📁</span>
                    <span className="folder-picker-name">{item.name}</span>
                    {isSelected && <span className="folder-picker-check">✓</span>}
                </div>
                {isExpanded && subfolders.map(child => renderFolderNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal save-to-folder-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">
                        {t('collection.saveToFolder', { defaultValue: 'Save to Folder' })}
                    </span>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {/* Request name */}
                    <div className="save-folder-field">
                        <label className="save-folder-label">
                            {t('collection.requestName', { defaultValue: 'Request Name' })}
                        </label>
                        <input
                            type="text"
                            className="save-folder-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Request name"
                            autoFocus
                        />
                    </div>

                    {/* Collection selector */}
                    <div className="save-folder-field">
                        <label className="save-folder-label">
                            {t('runner.collection', { defaultValue: 'Collection' })}
                        </label>
                        <select
                            className="save-folder-select"
                            value={selectedCollectionId}
                            onChange={e => {
                                setSelectedCollectionId(e.target.value);
                                setSelectedFolderId(null);
                            }}
                        >
                            <option value="">{t('runner.selectCollection', { defaultValue: 'Select Collection' })}</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>📦 {c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Folder tree picker */}
                    {selectedCollection && (
                        <div className="save-folder-field">
                            <label className="save-folder-label">
                                {t('collection.destinationFolder', { defaultValue: 'Destination Folder' })}
                                <span className="save-folder-optional">
                                    ({t('runner.dataFileOptional', { defaultValue: 'optional' })})
                                </span>
                            </label>
                            <div className="folder-picker-tree">
                                <div
                                    className={`folder-picker-item root ${selectedFolderId === null ? 'selected' : ''}`}
                                    onClick={() => setSelectedFolderId(null)}
                                >
                                    <span className="folder-picker-icon">📦</span>
                                    <span className="folder-picker-name">{selectedCollection.name} (root)</span>
                                    {selectedFolderId === null && <span className="folder-picker-check">✓</span>}
                                </div>
                                {folderTree.map(item => renderFolderNode(item))}
                            </div>
                        </div>
                    )}

                    {/* Include metadata checkbox */}
                    {response && (
                        <label className="save-folder-checkbox">
                            <input
                                type="checkbox"
                                checked={includeMetadata}
                                onChange={e => setIncludeMetadata(e.target.checked)}
                            />
                            <span>
                                {t('collection.includeMetadata', { defaultValue: 'Include response metadata' })}
                                {response && (
                                    <span className="save-folder-meta-preview">
                                        ({response.status} {response.statusText} · {response.time}ms)
                                    </span>
                                )}
                            </span>
                        </label>
                    )}
                </div>

                <div className="save-folder-footer">
                    <button className="save-folder-cancel-btn" onClick={onClose}>
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                    </button>
                    <button
                        className="save-folder-save-btn"
                        onClick={handleSave}
                        disabled={saving || !selectedCollectionId || !name.trim()}
                    >
                        {saving ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.save', { defaultValue: 'Save' })}
                    </button>
                </div>
            </div>
        </div>
    );
}
