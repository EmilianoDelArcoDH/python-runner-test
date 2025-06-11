import { ExpectationStep } from "./expectation_step.js";

/**
 * Represents a step where a function call is expected.
 */
export class FunctionCallExpectationStep extends ExpectationStep {
    constructor(functionName, expectedArguments, expectedReturnValue, description) {
        super("function_call", {
            functionName,
            expectedArguments,
            expectedReturnValue
        }, description);
        this.functionName = functionName;
        this.expectedArguments = expectedArguments;
        this.expectedReturnValue = expectedReturnValue;
    }
}
