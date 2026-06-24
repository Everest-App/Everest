"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractScriptsFromEvents = extractScriptsFromEvents;
exports.mergeScripts = mergeScripts;
exports.scriptToExecArray = scriptToExecArray;
exports.buildPostmanEvents = buildPostmanEvents;
function extractScriptsFromEvents(events) {
    const result = {
        preRequestScript: '',
        testScript: '',
    };
    if (!events || !Array.isArray(events))
        return result;
    const preRequestParts = [];
    const testParts = [];
    for (const event of events) {
        if (!event || typeof event !== 'object')
            continue;
        const listen = event.listen;
        const exec = event.script?.exec;
        let scriptText = '';
        if (Array.isArray(exec)) {
            scriptText = exec.filter((line) => line != null).join('\n');
        }
        else if (typeof exec === 'string') {
            scriptText = exec;
        }
        if (!scriptText)
            continue;
        if (listen === 'prerequest') {
            preRequestParts.push(scriptText);
        }
        else if (listen === 'test') {
            testParts.push(scriptText);
        }
    }
    result.preRequestScript = preRequestParts.join('\n\n');
    result.testScript = testParts.join('\n\n');
    return result;
}
function mergeScripts(...scripts) {
    return scripts
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .join('\n\n');
}
function scriptToExecArray(script) {
    if (!script)
        return [];
    return script.split('\n');
}
function buildPostmanEvents(preRequestScript, testScript) {
    const events = [];
    if (preRequestScript && preRequestScript.trim()) {
        events.push({
            listen: 'prerequest',
            script: {
                type: 'text/javascript',
                exec: scriptToExecArray(preRequestScript),
            },
        });
    }
    if (testScript && testScript.trim()) {
        events.push({
            listen: 'test',
            script: {
                type: 'text/javascript',
                exec: scriptToExecArray(testScript),
            },
        });
    }
    return events.length > 0 ? events : undefined;
}
