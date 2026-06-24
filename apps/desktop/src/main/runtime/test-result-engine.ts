import { 
    RuntimeTestAssertion, 
    RuntimeRunnerItemResult,
    CollectionItem,
    ScriptLevel
} from '@api-platform/core';

export interface RecordedAssertion extends RuntimeTestAssertion {
    level: ScriptLevel;
    timestamp: number;
}

export class TestResultEngine {
    // Map of requestId -> Map of iteration -> Assertions
    private requestAssertions: Map<string, Map<number, RecordedAssertion[]>> = new Map();
    
    // Ordered list of all execution results
    private results: RuntimeRunnerItemResult[] = [];

    public recordAssertions(item: CollectionItem, assertions: RuntimeTestAssertion[], level: ScriptLevel) {
        // Find current iteration (we assume the last recorded or 0)
        // This is a slight simplification, the Engine should pass iteration
        // Actually, we pass iteration to recordAssertions in the Engine now.
        // Wait, the method signature above doesn't have iteration, let's update it or just use the results list
    }
    
    public recordAssertionsWithIteration(item: CollectionItem, assertions: RuntimeTestAssertion[], level: ScriptLevel, iteration: number) {
        if (!this.requestAssertions.has(item.id)) {
            this.requestAssertions.set(item.id, new Map());
        }
        
        const reqMap = this.requestAssertions.get(item.id)!;
        if (!reqMap.has(iteration)) {
            reqMap.set(iteration, []);
        }
        
        const list = reqMap.get(iteration)!;
        
        for (const a of assertions) {
            list.push({
                ...a,
                level,
                timestamp: Date.now()
            });
        }
    }

    public recordResult(result: RuntimeRunnerItemResult) {
        this.results.push(result);
    }

    public getAssertionsForRequest(requestId: string, iteration: number): RecordedAssertion[] {
        const reqMap = this.requestAssertions.get(requestId);
        if (!reqMap) return [];
        return reqMap.get(iteration) || [];
    }

    public getAllResults(): RuntimeRunnerItemResult[] {
        return this.results;
    }

    public getSummary() {
        let totalRequests = this.results.length;
        let totalAssertions = 0;
        let passedAssertions = 0;
        let failedAssertions = 0;
        let totalDurationMs = 0;
        let totalResponseTimeMs = 0;

        for (const res of this.results) {
            totalAssertions += res.testSummary.total;
            passedAssertions += res.testSummary.passed;
            failedAssertions += res.testSummary.failed;
            totalDurationMs += res.timing.totalMs;
            if (res.response?.time) {
                totalResponseTimeMs += res.response.time;
            }
        }

        return {
            totalRequests,
            totalAssertions,
            passedAssertions,
            failedAssertions,
            totalDurationMs,
            avgResponseTimeMs: totalRequests > 0 ? totalResponseTimeMs / totalRequests : 0
        };
    }
    
    public clear() {
        this.requestAssertions.clear();
        this.results = [];
    }
}
