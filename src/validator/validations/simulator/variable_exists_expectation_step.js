import { ExpectationStep } from "./expectation_step.js";

export class VariableExistsExpectationStep extends ExpectationStep {
    constructor(variableNames, description) {
        const namesArray = Array.isArray(variableNames) ? variableNames : [variableNames];
        super("variable_exists", namesArray, description);
        this.variableNames = namesArray;
        this.expectedValue = namesArray; // ← clave para que tu asPythonDict() actual lo agarre bien
    }
}
