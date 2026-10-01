/**
 * Pure TypeScript ISO/IEC 18004 QR Code matrix generator (Byte mode, ECC Level L)
 * for generating scannable UPI QR codes (`upi://pay?pa=putinservai-1@okhdfcbank...`)
 * with zero external runtime dependencies or third-party tracking requests.
 */

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewords: number;
  alignment: number[];
}

// ISO/IEC 18004 specs for Versions 1..6 at Error Correction Level L (1 single block)
const VERSION_SPECS_L: VersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 19, ecCodewords: 7, alignment: [] },
  { version: 2, size: 25, dataCodewords: 34, ecCodewords: 10, alignment: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecCodewords: 15, alignment: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecCodewords: 20, alignment: [6, 26] },
  { version: 5, size: 37, dataCodewords: 108, ecCodewords: 26, alignment: [6, 30] },
  { version: 6, size: 41, dataCodewords: 136, ecCodewords: 18, alignment: [6, 34] },
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) {
      rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const spec =
    VERSION_SPECS_L.find((s) => bytes.length + 2 <= s.dataCodewords) || VERSION_SPECS_L[4];

  // Encode byte mode (0100) + 8-bit length + payload + terminator + pad bytes
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = spec.dataCodewords * 8;
  const term = Math.min(4, maxBits - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataWords = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataWords[i] = byte;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < spec.dataCodewords; i++, p ^= 1) {
    dataWords[i] = padBytes[p];
  }

  const ecWords = computeReedSolomon(dataWords, spec.ecCodewords);
  const allWords = new Uint8Array(dataWords.length + ecWords.length);
  allWords.set(dataWords, 0);
  allWords.set(ecWords, dataWords.length);

  const n = spec.size;
  const modules: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const isFunc: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < n && c >= 0 && c < n) {
      modules[r][c] = val;
      isFunc[r][c] = true;
    }
  };

  const placeFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inOuter = dr >= 0 && dr <= 6 && (dc === 0 || dc === 6);
        const inTopBot = dc >= 0 && dc <= 6 && (dr === 0 || dr === 6);
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter || inTopBot || inCenter);
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const align = spec.alignment;
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = align[i];
      const cc = align[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunc(cr + dr, cc + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // Reserve format info + dark module
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunc[8][i] = true;
      isFunc[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][n - 1 - i] = true;
    isFunc[n - 1 - i][8] = true;
  }
  setFunc(n - 8, 8, true);

  // Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = allWords.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? n - 1 - vert : vert;
        if (!isFunc[r][c] && bitIdx < totalBits) {
          const bit = ((allWords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) !== 0;
          modules[r][c] = bit;
          bitIdx++;
        }
      }
    }
  }

  // Apply mask 0: (r + c) % 2 === 0
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isFunc[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Format information for ECC Level L (01) + Mask 0 (000) => 0x77c4
  const formatBits = 0x77c4;
  const getFmtBit = (i: number) => ((formatBits >> i) & 1) !== 0;

  for (let i = 0; i <= 5; i++) setFunc(8, i, getFmtBit(14 - i));
  setFunc(8, 7, getFmtBit(8));
  setFunc(8, 8, getFmtBit(7));
  setFunc(7, 8, getFmtBit(6));
  for (let i = 9; i < 15; i++) setFunc(14 - i, 8, getFmtBit(14 - i));

  for (let i = 0; i < 8; i++) setFunc(8, n - 1 - i, getFmtBit(i));
  for (let i = 8; i < 15; i++) setFunc(n - 15 + i, 8, getFmtBit(i));

  return modules;
}
