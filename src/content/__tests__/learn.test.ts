import { type LearnBlock, LEARN_SECTIONS } from '@/content/learn';
import { findExample } from '@/lib/examples/coloring-examples';
import { findPrecedenceExample } from '@/lib/examples/precedence-examples';

const topic = (id: string) => LEARN_SECTIONS.flatMap((s) => s.topics).find((t) => t.id === id);
const allBlocks = LEARN_SECTIONS.flatMap((s) => s.topics.flatMap((t) => t.blocks));
const tries = allBlocks.filter((b): b is Extract<LearnBlock, { kind: 'try' }> => b.kind === 'try');

/** Todo el texto visible: títulos, párrafos, listas y etiquetas de los botones. */
const allTexts = [
  ...LEARN_SECTIONS.map((s) => s.title),
  ...LEARN_SECTIONS.flatMap((s) => s.topics.map((t) => t.title)),
  ...allBlocks.flatMap((b) => (b.kind === 'text' ? [b.text] : b.kind === 'list' ? b.items : [b.label])),
];

describe('contenido de Aprende', () => {
  it('tiene dos secciones: Coloración y Precedencias', () => {
    expect(LEARN_SECTIONS.map((s) => [s.id, s.title])).toEqual([
      ['coloring', 'Coloración'],
      ['precedence', 'Precedencias'],
    ]);
  });

  it('cubre los temas del diseño (§7.6)', () => {
    expect(LEARN_SECTIONS[0].topics.map((t) => t.id)).toEqual([
      'coloracion-propia',
      'numero-cromatico',
      'cotas',
      'konig',
      'cuatro-colores',
      'algoritmos',
      'casos-especiales',
      'aplicaciones',
      'preguntas',
    ]);
    expect(LEARN_SECTIONS[1].topics.map((t) => t.id)).toEqual([
      'que-es',
      'tabla-y-grafo',
      'etapas',
      'orden-topologico',
      'sin-ciclos',
      'ruta-critica',
      'conexion-coloracion',
    ]);
  });

  it('cada «Probar» abre un ejemplo que existe en su módulo', () => {
    expect(tries.length).toBeGreaterThan(0);
    for (const t of tries) {
      const find = t.module === 'coloring' ? findExample : findPrecedenceExample;
      expect(() => find(t.exampleId)).not.toThrow();
    }
  });

  it.each(['casos-especiales', 'konig', 'etapas', 'ruta-critica'])('«%s» tiene al menos un «Probar»', (id) => {
    expect(topic(id)?.blocks.some((b) => b.kind === 'try')).toBe(true);
  });

  it('sin pendientes ni comillas rectas', () => {
    for (const text of allTexts) {
      expect(text).not.toMatch(/TODO/);
      expect(text).not.toContain('"');
    }
  });

  it('todo párrafo termina en punto, signo de pregunta o dos puntos', () => {
    for (const b of allBlocks) if (b.kind === 'text') expect(b.text).toMatch(/[.?:]$/);
  });
});
