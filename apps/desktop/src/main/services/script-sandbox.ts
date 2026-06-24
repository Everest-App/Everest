import { ScriptContext, ScriptResult, RuntimeScriptContext, VariableScopeMap } from '@api-platform/core';
import { ScriptSandbox } from '../runtime/script-engine/sandbox';

const sandbox = new ScriptSandbox();

export async function runScript(script: string, context: ScriptContext): Promise<ScriptResult> {
    // Map old context to new context
    const scopes: VariableScopeMap = {
        local: {},
        data: {},
        environment: context.environment || {},
        collection: context.collectionVariables || {},
        global: context.globals || {}
    };

    const runtimeContext: RuntimeScriptContext = {
        request: context.request,
        response: context.response,
        scopes,
        info: {
            eventName: (context as any).eventName || 'test',
            iteration: (context as any).iteration || 0,
            iterationCount: (context as any).iterationCount || 1,
            requestName: context.request.url,
            requestId: context.request.id
        }
    };

    // Dummy request handler for the shim since single-request shim doesn't fully support sendRequest
    const dummyRequestHandler = async () => { throw new Error('pm.sendRequest is only supported in collection runs'); };

    const result = await sandbox.execute(script, runtimeContext, {
        timeoutMs: 5000,
        sendRequestHandler: dummyRequestHandler
    });

    // Extract environment mutations for the old API
    const envMutations = result.mutations?.environment || [];
    const envObj = { ...context.environment };
    for (const mut of envMutations) {
        if (mut.operation === 'set') envObj[mut.key] = mut.value;
        else if (mut.operation === 'unset') delete envObj[mut.key];
    }

    // Extract collection mutations for the old API
    const colMutations = result.mutations?.collection || [];
    const colObj = { ...context.collectionVariables };
    for (const mut of colMutations) {
        if (mut.operation === 'set') colObj[mut.key] = mut.value;
        else if (mut.operation === 'unset') delete colObj[mut.key];
    }

    // Extract global mutations for the old API
    const glbMutations = result.mutations?.global || [];
    const glbObj = { ...context.globals };
    for (const mut of glbMutations) {
        if (mut.operation === 'set') glbObj[mut.key] = mut.value;
        else if (mut.operation === 'unset') delete glbObj[mut.key];
    }

    return {
        success: result.success,
        assertions: result.assertions,
        consoleOutput: result.consoleOutput.map(c => `[${c.level}] ${c.args.join(' ')}`),
        error: result.error,
        updatedVariables: { ...envObj, ...colObj, ...glbObj },
        updatedRequest: result.requestOverrides as any,
        executionTimeMs: result.executionTimeMs
    } as any;
}
