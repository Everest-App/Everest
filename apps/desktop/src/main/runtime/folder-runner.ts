import { Collection, CollectionItem, RuntimeRunnerConfig } from '@api-platform/core';
import { CollectionRunner, RunnerHooks } from './collection-runner';

/**
 * Utility to run a specific folder within a collection.
 * It builds a virtual collection containing only the target folder
 * while preserving the collection-level scripts.
 */
export function createFolderRunner(
    collection: Collection,
    folderId: string,
    config: RuntimeRunnerConfig,
    hooks?: RunnerHooks
): CollectionRunner {
    const targetFolder = findItem(collection.items, folderId);
    
    if (!targetFolder || targetFolder.type !== 'folder') {
        throw new Error(`Folder with ID ${folderId} not found`);
    }

    // Create a virtual collection that only contains this folder,
    // but keeps the collection-level scripts and variables.
    const virtualCollection: Collection = {
        ...collection,
        items: [targetFolder]
    };

    return new CollectionRunner(virtualCollection, config, hooks);
}

function findItem(items: CollectionItem[], id: string): CollectionItem | undefined {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findItem(item.children, id);
            if (found) return found;
        }
    }
    return undefined;
}
