import { create } from 'zustand';
import { Collection, CollectionItem } from '@api-platform/core';

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
            await window.api.createCollection(name, description);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to create collection:', error);
        }
    },

    updateCollection: async (id, name, description) => {
        try {
            await window.api.updateCollection(id, name, description);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to update collection:', error);
        }
    },

    deleteCollection: async (id) => {
        try {
            await window.api.deleteCollection(id);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to delete collection:', error);
        }
    },

    duplicateCollection: async (id) => {
        try {
            await window.api.duplicateCollection(id);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to duplicate collection:', error);
        }
    },

    addItem: async (collectionId, parentId, item) => {
        try {
            await window.api.addCollectionItem(collectionId, parentId, item);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    },

    updateItem: async (item) => {
        try {
            await window.api.updateCollectionItem(item);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    },

    deleteItem: async (id) => {
        try {
            await window.api.deleteCollectionItem(id);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    },

    renameItem: async (item, newName) => {
        try {
            await window.api.updateCollectionItem({ ...item, name: newName });
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to rename item:', error);
        }
    },

    moveItem: async (itemId, newParentId, newSortOrder) => {
        try {
            await window.api.moveCollectionItem(itemId, newParentId, newSortOrder);
            get().fetchCollections();
        } catch (error) {
            console.error('Failed to move item:', error);
        }
    },

    reorderItems: async (items) => {
        try {
            await window.api.reorderCollectionItems(items);
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
