// ═══════════════════════════════════════════════════════════════════════
// romFighterPalettes.generated.ts — GENERADO por scripts/generate-rom-fighter-palettes.ts
// Paletas físicas de luchador: Bank30:$6E00 + actorVisualProfileKey*8
// (research-v3 §4 — ROM_STATIC_VERIFIED). 4 colores CGB × 16 bits BGR555.
// NO editar a mano — regenerar con npm run gen:fighter-palettes.
// ═══════════════════════════════════════════════════════════════════════

export interface RomFighterPalette {
  key: number;
  keyHex: string;
  raw: number[];
  bgr555: string[];
  colors: string[]; // #RRGGBB (BGR555 → RGB, sin interpolación)
  evidence: 'ROM_STATIC_VERIFIED';
}

export const ROM_FIGHTER_PALETTES: RomFighterPalette[] = [
  {
    "key": 2,
    "keyHex": "0x02",
    "raw": [
      128,
      128,
      128,
      128,
      128,
      128,
      0,
      0
    ],
    "bgr555": [
      "8080",
      "8080",
      "8080",
      "0000"
    ],
    "colors": [
      "#002100",
      "#002100",
      "#002100",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 3,
    "keyHex": "0x03",
    "raw": [
      0,
      0,
      128,
      128,
      128,
      128,
      128,
      128
    ],
    "bgr555": [
      "0000",
      "8080",
      "8080",
      "8080"
    ],
    "colors": [
      "#000000",
      "#002100",
      "#002100",
      "#002100"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 5,
    "keyHex": "0x05",
    "raw": [
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1
    ],
    "bgr555": [
      "0000",
      "0000",
      "0000",
      "0101"
    ],
    "colors": [
      "#000000",
      "#000000",
      "#000000",
      "#084200"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 6,
    "keyHex": "0x06",
    "raw": [
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0
    ],
    "bgr555": [
      "0101",
      "0101",
      "0000",
      "0000"
    ],
    "colors": [
      "#084200",
      "#084200",
      "#000000",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 7,
    "keyHex": "0x07",
    "raw": [
      1,
      1,
      2,
      3,
      3,
      3,
      0,
      0
    ],
    "bgr555": [
      "0101",
      "0302",
      "0303",
      "0000"
    ],
    "colors": [
      "#084200",
      "#10C500",
      "#19C500",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 8,
    "keyHex": "0x08",
    "raw": [
      127,
      127,
      127,
      127,
      92,
      127,
      92,
      127
    ],
    "bgr555": [
      "7f7f",
      "7f7f",
      "7f5c",
      "7f5c"
    ],
    "colors": [
      "#FFDEFF",
      "#FFDEFF",
      "#E6D6FF",
      "#E6D6FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 9,
    "keyHex": "0x09",
    "raw": [
      156,
      255,
      158,
      255,
      175,
      255,
      30,
      255
    ],
    "bgr555": [
      "ff9c",
      "ff9e",
      "ffaf",
      "ff1e"
    ],
    "colors": [
      "#E6E6FF",
      "#F7E6FF",
      "#7BEFFF",
      "#F7C5FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 10,
    "keyHex": "0x0a",
    "raw": [
      63,
      255,
      255,
      255,
      252,
      252,
      252,
      252
    ],
    "bgr555": [
      "ff3f",
      "ffff",
      "fcfc",
      "fcfc"
    ],
    "colors": [
      "#FFCEFF",
      "#FFFFFF",
      "#E63AFF",
      "#E63AFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 11,
    "keyHex": "0x0b",
    "raw": [
      28,
      252,
      8,
      248,
      240,
      240,
      0,
      0
    ],
    "bgr555": [
      "fc1c",
      "f808",
      "f0f0",
      "0000"
    ],
    "colors": [
      "#E600FF",
      "#4200F7",
      "#843AE6",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 12,
    "keyHex": "0x0c",
    "raw": [
      224,
      224,
      240,
      240,
      112,
      240,
      56,
      248
    ],
    "bgr555": [
      "e0e0",
      "f0f0",
      "f070",
      "f838"
    ],
    "colors": [
      "#003AC5",
      "#843AE6",
      "#8419E6",
      "#C508F7"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 13,
    "keyHex": "0x0d",
    "raw": [
      24,
      248,
      28,
      252,
      12,
      252,
      134,
      254
    ],
    "bgr555": [
      "f818",
      "fc1c",
      "fc0c",
      "fe86"
    ],
    "colors": [
      "#C500F7",
      "#E600FF",
      "#6300FF",
      "#31A5FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 14,
    "keyHex": "0x0e",
    "raw": [
      7,
      255,
      135,
      255,
      255,
      255,
      126,
      126
    ],
    "bgr555": [
      "ff07",
      "ff87",
      "ffff",
      "7e7e"
    ],
    "colors": [
      "#3AC5FF",
      "#3AE6FF",
      "#FFFFFF",
      "#F79CFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 15,
    "keyHex": "0x0f",
    "raw": [
      126,
      126,
      49,
      63,
      33,
      63,
      63,
      63
    ],
    "bgr555": [
      "7e7e",
      "3f31",
      "3f21",
      "3f3f"
    ],
    "colors": [
      "#F79CFF",
      "#8CCE7B",
      "#08CE7B",
      "#FFCE7B"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 21,
    "keyHex": "0x15",
    "raw": [
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1
    ],
    "bgr555": [
      "0000",
      "0000",
      "0101",
      "0101"
    ],
    "colors": [
      "#000000",
      "#000000",
      "#084200",
      "#084200"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 22,
    "keyHex": "0x16",
    "raw": [
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0
    ],
    "bgr555": [
      "0101",
      "0101",
      "0000",
      "0000"
    ],
    "colors": [
      "#084200",
      "#084200",
      "#000000",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 23,
    "keyHex": "0x17",
    "raw": [
      0,
      0,
      1,
      1,
      2,
      3,
      3,
      3
    ],
    "bgr555": [
      "0000",
      "0101",
      "0302",
      "0303"
    ],
    "colors": [
      "#000000",
      "#084200",
      "#10C500",
      "#19C500"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 24,
    "keyHex": "0x18",
    "raw": [
      17,
      31,
      15,
      15,
      15,
      15,
      24,
      31
    ],
    "bgr555": [
      "1f11",
      "0f0f",
      "0f0f",
      "1f18"
    ],
    "colors": [
      "#8CC53A",
      "#7BC519",
      "#7BC519",
      "#C5C53A"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 25,
    "keyHex": "0x19",
    "raw": [
      96,
      127,
      128,
      255,
      0,
      255,
      1,
      255
    ],
    "bgr555": [
      "7f60",
      "ff80",
      "ff00",
      "ff01"
    ],
    "colors": [
      "#00DEFF",
      "#00E6FF",
      "#00C5FF",
      "#08C5FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 26,
    "keyHex": "0x1a",
    "raw": [
      47,
      255,
      94,
      254,
      254,
      254,
      252,
      252
    ],
    "bgr555": [
      "ff2f",
      "fe5e",
      "fefe",
      "fcfc"
    ],
    "colors": [
      "#7BCEFF",
      "#F794FF",
      "#F7BDFF",
      "#E63AFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 27,
    "keyHex": "0x1b",
    "raw": [
      252,
      252,
      12,
      252,
      28,
      252,
      240,
      240
    ],
    "bgr555": [
      "fcfc",
      "fc0c",
      "fc1c",
      "f0f0"
    ],
    "colors": [
      "#E63AFF",
      "#6300FF",
      "#E600FF",
      "#843AE6"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 28,
    "keyHex": "0x1c",
    "raw": [
      255,
      253,
      255,
      254,
      199,
      255,
      67,
      255
    ],
    "bgr555": [
      "fdff",
      "feff",
      "ffc7",
      "ff43"
    ],
    "colors": [
      "#FF7BFF",
      "#FFBDFF",
      "#3AF7FF",
      "#19D6FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 29,
    "keyHex": "0x1d",
    "raw": [
      33,
      255,
      32,
      255,
      35,
      255,
      255,
      255
    ],
    "bgr555": [
      "ff21",
      "ff20",
      "ff23",
      "ffff"
    ],
    "colors": [
      "#08CEFF",
      "#00CEFF",
      "#19CEFF",
      "#FFFFFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 30,
    "keyHex": "0x1e",
    "raw": [
      143,
      143,
      15,
      15,
      6,
      7,
      2,
      3
    ],
    "bgr555": [
      "8f8f",
      "0f0f",
      "0706",
      "0302"
    ],
    "colors": [
      "#7BE619",
      "#7BC519",
      "#31C508",
      "#10C500"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 31,
    "keyHex": "0x1f",
    "raw": [
      3,
      3,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    "bgr555": [
      "0303",
      "0101",
      "0101",
      "0000"
    ],
    "colors": [
      "#19C500",
      "#084200",
      "#084200",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 32,
    "keyHex": "0x20",
    "raw": [
      80,
      80,
      128,
      128,
      0,
      0,
      128,
      128
    ],
    "bgr555": [
      "5050",
      "8080",
      "0000",
      "8080"
    ],
    "colors": [
      "#8410A5",
      "#002100",
      "#000000",
      "#002100"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 33,
    "keyHex": "0x21",
    "raw": [
      192,
      192,
      224,
      224,
      224,
      224,
      240,
      240
    ],
    "bgr555": [
      "c0c0",
      "e0e0",
      "e0e0",
      "f0f0"
    ],
    "colors": [
      "#003184",
      "#003AC5",
      "#003AC5",
      "#843AE6"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 34,
    "keyHex": "0x22",
    "raw": [
      16,
      240,
      240,
      240,
      16,
      240,
      16,
      240
    ],
    "bgr555": [
      "f010",
      "f0f0",
      "f010",
      "f010"
    ],
    "colors": [
      "#8400E6",
      "#843AE6",
      "#8400E6",
      "#8400E6"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 35,
    "keyHex": "0x23",
    "raw": [
      232,
      248,
      248,
      248,
      248,
      248,
      0,
      0
    ],
    "bgr555": [
      "f8e8",
      "f8f8",
      "f8f8",
      "0000"
    ],
    "colors": [
      "#423AF7",
      "#C53AF7",
      "#C53AF7",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 36,
    "keyHex": "0x24",
    "raw": [
      63,
      51,
      60,
      52,
      120,
      72,
      48,
      48
    ],
    "bgr555": [
      "333f",
      "343c",
      "4878",
      "3030"
    ],
    "colors": [
      "#FFCE63",
      "#E6086B",
      "#C51994",
      "#840863"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 39,
    "keyHex": "0x27",
    "raw": [
      0,
      0,
      1,
      1,
      3,
      2,
      3,
      3
    ],
    "bgr555": [
      "0000",
      "0101",
      "0203",
      "0303"
    ],
    "colors": [
      "#000000",
      "#084200",
      "#198400",
      "#19C500"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 40,
    "keyHex": "0x28",
    "raw": [
      255,
      131,
      255,
      135,
      121,
      121,
      7,
      7
    ],
    "bgr555": [
      "83ff",
      "87ff",
      "7979",
      "0707"
    ],
    "colors": [
      "#FFFF00",
      "#FFFF08",
      "#CE5AF7",
      "#3AC508"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 41,
    "keyHex": "0x29",
    "raw": [
      31,
      24,
      63,
      32,
      111,
      80,
      200,
      191
    ],
    "bgr555": [
      "181f",
      "203f",
      "506f",
      "bfc8"
    ],
    "colors": [
      "#FF0031",
      "#FF0842",
      "#7B19A5",
      "#42F77B"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 42,
    "keyHex": "0x2a",
    "raw": [
      239,
      159,
      255,
      255,
      255,
      255,
      126,
      126
    ],
    "bgr555": [
      "9fef",
      "ffff",
      "ffff",
      "7e7e"
    ],
    "colors": [
      "#7BFF3A",
      "#FFFFFF",
      "#FFFFFF",
      "#F79CFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 43,
    "keyHex": "0x2b",
    "raw": [
      254,
      254,
      204,
      60,
      140,
      124,
      248,
      248
    ],
    "bgr555": [
      "fefe",
      "3ccc",
      "7c8c",
      "f8f8"
    ],
    "colors": [
      "#F7BDFF",
      "#63317B",
      "#6321FF",
      "#C53AF7"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 44,
    "keyHex": "0x2c",
    "raw": [
      79,
      191,
      135,
      255,
      255,
      255,
      255,
      255
    ],
    "bgr555": [
      "bf4f",
      "ff87",
      "ffff",
      "ffff"
    ],
    "colors": [
      "#7BD67B",
      "#3AE6FF",
      "#FFFFFF",
      "#FFFFFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 45,
    "keyHex": "0x2d",
    "raw": [
      199,
      63,
      135,
      127,
      7,
      255,
      15,
      255
    ],
    "bgr555": [
      "3fc7",
      "7f87",
      "ff07",
      "ff0f"
    ],
    "colors": [
      "#3AF77B",
      "#3AE6FF",
      "#3AC5FF",
      "#7BC5FF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 46,
    "keyHex": "0x2e",
    "raw": [
      255,
      255,
      23,
      31,
      8,
      15,
      7,
      7
    ],
    "bgr555": [
      "ffff",
      "1f17",
      "0f08",
      "0707"
    ],
    "colors": [
      "#FFFFFF",
      "#BDC53A",
      "#42C519",
      "#3AC508"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 49,
    "keyHex": "0x31",
    "raw": [
      0,
      0,
      224,
      224,
      240,
      240,
      248,
      248
    ],
    "bgr555": [
      "0000",
      "e0e0",
      "f0f0",
      "f8f8"
    ],
    "colors": [
      "#000000",
      "#003AC5",
      "#843AE6",
      "#C53AF7"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 50,
    "keyHex": "0x32",
    "raw": [
      252,
      252,
      252,
      252,
      252,
      252,
      252,
      252
    ],
    "bgr555": [
      "fcfc",
      "fcfc",
      "fcfc",
      "fcfc"
    ],
    "colors": [
      "#E63AFF",
      "#E63AFF",
      "#E63AFF",
      "#E63AFF"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  },
  {
    "key": 51,
    "keyHex": "0x33",
    "raw": [
      76,
      124,
      132,
      252,
      248,
      248,
      0,
      0
    ],
    "bgr555": [
      "7c4c",
      "fc84",
      "f8f8",
      "0000"
    ],
    "colors": [
      "#6310FF",
      "#2121FF",
      "#C53AF7",
      "#000000"
    ],
    "evidence": "ROM_STATIC_VERIFIED"
  }
];
