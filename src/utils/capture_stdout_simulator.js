// export class SimpleSimulator {
//   constructor(code) {
//     this.code = code;
//     this.pyodideReady = this.loadPyodide();
//   }

//   async loadPyodide() {
//     if (!window.pyodide) {
//       const script = document.createElement("script");
//       script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
//       document.head.appendChild(script);

//       await new Promise((resolve) => {
//         script.onload = resolve;
//       });
//     }

//     this.pyodide = await loadPyodide();
//   }

//   /**
//    * Simula el código Python y captura su salida (print)
//    * @returns {Promise<{ stdout: string[], error?: string }>}
//    */
//   async simulate() {
//     await this.pyodideReady;

//     const indentedCode = this.code
//       .split("\n")
//       .map((line) => "    " + line)
//       .join("\n");

//     const simulationCode = `
// import sys
// from io import StringIO

// _stdout = sys.stdout
// sys.stdout = StringIO()

// try:
// ${indentedCode}
// except Exception as e:
//     print("ERROR:", e)

// result = sys.stdout.getvalue().splitlines()
// sys.stdout = _stdout
// result
// `;

//     try {
//       const output = this.pyodide.runPython(simulationCode).toJs();
//       return { stdout: output };
//     } catch (e) {
//       return { stdout: [], error: e.message };
//     }
//   }
// }

export function wrapWithPrintMock(code) {
  return `
import builtins
original_print = builtins.print
__captured_prints__ = []
def mock_print(*args, **kwargs):
    output_line = " ".join(str(a) for a in args)
    __captured_prints__.append(output_line)
builtins.print = mock_print

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
finally:
    builtins.print = original_print

__captured_prints__
`;
}

export class SimpleSimulator {
  constructor(code, mockCode = "", mockInputs = []) {
    this.code = code;
    this.mockCode = mockCode;
    this.mockInputs = mockInputs;
    this.pyodideReady = this.loadPyodide();
  }

  async loadPyodide() {
    if (!window.pyodide) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    this.pyodide = await loadPyodide();
  }

  async simulate() {
    await this.pyodideReady;

    const codeWithIndent = this.code
      .split("\n")
      .map((line) => "    " + line)
      .join("\n");

    const inputValuesPython = JSON.stringify(this.mockInputs || []);

    const pythonCode = `
    ${this.mockCode}
import builtins
original_print = builtins.print
__captured_prints__ = []

def mock_print(*args, **kwargs):
    output_line = " ".join(str(a) for a in args)
    __captured_prints__.append(output_line)

builtins.print = mock_print

# Mock de input:
input_values = ${inputValuesPython}
original_input = builtins.input
def mock_input(prompt=""):
    return input_values.pop(0) if input_values else ""

builtins.input = mock_input

try:
${codeWithIndent}
finally:
    builtins.print = original_print
    builtins.input = original_input



__captured_prints__
`;

    try {
      const output = this.pyodide.runPython(pythonCode).toJs();
      return { stdout: output };
    } catch (e) {
      return { stdout: [], error: e.message };
    }
  }

}
