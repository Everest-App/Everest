import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@api-platform/core';
import { CollectionItem } from '@api-platform/core';
import {
    getAllCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    duplicateCollection,
    addCollectionItem,
    updateCollectionItem,
    deleteCollectionItem,
    moveCollectionItem,
    reorderCollectionItems,
} from '../services/collection-service';

export function registerCollectionHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_GET_ALL, async () => {
        return getAllCollections();
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_CREATE, async (_event, name: string, description?: string) => {
        return createCollection(name, description);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_UPDATE, async (_event, id: string, name: string, description?: string) => {
        updateCollection(id, name, description);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DELETE, async (_event, id: string) => {
        deleteCollection(id);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DUPLICATE, async (_event, id: string) => {
        return duplicateCollection(id);
    });

    ipcMain.handle(
        IPC_CHANNELS.COLLECTIONS_ADD_ITEM,
        async (_event, collectionId: string, parentId: string | null, item: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'>) => {
            return addCollectionItem(collectionId, parentId, item);
        }
    );

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_UPDATE_ITEM, async (_event, item: CollectionItem) => {
        updateCollectionItem(item);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_DELETE_ITEM, async (_event, id: string) => {
        deleteCollectionItem(id);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_MOVE_ITEM, async (_event, itemId: string, newParentId: string | null, newSortOrder: number) => {
        moveCollectionItem(itemId, newParentId, newSortOrder);
    });

    ipcMain.handle(IPC_CHANNELS.COLLECTIONS_REORDER, async (_event, items: Array<{ id: string; sortOrder: number }>) => {
        reorderCollectionItems(items);
    });
}
