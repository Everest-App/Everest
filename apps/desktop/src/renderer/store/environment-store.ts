import { create } from 'zustand';
import { Environment, Variable } from '@api-platform/core';

interface EnvironmentStore {
    environments: Environment[];
    activeEnvironmentId: string | null;
    globalVariables: Variable[];
    loading: boolean;

    fetchEnvironments: () => Promise<void>;
    createEnvironment: (name: string) => Promise<void>;
    updateEnvironment: (env: Environment) => Promise<void>;
    deleteEnvironment: (id: string) => Promise<void>;
    setActiveEnvironment: (id: string | null) => void;

    fetchGlobalVariables: () => Promise<void>;
    setGlobalVariables: (vars: Variable[]) => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
    environments: [],
    activeEnvironmentId: null,
    globalVariables: [],
    loading: false,

    fetchEnvironments: async () => {
        set({ loading: true });
        try {
            const environments = await window.api.getEnvironments();
            set({ environments, loading: false });
        } catch (error) {
            console.error('Failed to fetch environments:', error);
            set({ loading: false });
        }
    },

    createEnvironment: async (name) => {
        try {
            await window.api.createEnvironment(name);
            get().fetchEnvironments();
        } catch (error) {
            console.error('Failed to create environment:', error);
        }
    },

    updateEnvironment: async (env) => {
        try {
            await window.api.updateEnvironment(env);
            get().fetchEnvironments();
        } catch (error) {
            console.error('Failed to update environment:', error);
        }
    },

    deleteEnvironment: async (id) => {
        try {
            await window.api.deleteEnvironment(id);
            const { activeEnvironmentId } = get();
            if (activeEnvironmentId === id) {
                set({ activeEnvironmentId: null });
            }
            get().fetchEnvironments();
        } catch (error) {
            console.error('Failed to delete environment:', error);
        }
    },

    setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

    fetchGlobalVariables: async () => {
        try {
            const globalVariables = await window.api.getGlobalVariables();
            set({ globalVariables });
        } catch (error) {
            console.error('Failed to fetch global variables:', error);
        }
    },

    setGlobalVariables: async (vars) => {
        try {
            await window.api.setGlobalVariables(vars);
            set({ globalVariables: vars });
        } catch (error) {
            console.error('Failed to set global variables:', error);
        }
    },
}));
