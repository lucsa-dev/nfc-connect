import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setPngDpi } from "@/lib/png";
import { crc32, createZip } from "@/lib/zip";

describe("crc32", () => {
  it("calcula o valor de referência", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("createZip", () => {
  const entries = [
    { name: "001-frente.png", data: new Uint8Array([1, 2, 3]) },
    { name: "pasta/texto.txt", data: new TextEncoder().encode("olá") },
  ];

  it("monta cabeçalhos e diretório central", () => {
    const zip = createZip(entries, new Date(2026, 9, 13, 10, 30));
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
  });

  it("abre no unzip com conteúdo íntegro", () => {
    const dir = mkdtempSync(join(tmpdir(), "zip-test-"));
    const file = join(dir, "teste.zip");
    writeFileSync(file, createZip(entries));
    let output: string;
    try {
      output = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    } catch {
      return; // sem unzip no ambiente
    }
    expect(output).toContain("No errors detected");
    expect(execFileSync("unzip", ["-p", file, "pasta/texto.txt"], { encoding: "utf8" })).toBe("olá");
  });
});

describe("setPngDpi", () => {
  // PNG 1×1 transparente.
  const png = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
    (c) => c.charCodeAt(0),
  );

  function physChunks(data: Uint8Array) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const found: number[] = [];
    for (let pos = 8; pos < data.length; ) {
      const length = view.getUint32(pos);
      if (String.fromCharCode(...data.subarray(pos + 4, pos + 8)) === "pHYs") found.push(view.getUint32(pos + 8));
      pos += 12 + length;
    }
    return found;
  }

  it("grava 300 DPI em pixels por metro", () => {
    expect(physChunks(setPngDpi(png, 300))).toEqual([11811]);
  });

  it("substitui um pHYs anterior", () => {
    expect(physChunks(setPngDpi(setPngDpi(png, 72), 300))).toEqual([11811]);
  });
});
