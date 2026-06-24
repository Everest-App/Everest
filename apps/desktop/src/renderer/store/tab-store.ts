import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
    Tab,
    RequestConfig,
    ResponseData,
    ScriptResult,
    HttpMethod,
    BodyType,
    AuthType,
} from '@api-platform/core';
import { parseUrlParams, buildUrlFromParams, mergeParamsFromUrl, getBaseUrl, normalizeRequestParams } from '../utils/url-params-sync';

function createDefaultRequest(): RequestConfig {
    return {
        id: uuidv4(),
        method: 'GET',
        url: '',
        params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
        headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
        body: {
            type: 'none',
            raw: '',
            formData: [{ id: uuidv4(), key: '', value: '', enabled: true }],
            urlencoded: [{ id: uuidv4(), key: '', value: '', enabled: true }],
        },
        auth: { type: 'none' },
    };
}

function createNewTab(): Tab {
    return {
        id: uuidv4(),
        title: 'New Request',
        request: createDefaultRequest(),
        response: null,
        loading: false,
    };
}

// Sync source flag to prevent infinite loops
type SyncSource = 'url' | 'params' | null;
let _syncSource: SyncSource = null;

interface TabStore {
    tabs: Tab[];
    activeTabId: string;

    addTab: () => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;

    updateMethod: (method: HttpMethod) => void;
    updateUrl: (url: string) => void;
    updateParams: (params: RequestConfig['params']) => void;
    updateHeaders: (headers: RequestConfig['headers']) => void;
    updateBodyType: (type: BodyType) => void;
    updateBodyRaw: (raw: string) => void;
    updateBodyFormData: (formData: RequestConfig['body']['formData']) => void;
    updateBodyUrlencoded: (urlencoded: RequestConfig['body']['urlencoded']) => void;
    updateAuthType: (type: AuthType) => void;
    updateAuth: (auth: RequestConfig['auth']) => void;
    updatePreRequestScript: (script: string) => void;
    updateTestScript: (script: string) => void;

    setLoading: (loading: boolean) => void;
    setResponse: (response: ResponseData | null) => void;
    setScriptResults: (scriptResults: { preRequest?: ScriptResult; test?: ScriptResult } | undefined) => void;

    loadRequest: (request: RequestConfig, name?: string, collectionId?: string, itemId?: string) => void;
    markAsSaved: (tabId: string, collectionId: string, itemId: string) => void;
}

export const useTabStore = create<TabStore>((set, get) => {
    const initialTab = createNewTab();

    return {
        tabs: [initialTab],
        activeTabId: initialTab.id,

        addTab: () => {
            const newTab = createNewTab();
            set((state) => ({
                tabs: [...state.tabs, newTab],
                activeTabId: newTab.id,
            }));
        },

        removeTab: (id: string) => {
            const { tabs, activeTabId } = get();
            if (tabs.length <= 1) return; // Keep at least one tab

            const idx = tabs.findIndex((t) => t.id === id);
            const newTabs = tabs.filter((t) => t.id !== id);

            let newActiveId = activeTabId;
            if (activeTabId === id) {
                newActiveId = newTabs[Math.min(idx, newTabs.length - 1)].id;
            }

            set({ tabs: newTabs, activeTabId: newActiveId });
        },

        setActiveTab: (id: string) => set({ activeTabId: id }),

        updateMethod: (method) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, method }, title: `${method} ${t.request.url || 'New Request'}` }
                        : t
                ),
            })),

        updateUrl: (url) => {
            // If this update was triggered by params sync, just update the URL
            if (_syncSource === 'params') {
                set((state) => ({
                    tabs: state.tabs.map((t) =>
                        t.id === state.activeTabId
                            ? { ...t, request: { ...t.request, url }, title: `${t.request.method} ${url || 'New Request'}` }
                            : t
                    ),
                }));
                return;
            }

            // URL → Params sync
            _syncSource = 'url';
            try {
                const { baseUrl, params: parsedParams } = parseUrlParams(url);

                set((state) => {
                    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
                    if (!activeTab) return state;

                    // Merge parsed params with existing ones (preserve disabled params)
                    let newParams = mergeParamsFromUrl(activeTab.request.params, parsedParams);

                    // Always keep at least one empty row
                    const hasEmptyRow = newParams.some(p => !p.key && !p.value);
                    if (!hasEmptyRow) {
                        newParams = [...newParams, { id: uuidv4(), key: '', value: '', enabled: true }];
                    }

                    return {
                        tabs: state.tabs.map((t) =>
                            t.id === state.activeTabId
                                ? {
                                    ...t,
                                    request: { ...t.request, url, params: newParams },
                                    title: `${t.request.method} ${url || 'New Request'}`,
                                }
                                : t
                        ),
                    };
                });
            } finally {
                _syncSource = null;
            }
        },

        updateParams: (params) => {
            // If this update was triggered by URL sync, just update the params
            if (_syncSource === 'url') {
                set((state) => ({
                    tabs: state.tabs.map((t) =>
                        t.id === state.activeTabId ? { ...t, request: { ...t.request, params } } : t
                    ),
                }));
                return;
            }

            // Params → URL sync
            _syncSource = 'params';
            try {
                set((state) => {
                    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
                    if (!activeTab) return state;

                    const baseUrl = getBaseUrl(activeTab.request.url);
                    const newUrl = buildUrlFromParams(baseUrl, params);

                    return {
                        tabs: state.tabs.map((t) =>
                            t.id === state.activeTabId
                                ? {
                                    ...t,
                                    request: { ...t.request, params, url: newUrl },
                                    title: `${t.request.method} ${newUrl || 'New Request'}`,
                                }
                                : t
                        ),
                    };
                });
            } finally {
                _syncSource = null;
            }
        },

        updateHeaders: (headers) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, request: { ...t.request, headers } } : t
                ),
            })),

        updateBodyType: (type) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, body: { ...t.request.body, type } } }
                        : t
                ),
            })),

        updateBodyRaw: (raw) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, body: { ...t.request.body, raw } } }
                        : t
                ),
            })),

        updateBodyFormData: (formData) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, body: { ...t.request.body, formData } } }
                        : t
                ),
            })),

        updateBodyUrlencoded: (urlencoded) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, body: { ...t.request.body, urlencoded } } }
                        : t
                ),
            })),

        updateAuthType: (type) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId
                        ? { ...t, request: { ...t.request, auth: { ...t.request.auth, type } } }
                        : t
                ),
            })),

        updateAuth: (auth) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, request: { ...t.request, auth } } : t
                ),
            })),

        updatePreRequestScript: (script) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, request: { ...t.request, preRequestScript: script } } : t
                ),
            })),

        updateTestScript: (script) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, request: { ...t.request, testScript: script } } : t
                ),
            })),

        setLoading: (loading) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, loading } : t
                ),
            })),

        setResponse: (response) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, response } : t
                ),
            })),

        setScriptResults: (scriptResults) =>
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, scriptResults } : t
                ),
            })),

        loadRequest: (request, name, collectionId, itemId) => {
            const { tabs } = get();
            // Check if a tab with this request ID already exists
            const existing = tabs.find(t => t.request.id === request.id);
            if (existing) {
                // Focus existing tab instead of creating duplicate
                set({ activeTabId: existing.id });
                return;
            }

            const newTab = createNewTab();
            // Normalize: extract any query params from URL into the params array.
            // This is the safety net for all import paths (cURL, Postman, collection open).
            const normalized = normalizeRequestParams(request);
            // IMPORTANT: preserve the original request.id so dedup check
            // can find this tab if the same request is opened again
            newTab.request = { ...normalized };
            newTab.title = name || `${normalized.method} ${normalized.url || 'New Request'}`;

            // Track saved state if this request came from a collection
            if (collectionId && itemId) {
                newTab.savedToCollection = { collectionId, itemId };
            }

            set((state) => ({
                tabs: [...state.tabs, newTab],
                activeTabId: newTab.id,
            }));
        },

        markAsSaved: (tabId, collectionId, itemId) => {
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === tabId
                        ? { ...t, savedToCollection: { collectionId, itemId } }
                        : t
                ),
            }));
        },
    };
});
