import { create } from 'zustand';
import { Collection, CollectionItem } from '@everest/core';

interface CollectionStore {
    collections: Collection[];
    loading: boolean;
    expandedFolders: Set<string>;

    fetchCollections: () => Promise<void>;
    createCollection: (name: string, description?: string) => Promise<void>;
    updateCollection: (id: string, name: string, description?: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    duplicateCollection: (id: string) => Promise<void>;

    addItem: (collectionId: string, parentId: string | null, item: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'>) => Promise<void>;
    updateItem: (item: CollectionItem) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    renameItem: (item: CollectionItem, newName: string) => Promise<void>;
    moveItem: (itemId: string, newParentId: string | null, newSortOrder: number) => Promise<void>;
    reorderItems: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>;

    toggleFolder: (id: string) => void;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
    collections: [],
    loading: false,
    expandedFolders: new Set<string>(),

    fetchCollections: async () => {
        set({ loading: true });
        try {
            const collections = await window.api.getCollections();
            set({ collections, loading: false });
        } catch (error) {
            console.error('Failed to fetch collections:', error);
            set({ loading: false });
        }
    },

    createCollection: async (name, description) => {
        try {
            const newCol = await window.api.createCollection(name, description);
            if (newCol) {
                set((state) => ({ collections: [...state.collections, newCol] }));
            } else {
                get().fetchCollections();
            }
        } catch (error) {
            console.error('Failed to create collection:', error);
        }
    },

    updateCollection: async (id, name, description) => {
        // Optimistic update
        set((state) => ({
            collections: state.collections.map((col) =>
                col.id === id ? { ...col, name, description: description ?? col.description } : col
            ),
        }));
        try {
            await window.api.updateCollection(id, name, description);
        } catch (error) {
            console.error('Failed to update collection:', error);
            get().fetchCollections(); // Revert/sync on error
        }
    },

    deleteCollection: async (id) => {
        // Optimistic update
        set((state) => ({
            collections: state.collections.filter((col) => col.id !== id),
        }));
        try {
            await window.api.deleteCollection(id);
        } catch (error) {
            console.error('Failed to delete collection:', error);
            get().fetchCollections();
        }
    },

    duplicateCollection: async (id) => {
        try {
            const duplicated = await window.api.duplicateCollection(id);
            if (duplicated) {
                set((state) => ({ collections: [...state.collections, duplicated] }));
            } else {
                get().fetchCollections();
            }
        } catch (error) {
            console.error('Failed to duplicate collection:', error);
        }
    },

    addItem: async (collectionId, parentId, item) => {
        try {
            const newItem = await window.api.addCollectionItem(collectionId, parentId, item);
            if (newItem) {
                set((state) => ({
                    collections: state.collections.map((col) => {
                        if (col.id !== collectionId) return col;
                        return {
                            ...col,
                            items: insertItemIntoTree(col.items || [], parentId, newItem),
                        };
                    }),
                }));
            } else {
                get().fetchCollections();
            }
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    },

    updateItem: async (item) => {
        // Optimistic update
        set((state) => ({
            collections: state.collections.map((col) => {
                if (col.id !== item.collectionId) return col;
                return {
                    ...col,
                    items: updateItemInTree(col.items || [], item),
                };
            }),
        }));
        try {
            await window.api.updateCollectionItem(item);
        } catch (error) {
            console.error('Failed to update item:', error);
            get().fetchCollections();
        }
    },

    deleteItem: async (id) => {
        // Optimistic update
        set((state) => ({
            collections: state.collections.map((col) => ({
                ...col,
                items: removeItemFromTree(col.items || [], id),
            })),
        }));
        try {
            await window.api.deleteCollectionItem(id);
        } catch (error) {
            console.error('Failed to delete item:', error);
            get().fetchCollections();
        }
    },

    renameItem: async (item, newName) => {
        const updatedItem = { ...item, name: newName };
        get().updateItem(updatedItem);
    },

    moveItem: async (itemId, newParentId, newSortOrder) => {
        try {
            await window.api.moveCollectionItem(itemId, newParentId, newSortOrder);
            // Sync tree once move completes cleanly
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to move item:', error);
        }
    },

    reorderItems: async (items) => {
        try {
            await window.api.reorderCollectionItems(items);
            // Reorder is complex; sync tree
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to reorder items:', error);
        }
    },

    toggleFolder: (id) => {
        set((state) => {
            const next = new Set(state.expandedFolders);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return { expandedFolders: next };
        });
    },
}));

// ─── Helper functions for optimistic tree updates ───

function insertItemIntoTree(items: CollectionItem[], parentId: string | null, newItem: CollectionItem): CollectionItem[] {
    if (!parentId) {
        return [...items, newItem];
    }
    return items.map((item) => {
        if (item.id === parentId) {
            return { ...item, children: [...(item.children || []), newItem] };
        }
        if (item.children && item.children.length > 0) {
            return { ...item, children: insertItemIntoTree(item.children, parentId, newItem) };
        }
        return item;
    });
}

function updateItemInTree(items: CollectionItem[], updatedItem: CollectionItem): CollectionItem[] {
    return items.map((item) => {
        if (item.id === updatedItem.id) {
            return { ...item, ...updatedItem, children: item.children };
        }
        if (item.children && item.children.length > 0) {
            return { ...item, children: updateItemInTree(item.children, updatedItem) };
        }
        return item;
    });
}

function removeItemFromTree(items: CollectionItem[], id: string): CollectionItem[] {
    return items
        .filter((item) => item.id !== id)
        .map((item) => {
            if (item.children && item.children.length > 0) {
                return { ...item, children: removeItemFromTree(item.children, id) };
            }
            return item;
        });
}
