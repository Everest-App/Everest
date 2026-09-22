import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { createEnvironment, getAllEnvironments, updateEnvironment } from '../../src/main/services/environment-service';
import { Environment } from '@everest/core';

When('که یک محیط جدید با نام {string} ایجاد می‌کنم', function (name: string) {
    this.result = createEnvironment(name);
});

Then('یک محیط با نام {string} باید در سیستم وجود داشته باشد', function (name: string) {
    const environments = getAllEnvironments();
    const found = environments.find(e => e.name === name);
    assert.ok(found, `محیط با نام ${name} پیدا نشد`);
});

Given('یک محیط با نام {string} در سیستم وجود دارد', function (name: string) {
    this.result = createEnvironment(name);
});

When('که متغیری با نام {string} و مقدار {string} به آن اضافه می‌کنم', function (key: string, value: string) {
    const env = this.result;
    env.variables.push({ id: '1', key, value, enabled: true });
    updateEnvironment(env);
});

Then('متغیر {string} با مقدار {string} باید در آن محیط وجود داشته باشد', function (key: string, value: string) {
    const envId = this.result.id;
    const environments = getAllEnvironments();
    const env = environments.find(e => e.id === envId);
    assert.ok(env);
    const v = env.variables.find(v => v.key === key);
    assert.ok(v, `متغیر ${key} پیدا نشد`);
    assert.strictEqual(v.value, value);
});
