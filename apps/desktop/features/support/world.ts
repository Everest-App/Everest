import { setWorldConstructor, World } from '@cucumber/cucumber';
import { Database } from 'sql.js';
import { getTestDb } from './db-mock';

export class CustomWorld extends World {
    // Shared state between steps
    public result: any;
    public error: any;
    
    constructor(options: any) {
        super(options);
    }

    get db(): Database {
        return getTestDb();
    }
}

setWorldConstructor(CustomWorld);
