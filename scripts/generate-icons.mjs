// Genera los íconos PWA sin dependencias externas (usa zlib nativo).
// Tile naranja de obra (#d9700a) con una casita blanca centrada dentro de la
// zona segura, así el mismo dibujo sirve para íconos "any" y "maskable".
// Regenerar: `node scripts/generate-icons.mjs`
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const BG = [0xd9, 0x70, 0x0a];
const FG = [0xff, 0xff, 0xff];

// CRC32
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

// ¿El píxel (x,y) es parte de la casita? Coordenadas normalizadas 0..1.
function esCasa(u, v) {
  // Techo: triángulo, apex (0.5,0.20) base y=0.46 entre x 0.22..0.78
  if (v >= 0.2 && v <= 0.46) {
    const prog = (v - 0.2) / (0.46 - 0.2); // 0 en apex, 1 en base
    const half = 0.28 * prog;
    if (u >= 0.5 - half && u <= 0.5 + half) return true;
  }
  // Cuerpo: rectángulo 0.30..0.70 x, 0.46..0.80 y
  if (u >= 0.3 && u <= 0.7 && v >= 0.46 && v <= 0.8) {
    // Puerta calada 0.44..0.56 x, 0.58..0.80 y
    if (u >= 0.44 && u <= 0.56 && v >= 0.58 && v <= 0.8) return false;
    return true;
  }
  return false;
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      const c = esCasa((x + 0.5) / size, (y + 0.5) / size) ? FG : BG;
      raw[p++] = c[0];
      raw[p++] = c[1];
      raw[p++] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-192.png", 192],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(OUT, name), png(size));
  console.log("icono:", name);
}
console.log("Listo en public/icons/");
