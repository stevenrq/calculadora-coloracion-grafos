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
