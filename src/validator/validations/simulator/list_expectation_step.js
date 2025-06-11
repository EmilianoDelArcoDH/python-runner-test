import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a list value is expected.
 */
export class ListExpectationStep extends ExpectationStep {
    constructor(expectedList, description) {
        super("list", expectedList, description);
        this.expectedList = expectedList;
    }
}
