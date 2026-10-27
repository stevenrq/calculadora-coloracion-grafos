const zlib = require('zlib');

const { encodePng } = require('../png');

/** Recorre los bloques del PNG: { type, data, crcOk }. */
function chunks(png) {
  const out = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const typeAndData = png.subarray(at + 4, at + 8 + length);
    const crc = png.readUInt32BE(at + 8 + length);
    out.push({ type: typeAndData.toString('ascii', 0, 4), data: typeAndData.subarray(4), crcOk: zlib.crc32(typeAndData) === crc });
    at += 12 + length;
  }
  return out;
}

it('escribe un PNG RGBA de 8 bits válido', () => {
  const png = encodePng(2, 1, new Uint8Array([255, 0, 0, 255, 0, 0, 255, 128]));
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const [ihdr, idat, iend] = chunks(png);
  expect([ihdr.type, idat.type, iend.type]).toEqual(['IHDR', 'IDAT', 'IEND']);
  expect([ihdr.crcOk, idat.crcOk, iend.crcOk]).toEqual([true, true, true]);
  expect(ihdr.data.readUInt32BE(0)).toBe(2);
  expect(ihdr.data.readUInt32BE(4)).toBe(1);
  expect([ihdr.data[8], ihdr.data[9]]).toEqual([8, 6]); // 8 bits por canal, RGBA

  // Cada fila empieza con el byte de filtro (0 = sin filtro) y sigue con 4 bytes por píxel.
  expect([...zlib.inflateSync(idat.data)]).toEqual([0, 255, 0, 0, 255, 0, 0, 255, 128]);
});
