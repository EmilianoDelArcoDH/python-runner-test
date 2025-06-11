// import { exercises } from '../utils/exercises';
// import { CodeSimulator, SyntaxValidator } from "../validator/validations/validations.js";

// export const useValidateExercise = async (exerciseId, editors, lang, postEvent, stateToPost) => {
//     const failureReasons = [];
//     let syntaxErrorsFound = false;
//     let simulationErrorsFound = false;

//     try {

//         const exercise = exercises.find((ex) => ex.id === exerciseId);

//         if (!exercise) {
//             throw new Error("No se encontró el ejercicio");
//         }

//         const codeEditor = editors.find((ed) => ed.id === exercise.mainEditor);
//         if (!codeEditor) {
//             throw new Error("Editor principal no encontrado");
//         }

//         const { code } = codeEditor;

//         // 1. Validación de Sintaxis
//         if (exercise.validationAST) {
//             //console.log(":rocket: Iniciando validación de sintaxis...");
//             const syntaxValidate = await SyntaxValidator(code);
//             const syntaxValidationErrors = syntaxValidate.theseStories(
//                 lang,
//                 ...exercise.validationAST
//             );

//             // Procesar todos los errores
//             Object.entries(syntaxValidationErrors).forEach(([key, errorList]) => {
//                 errorList.forEach((error) => {
//                     const errorMessage = error[lang] || error["en"]; // Fallback a inglés si no está el idioma deseado
//                     failureReasons.push(errorMessage);
//                 });
//             });

//             // Verificar si se encontraron errores
//             syntaxErrorsFound = failureReasons.length > 0;

//         }
//         console.log(failureReasons)
//         // 2. Simulación de Código
       
        
//         if (exercise.validationCodeSimulator) {
//             //console.log(":rocket: Iniciando simulación de código...");
//             const safeCode = JSON.stringify(code);
//             const codeSimulator = new CodeSimulator(safeCode);
//             const simulationResults = await codeSimulator.simulate(lang, exercise.validationCodeSimulator);

//             console.log(simulationResults);

//             simulationResults.forEach((result) => {
//                 if (!result.success) {
//                     simulationErrorsFound = true;
//                     failureReasons.push(`${result.error}`);
//                 }
//             });
            
//         }
//         console.log(failureReasons)
//         console.log(syntaxErrorsFound, simulationErrorsFound);
        
//         // 3. Resultado Final
//         if (syntaxErrorsFound || simulationErrorsFound) {
//             throw new Error("Falló la validación de sintaxis o simulación");
//         }
//         console.log('Has completado el ejercicio');
        
//         postEvent("SUCCESS", "Has completado el ejercicio", [], stateToPost);

//     } catch (error) {
//         // Filtrar razones de fallo si es necesario
//         const failureReasonsFiltrado = failureReasons.filter(reason =>
//             !reason.includes("El código debe corregir los errores")
//         );

//         postEvent("FAILURE", "El ejercicio está incompleto", failureReasonsFiltrado, stateToPost);
//     }
// };


import { exercises } from '../utils/exercises';
import { CodeSimulator, SyntaxValidator } from "../validator/validations/validations.js";
import { runValidations } from "../utils/run_validations.js";

export const useValidateExercise = async (exerciseId, editors, lang, postEvent, stateToPost) => {
    const failureReasons = [];
    let syntaxErrorsFound = false;
    let simulationErrorsFound = false;

    try {
        const exercise = exercises.find((ex) => ex.id === exerciseId);
        if (!exercise) throw new Error("No se encontró el ejercicio");

        const codeEditor = editors.find((ed) => ed.id === exercise.mainEditor);
        if (!codeEditor) throw new Error("Editor principal no encontrado");

        const { code } = codeEditor;

        // 1. Validaciones Objetivas
        if (exercise.validations && Array.isArray(exercise.validations)) {
            const results = await runValidations(code, exercise.validations,exerciseId);
            results.forEach(result => {
                if (!result.success) {
                    failureReasons.push(result.message);
                }
            });
        }

        // 2. Validación AST personalizada
        if (exercise.validationAST) {
            const syntaxValidate = await SyntaxValidator(code);
            const syntaxValidationErrors = syntaxValidate.theseStories(
                lang,
                ...exercise.validationAST
            );

            Object.entries(syntaxValidationErrors).forEach(([_, errorList]) => {
                errorList.forEach((error) => {
                    const errorMessage = error[lang] || error["en"];
                    failureReasons.push(errorMessage);
                });
            });

            syntaxErrorsFound = failureReasons.length > 0;
        }

        // 3. Simulación de Código
        if (exercise.validationCodeSimulator) {
            const safeCode = JSON.stringify(code);
            const codeSimulator = new CodeSimulator(safeCode);
            const simulationResults = await codeSimulator.simulate(lang, exercise.validationCodeSimulator);

            simulationResults.forEach((result) => {
                if (!result.success) {
                    simulationErrorsFound = true;
                    failureReasons.push(`${result.error}`);
                }
            });
        }
        console.log(failureReasons)
        console.log(syntaxErrorsFound, simulationErrorsFound);

        // Resultado Final
        if (syntaxErrorsFound || simulationErrorsFound || failureReasons.length > 0) {
            throw new Error("Falló alguna validación");
        }

        postEvent("SUCCESS", "Has completado el ejercicio", [], stateToPost);
    } catch (error) {
        const failureReasonsFiltrado = failureReasons.filter(reason =>
            !reason.includes("El código debe corregir los errores")
        );
        postEvent("FAILURE", "Faltan objetivos por cumplir", failureReasonsFiltrado, stateToPost);
    }
};
