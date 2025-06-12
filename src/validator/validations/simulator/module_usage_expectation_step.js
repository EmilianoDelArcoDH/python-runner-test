import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a module usage is expected.
 */
export class ModuleUsageExpectationStep extends ExpectationStep {
    constructor(moduleName, expectedUsage, description) {
        const expectedValue = {
            moduleName,
            expectedUsage
        };
        super("module_usage", expectedValue, description);
        this.moduleName = moduleName;
        this.expectedUsage = expectedUsage;
        this.expectedValue = expectedValue; // ← para coherencia con asPythonDict()
    }
}

