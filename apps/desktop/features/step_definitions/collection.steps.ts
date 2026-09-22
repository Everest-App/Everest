import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { createCollection, getAllCollections, getCollectionById, deleteCollection } from '../../src/main/services/collection-service';
import { Collection } from '@everest/core';

Given('سیستم در حالت اولیه است', function () {
    // DB is initialized before each scenario via hooks, so it's clean
    assert.strictEqual(getAllCollections().length, 0);
});

When('که یک کالکشن جدید با نام {string} ایجاد می‌کنم', function (name: string) {
    const collection = createCollection(name);
    this.result = collection;
});

Then('یک کالکشن با نام {string} باید در سیستم وجود داشته باشد', function (name: string) {
    const collections = getAllCollections();
    const found = collections.find(c => c.name === name);
    assert.ok(found, `کالکشن با نام ${name} پیدا نشد`);
});

Given('یک کالکشن با نام {string} در سیستم وجود دارد', function (name: string) {
    this.result = createCollection(name);
});

When('که کالکشن را با شناسه آن دریافت می‌کنم', function () {
    const collectionId = this.result.id;
    this.result = getCollectionById(collectionId);
});

Then('نام کالکشن دریافت شده باید {string} باشد', function (name: string) {
    assert.strictEqual(this.result.name, name);
});

When('که آن کالکشن را حذف می‌کنم', function () {
    const collectionId = this.result.id;
    deleteCollection(collectionId);
});

Then('آن کالکشن نباید در سیستم وجود داشته باشد', function () {
    const collectionId = this.result.id;
    const found = getCollectionById(collectionId);
    assert.strictEqual(found, null);
});
