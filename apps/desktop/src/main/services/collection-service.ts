import { randomUUID as uuidv4 } from 'crypto';
import { getDb, markDirty, saveDatabase } from '../storage/database';
import { Collection, CollectionItem, RequestConfig, Variable } from '@everest/core';

// ─── Collections CRUD ────────────────────────────────────────────

export function getAllCollections(): Collection[] {
    const db = getDb();
    const colResult = db.exec('SELECT id, name, description, variables_json, created_at, updated_at, pre_request_script, test_script FROM collections ORDER BY name');

    if (colResult.length === 0) return [];

    // Single query for ALL items across all collections (eliminates N+1)
    const itemResult = db.exec(
        'SELECT id, collection_id, parent_id, name, type, sort_order, request_json, pre_request_script, test_script FROM collection_items ORDER BY sort_order'
    );

    // Group items by collection_id in memory
    const itemsByCollection = new Map<string, CollectionItem[]>();
    if (itemResult.length > 0) {
        for (const row of itemResult[0].values) {
            const colId = row[1] as string;
            if (!itemsByCollection.has(colId)) itemsByCollection.set(colId, []);
            itemsByCollection.get(colId)!.push({
                id: row[0] as string,
                collectionId: colId,
                parentId: row[2] as string | null,
                name: row[3] as string,
                type: row[4] as 'folder' | 'request',
                sortOrder: row[5] as number,
                request: row[6] ? JSON.parse(row[6] as string) : undefined,
                preRequestScript: (row[7] as string) || '',
                testScript: (row[8] as string) || '',
            });
        }
    }

    return colResult[0].values.map((row: any[]) => {
        const collectionId = row[0] as string;
        return {
            id: collectionId,
            name: row[1] as string,
            description: (row[2] as string) || '',
            variables: JSON.parse((row[3] as string) || '[]'),
            createdAt: row[4] as number,
            updatedAt: row[5] as number,
            preRequestScript: (row[6] as string) || '',
            testScript: (row[7] as string) || '',
            items: buildItemTree(itemsByCollection.get(collectionId) || []),
        };
    });
}

/**
 * Get a single collection by ID with its items structured as a tree.
 * Returns null if not found.
 */
export function getCollectionById(collectionId: string): Collection | null {
    const db = getDb();
    const result = db.exec(
        'SELECT id, name, description, variables_json, created_at, updated_at, pre_request_script, test_script FROM collections WHERE id = ?',
        [collectionId]
    );

    if (result.length === 0 || result[0].values.length === 0) return null;

    const row = result[0].values[0] as any[];
    const flatItems = getCollectionItems(collectionId);
    const treeItems = buildItemTree(flatItems);

    return {
        id: row[0] as string,
        name: row[1] as string,
        description: (row[2] as string) || '',
        variables: JSON.parse((row[3] as string) || '[]'),
        createdAt: row[4] as number,
        updatedAt: row[5] as number,
        preRequestScript: (row[6] as string) || '',
        testScript: (row[7] as string) || '',
        items: treeItems,
    };
}

export function createCollection(name: string, description?: string, preRequestScript?: string, testScript?: string): Collection {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    db.run(
        'INSERT INTO collections (id, name, description, variables_json, created_at, updated_at, pre_request_script, test_script) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || '', '[]', now, now, preRequestScript || '', testScript || '']
    );

    markDirty();

    return {
        id,
        name,
        description: description || '',
        variables: [],
        preRequestScript: preRequestScript || '',
        testScript: testScript || '',
        createdAt: now,
        updatedAt: now,
        items: [],
    };
}

export function updateCollection(id: string, name: string, description?: string): void {
    const db = getDb();
    db.run(
        'UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [name, description || '', Date.now(), id]
    );
    markDirty();
}

export function deleteCollection(id: string): void {
    const db = getDb();
    db.run('DELETE FROM collection_items WHERE collection_id = ?', [id]);
    db.run('DELETE FROM collections WHERE id = ?', [id]);
    markDirty();
}

export function duplicateCollection(id: string): Collection {
    const original = getAllCollections().find(c => c.id === id);
    if (!original) throw new Error(`Collection ${id} not found`);

    const newCollection = createCollection(`${original.name} (Copy)`, original.description, original.preRequestScript, original.testScript);

    // Deep-copy items with new IDs
    const idMap = new Map<string, string>();

    function copyItems(items: CollectionItem[], newParentId: string | null) {
        for (const item of items) {
            const newId = uuidv4();
            idMap.set(item.id, newId);

            addCollectionItem(newCollection.id, newParentId, {
                name: item.name,
                type: item.type,
                parentId: newParentId,
                request: item.request,
                preRequestScript: item.preRequestScript,
                testScript: item.testScript,
            });

            if (item.children && item.children.length > 0) {
                // Use the newly created item's ID (last inserted)
                copyItems(item.children, newId);
            }
        }
    }

    // Build tree from flat items, then copy
    const tree = buildItemTree(original.items);
    copyItems(tree, null);

    return {
        ...newCollection,
        items: getCollectionItems(newCollection.id),
    };
}

// ─── Collection Items CRUD ───────────────────────────────────────

export function addCollectionItem(
    collectionId: string,
    parentId: string | null,
    item: Omit<CollectionItem, 'id' | 'collectionId' | 'sortOrder'>
): CollectionItem {
    const db = getDb();
    const id = uuidv4();

    // Get max sort order for siblings
    const sortResult = db.exec(
        'SELECT COALESCE(MAX(sort_order), -1) FROM collection_items WHERE collection_id = ? AND parent_id IS ?',
        [collectionId, parentId ?? null]
    );
    const maxSort = sortResult.length > 0 ? (sortResult[0].values[0][0] as number) : -1;

    const newItem: CollectionItem = {
        id,
        collectionId,
        parentId: parentId,
        name: item.name,
        type: item.type,
        sortOrder: maxSort + 1,
        request: item.request,
        preRequestScript: item.preRequestScript,
        testScript: item.testScript,
    };

    db.run(
        'INSERT INTO collection_items (id, collection_id, parent_id, name, type, sort_order, request_json, pre_request_script, test_script) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, collectionId, parentId, item.name, item.type, newItem.sortOrder, item.request ? JSON.stringify(item.request) : null, item.preRequestScript || '', item.testScript || '']
    );

    // Update collection timestamp
    db.run('UPDATE collections SET updated_at = ? WHERE id = ?', [Date.now(), collectionId]);
    markDirty();

    return newItem;
}

export function updateCollectionItem(item: CollectionItem): void {
    const db = getDb();
    db.run(
        'UPDATE collection_items SET name = ?, parent_id = ?, sort_order = ?, request_json = ?, pre_request_script = ?, test_script = ? WHERE id = ?',
        [item.name, item.parentId, item.sortOrder, item.request ? JSON.stringify(item.request) : null, item.preRequestScript || '', item.testScript || '', item.id]
    );
    db.run('UPDATE collections SET updated_at = ? WHERE id = ?', [Date.now(), item.collectionId]);
    markDirty();
}

export function deleteCollectionItem(id: string): void {
    const db = getDb();
    // Also delete all children recursively
    deleteItemAndChildren(db, id);
    markDirty();
}

function deleteItemAndChildren(db: any, id: string): void {
    // Find children
    const children = db.exec('SELECT id FROM collection_items WHERE parent_id = ?', [id]);
    if (children.length > 0) {
        for (const childRow of children[0].values) {
            deleteItemAndChildren(db, childRow[0] as string);
        }
    }
    db.run('DELETE FROM collection_items WHERE id = ?', [id]);
}

/**
 * Move a collection item to a new parent and/or sort order.
 * Prevents circular references (moving a folder into its own descendant).
 */
export function moveCollectionItem(itemId: string, newParentId: string | null, newSortOrder: number): void {
    const db = getDb();

    // Get the item's collection_id
    const itemResult = db.exec('SELECT collection_id, parent_id FROM collection_items WHERE id = ?', [itemId]);
    if (itemResult.length === 0 || itemResult[0].values.length === 0) {
        throw new Error(`Item ${itemId} not found`);
    }
    const collectionId = itemResult[0].values[0][0] as string;

    // Circular reference check: ensure newParentId is not a descendant of itemId
    if (newParentId) {
        const descendants = getDescendantIds(db, itemId);
        if (descendants.has(newParentId)) {
            throw new Error('Cannot move an item into its own descendant');
        }
        if (newParentId === itemId) {
            throw new Error('Cannot move an item into itself');
        }
    }

    // Shift siblings at the destination to make room
    db.run(
        'UPDATE collection_items SET sort_order = sort_order + 1 WHERE collection_id = ? AND parent_id IS ? AND sort_order >= ?',
        [collectionId, newParentId ?? null, newSortOrder]
    );

    // Move the item
    db.run(
        'UPDATE collection_items SET parent_id = ?, sort_order = ? WHERE id = ?',
        [newParentId ?? null, newSortOrder, itemId]
    );

    // Re-index old parent's children to remove gaps
    reindexChildren(db, collectionId, itemResult[0].values[0][1] as string | null);

    // Update collection timestamp
    db.run('UPDATE collections SET updated_at = ? WHERE id = ?', [Date.now(), collectionId]);
    markDirty();
}

/**
 * Batch-update sort_order for multiple items (used after drag reorder within a parent).
 */
export function reorderCollectionItems(items: Array<{ id: string; sortOrder: number }>): void {
    const db = getDb();
    let collectionId: string | null = null;

    db.run('BEGIN TRANSACTION');
    try {
        for (const item of items) {
            db.run('UPDATE collection_items SET sort_order = ? WHERE id = ?', [item.sortOrder, item.id]);
            if (!collectionId) {
                const res = db.exec('SELECT collection_id FROM collection_items WHERE id = ?', [item.id]);
                if (res.length > 0 && res[0].values.length > 0) {
                    collectionId = res[0].values[0][0] as string;
                }
            }
        }

        if (collectionId) {
            db.run('UPDATE collections SET updated_at = ? WHERE id = ?', [Date.now(), collectionId]);
        }
        db.run('COMMIT');
    } catch (e) {
        db.run('ROLLBACK');
        throw e;
    }
    markDirty();
}

/** Get all descendant IDs of an item (for circular reference checks). */
function getDescendantIds(db: any, itemId: string): Set<string> {
    const descendants = new Set<string>();
    const stack = [itemId];

    while (stack.length > 0) {
        const current = stack.pop()!;
        const children = db.exec('SELECT id FROM collection_items WHERE parent_id = ?', [current]);
        if (children.length > 0) {
            for (const row of children[0].values) {
                const childId = row[0] as string;
                descendants.add(childId);
                stack.push(childId);
            }
        }
    }

    return descendants;
}

/** Re-index children sort_order to be gap-free (0, 1, 2, ...). */
function reindexChildren(db: any, collectionId: string, parentId: string | null): void {
    const children = db.exec(
        'SELECT id FROM collection_items WHERE collection_id = ? AND parent_id IS ? ORDER BY sort_order',
        [collectionId, parentId ?? null]
    );
    if (children.length > 0) {
        children[0].values.forEach((row: any[], idx: number) => {
            db.run('UPDATE collection_items SET sort_order = ? WHERE id = ?', [idx, row[0]]);
        });
    }
}

// ─── Helpers ─────────────────────────────────────────────────────

function getCollectionItems(collectionId: string): CollectionItem[] {
    const db = getDb();
    const result = db.exec(
        'SELECT id, collection_id, parent_id, name, type, sort_order, request_json, pre_request_script, test_script FROM collection_items WHERE collection_id = ? ORDER BY sort_order',
        [collectionId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        collectionId: row[1] as string,
        parentId: row[2] as string | null,
        name: row[3] as string,
        type: row[4] as 'folder' | 'request',
        sortOrder: row[5] as number,
        request: row[6] ? JSON.parse(row[6] as string) : undefined,
        preRequestScript: (row[7] as string) || '',
        testScript: (row[8] as string) || '',
    }));
}

export function buildItemTree(items: CollectionItem[]): CollectionItem[] {
    const map = new Map<string, CollectionItem>();
    const roots: CollectionItem[] = [];

    for (const item of items) {
        map.set(item.id, { ...item, children: [] });
    }

    for (const item of items) {
        const node = map.get(item.id)!;
        if (item.parentId && map.has(item.parentId)) {
            map.get(item.parentId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

export interface ItemWithAncestors {
    item: CollectionItem;
    collectionId: string;
    collectionPreRequest: string;
    collectionTest: string;
    folderPreRequest: string;
    folderTest: string;
}

/**
 * Fetch a single collection item and all ancestor scripts in a single O(depth) lookup.
 * Replaces O(N*M) full-tree scans during request execution.
 */
export function getItemWithAncestors(itemId: string): ItemWithAncestors | null {
    const db = getDb();

    // 1. Fetch target item
    const itemResult = db.exec(
        'SELECT id, collection_id, parent_id, name, type, sort_order, request_json, pre_request_script, test_script FROM collection_items WHERE id = ?',
        [itemId]
    );

    if (itemResult.length === 0 || itemResult[0].values.length === 0) {
        return null;
    }

    const row = itemResult[0].values[0];
    const collectionId = row[1] as string;
    const parentId = row[2] as string | null;

    const item: CollectionItem = {
        id: row[0] as string,
        collectionId,
        parentId,
        name: row[3] as string,
        type: row[4] as 'folder' | 'request',
        sortOrder: row[5] as number,
        request: row[6] ? JSON.parse(row[6] as string) : undefined,
        preRequestScript: (row[7] as string) || '',
        testScript: (row[8] as string) || '',
    };

    // 2. Fetch collection-level scripts
    let collectionPreRequest = '';
    let collectionTest = '';
    const colResult = db.exec(
        'SELECT pre_request_script, test_script FROM collections WHERE id = ?',
        [collectionId]
    );

    if (colResult.length > 0 && colResult[0].values.length > 0) {
        const colRow = colResult[0].values[0];
        collectionPreRequest = (colRow[0] as string) || '';
        collectionTest = (colRow[1] as string) || '';
    }

    // 3. Collect ancestor folder scripts (from bottom-up then reverse to top-down)
    const folderPreScripts: string[] = [];
    const folderTestScripts: string[] = [];

    let currentParentId = parentId;
    while (currentParentId) {
        const parentResult = db.exec(
            'SELECT parent_id, pre_request_script, test_script FROM collection_items WHERE id = ?',
            [currentParentId]
        );

        if (parentResult.length === 0 || parentResult[0].values.length === 0) {
            break;
        }

        const parentRow = parentResult[0].values[0];
        currentParentId = parentRow[0] as string | null;

        const preScript = (parentRow[1] as string) || '';
        const testScript = (parentRow[2] as string) || '';

        if (preScript) folderPreScripts.unshift(preScript);
        if (testScript) folderTestScripts.unshift(testScript);
    }

    return {
        item,
        collectionId,
        collectionPreRequest,
        collectionTest,
        folderPreRequest: folderPreScripts.join('\n\n'),
        folderTest: folderTestScripts.join('\n\n'),
    };
}

