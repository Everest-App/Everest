import { RequestConfig, ResponseData } from '@api-platform/core';
import { RequestExecutor } from '../runtime/request-executor';

// Single shared executor so we can abort the in-flight request
const executor = new RequestExecutor();

/**
 * Execute an HTTP request.
 * Shimmed to use the new Runtime RequestExecutor.
 */
export async function executeRequest(config: RequestConfig): Promise<ResponseData> {
    return executor.execute(config, {
        timeoutMs: 30000,
        followRedirects: true
    });
}

/**
 * Cancel the currently running HTTP request (if any).
 * Calls abort() on the executor which signals axios via AbortController.
 */
export function cancelCurrentRequest(): void {
    executor.abort();
}

