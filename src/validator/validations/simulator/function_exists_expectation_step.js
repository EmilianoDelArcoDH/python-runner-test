import { ExpectationStep } from "./expectation_step.js";

export class FunctionExistsExpectationStep extends ExpectationStep {
    constructor(functionNames, description) {
        const namesArray = Array.isArray(functionNames) ? functionNames : [functionNames];
        super("function_exists", namesArray, description);
        this.functionNames = namesArray;
        this.expectedValue = namesArray; // ← importante
    }
}
