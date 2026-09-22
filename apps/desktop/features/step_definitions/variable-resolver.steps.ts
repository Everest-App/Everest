import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { RuntimeVariableResolver } from '../../src/main/runtime/variable-resolver';
import { EnvironmentManager } from '../../src/main/runtime/environment-manager';
import { CollectionVariableManager } from '../../src/main/runtime/collection-variable-manager';
import { IterationDataManager } from '../../src/main/runtime/iteration-data-manager';

Given('یک محیط با متغیر {string} و مقدار {string} فعال است', function (key: string, value: string) {
    const envManager = new EnvironmentManager();
    envManager.set(key, value);
    
    const collectionManager = new CollectionVariableManager();
    const dataManager = new IterationDataManager();
    
    this.resolver = new RuntimeVariableResolver(envManager, collectionManager, dataManager);
});

When('که رشته {string} را ارزیابی می‌کنم', function (input: string) {
    this.result = this.resolver.getCoreResolver().replaceIn(input);
});

Then('نتیجه باید {string} باشد', function (expected: string) {
    assert.strictEqual(this.result, expected);
});

Given('متغیر {string} مقدار {string} دارد', function (key: string, value: string) {
    if (!this.resolver) {
        const envManager = new EnvironmentManager();
        const collectionManager = new CollectionVariableManager();
        const dataManager = new IterationDataManager();
        this.resolver = new RuntimeVariableResolver(envManager, collectionManager, dataManager);
    }
    this.resolver.applyMutations({
        local: [{ operation: 'set', key, value }]
    });
});
