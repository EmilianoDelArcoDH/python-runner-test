// public/pyodideWorker.js

// Cargar Pyodide usando importScripts
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');

let pyodide = null;
let isLoading = false;
let pendingInput = null;
let stdinInputQueue = [];
let lastInputs = [];
let packagesRun;

// Función para cargar Pyodide y los paquetes necesarios
const loadPyodideAndPackages = async (packagesToLoad) => {
  if (pyodide === null) {
    isLoading = true;
    postMessage({ type: 'status', message: 'Cargando Pyodide...' });
    try {
      // Cargar pyodide
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });
      postMessage({ type: 'status', message: 'Pyodide cargado.' });
      // Cargar micropip
      // await pyodide.loadPackage('micropip');
      // postMessage({ type: 'status', message: 'Micropip cargado.' });
      pyodide.setStdin({
        stdin: () => {
          //console.log("tengo esto: ", stdinInputQueue);
          
          // Si hay input en la cola, devolverlo
          if (stdinInputQueue.length > 0) {
            return stdinInputQueue.shift(); // Remover y devolver el primer input de la cola 
          }
          
          // Si no hay input disponible, devolver null (o undefined)
          return null;
        }
      });

      let packages = [];

      if (packagesToLoad) {
        packages = packagesToLoad;
      }
      postMessage({ type: 'status', message: 'Cargando paquetes de Pyodide...' });
      await pyodide.loadPackage(packages);
      postMessage({ type: 'status', message: 'Paquetes cargados.' });
    } catch (error) {
      postMessage({ type: 'error', payload: `Error al cargar Pyodide o paquetes: ${error.message}` });
    } finally {
      isLoading = false;
      postMessage({ type: 'loaded' });
    }
  }
};

const runPythonCode = async (editors, data = null, editorsNotVisible = {}, mode = "light") => {

  if (isLoading || pyodide === null) {
    postMessage({ type: 'error', payload: 'Pyodide aún se está cargando.' });
    return;
  }

  try {
    let graphicsColor = "default";
    if (mode === "dark") {
        graphicsColor = "dark_background";
    }

    // Transformar editorsNotVisible en un array (si existe)
    const editorsNotVisibleArray = Object.entries(editorsNotVisible).map(([id, details]) => ({
      id,
      ...details,
    }));

    // Combinar editores visibles y no visibles
    const allEditors = [...editors, ...editorsNotVisibleArray];

    // Escribir archivos en el sistema de archivos de Pyodide
    allEditors.forEach(editor => {

      const fileName = `${editor.id}`;
      pyodide.FS.writeFile(fileName, editor.code);
      
    });

    if (data) {
        // Guardar cada dataset en el sistema de archivos de Pyodide como JSON
        for (const [datasetName, datasetContent] of Object.entries(data)) {
            const filePath = `${datasetName}.json`;
            pyodide.FS.writeFile(filePath, datasetContent);
        }

        // Agregar un editor virtual para cargar los datasets
        const datasetNames = Object.keys(data);
        const datasetsCode = `
          import json

          # Lista de nombres de archivos que deseas cargar
          dataset_names = ${JSON.stringify(datasetNames)}

          # Cargar cada archivo en una variable separada
          for dataset_name in dataset_names:
              file_path = f"{dataset_name}.json"
              with open(file_path, "r") as file:
                  globals()[dataset_name] = json.load(file)
                  `;
        
        // Escribir el archivo datasets.py en Pyodide
        pyodide.FS.writeFile('datasets.py', datasetsCode);
    }

    // Ejecutar el código principal
    const result = await pyodide.runPythonAsync(`
      import sys
      import io
      import builtins
      import base64
      import importlib
      import traceback
      from js import XMLHttpRequest
      from io import StringIO
    
      ${packagesRun.includes("micropip") ? ` 
      import micropip
      await micropip.install('translate')
      await micropip.install('flask-cors')
      await micropip.install('seaborn')
      await micropip.install('scikit-learn')
      await micropip.install('ipython')
      await micropip.install('graphviz')
      await micropip.install('yellowbrick')
      await micropip.install('setuptools')
      # Sobrescribir la función display de IPython
      try:
          from IPython.display import display as original_display
      except ImportError:
          original_display = None
    
      def custom_display(*args, **kwargs):
          for obj in args:
              captured_display_outputs.append(str(obj))
          # Si deseas que se siga mostrando en consola o en el notebook, descomenta la siguiente línea:
          # if original_display: original_display(*args, **kwargs)
    
      import IPython
      IPython.display.display = custom_display
      ` : ""}
    
      ${packagesRun.includes("matplotlib") ? `
      import matplotlib.pyplot as plt
      import matplotlib
      matplotlib.use('Agg')
      def custom_show():
          global image_data
          buf = io.BytesIO()
          plt.savefig(buf, format='png')
          buf.seek(0)
          img_data = base64.b64encode(buf.read()).decode('utf-8')
          buf.close()
          # Agregamos esta imagen al arreglo
          images_data_list.append(img_data)
          # Cerramos únicamente la figura actual, para que cada llamada a show() sea una figura independiente
          plt.close('all')
      plt.show = custom_show
      ` : ''}
    
      importlib.invalidate_caches()
      ${packagesRun.includes("matplotlib") ? `plt.style.use('${graphicsColor}')` : ''}
    
      python_output = []
      python_errors = []
      input_history = []
      captured_display_outputs = []  # Variable para capturar salidas de display
      images_data_list = []

    
      class OutputRedirector(io.StringIO):
          def write(self, text):
              if text.strip():
                  input_history.append(('Output', text.strip()))
    
      sys.stdout = OutputRedirector()
      sys.stderr = OutputRedirector()
    
      editor_modules = [editor_id for editor_id in [${allEditors.map(editor => `'${editor.id.replace(/\.py$/, '')}'`).join(', ')}]]
      for module in editor_modules:
          if module in sys.modules:
              del sys.modules[module]
    
      importlib.invalidate_caches()
    
      original_input = builtins.input
      def custom_input(prompt=""):
          response = original_input(prompt)
          input_history.append(('Input', f"{response.strip()}"))
          return response
    
      builtins.input = custom_input
    
      try:
          main = importlib.import_module('main')
      except Exception:
          python_errors.append(traceback.format_exc())
      finally:
          for module in editor_modules:
              if module in sys.modules:
                  del sys.modules[module]
          
          del sys.stdout
          del sys.stderr
          sys.stdout = sys.__stdout__
          sys.stderr = sys.__stderr__
    
          captured_images = images_data_list  # Guarda las imágenes capturadas
          images_data_list = []  # Reinicia la lista para futuras ejecuciones
          builtins.input = original_input
    
      python_output = '\\n'.join([
          f">>> {entry[1]}" if entry[0] == 'Input' else entry[1]
          for entry in input_history
      ])
    
      # Retornamos también los outputs capturados de display
      ('\\n'.join(python_errors), captured_images, python_output, captured_display_outputs)
    `);
    
    //   // Función para listar archivos en un directorio dado
    // const listFilesInDir = (dir) => {
    //   try {
    //     const files = pyodide.FS.readdir(dir);
    //     return files.filter(filename => filename !== '.' && filename !== '..');
    //   } catch (error) {
    //     console.error(`No se pudo listar archivos en ${dir}:`, error);
    //     return [];
    //   }
    // };

    // console.log("Archivos en la raíz:", listFilesInDir('/'));
    // console.log("Archivos en /home/pyodide:", listFilesInDir('/home/pyodide'));

    // Verificar si alguno de los editores contiene la línea deseada
    const csvExportLine = "df.to_csv";
    const shouldExportCsv = allEditors.some(editor => editor.code.includes(csvExportLine));

    if (shouldExportCsv) {
      // Exporta los CSV antes de eliminar archivos
      exportCsvFiles();
    }
    
    // Eliminar archivos existentes
    const deleteFileIfExists = (filePath) => {
      try {
        if (pyodide.FS.lookupPath(filePath).node) {
          pyodide.FS.unlink(filePath);
          //console.log(`Archivo eliminado: ${filePath}`);
        }
      } catch (error) {
        console.warn(`No se pudo eliminar ${filePath}:`, error);
      }
    };
  
    allEditors.forEach(editor => {
      deleteFileIfExists(`/home/pyodide/${editor.id}`);
    });
  
    // Desestructurar el resultado para obtener output, errores, imageData y el último prompt
    const [errors, imageData, resultado, capturedDisplayOutputs] = result;

    const imageDataArray = imageData.toJs();

    // Convierte el PyProxy a un array nativo de JavaScript
    const displayOutputsArray = capturedDisplayOutputs.toJs();
    console.log("Contenido de capturedDisplayOutputs:", displayOutputsArray);

    // Enviar mensajes según el resultado
    if (errors) {
      if (errors.includes('EOFError: EOF when reading a line')) {
        lastInputs.forEach(element => {
          stdinInputQueue.push(element);
        });
        
        //Resultado en pendingInput innecesario?
        pendingInput = { prompt: resultado, allEditors, data, mode };

        postMessage({ type: 'requestInput', payload: { prompt: resultado } });
        
      } else {
        stdinInputQueue = [];
        lastInputs = [];
        postMessage({ type: 'error', payload: errors });
      }
    } else {
      postMessage({ type: 'output', payload: { resultado, imageDataArray, displayOutputsArray} });
      stdinInputQueue = [];
      lastInputs = [];
    }
  
  } catch (error) {
    stdinInputQueue = [];
    lastInputs = [];
    postMessage({ type: 'error', payload: this.error });
    //console.log(error);
  }
};

// Función para listar archivos CSV en el directorio /home/pyodide
const listCsvFiles = () => {
  let files = pyodide.FS.readdir('/home/pyodide');
  return files.filter(filename => filename.toLowerCase().endsWith('.csv'));
};

// Función para exportar los archivos CSV encontrados
const exportCsvFiles = () => {
  const csvFiles = listCsvFiles();
  if (csvFiles.length > 0) {
    csvFiles.forEach(fileName => {
      try {
        // Construir la ruta completa
        const fullPath = `/home/pyodide/${fileName}`;
        const csvData = pyodide.FS.readFile(fullPath, { encoding: 'utf8' });
        postMessage({
          type: 'CSV_DATA',
          fileName,
          data: csvData
        });
      } catch (error) {
        postMessage({
          type: 'error',
          payload: `Error al leer el archivo ${fileName}: ${error.message}`
        });
      }
    });
  } else {
    console.log("No se encontró ningún archivo CSV para exportar.");
  }
};



// Manejar mensajes entrantes desde el hilo principal
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  switch (type) {
    case 'LOAD_PYODIDE':
      packagesRun = payload;
      await loadPyodideAndPackages(payload);
      break;

    case 'RUN_CODE':
      if (payload && payload.editors) {
        runPythonCode(payload.editors, payload.data, payload.editorsNotVisible, payload.mode);
      } else {
        postMessage({ type: 'error', payload: 'No se proporcionaron editores para ejecutar.' });
      }
      break;

    case 'PROVIDE_INPUT':
      if (pendingInput) {
        try {
          const { input } = payload;
          const { allEditors, data, mode } = pendingInput;

          lastInputs.push(input);
          stdinInputQueue.push(input);
          
          runPythonCode(allEditors, data, {}, mode);

          // Limpiar el input pendiente
          pendingInput = null;
        } catch (error) {
          postMessage({ type: 'error', payload: `Error al proporcionar input: ${error.message}` });
        }
      } else {
        postMessage({ type: 'error', payload: 'No hay input pendiente para proporcionar.' });
      }
      break;

    default:
      postMessage({ type: 'error', payload: `Tipo de mensaje desconocido: ${type}` });
      break;
  }
};
