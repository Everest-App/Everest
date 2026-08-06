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

    // Deep Interface: Centralized tab & request mutation engine
    updateActiveTab: (patch: Partial<Omit<Tab, 'id' | 'request'>>) => void;
    updateActiveRequest: (patch: Partial<RequestConfig> | ((prev: RequestConfig) => Partial<RequestConfig>)) => void;

    // Convenience delegates wrapping updateActiveRequest
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

        // ── Deep Core Mutation Engine ──

        updateActiveTab: (patch) => {
            set((state) => ({
                tabs: state.tabs.map((t) =>
                    t.id === state.activeTabId ? { ...t, ...patch } : t
                ),
            }));
        },

        updateActiveRequest: (patchArg) => {
            set((state) => {
                const activeIdx = state.tabs.findIndex((t) => t.id === state.activeTabId);
                if (activeIdx === -1) return state;

                const currentTab = state.tabs[activeIdx];
                const patch = typeof patchArg === 'function' ? patchArg(currentTab.request) : patchArg;
                const updatedRequest = { ...currentTab.request, ...patch };

                const newTitle = patch.method || patch.url !== undefined
                    ? `${updatedRequest.method} ${updatedRequest.url || 'New Request'}`
                    : currentTab.title;

                const updatedTab = {
                    ...currentTab,
                    request: updatedRequest,
                    title: newTitle,
                };

                const newTabs = [...state.tabs];
                newTabs[activeIdx] = updatedTab;

                return { tabs: newTabs };
            });
        },

        // ── Delegates ──

        updateMethod: (method) => get().updateActiveRequest({ method }),

        updateUrl: (url) => {
            if (_syncSource === 'params') {
                get().updateActiveRequest({ url });
                return;
            }

            _syncSource = 'url';
            try {
                const { baseUrl, params: parsedParams } = parseUrlParams(url);
                const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
                if (!activeTab) return;

                let newParams = mergeParamsFromUrl(activeTab.request.params, parsedParams);
                const hasEmptyRow = newParams.some((p) => !p.key && !p.value);
                if (!hasEmptyRow) {
                    newParams = [...newParams, { id: uuidv4(), key: '', value: '', enabled: true }];
                }

                get().updateActiveRequest({ url, params: newParams });
            } finally {
                _syncSource = null;
            }
        },

        updateParams: (params) => {
            if (_syncSource === 'url') {
                get().updateActiveRequest({ params });
                return;
            }

            _syncSource = 'params';
            try {
                const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
                if (!activeTab) return;

                const baseUrl = getBaseUrl(activeTab.request.url);
                const newUrl = buildUrlFromParams(baseUrl, params);

                get().updateActiveRequest({ params, url: newUrl });
            } finally {
                _syncSource = null;
            }
        },

        updateHeaders: (headers) => get().updateActiveRequest({ headers }),

        updateBodyType: (type) =>
            get().updateActiveRequest((req) => ({
                body: { ...req.body, type },
            })),

        updateBodyRaw: (raw) =>
            get().updateActiveRequest((req) => ({
                body: { ...req.body, raw },
            })),

        updateBodyFormData: (formData) =>
            get().updateActiveRequest((req) => ({
                body: { ...req.body, formData },
            })),

        updateBodyUrlencoded: (urlencoded) =>
            get().updateActiveRequest((req) => ({
                body: { ...req.body, urlencoded },
            })),

        updateAuthType: (type) =>
            get().updateActiveRequest((req) => ({
                auth: { ...req.auth, type },
            })),

        updateAuth: (auth) => get().updateActiveRequest({ auth }),

        updatePreRequestScript: (script) => get().updateActiveRequest({ preRequestScript: script }),

        updateTestScript: (script) => get().updateActiveRequest({ testScript: script }),

        setLoading: (loading) => get().updateActiveTab({ loading }),

        setResponse: (response) => get().updateActiveTab({ response }),

        setScriptResults: (scriptResults) => get().updateActiveTab({ scriptResults }),

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
