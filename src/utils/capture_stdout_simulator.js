export class SimpleSimulator {
  constructor(code) {
    this.code = code;
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

  /**
   * Simula el código Python y captura su salida (print)
   * @returns {Promise<{ stdout: string[], error?: string }>}
   */
  async simulate() {
    await this.pyodideReady;

    const indentedCode = this.code
      .split("\n")
      .map((line) => "    " + line)
      .join("\n");

    const simulationCode = `
import sys
from io import StringIO

_stdout = sys.stdout
sys.stdout = StringIO()

try:
${indentedCode}
except Exception as e:
    print("ERROR:", e)

result = sys.stdout.getvalue().splitlines()
sys.stdout = _stdout
result
`;

    try {
      const output = this.pyodide.runPython(simulationCode).toJs();
      return { stdout: output };
    } catch (e) {
      return { stdout: [], error: e.message };
    }
  }
}
