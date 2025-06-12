import { Assert } from "./assert.js";

/**
 * Class representing a code simulator for Python code, using Pyodide.
 */
export class CodeSimulator {
    /**
     * Create a CodeSimulator instance.
     * @param {string} code - The Python code to be simulated.
     */
    constructor(code) {
        this.code = code;
        this.pyodideReadyPromise = this.loadPyodide();
    }

    /**
     * Load Pyodide and set it to the instance.
     */
    async loadPyodide() {
        if (!window.pyodide) {
            const pyodideScript = document.createElement('script');
            pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
            document.head.appendChild(pyodideScript);

            await new Promise((resolve) => {
                pyodideScript.onload = resolve;
            });
        }

        this.pyodide = await loadPyodide();
    }

    /**
     * Simulate the code with the given test cases.
     * @param {string} lang - The language of the error messages.
     * @param  {...any} testCases - The test cases to be simulated.
     * @returns {Array} The results of the simulation.
     * @async
     */
    async simulate(lang, ...testCases) {
        await this.pyodideReadyPromise;

        let allResults = [];

        for (const testCase of testCases) {
            if (!testCase) continue;
            if (typeof testCase.test !== 'function') continue;

            const assert = new Assert();
            testCase.test(assert);

            console.log("EXPECTATIONS TO PYTHON:", assert.asPythonDict());

            const simulationCode = `
import builtins
from io import StringIO
import sys
import ast

def validate_expectations(expectations, code):
    original_print = builtins.print
    original_input = builtins.input

    output = StringIO()
    def mock_print(*args, **kwargs):
        original_print(*args, **kwargs, file=output)
    builtins.print = mock_print

    input_values = [exp["expected_value"] for exp in expectations["expectations"] if exp["operation"] == "input"]
    input_index = 0
    input_called = False

    def mock_input(prompt=""):
        nonlocal input_index, input_called
        input_called = True
        if input_index < len(input_values):
            value = input_values[input_index]
            input_index += 1
            return value
        return ""

    builtins.input = mock_input

    # ---- PRE-ANALISIS con AST ----
    tree = ast.parse(code)

    remaining_expectations = []

    for exp in expectations["expectations"]:
        if exp["operation"] == "variable_exists":
            print("DEBUG: Entrando en variable_exists con expected_value:", exp["expected_value"])
            expected_names = exp["expected_value"]

            class VariableNameCollector(ast.NodeVisitor):
                def __init__(self):
                    self.variable_names = set()

                def visit_Name(self, node):
                    if isinstance(node.ctx, ast.Store):
                        self.variable_names.add(node.id)
                    self.generic_visit(node)

            visitor = VariableNameCollector()
            visitor.visit(tree)

            print("DEBUG: Variables encontradas en el código:", visitor.variable_names)

            found_match = False
            for name in expected_names:
                if name in visitor.variable_names:
                    found_match = True
                    break

            if not found_match:
                remaining_expectations.append(exp)

    # ---- Ejecutar código (exec) ----
    locals_after_exec = {}

    # ---- prepare function_call mocks ----
    call_logs = {}
    def make_mock_function(fname, return_value):
        def mock_function(*args, **kwargs):
            if fname not in call_logs:
                call_logs[fname] = []
            call_logs[fname].append({"args": args, "kwargs": kwargs})
            return return_value
        return mock_function

    for exp in expectations["expectations"]:
        if exp["operation"] == "function_call":
            func_name = exp["expected_value"]["functionName"]
            expected_return = exp["expected_value"]["expectedReturnValue"]
            globals()[func_name] = make_mock_function(func_name, expected_return)

    try:
        exec(code, globals(), locals_after_exec)
    except Exception as e:
        builtins.print = original_print
        builtins.input = original_input
        return [{"description": f"Error executing code: {e.__class__.__name__}: {e}"}]

    # ---- validate post-exec expectations ----
    output_lines = output.getvalue().strip().splitlines()

    for exp in expectations["expectations"]:
        if exp["operation"] in ("variable_exists"):  # ya procesado antes
            continue

        if exp["operation"] == "print":
            if exp["expected_value"] in output_lines:
                output_lines.remove(exp["expected_value"])
            else:
                remaining_expectations.append(exp)

        elif exp["operation"] == "input":
            if input_called and input_index == 0:
                input_values.insert(0, "")
            if input_called and input_index > 0 and exp["expected_value"] == input_values[input_index - 1]:
                input_index -= 1
            else:
                remaining_expectations.append(exp)

        elif exp["operation"] == "function_call":
            func_name = exp["expected_value"]["functionName"]
            expected_args = exp["expected_value"]["expectedArguments"]
            calls = call_logs.get(func_name, [])
            found_match = False
            for call in calls:
                if list(call["args"]) == expected_args:
                    found_match = True
                    break
            if not found_match:
                remaining_expectations.append(exp)

        elif exp["operation"] == "module_usage":
            module_name = exp["expected_value"]["moduleName"]
            expected_usage = exp["expected_value"]["expectedUsage"]

            if module_name not in sys.modules:
                print(f"DEBUG: Module {module_name} NOT in sys.modules")
                remaining_expectations.append(exp)
                continue

            module_obj = sys.modules[module_name]
            module_dir = dir(module_obj)

            if isinstance(expected_usage, list):
                for attr in expected_usage:
                    if attr not in module_dir:
                        print(f"DEBUG: Attribute {attr} NOT FOUND in module {module_name}")
                        remaining_expectations.append(exp)
                        break
            else:
                if expected_usage not in module_dir:
                    print(f"DEBUG: Attribute {expected_usage} NOT FOUND in module {module_name}")
                    remaining_expectations.append(exp)

        elif exp["operation"] == "list":
            expected_list = exp["expected_value"]
            found_match = False
            for var_name, value in locals_after_exec.items():
                if isinstance(value, list) and value == expected_list:
                    found_match = True
                    break
            if not found_match:
                remaining_expectations.append(exp)

        elif exp["operation"] == "dict":
            expected_dict = exp["expected_value"]
            found_match = False
            for var_name, value in locals_after_exec.items():
                if isinstance(value, dict) and value == expected_dict:
                    found_match = True
                    break
            if not found_match:
                remaining_expectations.append(exp)

        elif exp["operation"] == "bin_op":
            expected_left_names = exp["expected_value"]["leftNames"]
            expected_operator = exp["expected_value"]["operator"]
            expected_right_value = exp["expected_value"]["rightValue"]

            class BinOpCollector(ast.NodeVisitor):
                def __init__(self):
                    self.found = False

                def visit_BinOp(self, node):
                    op_type = type(node.op).__name__
                    operator_map = {
                        'Add': '+',
                        'Sub': '-',
                        'Mult': '*',
                        'Div': '/',
                        'FloorDiv': '//',
                        'Mod': '%',
                    }
                    op_symbol = operator_map.get(op_type, None)

                    if (op_symbol == expected_operator and
                        isinstance(node.left, ast.Name) and
                        node.left.id in expected_left_names and
                        isinstance(node.right, ast.Constant) and
                        node.right.value == expected_right_value):
                        self.found = True

                    self.generic_visit(node)

            tree = ast.parse(code)
            visitor = BinOpCollector()
            visitor.visit(tree)

            if not visitor.found:
                remaining_expectations.append(exp)

        elif exp["operation"] == "function_exists":
            expected_names = exp["expected_value"]

            class FunctionDefCollector(ast.NodeVisitor):
                def __init__(self):
                    self.function_names = set()

                def visit_FunctionDef(self, node):
                    self.function_names.add(node.name)
                    self.generic_visit(node)

            tree = ast.parse(code)
            visitor = FunctionDefCollector()
            visitor.visit(tree)

            found_match = False
            for name in expected_names:
                if name in visitor.function_names:
                    found_match = True
                    break
            if not found_match:
                remaining_expectations.append(exp)

        elif exp["operation"] == "if_structure":
            expected_left_names = exp["expected_value"]["leftNames"]
            expected_operator = exp["expected_value"]["operator"]
            expected_right_value = exp["expected_value"]["rightValue"]

            class IfConditionCollector(ast.NodeVisitor):
                def __init__(self):
                    self.found = False

                def visit_If(self, node):
                    if isinstance(node.test, ast.Compare):
                        if (isinstance(node.test.left, ast.Name) and
                            node.test.left.id in expected_left_names):

                            operator_map = {
                                'Eq': '==',
                                'NotEq': '!=',
                                'Lt': '<',
                                'LtE': '<=',
                                'Gt': '>',
                                'GtE': '>='
                            }

                            if len(node.test.ops) == 1:
                                op_type = type(node.test.ops[0]).__name__
                                op_symbol = operator_map.get(op_type, None)

                                if (op_symbol == expected_operator and
                                    len(node.test.comparators) == 1 and
                                    isinstance(node.test.comparators[0], ast.Constant) and
                                    node.test.comparators[0].value == expected_right_value):
                                    self.found = True

                    self.generic_visit(node)

            tree = ast.parse(code)
            visitor = IfConditionCollector()
            visitor.visit(tree)

            if not visitor.found:
                remaining_expectations.append(exp)

        elif exp["operation"] == "loop_structure":
            expected_loop_type = exp["expected_value"]  # "for" o "while"

            class LoopCollector(ast.NodeVisitor):
                def __init__(self):
                    self.found = False

                def visit_For(self, node):
                    if expected_loop_type == "for":
                        self.found = True
                    self.generic_visit(node)

                def visit_While(self, node):
                    if expected_loop_type == "while":
                        self.found = True
                    self.generic_visit(node)

            tree = ast.parse(code)
            visitor = LoopCollector()
            visitor.visit(tree)

            if not visitor.found:
                remaining_expectations.append(exp)
        elif exp["operation"] == "plot_exists":
            expected_functions = exp["expected_value"]  # list of function names like "plot", "show", "scatterplot", etc.

            class PlotCallCollector(ast.NodeVisitor):
                def __init__(self):
                    self.called_functions = set()

                def visit_Call(self, node):
                    # Detect function call names
                    func_name = ""
                    if isinstance(node.func, ast.Attribute):
                        func_name = node.func.attr
                    elif isinstance(node.func, ast.Name):
                        func_name = node.func.id

                    if func_name:
                        self.called_functions.add(func_name)

                    self.generic_visit(node)

            tree = ast.parse(code)
            visitor = PlotCallCollector()
            visitor.visit(tree)

            print("DEBUG: Plot functions found in code:", visitor.called_functions)

            found_match = False
            for func in expected_functions:
                if func in visitor.called_functions:
                    found_match = True
                    break

            if not found_match:
                remaining_expectations.append(exp)
                
    builtins.print = original_print
    builtins.input = original_input

    return remaining_expectations

remaining = validate_expectations(${assert.asPythonDict()}, ${this.code})
{
    "success": len(remaining) == 0,
    "unmet_expectations": remaining
}
`;


            const jsResult = this.pyodide.runPython(simulationCode).toJs();
            const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            if (!jsResult.success) {
                const unmet = jsResult.unmet_expectations[0];
                console.log("UNMET:", unmet);
                const failedStep = assert.getExpectations().find(
                    (exp) =>
                        exp.operation === unmet.operation &&
                        isEqual(exp.expectedValue, unmet.expected_value)
                );
                console.log("FAILED STEP:", failedStep);
                allResults.push({
                    success: false,
                    description: testCase.description,
                    error: failedStep?.getErrorMessage(lang) ?? unmet.description ?? "Error en la simulación",
                });
                break;
            } else {
                allResults.push({
                    success: true,
                    description: testCase.description,
                    error: null,
                });
            }
            console.log("UNMET EXPECTATIONS:", jsResult.unmet_expectations);

        }

        return allResults;
    }
}
