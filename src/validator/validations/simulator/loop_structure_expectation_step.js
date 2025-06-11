import { ExpectationStep } from "./expectation_step.js";

export class LoopStructureExpectationStep extends ExpectationStep {
    constructor(loopType, description) {
        super("loop_structure", loopType, description);
        this.loopType = loopType;
        this.expectedValue = loopType; // ← importante
    }
}
