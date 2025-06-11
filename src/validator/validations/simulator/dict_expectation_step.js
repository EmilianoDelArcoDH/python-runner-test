import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a dictionary value is expected.
 */
export class DictExpectationStep extends ExpectationStep {
    constructor(expectedDict, description) {
        super("dict", expectedDict, description);
        this.expectedDict = expectedDict;
    }
}
