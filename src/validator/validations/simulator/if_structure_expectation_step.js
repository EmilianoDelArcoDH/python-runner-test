import { ExpectationStep } from "./expectation_step.js";

export class IfStructureExpectationStep extends ExpectationStep {
    constructor(leftNames, operator, rightValue, description) {
        const leftNamesArray = Array.isArray(leftNames) ? leftNames : [leftNames];
        const expectedValue = {
            leftNames: leftNamesArray,
            operator: operator,
            rightValue: rightValue
        };
        super("if_structure", expectedValue, description);
        this.leftNames = leftNamesArray;
        this.operator = operator;
        this.rightValue = rightValue;
        this.expectedValue = expectedValue; // ← importante
    }
}
