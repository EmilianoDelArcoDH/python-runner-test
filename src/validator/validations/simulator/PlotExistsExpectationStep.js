import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a plot function usage is expected.
 */
export class PlotExistsExpectationStep extends ExpectationStep {
    constructor(expectedFunctions, description) {
        const expectedValue = expectedFunctions; // list of function names
        super("plot_exists", expectedValue, description);
        this.expectedFunctions = expectedFunctions;
        this.expectedValue = expectedValue;
    }
}
