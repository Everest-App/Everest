import { VariableScopeMap, VariableMutations } from '@api-platform/core';
import { VariableResolver as CoreVariableResolver } from '@api-platform/core';
import { EnvironmentManager } from './environment-manager';
import { CollectionVariableManager } from './collection-variable-manager';
import { IterationDataManager } from './iteration-data-manager';

export class RuntimeVariableResolver {
    private coreResolver: CoreVariableResolver;
    
    // We keep a local-only scope that gets reset per request or run depending on config
    private localScope: Record<string, any> = {};

    constructor(
        private environmentManager: EnvironmentManager,
        private collectionVariableManager: CollectionVariableManager,
        private iterationDataManager: IterationDataManager,
        private globalScope: Record<string, string> = {}
    ) {
        this.coreResolver = new CoreVariableResolver(this.getCurrentScopes());
    }

    public getCoreResolver(): CoreVariableResolver {
        return this.coreResolver;
    }

    public getCurrentScopes(): VariableScopeMap {
        return {
            local: this.localScope,
            data: this.iterationDataManager.getCurrentRow(),
            environment: this.environmentManager.getVariables(),
            collection: this.collectionVariableManager.getVariables(),
            global: this.globalScope
        };
    }

    public applyMutations(mutations: VariableMutations) {
        // Apply local mutations
        for (const mut of mutations.local || []) {
            if (mut.operation === 'set') this.localScope[mut.key] = mut.value;
            else if (mut.operation === 'unset') delete this.localScope[mut.key];
        }

        // Apply environment mutations
        for (const mut of mutations.environment || []) {
            if (mut.operation === 'set') this.environmentManager.set(mut.key, String(mut.value));
            else if (mut.operation === 'unset') this.environmentManager.unset(mut.key);
        }

        // Apply collection mutations
        for (const mut of mutations.collection || []) {
            if (mut.operation === 'set') this.collectionVariableManager.set(mut.key, String(mut.value));
            else if (mut.operation === 'unset') this.collectionVariableManager.unset(mut.key);
        }

        // Apply global mutations
        for (const mut of mutations.global || []) {
            if (mut.operation === 'set') this.globalScope[mut.key] = String(mut.value);
            else if (mut.operation === 'unset') delete this.globalScope[mut.key];
        }

        // Refresh core resolver with new scopes
        this.coreResolver = new CoreVariableResolver(this.getCurrentScopes());
    }

    public clearLocalScope() {
        this.localScope = {};
        this.coreResolver = new CoreVariableResolver(this.getCurrentScopes());
    }

    public syncScopes() {
        this.coreResolver = new CoreVariableResolver(this.getCurrentScopes());
    }
}
