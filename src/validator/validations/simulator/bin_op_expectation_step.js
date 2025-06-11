import { ExpectationStep } from "./expectation_step.js";

export class BinOpExpectationStep extends ExpectationStep {
    constructor(leftNames, operator, rightValue, description) {
        const leftNamesArray = Array.isArray(leftNames) ? leftNames : [leftNames];
        const expectedValue = {
            leftNames: leftNamesArray,
            operator: operator,
            rightValue: rightValue
        };
        super("bin_op", expectedValue, description);
        this.leftNames = leftNamesArray;
        this.operator = operator;
        this.rightValue = rightValue;
        this.expectedValue = expectedValue; // ← importante
    }
}
