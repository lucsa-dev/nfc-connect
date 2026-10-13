import { crc32 } from "@/lib/zip";

const SIGNATURE_LENGTH = 8;

/**
 * Grava a resolução (DPI) no PNG com um bloco pHYs logo após o IHDR, para a
 * gráfica abrir a imagem no tamanho físico certo. Substitui um pHYs existente.
 */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const ihdrEnd = SIGNATURE_LENGTH + 8 + view.getUint32(SIGNATURE_LENGTH) + 4;

  // Procura um pHYs já existente para removê-lo.
  const chunks: Array<[number, number]> = [];
  for (let pos = ihdrEnd; pos + 8 <= png.length; ) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(...png.subarray(pos + 4, pos + 8));
    const end = pos + 12 + length;
    if (type !== "pHYs") chunks.push([pos, end]);
    pos = end;
  }

  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(21);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  pv.setUint32(8, ppm);
  pv.setUint32(12, ppm);
  phys[16] = 1; // unidade: metro
  pv.setUint32(17, crc32(phys.subarray(4, 17)));

  const parts = [png.subarray(0, ihdrEnd), phys, ...chunks.map(([start, end]) => png.subarray(start, end))];
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}
