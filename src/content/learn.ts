import type { DocKey } from '@/state/storage';

export type LearnBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  /** Botón "Probar": carga el ejemplo `exampleId` en el módulo `module`. */
  | { kind: 'try'; module: DocKey; exampleId: string; label: string };

export interface LearnTopic {
  id: string;
  title: string;
  blocks: LearnBlock[];
}

export interface LearnSection {
  id: 'coloring' | 'precedence';
  title: string;
  topics: LearnTopic[];
}

const text = (t: string): LearnBlock => ({ kind: 'text', text: t });
const list = (...items: string[]): LearnBlock => ({ kind: 'list', items });
const tryColoring = (exampleId: string, label: string): LearnBlock => ({ kind: 'try', module: 'coloring', exampleId, label });
const tryPrecedence = (exampleId: string, label: string): LearnBlock => ({
  kind: 'try',
  module: 'precedence',
  exampleId,
  label,
});

/** Teoría de la pestaña Aprende (§7.6 del diseño): corta, offline y con un ejemplo para probar cada idea. */
export const LEARN_SECTIONS: readonly LearnSection[] = [
  {
    id: 'coloring',
    title: 'Coloración',
    topics: [
      {
        id: 'coloracion-propia',
        title: 'Coloración propia',
        blocks: [
          text('Colorear un grafo es asignar un color a cada vértice. La coloración es propia cuando los dos extremos de cada arista tienen colores distintos.'),
          text('En la app los colores se numeran 1, 2, 3… porque no importa el tono, sino cuántos colores distintos se usan.'),
          text('Una k-coloración usa como mucho k colores. Los vértices de un mismo color forman una clase: un conjunto independiente, es decir, sin aristas entre ellos.'),
          tryColoring('c4', 'Ciclo C₄'),
        ],
      },
      {
        id: 'numero-cromatico',
        title: 'Número cromático χ(G)',
        blocks: [
          text('El número cromático χ(G) es el menor k para el que existe una coloración propia con k colores.'),
          list(
            'χ(G) = 1 si y solo si el grafo no tiene aristas.',
            'χ(G) ≤ 2 si y solo si el grafo es bipartito.',
            'χ(Kₙ) = n: en un grafo completo todos los vértices son vecinos entre sí.',
          ),
          text('Encontrar una coloración con pocos colores es fácil; demostrar que no se puede con menos es lo difícil. Decidir si χ(G) ≤ k es NP-completo para k ≥ 3, por eso la app combina heurísticas rápidas con una búsqueda exacta.'),
          tryColoring('k5', 'Completo K₅'),
        ],
      },
      {
        id: 'cotas',
        title: 'Cotas de χ(G)',
        blocks: [
          text('Antes de buscar conviene acotar. Estas son las cotas que usa la app:'),
          list(
            'Triviales: 1 ≤ χ(G) ≤ n, y χ(G) ≥ 2 en cuanto hay una arista.',
            'Clique: χ(G) ≥ ω(G), el tamaño del mayor subgrafo completo, porque sus vértices necesitan colores distintos.',
            'Ciclo impar: si el grafo tiene un ciclo de longitud impar, χ(G) ≥ 3.',
            'Grado máximo: χ(G) ≤ Δ(G) + 1, porque cada vértice tiene como mucho Δ vecinos y siempre queda un color libre.',
            'Brooks (1941): si G es conexo y no es un grafo completo ni un ciclo impar, entonces χ(G) ≤ Δ(G).',
          ),
          text('Las dos excepciones de Brooks son justas: Kₙ tiene Δ = n − 1 y χ = n, y un ciclo impar tiene Δ = 2 y χ = 3.'),
          text('Cuando la cota inferior coincide con los colores que usó una heurística, ya se sabe χ(G) sin buscar más.'),
          tryColoring('c5', 'C₅, una excepción de Brooks'),
          tryColoring('petersen', 'Petersen: Δ = 3 y χ = 3'),
        ],
      },
      {
        id: 'konig',
        title: 'Bipartitos y el teorema de König',
        blocks: [
          text('Un grafo es bipartito si sus vértices se pueden repartir en dos grupos de modo que toda arista vaya de un grupo al otro.'),
          text('Teorema de König (1936): un grafo es bipartito si y solo si no tiene ciclos de longitud impar. Dicho con colores, si y solo si χ(G) ≤ 2.'),
          text('Para comprobarlo basta un recorrido en anchura: se alternan dos colores por niveles y, si una arista une dos vértices del mismo color, hay un ciclo impar.'),
          tryColoring('k33', 'K₃,₃ es bipartito'),
          tryColoring('c5', 'C₅ tiene un ciclo impar'),
        ],
      },
      {
        id: 'cuatro-colores',
        title: 'Teorema de los cuatro colores',
        blocks: [
          text('Todo grafo planar, es decir, que se puede dibujar sin que se crucen aristas, cumple χ(G) ≤ 4.'),
          text('Lo demostraron Kenneth Appel y Wolfgang Haken en 1976 con ayuda de una computadora, que revisó casi 2000 configuraciones. Fue la primera gran demostración que dependió de un programa.'),
          text('Por eso un mapa en el que cada país es una sola región se puede pintar con cuatro colores sin que dos vecinos compartan color: cada país es un vértice y cada frontera, una arista.'),
          text('El teorema no dice que todo grafo use 4 colores: K₅ necesita 5, y no es planar.'),
          tryColoring('w5', 'Rueda W₅: planar y con χ = 4'),
        ],
      },
      {
        id: 'algoritmos',
        title: 'Cómo funciona cada algoritmo',
        blocks: [
          text('La app ofrece cinco opciones. Las tres heurísticas son rápidas, pero no siempre encuentran el óptimo:'),
          list(
            'Greedy (orden de entrada): recorre los vértices en el orden en que se escribieron y a cada uno le da el menor color libre. Cuesta O(n + m), pero el resultado depende mucho del orden.',
            'Welsh-Powell: ordena los vértices de mayor a menor grado y barre la lista una vez por color, dando ese color a cada vértice que no tenga un vecino que ya lo use. Cuesta O(n log n) ordenar y O(n + m) cada barrido.',
            'DSATUR (Brélaz, 1979): elige siempre el vértice sin color que ve más colores distintos entre sus vecinos (su saturación); si empatan, el de mayor grado. Suele usar menos colores que los otros dos y es exacto en bipartitos. Una versión sencilla cuesta O(n²).',
          ),
          text('Las otras dos opciones garantizan el resultado:'),
          list(
            'Exacto (backtracking): prueba k = cota inferior, k + 1, … y para cada k busca en profundidad una coloración con k colores, retrocediendo en cuanto hay un conflicto. Da χ(G) demostrado, pero en el peor caso es exponencial.',
            'Auto: lanza el exacto con un límite de 3 segundos. Si termina, muestra χ(G); si no, usa DSATUR y muestra entre qué cotas está χ(G).',
          ),
          text('En los resultados, «Comparar los 5 algoritmos» los pone lado a lado y el reproductor muestra en qué orden pinta cada uno.'),
          tryColoring('exams', 'Horario de exámenes'),
        ],
      },
      {
        id: 'casos-especiales',
        title: 'Casos especiales',
        blocks: [
          list(
            'Completo Kₙ: χ = n.',
            'Ciclo Cₙ: χ = 2 si n es par y χ = 3 si n es impar.',
            'Árbol con al menos una arista: χ = 2, porque no tiene ciclos y por tanto es bipartito.',
            'Bipartito con aristas: χ = 2, como K₃,₃ o el cubo Q₃.',
            'Rueda Wₙ, que en esta app es un ciclo Cₙ más un centro unido a todos: χ = 3 si n es par y χ = 4 si n es impar.',
            'Grafo de Petersen: 10 vértices, cada uno de grado 3, y χ = 3. No tiene triángulos, pero sí ciclos de 5.',
          ),
          text('Cada caso tiene su ejemplo:'),
          tryColoring('k5', 'Completo K₅'),
          tryColoring('c4', 'Ciclo par C₄'),
          tryColoring('c5', 'Ciclo impar C₅'),
          tryColoring('tree', 'Árbol'),
          tryColoring('q3', 'Cubo Q₃'),
          tryColoring('w6', 'Rueda W₆ (n par)'),
          tryColoring('w5', 'Rueda W₅ (n impar)'),
          tryColoring('petersen', 'Grafo de Petersen'),
        ],
      },
      {
        id: 'aplicaciones',
        title: 'Aplicaciones',
        blocks: [
          list(
            'Horarios de exámenes: cada materia es un vértice y se unen las que comparten estudiantes. Cada color es una franja horaria, y χ(G) es el menor número de franjas.',
            'Frecuencias de radio: las antenas cercanas que se interfieren no pueden usar la misma frecuencia.',
            'Registros en compiladores: las variables que están vivas al mismo tiempo no pueden compartir registro.',
            'Mapas: países vecinos con colores distintos; por el teorema de los cuatro colores bastan 4.',
            'Sudoku: es una coloración con 9 colores de un grafo de 81 casillas en el que se unen las de la misma fila, columna o caja, con algunos colores ya puestos.',
          ),
          tryColoring('exams', 'Horario de exámenes'),
        ],
      },
      {
        id: 'preguntas',
        title: 'Preguntas frecuentes',
        blocks: [
          text('¿Por qué DSATUR y Welsh-Powell dan resultados distintos?'),
          text('Porque eligen los vértices en otro orden. Ninguna heurística garantiza el óptimo en todos los grafos.'),
          text('Si una heurística usa k colores, ¿χ(G) = k?'),
          text('No necesariamente: solo se sabe que χ(G) ≤ k. Es óptima cuando k coincide con una cota inferior, como el tamaño de una clique, o cuando lo confirma el algoritmo exacto.'),
          text('¿Por qué a veces el exacto no termina?'),
          text('Porque el problema es NP-difícil y los casos crecen de forma exponencial. Si se acaba el tiempo, la app muestra las cotas y la mejor coloración encontrada.'),
          text('¿La dirección de las flechas cambia la coloración?'),
          text('No. Para colorear solo importa qué vértices son vecinos; un grafo dirigido se colorea como si sus aristas no tuvieran dirección.'),
          text('¿Puedo practicar a mano?'),
          text('Sí. En Colorear toca «Colorea tú», pinta los vértices y usa «Comprobar» para compararte con χ(G).'),
        ],
      },
    ],
  },
  {
    id: 'precedence',
    title: 'Precedencias',
    topics: [
      {
        id: 'que-es',
        title: 'Qué es un grafo de precedencia',
        blocks: [
          text('Un grafo de precedencia representa un proyecto: cada vértice es una actividad y cada flecha A → B dice que A debe terminar antes de que B empiece.'),
          text('Es un grafo dirigido y sin ciclos. Sirve para planificar obras, desarrollo de software, recetas o cualquier trabajo con pasos que dependen de otros.'),
          tryPrecedence('presentation', 'Preparar una exposición'),
        ],
      },
      {
        id: 'tabla-y-grafo',
        title: 'Tabla y grafo',
        blocks: [
          text('La tabla de precedencias lista cada actividad con su código, su duración y sus predecesoras inmediatas: las que deben terminar justo antes.'),
          text('El grafo dibuja lo mismo: una flecha de cada predecesora a su actividad. En la app puedes editar en la Tabla, en el Grafo o en la Matriz, y las tres vistas cambian juntas.'),
          text('Solo se anotan las predecesoras inmediatas: si A va antes de B y B antes de C, no hace falta escribir A como predecesora de C.'),
          tryPrecedence('homework', 'Tarea de la plataforma'),
        ],
      },
      {
        id: 'etapas',
        title: 'Etapas',
        blocks: [
          text('Las etapas agrupan las actividades que pueden hacerse al mismo tiempo. La regla es:'),
          list(
            'Etapa 1: las actividades sin predecesoras.',
            'Se retiran las de la etapa anterior; las que quedan sin predecesoras forman la etapa siguiente.',
            'Equivale a: etapa de una actividad = 1 + la mayor etapa de sus predecesoras.',
          ),
          text('Las actividades de una misma etapa no dependen entre sí, así que pueden avanzar en paralelo. El número de etapas es la cantidad de vértices del camino más largo.'),
          tryPrecedence('homework', 'Tarea: 8 etapas'),
        ],
      },
      {
        id: 'orden-topologico',
        title: 'Orden topológico',
        blocks: [
          text('Un orden topológico es una lista de todas las actividades en la que cada una aparece después de sus predecesoras: un orden en el que se podría hacer el proyecto, una actividad tras otra.'),
          text('Leer las etapas una tras otra da un orden topológico. Suele haber muchos, porque dentro de una etapa el orden es libre.'),
          text('El algoritmo de Kahn lo construye retirando una y otra vez las actividades que ya no tienen predecesoras pendientes. Cuesta O(n + m).'),
          tryPrecedence('presentation', 'Preparar una exposición'),
        ],
      },
      {
        id: 'sin-ciclos',
        title: 'Por qué no puede haber ciclos',
        blocks: [
          text('Si A va antes de B, B antes de C y C antes de A, ninguna de las tres puede empezar: cada una espera a otra. Un ciclo hace imposible el proyecto.'),
          text('Con un ciclo no existe orden topológico, así que no hay etapas ni ruta crítica. La app lo detecta y muestra qué actividades lo forman para que corrijas la tabla.'),
        ],
      },
      {
        id: 'ruta-critica',
        title: 'Ruta crítica y holgura',
        blocks: [
          text('Con las duraciones se calcula, para cada actividad:'),
          list(
            'IT, inicio temprano: lo antes que puede empezar. Es el mayor FT de sus predecesoras, o 0 si no tiene.',
            'FT, fin temprano: IT + duración.',
            'FL, fin tardío: lo más tarde que puede terminar sin retrasar el proyecto. Es el menor IL de sus sucesoras, o la duración del proyecto si no tiene.',
            'IL, inicio tardío: FL − duración.',
            'Holgura: IL − IT, cuánto puede retrasarse sin retrasar el proyecto.',
          ),
          text('La duración del proyecto es el mayor FT. Las actividades con holgura 0 son críticas y forman la ruta crítica: el camino más largo si se suman las duraciones. Retrasar cualquiera de ellas retrasa todo el proyecto.'),
          tryPrecedence('homework', 'Tarea: ruta crítica de 14 semanas'),
          tryPrecedence('presentation', 'Exposición: actividades con holgura'),
        ],
      },
      {
        id: 'conexion-coloracion',
        title: 'Conexión con la coloración',
        blocks: [
          text('Si se quitan las direcciones, pintar cada actividad con el número de su etapa da una coloración propia: cada flecha va de una etapa menor a una mayor, así que sus extremos nunca comparten color.'),
          text('Por eso χ(G) ≤ número de etapas. El teorema de Gallai–Hasse–Roy–Vitaver va más allá: χ(G) es el mínimo, entre todas las orientaciones sin ciclos de G, del número de vértices del camino dirigido más largo.'),
          text('En los resultados de Precedencias, «Ver etapas como coloración» abre el grafo en Colorear para comparar las etapas con χ(G).'),
          tryColoring('homework', 'La tarea sin direcciones'),
        ],
      },
    ],
  },
];
