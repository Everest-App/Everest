import { Before, After } from '@cucumber/cucumber';
import { initTestDb, getTestDb } from './db-mock';

Before(async function () {
    // Initialize a fresh in-memory database for each scenario
    await initTestDb();
});

After(async function () {
    // Clean up
    try {
        const db = getTestDb();
        db.close();
    } catch (e) {
        // ignore if not initialized
    }
});
