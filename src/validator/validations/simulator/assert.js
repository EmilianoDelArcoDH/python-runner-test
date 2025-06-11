import { InputExpectationStep } from "./input_expectation_step.js";
import { PrintExpectationStep } from "./print_expectation_step.js";
import { FunctionCallExpectationStep } from "./function_call_expectation_step.js";
import { ModuleUsageExpectationStep } from "./module_usage_expectation_step.js";
import { ListExpectationStep } from "./list_expectation_step.js";
import { DictExpectationStep } from "./dict_expectation_step.js";
import { VariableExistsExpectationStep } from "./variable_exists_expectation_step.js";
import { BinOpExpectationStep } from "./bin_op_expectation_step.js";
import { FunctionExistsExpectationStep } from "./function_exists_expectation_step.js";
import { IfStructureExpectationStep } from "./if_structure_expectation_step.js";
import { LoopStructureExpectationStep } from "./loop_structure_expectation_step.js";


/**
 * Class representing an assertion simulator.
 */
export class Assert {
    /**
     * Create an Assert instance.
     * @param {Array} [expectations=[]] - The initial list of expectations.
     */
    constructor(expectations = []) {
        this.expectations = expectations;
    }

    /**
     * Add a print expectation step.
     * @param {*} expectedValue - The expected value to be printed.
     * @param {string} description - The description of the expectation.
     * @returns {PrintExpectationStep} The created print expectation step.
     */
    print(expectedValue, description) {
        const step = new PrintExpectationStep(expectedValue, description);
        this.expectations.push(step);
        return step;
    }

    /**
     * Add an input expectation step.
     * @param {string} prompt - The prompt message for the input.
     * @param {*} simulatedInput - The simulated input value.
     * @param {string} description - The description of the expectation.
     * @returns {InputExpectationStep} The created input expectation step.
     */
    input(prompt, simulatedInput, description) {
        const step = new InputExpectationStep(prompt, simulatedInput, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a variable existence expectation step.
     * @param {string|Array} variableNames - The name(s) of the variable(s) expected to exist.
     * @param {string} description - The description of the expectation.
     * @returns {VariableExistsExpectationStep} The created variable existence expectation step.
     */
    variableExists(variableNames, description) {
        const step = new VariableExistsExpectationStep(variableNames, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a binary operation expectation step.
     * @param {string|Array} leftNames - The name(s) of the left operand(s).
     * @param {string} operator - The operator for the binary operation.
     * @param {*} rightValue - The expected value of the right operand.
     * @param {string} description - The description of the expectation.
     * @returns {BinOpExpectationStep} The created binary operation expectation step.
     */
    binOp(leftNames, operator, rightValue, description) {
        const step = new BinOpExpectationStep(leftNames, operator, rightValue, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a function existence expectation step.
     * @param {string|Array} functionNames - The name(s) of the function(s) expected to exist.
     * @param {string} description - The description of the expectation.
     * @returns {FunctionExistsExpectationStep} The created function existence expectation step.
     */
    functionExists(functionNames, description) {
        const step = new FunctionExistsExpectationStep(functionNames, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a function call expectation step.
     * @param {string} functionName - The name of the function to be called.
     * @param {Array} expectedArguments - The expected arguments for the function call.
     * @param {*} expectedReturnValue - The expected return value of the function call.
     * @param {string} description - The description of the expectation.
     * @returns {FunctionCallExpectationStep} The created function call expectation step.
     */
    functionCall(functionName, expectedArguments, expectedReturnValue, description) {
        const step = new FunctionCallExpectationStep(functionName, expectedArguments, expectedReturnValue, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a module usage expectation step.
     * @param {string} moduleName - The name of the module to be used.
     * @param {Object} expectedUsage - The expected usage of the module.
     * @param {string} description - The description of the expectation.
     * @returns {ModuleUsageExpectationStep} The created module usage expectation step.
     */
    moduleUsage(moduleName, expectedUsage, description) {
        const step = new ModuleUsageExpectationStep(moduleName, expectedUsage, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a list expectation step.
     * @param {Array} expectedList - The expected list value.
     * @param {string} description - The description of the expectation.
     * @returns {ListExpectationStep} The created list expectation step.
     */
    list(expectedList, description) {
        const step = new ListExpectationStep(expectedList, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a dictionary expectation step.
     * @param {Object} expectedDict - The expected dictionary value.
     * @param {string} description - The description of the expectation.
     * @returns {DictExpectationStep} The created dictionary expectation step.
     */
    dict(expectedDict, description) {
        const step = new DictExpectationStep(expectedDict, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add an if structure expectation step.
     * @param {string|Array} leftNames - The name(s) of the variable(s) on the left side of the condition.
     * @param {string} operator - The operator for the condition (e.g., '==', '!=', '<', '>', etc.).
     * @param {*} rightValue - The expected value on the right side of the condition.
     * @param {string} description - The description of the expectation.
     * @returns {IfStructureExpectationStep} The created if structure expectation step.
     */
    ifStructure(leftNames, operator, rightValue, description) {
        const step = new IfStructureExpectationStep(leftNames, operator, rightValue, description);
        this.expectations.push(step);
        return step;
    }
    /**
     * Add a loop structure expectation step.
     * @param {string} loopType - The type of loop expected ('for' or 'while').
     * @param {string} description - The description of the expectation.
     * @returns {LoopStructureExpectationStep} The created loop structure expectation step.
     */
    loopStructure(loopType, description) {
        const step = new LoopStructureExpectationStep(loopType, description);
        this.expectations.push(step);
        return step;
    }

    /**
     * Get the list of expectations.
     * @returns {Array} The list of expectations.
     */
    getExpectations() {
        return this.expectations;
    }

    /**
     * Convert the expectations to a Python dictionary format.
     * @returns {string} The JSON string representing the expectations in Python dictionary format.
    */
       asPythonDict() {
           return JSON.stringify({
               expectations: this.expectations.map((exp) => ({
                   operation: exp.operation,
                   expected_value: exp.expectedValue,
                   simulated_input: exp.simulatedInput,
                   description: exp.description
                }))
            });
        }
    // asPythonDict() {
    //     return {
    //         expectations: this.expectations.map(exp => exp.asPythonDict())
    //     };
    // }
}


