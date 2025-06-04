import { SyntaxValidator } from "../validator/validations/validations.js";
import { CodeSimulator } from "../validator/validations/simulator/code_simulator.js";
import { SimpleSimulator } from "./capture_stdout_simulator.js";

export function runValidations(code, rules) {
  const results = [];

  return SyntaxValidator(code)
    .then((syntaxValidator) => {
      if (!syntaxValidator.module || !Array.isArray(syntaxValidator.module.body)) {
        throw new Error("AST no válido o no cargado");
      }

      const simulator = new CodeSimulator(JSON.stringify(code));
      return simulator.simulate().then((output) => {
        for (const rule of rules) {
          switch (rule.type) {
            case "function_exists": {
              let found = false;
              try {
                found = Array.isArray(syntaxValidator.module?.body) &&
                  syntaxValidator.module.body.some(
                    node => node.type === "FunctionNode" && node.name === rule.name
                  );
              } catch (e) {
                console.warn("Error en function_exists:", e);
              }

              results.push({
                type: rule.type,
                success: found,
                message: found
                  ? `Función ${rule.name} encontrada.`
                  : `Función ${rule.name} no encontrada.`
              });
              break;
            }


            case "uses_library": {
              const found = syntaxValidator.code.includes(`import ${rule.name}`) || syntaxValidator.code.includes(`from ${rule.name}`);
              results.push({
                type: rule.type,
                success: found,
                message: found
                  ? `Importación de ${rule.name} detectada.`
                  : `No se encontró importación de ${rule.name}.`
              });
              break;
            }

            case "prints_group": {
              const simulator = new SimpleSimulator(code);
              return simulator.simulate().then((out) => {
                for (const printRule of rule.prints) {
                  const printed = out.stdout.some(line => line.includes(printRule.textIncludes));
                  results.push({
                    type: "prints",
                    success: printed,
                    message: printed
                      ? `Se imprimió "${printRule.textIncludes}".`
                      : `No se imprimió "${printRule.textIncludes}".`
                  });
                }
                return results;
              });
            }
            case "prints": {
              const simulator = new StdoutSimulator(code);
              return simulator.simulate().then((out) => {

                const printed = out.stdout.some(line => line.includes(rule.textIncludes));

                results.push({
                  type: rule.type,
                  success: printed,
                  message: printed
                    ? `Se imprimió texto esperado.`
                    : `No se imprimió texto esperado.`
                });

                return results;
              });
            }
            case "variable_exists": {
              const variables = Array.isArray(rule.name) ? rule.name : [rule.name];
              const foundVars = new Set();

              try {
                if (Array.isArray(syntaxValidator.module?.body)) {
                  syntaxValidator.module.body.forEach(node => {
                    if (node.type === "VariableAssignNode") {
                      node.targets?.forEach(target => {
                        if (target.type === "NameNode" && variables.includes(target.id)) {
                          foundVars.add(target.id);
                        }
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn("Error en variable_exists:", e);
              }

              variables.forEach(varName => {
                const success = foundVars.has(varName);
                results.push({
                  type: rule.type,
                  variable: varName,
                  success,
                  message: success
                    ? `Variable ${varName} encontrada.`
                    : `Variable ${varName} no encontrada.`
                });
              });

              break;
            }
            case "variable_value": {
              const variables = Array.isArray(rule.name) ? rule.name : [rule.name];
              const foundVars = new Map();

              try {
                if (Array.isArray(syntaxValidator.module?.body)) {
                  syntaxValidator.module.body.forEach(node => {
                    if (node.type === "VariableAssignNode") {
                      node.targets?.forEach(target => {
                        if (target.type === "NameNode" && variables.includes(target.id)) {
                          foundVars.set(target.id, node.value);
                        }
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn("Error en variable_value:", e);
              }

              variables.forEach(varName => {
                const value = foundVars.get(varName);
                const success = value === rule.value;
                results.push({
                  type: rule.type,
                  variable: varName,
                  success,
                  message: success
                    ? `Variable ${varName} tiene el valor esperado.`
                    : `Variable ${varName} no tiene el valor esperado.`
                });
              });

              break;
            }
            case "list": {
              const list = Array.isArray(rule.name) ? rule.name : [rule.name];
              const foundItems = new Set();

              try {
                if (Array.isArray(syntaxValidator.module?.body)) {
                  syntaxValidator.module.body.forEach(node => {
                    if (node.type === "ListNode") {
                      node.elements?.forEach(element => {
                        if (element.type === "NameNode" && list.includes(element.id)) {
                          foundItems.add(element.id);
                        }
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn("Error en list:", e);
              }

              list.forEach(item => {
                const success = foundItems.has(item);
                results.push({
                  type: rule.type,
                  item,
                  success,
                  message: success
                    ? `Elemento ${item} encontrado en la lista.`
                    : `Elemento ${item} no encontrado en la lista.`
                });
              });

              break;
            }
            case "diccionary": {
              const dictionary = Array.isArray(rule.name) ? rule.name : [rule.name];
              const foundItems = new Set();

              try {
                if (Array.isArray(syntaxValidator.module?.body)) {
                  syntaxValidator.module.body.forEach(node => {
                    if (node.type === "DictNode") {
                      node.items?.forEach(item => {
                        if (item.type === "KeyValueNode" && dictionary.includes(item.key.id)) {
                          foundItems.add(item.key.id);
                        }
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn("Error en diccionary:", e);
              }

              dictionary.forEach(item => {
                const success = foundItems.has(item);
                results.push({
                  type: rule.type,
                  item,
                  success,
                  message: success
                    ? `Elemento ${item} encontrado en el diccionario.`
                    : `Elemento ${item} no encontrado en el diccionario.`
                });
              });

              break;
            }

            default:
              results.push({
                type: rule.type,
                success: false,
                message: `Tipo de validación desconocido: ${rule.type}`
              });
          }
        }
        return results;
      });
    })
    .catch((e) => {
      return [
        {
          type: "syntax",
          success: false,
          message: "Error de sintaxis: " + e.message
        }
      ];
    });
}
