import { graphKey } from '../graph';
import { graphToText, parseGraphText, resyncDraft } from '../text';

describe('parseGraphText', () => {
  it('lista de aristas con separadores variados', () => {
    const r = parseGraphText('A-B, B C\nC->D\nD→A', 'edges', false);
    expect(r.errors).toEqual([]);
    expect(r.graph!.vertices).toEqual(['A', 'B', 'C', 'D']);
    expect(r.graph!.edges).toHaveLength(4);
  });

  it('texto sucio: CRLF, comas finales, líneas vacías, espacios, acentos', () => {
    const r = parseGraphText('  Física - Química ,\r\n\r\nQuímica-Cálculo,,\r\n', 'edges', false);
    expect(r.errors).toEqual([]);
    expect(r.graph!.vertices).toEqual(['Física', 'Química', 'Cálculo']);
    expect(r.graph!.edges).toHaveLength(2);
  });

  it('vértice aislado como etiqueta sola', () => {
    expect(parseGraphText('A-B\nF', 'edges', false).graph!.vertices).toEqual(['A', 'B', 'F']);
  });

  it('lazo, etiqueta inválida y token ilegible', () => {
    const r = parseGraphText('A-B\nB-C\nA-A\nA$-B\nA-B-C', 'edges', false);
    expect(r.graph).toBeNull();
    expect(r.errors).toEqual([
      { line: 3, message: "Línea 3: 'A-A' es un lazo; no se permiten." },
      {
        line: 4,
        message: "Línea 4: 'A$' no es una etiqueta válida (usa letras, dígitos o _, máximo 12 caracteres).",
      },
      { line: 5, message: "Línea 5: no se entiende 'A-B-C'." },
    ]);
  });

  it('duplicados se fusionan con aviso', () => {
    const r = parseGraphText('A-B\nB-A', 'edges', false);
    expect(r.graph!.edges).toHaveLength(1);
    expect(r.warnings).toEqual([{ line: 2, message: 'Línea 2: la arista B-A está repetida; se fusionó.' }]);
  });

  it('límite de 60 vértices', () => {
    const text = Array.from({ length: 61 }, (_, i) => `v${i}`).join('\n');
    expect(parseGraphText(text, 'edges', false).errors).toEqual([
      { line: 0, message: 'El grafo tiene 61 vértices; el máximo es 60.' },
    ]);
  });

  it('lista de adyacencia (la simetría no genera avisos)', () => {
    const r = parseGraphText('A: B, C\nB: A D\nC:\nD: B', 'adjacency', false);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.graph!.vertices).toEqual(['A', 'B', 'C', 'D']);
    expect(r.graph!.edges).toHaveLength(3);
  });

  it('adyacencia sin dos puntos', () => {
    expect(parseGraphText('A B C', 'adjacency', false).errors[0].message).toBe(
      "Línea 1: falta ':' después del vértice (ejemplo: A: B, C).",
    );
  });

  it('en modo dirigido A->B y B->A son dos aristas', () => {
    expect(parseGraphText('A->B\nB->A', 'edges', true).graph!.edges).toHaveLength(2);
  });
});

describe('graphToText', () => {
  it('ida y vuelta conserva el grafo en ambos formatos', () => {
    const g = parseGraphText('A-B\nB-C\nC-A\nF', 'edges', false).graph!;
    for (const f of ['edges', 'adjacency'] as const) {
      expect(graphKey(parseGraphText(graphToText(g, f), f, false).graph!)).toBe(graphKey(g));
    }
  });

  it('formato de aristas: una por línea; dirigido usa ->', () => {
    expect(graphToText(parseGraphText('A-B', 'edges', false).graph!, 'edges')).toBe('A-B');
    expect(graphToText(parseGraphText('A->B', 'edges', true).graph!, 'edges')).toBe('A->B');
  });
});

describe('guiones tipográficos', () => {
  it('acepta – y — como separador de arista (Word los pone solos)', () => {
    const r = parseGraphText('A – B, B—C', 'edges', false);
    expect(r.errors).toEqual([]);
    expect(r.graph?.edges).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ]);
  });
});

describe('resyncDraft', () => {
  const triangle = parseGraphText('A-B, B-C, C-A', 'edges', false).graph!;
  const path = parseGraphText('X-Y', 'edges', false).graph!;

  it('si el grafo no cambió, conserva lo que el usuario escribió', () => {
    const draft = { key: graphKey(triangle), text: 'A-B, B-C, C-A, C-D' };
    expect(resyncDraft(draft, triangle, 'edges')).toBe(draft);
  });

  it('si el grafo cambió desde afuera (ejemplo, deshacer), regenera el texto en el formato actual', () => {
    const draft = { key: graphKey(triangle), text: 'A-B, B-C, C-A' };
    expect(resyncDraft(draft, path, 'edges')).toEqual({ key: graphKey(path), text: graphToText(path, 'edges') });
  });
});
