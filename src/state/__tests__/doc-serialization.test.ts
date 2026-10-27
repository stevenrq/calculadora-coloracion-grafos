import { parseGraphText } from '@/lib/graph/text';
import { deserializeDoc, serializeDoc } from '../doc-serialization';

const doc = {
  graph: parseGraphText('A-B', 'edges', false).graph!,
  positions: { A: { x: 1, y: 2 }, B: { x: 3, y: 4 } },
};

it('ida y vuelta', () => expect(deserializeDoc(serializeDoc(doc))).toEqual(doc));

it.each([
  ['null', null],
  ['basura', '{no es json'],
  ['otra versión', JSON.stringify({ ...JSON.parse(serializeDoc(doc)), version: 2 })],
  ['arista a vértice inexistente', serializeDoc({ ...doc, graph: { ...doc.graph, edges: [['A', 'Z']] } })],
  ['falta posición', serializeDoc({ ...doc, positions: { A: { x: 1, y: 2 } } })],
])('%s → null', (_n, text) => expect(deserializeDoc(text as string | null)).toBeNull());

describe('documento de precedencias', () => {
  const precedence = {
    graph: { directed: true, vertices: ['A', 'B'], edges: [['A', 'B']] as [string, string][] },
    positions: { A: { x: 1, y: 2 }, B: { x: 3, y: 4 } },
    activities: { A: { name: 'Requisitos', duration: 2 }, B: { name: '', duration: null } },
    unit: 'días' as const,
  };
  const withData = (patch: Record<string, unknown>) => JSON.stringify({ ...JSON.parse(serializeDoc(precedence)), ...patch });

  it('ida y vuelta con actividades y unidad', () => {
    expect(deserializeDoc(serializeDoc(precedence))).toEqual(precedence);
  });

  it('un documento de coloración no gana campos de precedencias', () => {
    expect(Object.keys(deserializeDoc(serializeDoc(doc)) ?? {}).sort()).toEqual(['graph', 'positions']);
  });

  it('en dirigido, A → B y B → A son flechas distintas', () => {
    const both = { ...precedence, graph: { ...precedence.graph, edges: [['A', 'B'], ['B', 'A']] as [string, string][] } };
    expect(deserializeDoc(serializeDoc(both))).not.toBeNull();
  });

  it.each([
    ['unidad desconocida', withData({ unit: 'años' })],
    ['nombre de más de 80 caracteres', withData({ activities: { A: { name: 'x'.repeat(81), duration: 1 } } })],
    ['duración negativa', withData({ activities: { A: { name: '', duration: -1 } } })],
    ['flecha repetida', withData({ edges: [['A', 'B'], ['A', 'B']] })],
    ['actividad null', withData({ activities: { A: null } })],
    ['actividad que no es objeto', withData({ activities: { A: 'Requisitos' } })],
  ])('%s → null', (_n, text) => expect(deserializeDoc(text)).toBeNull());
});

it('en no dirigido, A-B y B-A son la misma arista repetida → null', () => {
  expect(deserializeDoc(serializeDoc({ ...doc, graph: { ...doc.graph, edges: [['A', 'B'], ['B', 'A']] } }))).toBeNull();
});
