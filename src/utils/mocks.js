// mocks.js
export const exerciseMocks = {
    "tipoDatos-01-02": `
# Mock para tipoDatos-01-02
sabor = "chocolate"
`,

    "tipoDatos-02": `
# Mock para tipoDatos-02
edad = 25
edadFutura = edad + 18
`,

    "modulo-01": `
# Mock para modulo-01
num1 = 5
num2 = 4
num3 = 6
num4 = 7
num5 = 3
total = num1 + num2 + num3 + num4 + num5
`,

    "modulo-02": `
# Mock para modulo-02
ahora = __import__("datetime").datetime.now()
fecha = __import__("datetime").datetime(2000, 1, 1)
diferencia = ahora - fecha
diferenciaEnDias = diferencia.days
anios = diferenciaEnDias / 365
`,

    "funciones-01": `

`,

    "tipoDatos-01-01": `
# Mock para tipoDatos-01-01
numA = 2
numB = 3
total = numA + numB
`,

    "tipoDatos-01-03": `
# Mock para tipoDatos-01-03
numA = 3
numB = 4
resultado = int(numA) * int(numB)
`,

    "listas01-01": `
# Mock para listas01-01
notas = [10, 4, 6, 5, 10, 8, 9, 4]
sumaNotas = sum(notas)
cantidadNotas = len(notas)
promedio = sumaNotas / cantidadNotas
`,

    "listas01-02": `
# Mock para listas01-02
animales = ["Avestruz", "León", "Elefante", "Gorila", "Ballenas", "Caballo", "Gallina", "Hámster", "Perro", "Gato"]
animalesDomesticos = animales[5:]
animalesDomesticos.sort()
animalesSalvajes = animales[:5]
animalesSalvajes.sort()
`,

    "listas01-03": `
# Mock para listas01-03
frutas = ["pistacho", "Mandarina", "Patata", "Naranja", "Pomelo", "Coco", "Tomate", "Kiwi", "Mango", "Cebolla"]
frutas[2] = "Fresa"
frutas[6] = "Manzana"
frutas[9] = "Durazno"
frutas.sort()
`,

    "diccionario-01-03": `
# Mock para diccionario-01-03
superheroe = {}
superheroe["nombre"] = "Spiderman"
superheroe["edad"] = 18
superheroe["ciudad"] = "Nueva York"
superheroe["identidadSecreta"] = "Peter Parker"
superheroe["enemigos"] = ["Duende Verde", "Doctor Octopus"]
superheroe["poderes"] = ["Agilidad", "Telarañas", "Fuerza"]
`,

    "diccionario-01-04": `
# Mock para diccionario-01-04
pelicula1 = {"título": "Matrix", "protagonista": "Neo", "genero": "Ciencia Ficción", "duracion": "2h"}
pelicula2 = {"título": "Titanic", "protagonista": "Jack", "genero": "Romance", "duracion": "3h"}
pelicula3 = {"título": "Inception", "protagonista": "Dom Cobb", "genero": "Ciencia Ficción", "duracion": "2h30m"}
pelicula4 = {"título": "El Padrino", "protagonista": "Vito Corleone", "genero": "Drama", "duracion": "3h"}
pelicula5 = {"título": "Jurassic Park", "protagonista": "Alan Grant", "genero": "Aventura", "duracion": "2h"}
pelicula6 = {"título": "Avatar", "protagonista": "Jake Sully", "genero": "Ciencia Ficción", "duracion": "2h40m"}
`,

};
