import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a module usage is expected.
 */
export class ModuleUsageExpectationStep extends ExpectationStep {
    constructor(moduleName, expectedUsage, description) {
        super("module_usage", {
            moduleName,
            expectedUsage
        }, description);
        this.moduleName = moduleName;
        this.expectedUsage = expectedUsage;
    }
}
