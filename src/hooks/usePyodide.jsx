import { useState, useEffect, useRef } from 'react';

const usePyodide = () => {
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [outputPyodideHistory, setOutputPyodideHistory] = useState([]); // Historial de salidas
  const [outputPyodideInput, setOutputPyodideInput] = useState([]); // Historial de inputs
  const [outputPyodideGraph, setOutputPyodideGraph] = useState([]);
  const [outputDecisionTreeGraph, setOutputDecisionTree] = useState([]);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [csvFileData, setCsvFileData] = useState(null);
  const [editors, setEditors] = useState([]);
  const [packages, setPackages] = useState([]);
  const workerRef = useRef(null);

  const initializeWorker = (packages) => {
    setPackages(packages)
    workerRef.current = new Worker(new URL('../workers/pyodideWorker.js', import.meta.url));

    // Manejar mensajes entrantes desde el Web Worker
    workerRef.current.onmessage = (event) => {
      const { type, payload, fileName, data } = event.data;

      switch (type) {
        case 'status':
          break;
    
        case 'loaded':
          setLoadingPackages(false);
          break;
    
        case 'output':
          setOutputPyodideInput([]);
          setTimeout(() => {
            setLoadingExecution(false);
          }, 1000);
          setOutputPyodideHistory((prevHistory) => [...prevHistory, payload.resultado]);
          setOutputPyodideGraph(payload.imageDataArray || null);
          setOutputDecisionTree(payload.displayOutputsArray || null);          
          break;
    
        case 'requestInput':
          setOutputPyodideInput([payload.prompt]);
          setWaitingForInput(true);
          break;
    
        case 'error':
          setOutputPyodideInput([]);
          setTimeout(() => {
            setLoadingExecution(false);
          }, 1000);
          setOutputPyodideHistory((prevHistory) => [...prevHistory, `Error: ${payload}`]);
          break;
    
          case 'CSV_DATA': {
            if (!fileName || !data) {
              console.warn("CSV_DATA mensaje incompleto:", event.data);
              break;
            }
            // Crear Blob y forzar descarga
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName; // "datos_exportados.csv" u otro
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
  
            // -----------------------------------------------------
            // Convertir los datos binarios a string, y guardarlos
            // en el estado csvFileData para que luego Sandbox sepa
            // crear el editor:
            // -----------------------------------------------------
            let csvText = '';
            csvText = data;         
            setCsvFileData({ fileName, code: csvText });
  
            break;
          }
    
        default:
          console.warn(`Mensaje desconocido del worker: ${type}`);
          break;
      }
    };    

    // Cargar Pyodide al montar el componente
    workerRef.current.postMessage({ type: 'LOAD_PYODIDE', payload: packages });
  };

  const interruptExecution = () => {
    setLoadingExecution(false);
    if (workerRef.current) {
      workerRef.current.terminate();
      setOutputPyodideHistory((prevHistory) => [...prevHistory, 'Ejecución detenida, espera a que carguen los paquetes nuevamente']); // Agregar mensaje al historial
      setLoadingPackages(true); // Reiniciar estado de carga
      initializeWorker(packages); // Crear un nuevo worker y cargar Pyodide nuevamente
    }
  };

  // Función para ejecutar código Python
  const runPythonCode = (editorsToRun, data, editorsNotVisible={}, mode) => {
    setLoadingExecution(true);

    // Enviar el código de los editores al Web Worker para su ejecución
    workerRef.current.postMessage({
      type: 'RUN_CODE',
      payload: { editors: editorsToRun, data: data, editorsNotVisible: editorsNotVisible,  mode: mode },
    });
  };

  // Función para proporcionar input al Web Worker
  const provideInput = (userInput) => {
    setWaitingForInput(false);
    workerRef.current.postMessage({
      type: 'PROVIDE_INPUT',
      payload: { input: userInput },
    });
  };

  return {
    setEditors,
    interruptExecution,
    setLoadingExecution,
    setLoadingPackages,
    runPythonCode,
    initializeWorker,
    setOutputPyodideGraph,
    setOutputDecisionTree,
    setOutputPyodideHistory,
    provideInput,
    setCsvFileData,
    csvFileData, // Exponemos el nuevo estado
    loadingPackages,
    outputPyodideHistory, // Exponer el historial
    outputPyodideGraph,
    outputDecisionTreeGraph,
    waitingForInput,
    editors,
    loadingExecution,
    outputPyodideInput,
  };
};

export default usePyodide;
