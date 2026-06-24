import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollectionStore } from '../../store/collection-store';
import { useTabStore } from '../../store/tab-store';
import { Collection, CollectionItem } from '@api-platform/core';
import { v4 as uuidv4 } from 'uuid';
import { useDebouncedValue } from '../../hooks/useSearch';
import { searchCollections, buildTree, MatchedCollectionItem, MatchedCollection } from '../../utils/search-utils';
import { HighlightedText } from '../common/HighlightedText';

interface CollectionPanelProps {
    onRunCollection?: (collectionId: string) => void;
    onRunFolder?: (collectionId: string, folderId: string, folderName: string) => void;
}

const METHOD_COLORS: Record<string, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)',
    DELETE: 'var(--method-delete)',
    OPTIONS: 'var(--method-options)',
    HEAD: 'var(--method-head)',
};

// ── Drag-and-drop data ──
interface DragData {
    itemId: string;
    collectionId: string;
    parentId: string | null;
    type: 'folder' | 'request';
}

type DropPosition = 'before' | 'after' | 'inside' | null;

export function CollectionPanel({ onRunCollection, onRunFolder }: CollectionPanelProps) {
    const { t } = useTranslation();
    const {
        collections, loading, expandedFolders,
        fetchCollections, createCollection, deleteCollection, duplicateCollection,
        addItem, deleteItem, toggleFolder, renameItem, moveItem,
    } = useCollectionStore();
    const { loadRequest } = useTabStore();
    const [newName, setNewName] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebouncedValue(searchQuery, 200);

    // ── Rename state ──
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // ── Drag state ──
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<DropPosition>(null);
    const dragDataRef = useRef<DragData | null>(null);

    // ── Context menu state ──
    const [contextMenu, setContextMenu] = useState<{
        x: number; y: number;
        item?: CollectionItem;
        collection?: Collection;
    } | null>(null);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    // Close context menu on click outside
    useEffect(() => {
        if (contextMenu) {
            const handleClick = () => setContextMenu(null);
            window.addEventListener('click', handleClick);
            return () => window.removeEventListener('click', handleClick);
        }
    }, [contextMenu]);

    // Auto-focus rename input
    useEffect(() => {
        if (editingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingId]);

    const searchResults = useMemo(
        () => searchCollections(collections, debouncedQuery),
        [collections, debouncedQuery]
    );
    const isSearching = debouncedQuery.trim().length > 0;

    // ── Handlers ──

    const handleCreate = () => {
        if (newName.trim()) {
            createCollection(newName.trim());
            setNewName('');
            setShowCreate(false);
        }
    };

    const handleAddRequest = (collectionId: string, parentId: string | null) => {
        addItem(collectionId, parentId, {
            name: 'New Request',
            type: 'request',
            parentId,
            request: {
                id: uuidv4(),
                method: 'GET',
                url: '',
                params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
                headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
                body: { type: 'none' },
                auth: { type: 'none' },
            },
        });
    };

    const handleAddFolder = (collectionId: string, parentId: string | null) => {
        addItem(collectionId, parentId, {
            name: 'New Folder',
            type: 'folder',
            parentId,
        });
    };

    // ── Rename ──

    const startRename = (id: string, currentName: string, collectionId?: string) => {
        setEditingId(id);
        setEditingName(currentName);
        setEditingCollectionId(collectionId || null);
    };

    const commitRename = (item?: CollectionItem) => {
        if (!editingId || !editingName.trim()) {
            setEditingId(null);
            return;
        }

        if (editingCollectionId && !item) {
            // Renaming a collection
            const col = collections.find(c => c.id === editingId);
            if (col && editingName.trim() !== col.name) {
                const { updateCollection: updateCol } = useCollectionStore.getState();
                updateCol(editingId, editingName.trim(), col.description);
            }
        } else if (item && editingName.trim() !== item.name) {
            // Renaming an item (folder or request)
            renameItem(item, editingName.trim());
        }

        setEditingId(null);
        setEditingName('');
        setEditingCollectionId(null);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditingName('');
        setEditingCollectionId(null);
    };

    // ── Drag-and-drop ──

    const handleDragStart = useCallback((e: React.DragEvent, item: CollectionItem) => {
        dragDataRef.current = {
            itemId: item.id,
            collectionId: item.collectionId,
            parentId: item.parentId,
            type: item.type,
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        (e.currentTarget as HTMLElement).classList.add('dragging');
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove('dragging');
        setDragOverId(null);
        setDropPosition(null);
        dragDataRef.current = null;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, targetId: string, targetType: 'folder' | 'request') => {
        e.preventDefault();
        e.stopPropagation();

        const dragData = dragDataRef.current;
        if (!dragData || dragData.itemId === targetId) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        let pos: DropPosition;
        if (targetType === 'folder') {
            if (y < height * 0.25) pos = 'before';
            else if (y > height * 0.75) pos = 'after';
            else pos = 'inside';
        } else {
            pos = y < height * 0.5 ? 'before' : 'after';
        }

        e.dataTransfer.dropEffect = 'move';
        setDragOverId(targetId);
        setDropPosition(pos);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if leaving the actual element (not entering a child)
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
            setDragOverId(null);
            setDropPosition(null);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetItem: CollectionItem, siblings: CollectionItem[]) => {
        e.preventDefault();
        e.stopPropagation();

        const dragData = dragDataRef.current;
        if (!dragData || dragData.itemId === targetItem.id) return;
        if (dragData.collectionId !== targetItem.collectionId) return; // same collection only

        const pos = dropPosition;
        setDragOverId(null);
        setDropPosition(null);

        if (pos === 'inside' && targetItem.type === 'folder') {
            // Move into folder — place at end
            const folderChildren = targetItem.children || [];
            const maxSort = folderChildren.length > 0
                ? Math.max(...folderChildren.map(c => c.sortOrder)) + 1
                : 0;
            moveItem(dragData.itemId, targetItem.id, maxSort);
        } else if (pos === 'before') {
            moveItem(dragData.itemId, targetItem.parentId, targetItem.sortOrder);
        } else if (pos === 'after') {
            moveItem(dragData.itemId, targetItem.parentId, targetItem.sortOrder + 1);
        }
    }, [dropPosition, moveItem]);

    const handleDropOnCollection = useCallback((e: React.DragEvent, collectionId: string, rootItems: CollectionItem[]) => {
        e.preventDefault();
        e.stopPropagation();

        const dragData = dragDataRef.current;
        if (!dragData || dragData.collectionId !== collectionId) return;

        setDragOverId(null);
        setDropPosition(null);

        const maxSort = rootItems.length > 0
            ? Math.max(...rootItems.map(c => c.sortOrder)) + 1
            : 0;
        moveItem(dragData.itemId, null, maxSort);
    }, [moveItem]);

    // ── Context menu ──

    const handleContextMenu = (e: React.MouseEvent, item?: CollectionItem, collection?: Collection) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item, collection });
    };

    // ── Get drag-over CSS class ──
    const getDragClass = (itemId: string) => {
        if (dragOverId !== itemId) return '';
        if (dropPosition === 'before') return 'drag-over-before';
        if (dropPosition === 'after') return 'drag-over-after';
        if (dropPosition === 'inside') return 'drag-over-inside';
        return '';
    };

    // ── Render item (non-search mode) ──
    const renderItem = (item: CollectionItem, depth: number = 0, siblings: CollectionItem[] = []) => {
        const isEditing = editingId === item.id;

        if (item.type === 'folder') {
            const isExpanded = expandedFolders.has(item.id);
            return (
                <div key={item.id}>
                    <div
                        className={`collection-item folder ${getDragClass(item.id)}`}
                        style={{ paddingInlineStart: 12 + depth * 16 }}
                        onClick={() => toggleFolder(item.id)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, item.id, 'folder')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, item, siblings)}
                    >
                        <span className="collection-icon">{isExpanded ? '▾' : '▸'}</span>
                        <span className="collection-icon">📁</span>
                        {isEditing ? (
                            <input
                                ref={renameInputRef}
                                className="collection-rename-input"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commitRename(item);
                                    if (e.key === 'Escape') cancelRename();
                                }}
                                onBlur={() => commitRename(item)}
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span
                                className="collection-item-name"
                                onDoubleClick={(e) => { e.stopPropagation(); startRename(item.id, item.name); }}
                            >
                                {item.name}
                            </span>
                        )}
                        <div className="collection-item-actions">
                            {onRunFolder && (
                                <button className="collection-play-btn" onClick={(e) => { e.stopPropagation(); onRunFolder(item.collectionId, item.id, item.name); }} title={t('collection.runFolder', { defaultValue: 'Run Folder' })}>▶</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleAddRequest(item.collectionId, item.id); }} title={t('collection.addRequest')}>+R</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAddFolder(item.collectionId, item.id); }} title={t('collection.addFolder')}>+F</button>
                            <button onClick={(e) => { e.stopPropagation(); startRename(item.id, item.name); }} title={t('common.rename', { defaultValue: 'Rename' })}>✎</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} title={t('common.delete')}>×</button>
                        </div>
                    </div>
                    {isExpanded && item.children?.map(child => renderItem(child, depth + 1, item.children || []))}
                </div>
            );
        }

        return (
            <div
                key={item.id}
                className={`collection-item request ${getDragClass(item.id)}`}
                style={{ paddingInlineStart: 20 + depth * 16 }}
                onClick={() => !isEditing && item.request && loadRequest(item.request, item.name, item.collectionId, item.id)}
                onMouseUp={() => {
                    if (!isEditing && item.request && !dragDataRef.current) {
                        loadRequest(item.request, item.name, item.collectionId, item.id);
                    }
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item.id, 'request')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item, siblings)}
            >
                <span
                    className="collection-method"
                    style={{ color: METHOD_COLORS[item.request?.method || 'GET'], cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isEditing && item.request) loadRequest(item.request, item.name, item.collectionId, item.id);
                    }}
                >
                    {item.request?.method || 'GET'}
                </span>
                {isEditing ? (
                    <input
                        ref={renameInputRef}
                        className="collection-rename-input"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitRename(item);
                            if (e.key === 'Escape') cancelRename();
                        }}
                        onBlur={() => commitRename(item)}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="collection-item-name"
                        style={{ cursor: 'pointer', flex: 1 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isEditing && item.request) loadRequest(item.request, item.name, item.collectionId, item.id);
                        }}
                        onDoubleClick={(e) => { e.stopPropagation(); startRename(item.id, item.name); }}
                    >
                        {item.name}
                    </span>
                )}
                <div className="collection-item-actions">
                    <button onClick={(e) => { e.stopPropagation(); startRename(item.id, item.name); }} title={t('common.rename', { defaultValue: 'Rename' })}>✎</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} title={t('common.delete')}>×</button>
                </div>
            </div>
        );
    };

    // Render item for search mode (uses MatchedCollectionItem)
    const renderSearchItem = (item: MatchedCollectionItem, depth: number = 0, query: string) => {
        if (item.type === 'folder') {
            return (
                <div key={item.id}>
                    <div
                        className="collection-item folder"
                        style={{ paddingInlineStart: 12 + depth * 16 }}
                        onClick={() => toggleFolder(item.id)}
                    >
                        <span className="collection-icon">▾</span>
                        <span className="collection-icon">📁</span>
                        <HighlightedText text={item.name} query={query} className="collection-item-name" />
                        <div className="collection-item-actions">
                            {onRunFolder && (
                                <button className="collection-play-btn" onClick={(e) => { e.stopPropagation(); onRunFolder(item.collectionId, item.id, item.name); }} title={t('collection.runFolder', { defaultValue: 'Run Folder' })}>▶</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleAddRequest(item.collectionId, item.id); }} title={t('collection.addRequest')}>+R</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAddFolder(item.collectionId, item.id); }} title={t('collection.addFolder')}>+F</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} title={t('common.delete')}>×</button>
                        </div>
                    </div>
                    {item.matchedChildren?.map(child => renderSearchItem(child as MatchedCollectionItem, depth + 1, query))}
                    {!item.matchedChildren && item.children?.map(child => renderSearchItem(child as MatchedCollectionItem, depth + 1, query))}
                </div>
            );
        }

        return (
            <div
                key={item.id}
                className="collection-item request"
                style={{ paddingInlineStart: 20 + depth * 16 }}
                onClick={() => item.request && loadRequest(item.request, item.name, item.collectionId, item.id)}
                onMouseUp={() => {
                    if (item.request && !dragDataRef.current) {
                        loadRequest(item.request, item.name, item.collectionId, item.id);
                    }
                }}
            >
                <span
                    className="collection-method"
                    style={{ color: METHOD_COLORS[item.request?.method || 'GET'], cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.request) loadRequest(item.request, item.name, item.collectionId, item.id);
                    }}
                >
                    {item.request?.method || 'GET'}
                </span>
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.request) loadRequest(item.request, item.name, item.collectionId, item.id);
                    }}
                    style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center' }}
                >
                    <HighlightedText text={item.name} query={query} className="collection-item-name" />
                </div>
                <div className="collection-item-actions">
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} title={t('common.delete')}>×</button>
                </div>
            </div>
        );
    };

    return (
        <div className="collection-panel">
            {/* Search Input */}
            <div className="collection-search-wrapper">
                <input
                    type="text"
                    className="collection-search-input"
                    placeholder={t('collection.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    spellCheck={false}
                />
                {searchQuery && (
                    <button
                        className="collection-search-clear"
                        onClick={() => setSearchQuery('')}
                        title={t('common.close')}
                    >×</button>
                )}
            </div>

            <div className="collection-toolbar">
                <button className="kv-add-btn" style={{ margin: '0 12px 8px', width: 'calc(100% - 24px)' }} onClick={() => setShowCreate(!showCreate)}>
                    {t('collection.newCollection')}
                </button>
            </div>

            {showCreate && (
                <div className="collection-create" style={{ padding: '0 12px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input
                            type="text"
                            placeholder={t('collection.collectionName')}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            style={{
                                flex: 1, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-sans)',
                                background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none',
                            }}
                            autoFocus
                        />
                        <button className="body-type-btn active" onClick={handleCreate} style={{ fontSize: 11 }}>{t('common.create')}</button>
                    </div>
                </div>
            )}

            {loading && collections.length === 0 && (
                <div className="empty-state" style={{ height: 100 }}>
                    <span className="loading-spinner" />
                </div>
            )}

            {!loading && collections.length === 0 && !showCreate && (
                <div className="empty-state" style={{ height: 150 }}>
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-text">{t('collection.noCollections')}</div>
                    <div className="empty-state-sub">{t('collection.createToOrganize')}</div>
                </div>
            )}

            {/* Search Results */}
            {isSearching && searchResults.length === 0 && (
                <div className="empty-state" style={{ height: 80 }}>
                    <div className="empty-state-sub">{t('common.noResults')}</div>
                </div>
            )}

            {isSearching ? (
                // Render search results
                searchResults.map(({ collection: col, matchedItems }) => (
                    <div key={col.id} className="collection-group">
                        <div className="collection-header" onClick={() => toggleFolder(col.id)}>
                            <span className="collection-icon">▾</span>
                            <span className="collection-icon">📦</span>
                            <HighlightedText text={col.name} query={debouncedQuery} className="collection-header-name" />
                            <div className="collection-item-actions">
                                {onRunCollection && (
                                    <button className="collection-play-btn" onClick={(e) => { e.stopPropagation(); onRunCollection(col.id); }} title={t('collection.runCollection')}>▶</button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleAddRequest(col.id, null); }} title={t('collection.addRequest')}>+R</button>
                                <button onClick={(e) => { e.stopPropagation(); handleAddFolder(col.id, null); }} title={t('collection.addFolder')}>+F</button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateCollection(col.id); }} title={t('collection.duplicate')}>⧉</button>
                                <button onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }} title={t('common.delete')}>×</button>
                            </div>
                        </div>
                        {matchedItems.map(item => renderSearchItem(item, 0, debouncedQuery))}
                    </div>
                ))
            ) : (
                // Render normal tree
                collections.map((col) => {
                    const isExpanded = expandedFolders.has(col.id);
                    const tree = buildTree(col.items);
                    const isEditingCol = editingId === col.id;
                    return (
                        <div key={col.id} className="collection-group">
                            <div
                                className="collection-header"
                                onClick={() => !isEditingCol && toggleFolder(col.id)}
                                onContextMenu={(e) => handleContextMenu(e, undefined, col)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverId(col.id); setDropPosition('inside'); }}
                                onDragLeave={() => { setDragOverId(null); setDropPosition(null); }}
                                onDrop={(e) => handleDropOnCollection(e, col.id, tree)}
                            >
                                <span className="collection-icon">{isExpanded ? '▾' : '▸'}</span>
                                <span className="collection-icon">📦</span>
                                {isEditingCol ? (
                                    <input
                                        ref={renameInputRef}
                                        className="collection-rename-input"
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') commitRename();
                                            if (e.key === 'Escape') cancelRename();
                                        }}
                                        onBlur={() => commitRename()}
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className="collection-header-name"
                                        onDoubleClick={(e) => { e.stopPropagation(); startRename(col.id, col.name, col.id); }}
                                    >
                                        {col.name}
                                    </span>
                                )}
                                <div className="collection-item-actions">
                                    {onRunCollection && (
                                        <button className="collection-play-btn" onClick={(e) => { e.stopPropagation(); onRunCollection(col.id); }} title={t('collection.runCollection')}>▶</button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleAddRequest(col.id, null); }} title={t('collection.addRequest')}>+R</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleAddFolder(col.id, null); }} title={t('collection.addFolder')}>+F</button>
                                    <button onClick={(e) => { e.stopPropagation(); startRename(col.id, col.name, col.id); }} title={t('common.rename', { defaultValue: 'Rename' })}>✎</button>
                                    <button onClick={(e) => { e.stopPropagation(); duplicateCollection(col.id); }} title={t('collection.duplicate')}>⧉</button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }} title={t('common.delete')}>×</button>
                                </div>
                            </div>
                            {isExpanded && tree.map(item => renderItem(item, 0, tree))}
                        </div>
                    );
                })
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="collection-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={() => setContextMenu(null)}
                >
                    {contextMenu.item && (
                        <>
                            <div className="collection-context-menu-item"
                                onClick={() => startRename(contextMenu.item!.id, contextMenu.item!.name)}>
                                ✎ {t('common.rename', { defaultValue: 'Rename' })}
                            </div>
                            {contextMenu.item.type === 'folder' && (
                                <>
                                    <div className="collection-context-menu-item"
                                        onClick={() => handleAddRequest(contextMenu.item!.collectionId, contextMenu.item!.id)}>
                                        + {t('collection.addRequest', { defaultValue: 'Add Request' })}
                                    </div>
                                    <div className="collection-context-menu-item"
                                        onClick={() => handleAddFolder(contextMenu.item!.collectionId, contextMenu.item!.id)}>
                                        + {t('collection.addFolder', { defaultValue: 'Add Folder' })}
                                    </div>
                                    {onRunFolder && (
                                        <div className="collection-context-menu-item"
                                            onClick={() => onRunFolder(contextMenu.item!.collectionId, contextMenu.item!.id, contextMenu.item!.name)}>
                                            ▶ {t('collection.runFolder', { defaultValue: 'Run Folder' })}
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="collection-context-menu-divider" />
                            <div className="collection-context-menu-item danger"
                                onClick={() => deleteItem(contextMenu.item!.id)}>
                                × {t('common.delete', { defaultValue: 'Delete' })}
                            </div>
                        </>
                    )}
                    {contextMenu.collection && !contextMenu.item && (
                        <>
                            <div className="collection-context-menu-item"
                                onClick={() => startRename(contextMenu.collection!.id, contextMenu.collection!.name, contextMenu.collection!.id)}>
                                ✎ {t('common.rename', { defaultValue: 'Rename' })}
                            </div>
                            <div className="collection-context-menu-item"
                                onClick={() => handleAddRequest(contextMenu.collection!.id, null)}>
                                + {t('collection.addRequest', { defaultValue: 'Add Request' })}
                            </div>
                            <div className="collection-context-menu-item"
                                onClick={() => handleAddFolder(contextMenu.collection!.id, null)}>
                                + {t('collection.addFolder', { defaultValue: 'Add Folder' })}
                            </div>
                            <div className="collection-context-menu-item"
                                onClick={() => duplicateCollection(contextMenu.collection!.id)}>
                                ⧉ {t('collection.duplicate', { defaultValue: 'Duplicate' })}
                            </div>
                            {onRunCollection && (
                                <div className="collection-context-menu-item"
                                    onClick={() => onRunCollection(contextMenu.collection!.id)}>
                                    ▶ {t('collection.runCollection', { defaultValue: 'Run Collection' })}
                                </div>
                            )}
                            <div className="collection-context-menu-divider" />
                            <div className="collection-context-menu-item danger"
                                onClick={() => deleteCollection(contextMenu.collection!.id)}>
                                × {t('common.delete', { defaultValue: 'Delete' })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
