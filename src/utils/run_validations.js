import { SyntaxValidator } from "../validator/validations/validations.js";
import { CodeSimulator } from "../validator/validations/simulator/code_simulator.js";
import { SimpleSimulator } from "./capture_stdout_simulator.js";
import { exerciseMocks } from "./mocks.js";

export function runValidations(code, rules, exerciseId) {
  const results = [];
  console.log("Ejecutando validaciones para el ejercicio:", exerciseId);


  return SyntaxValidator(code)

    .then((syntaxValidator) => {
      if (!syntaxValidator.module || !Array.isArray(syntaxValidator.module.body)) {
        throw new Error("AST no válido o no cargado");
      }
      const mockCode = exerciseMocks[exerciseId] || "";
      const simulator = new CodeSimulator(JSON.stringify(code));
      return simulator.simulate().then((output) => {
        let stopValidations = false;
        for (const rule of rules) {
          if (stopValidations) {
            // Cortamos el resto → no hacemos más validations
            // results.push({
            //   type: rule.type,
            //   success: false,
            //   message: "Validación detenida debido a error crítico anterior."
            // });
            continue;
          }
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
              // 🚩 Aquí sí queremos que si no existe la función, no sigan las validaciones
              if (!found) stopValidations = true;

              break;
            }
            case "argument_test": {
              const promises = [];

              for (const argSet of rule.argumentSets) {
                const variableOverrides = {
                  "__mock_result1__": argSet.args1[0] / argSet.args1[1],
                  "__mock_result2__": argSet.args2[0] / argSet.args2[1],
                };

                let finalMockCode = mockCode;
                for (const key in variableOverrides) {
                  finalMockCode = finalMockCode.replaceAll(key, variableOverrides[key]);
                }

                const simulator = new SimpleSimulator(code, finalMockCode);
                const promise = simulator.simulate().then((out) => {
                  const expectedResult = (argSet.args1[0] / argSet.args1[1]) + (argSet.args2[0] / argSet.args2[1]);
                  const expectedString = argSet.expectedTotal || expectedResult.toString();

                  const printed = out.stdout.some(line => line.includes(expectedString));
                  const actualPrinted = out.stdout.join(" | "); // todas las líneas impresas juntas
                  results.push({
                    type: rule.type,
                    args1: argSet.args1,
                    args2: argSet.args2,
                    expectedTotal: expectedString,
                    success: printed,
                    message: printed
                      ? `Se imprimió el valor esperado "${expectedString}".`
                      : rule.feedbackTemplate
                        ? rule.feedbackTemplate(argSet.args1, argSet.args2, expectedString, actualPrinted)
                        : `No se imprimió "${expectedString}".`
                  });
                  // 🚩 Si falla, paramos las siguientes VALIDACIONES (pero los .simulate() ya lanzados siguen)
                  if (!printed) stopValidations = true;
                });
                promises.push(promise);
              }


              return Promise.all(promises).then(() => results);
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

            case "input_exists": {
              const inputRegex = /\binput\s*\(/g;
              const inputFound = inputRegex.test(syntaxValidator.code);

              results.push({
                type: rule.type,
                success: inputFound,
                message: inputFound
                  ? `Se encontró el uso de input().`
                  : `No se encontró el uso de input().`
              });
              if (!inputFound) {
                stopValidations = true;
              }

              break;
            }

            case "input_value": {
              const allInputs = rule.mockInputs || [[]]; // array de arrays
              const allExpectedOutputs = Array.isArray(rule.expectedOutputs) ? rule.expectedOutputs : [rule.expectedOutputs];

              const promises = [];

              // Ejecutamos el código una vez por cada set de inputs
              for (let i = 0; i < allInputs.length; i++) {
                const inputs = allInputs[i];
                const expectedOutput = allExpectedOutputs[i] || "";

                const simulator = new SimpleSimulator(code, mockCode, inputs);

                const promise = simulator.simulate().then((out) => {
                  const printed = out.stdout.some(line => line.includes(expectedOutput));

                  const actualPrinted = out.stdout.join(" | "); // todas las líneas impresas juntas
                  console.log("Actual Printed:", actualPrinted);
                  

                  let message = printed
                    ? `Se imprimió el valor esperado "${expectedOutput}".`
                    : `No se imprimió el valor esperado "${expectedOutput}".`;

                  // Si definiste feedbackTemplate, usalo
                  if (!printed && typeof rule.feedbackTemplate === "function") {
                    message = rule.feedbackTemplate(inputs, expectedOutput, actualPrinted);
                  }
                  // 🚩 Si falla, paramos las siguientes VALIDACIONES
                if (!printed) stopValidations = true;
                promises.push(promise);

                  results.push({
                    type: rule.type,
                    inputs,
                    expectedOutput,
                    success: printed,
                    message
                  });
                });
                
              }


              // Retornamos Promise.all
              return Promise.all(promises).then(() => results);
            }


            case "prints_group": {
              const simulator = new SimpleSimulator(code, mockCode);
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
                  if (!printed) stopValidations = true;
                }
                return results;
              });
            }
            case "prints": {
              const simulator = new StdoutSimulator(code, mockCode);
              return simulator.simulate().then((out) => {

                const printed = out.stdout.some(line => line.includes(rule.textIncludes));

                results.push({
                  type: rule.type,
                  success: printed,
                  message: printed
                    ? `Se imprimió texto esperado.`
                    : `No se imprimió texto esperado.`
                });
                if (!success) {
                  stopValidations = true;
                }
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
                // 🚩 Si alguna falta, paramos las validaciones
                if (!success) stopValidations = true;
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
                if (!success) {
                  stopValidations = true;
                }
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
                if (!success) {
                  stopValidations = true;
                }
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
                if (!success) {
                  stopValidations = true;
                }
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
