#!/usr/bin/env node

/**
 * Genera el ícono y la pantalla de bienvenida de ColorGrafos: una rueda W₃ (χ = 4) con cuatro colores de la paleta.
 * Sin dependencias: dibuja círculos y segmentos con antialias por supermuestreo y escribe PNG con scripts/png.js.
 * Uso: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const { encodePng } = require('./png');

const PRIMARY = '#3B5BDB'; // primario del tema claro (src/constants/theme.ts)
const WHITE = '#FFFFFF';
// De GRAPH_COLORS (src/constants/palette.ts): bermellón, verde azulado, amarillo y celeste.
const VERTEX_COLORS = ['#D55E00', '#009E73', '#F0E442', '#56B4E9'];
const SAMPLES = 4; // 4×4 muestras por píxel

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Rueda W₃ centrada en el lienzo (coordenadas de 0 a 1). `radius` es el radio del triángulo.
 * El dibujo llega hasta 1,511 × radius del centro: con 0,20 cabe en la zona segura del ícono adaptativo (0,305).
 */
function wheel(radius, { mono = false } = {}) {
  const shift = radius / 4; // la caja del triángulo va de −R a R/2: se baja R/4 para centrarla
  const outer = [-90, 30, 150].map((deg) => ({
    x: 0.5 + radius * Math.cos((deg * Math.PI) / 180),
    y: 0.5 + shift + radius * Math.sin((deg * Math.PI) / 180),
  }));
  const points = [...outer, { x: 0.5, y: 0.5 + shift }];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
    [0, 3],
    [1, 3],
    [2, 3],
  ];
  const vertexRadius = radius * 0.3;
  const ring = radius * 0.065;
  return [
    ...edges.map(([a, b]) => ({ kind: 'segment', a: points[a], b: points[b], half: radius * 0.055, color: WHITE })),
    ...points.flatMap((c, i) => [
      { kind: 'circle', c, r: vertexRadius + ring, color: WHITE },
      { kind: 'circle', c, r: vertexRadius, color: mono ? WHITE : VERTEX_COLORS[i] },
    ]),
  ];
}

function covers(shape, u, v) {
  if (shape.kind === 'circle') return (u - shape.c.x) ** 2 + (v - shape.c.y) ** 2 <= shape.r ** 2;
  // Segmento con extremos redondeados: distancia del punto al segmento.
  const { a, b } = shape;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((u - a.x) * dx + (v - a.y) * dy) / (dx * dx + dy * dy)));
  return (u - a.x - t * dx) ** 2 + (v - a.y - t * dy) ** 2 <= shape.half ** 2;
}

function bounds(shape, size) {
  const pad = shape.kind === 'circle' ? shape.r : shape.half;
  const xs = shape.kind === 'circle' ? [shape.c.x] : [shape.a.x, shape.b.x];
  const ys = shape.kind === 'circle' ? [shape.c.y] : [shape.a.y, shape.b.y];
  return {
    x0: Math.floor((Math.min(...xs) - pad) * size),
    x1: Math.ceil((Math.max(...xs) + pad) * size),
    y0: Math.floor((Math.min(...ys) - pad) * size),
    y1: Math.ceil((Math.max(...ys) + pad) * size),
  };
}

/** Dibuja las figuras en orden (la última queda arriba) sobre `background`, o sobre transparente si es null. */
function render(size, shapes, background) {
  const pixels = new Uint8Array(size * size * 4);
  const bg = background && rgb(background);
  const prepared = shapes.map((s) => ({ ...s, rgb: rgb(s.color), box: bounds(s, size) }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const near = prepared.filter((s) => x >= s.box.x0 && x <= s.box.x1 && y >= s.box.y0 && y <= s.box.y1);
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const u = (x + (sx + 0.5) / SAMPLES) / size;
          const v = (y + (sy + 0.5) / SAMPLES) / size;
          let color = bg;
          for (const s of near) if (covers(s, u, v)) color = s.rgb;
          if (!color) continue;
          r += color[0];
          g += color[1];
          b += color[2];
          hits++;
        }
      }
      // Todas las figuras son opacas: promediar solo las muestras cubiertas da el color con alfa correcto.
      const i = (y * size + x) * 4;
      if (hits > 0) {
        pixels[i] = Math.round(r / hits);
        pixels[i + 1] = Math.round(g / hits);
        pixels[i + 2] = Math.round(b / hits);
      }
      pixels[i + 3] = Math.round((255 * hits) / (SAMPLES * SAMPLES));
    }
  }
  return encodePng(size, size, pixels);
}

const OUTPUTS = [
  { file: 'icon.png', size: 1024, shapes: wheel(0.27), background: PRIMARY },
  { file: 'android-icon-foreground.png', size: 1024, shapes: wheel(0.2), background: null },
  { file: 'android-icon-monochrome.png', size: 1024, shapes: wheel(0.2, { mono: true }), background: null },
  { file: 'splash-icon.png', size: 1024, shapes: wheel(0.3), background: null },
  { file: 'favicon.png', size: 48, shapes: wheel(0.27), background: PRIMARY },
];

const dir = path.join(__dirname, '..', 'assets', 'images');
for (const { file, size, shapes, background } of OUTPUTS) {
  fs.writeFileSync(path.join(dir, file), render(size, shapes, background));
  console.log(`assets/images/${file} (${size}×${size})`);
}
