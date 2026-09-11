// ═══════════════════════════════════════════════════════════════════════
// GENERADO por scripts/build-rom-bg-assembly.ts — NO editar a mano.
// Fuente: ROM (Bank68:$7A0C/$7B10 + Bank03:$6834/$688F).
// Evidencia: ROM_BG_FORMAT_VERIFIED (research V5) + reproducción píxel-exacta
// de los samples ROM (verify:rom-bg-assembly).
// ═══════════════════════════════════════════════════════════════════════
import type { RomBgAssemblyProgram } from '../../battle/romDisplay/romBgAssemblyDecode';

export const ROM_BG_ASSEMBLY_PROGRAMS: readonly RomBgAssemblyProgram[] = [
  {
    resource: 0x19,
    descriptorOffset: 0x1a3a0c,
    rowTableOffset: 0xe834,
    rows: 7,
    cols: 6,
    widthPx: 48,
    heightPx: 56,
    bgRowStart: 4,
    bgCol: 7,
    paletteSlot: 5,
    tileCount: 16,
    evidence: 'ROM_BG_FORMAT_VERIFIED',
    cells: [{ row:0, col:0, attr:0xd, tileId:0x80, tileIndex:0, flipX:false, flipY:false }, { row:0, col:1, attr:0xd, tileId:0x81, tileIndex:1, flipX:false, flipY:false }, { row:0, col:2, attr:0xd, tileId:0x82, tileIndex:2, flipX:false, flipY:false }, { row:0, col:3, attr:0x2d, tileId:0x82, tileIndex:2, flipX:true, flipY:false }, { row:0, col:4, attr:0x2d, tileId:0x81, tileIndex:1, flipX:true, flipY:false }, { row:0, col:5, attr:0x2d, tileId:0x80, tileIndex:0, flipX:true, flipY:false }, { row:1, col:0, attr:0xd, tileId:0x83, tileIndex:3, flipX:false, flipY:false }, { row:1, col:1, attr:0xd, tileId:0x84, tileIndex:4, flipX:false, flipY:false }, { row:1, col:2, attr:0xd, tileId:0x85, tileIndex:5, flipX:false, flipY:false }, { row:1, col:3, attr:0x2d, tileId:0x85, tileIndex:5, flipX:true, flipY:false }, { row:1, col:4, attr:0x2d, tileId:0x84, tileIndex:4, flipX:true, flipY:false }, { row:1, col:5, attr:0x2d, tileId:0x83, tileIndex:3, flipX:true, flipY:false }, { row:2, col:0, attr:0xd, tileId:0x86, tileIndex:6, flipX:false, flipY:false }, { row:2, col:1, attr:0xd, tileId:0x87, tileIndex:7, flipX:false, flipY:false }, { row:2, col:2, attr:0xd, tileId:0x88, tileIndex:8, flipX:false, flipY:false }, { row:2, col:3, attr:0x2d, tileId:0x88, tileIndex:8, flipX:true, flipY:false }, { row:2, col:4, attr:0x2d, tileId:0x87, tileIndex:7, flipX:true, flipY:false }, { row:2, col:5, attr:0x2d, tileId:0x86, tileIndex:6, flipX:true, flipY:false }, { row:3, col:0, attr:0xd, tileId:0x89, tileIndex:9, flipX:false, flipY:false }, { row:3, col:1, attr:0xd, tileId:0x8a, tileIndex:10, flipX:false, flipY:false }, { row:3, col:2, attr:0xd, tileId:0x8b, tileIndex:11, flipX:false, flipY:false }, { row:3, col:3, attr:0x2d, tileId:0x8b, tileIndex:11, flipX:true, flipY:false }, { row:3, col:4, attr:0x2d, tileId:0x8a, tileIndex:10, flipX:true, flipY:false }, { row:3, col:5, attr:0x2d, tileId:0x89, tileIndex:9, flipX:true, flipY:false }, { row:4, col:0, attr:0xd, tileId:0x8c, tileIndex:12, flipX:false, flipY:false }, { row:4, col:1, attr:0xd, tileId:0x8d, tileIndex:13, flipX:false, flipY:false }, { row:4, col:2, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:4, col:3, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:4, col:4, attr:0x2d, tileId:0x8d, tileIndex:13, flipX:true, flipY:false }, { row:4, col:5, attr:0x2d, tileId:0x8c, tileIndex:12, flipX:true, flipY:false }, { row:5, col:0, attr:0xd, tileId:0x8e, tileIndex:14, flipX:false, flipY:false }, { row:5, col:1, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:5, col:2, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:5, col:3, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:5, col:4, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:5, col:5, attr:0x2d, tileId:0x8e, tileIndex:14, flipX:true, flipY:false }, { row:6, col:0, attr:0xd, tileId:0x8f, tileIndex:15, flipX:false, flipY:false }, { row:6, col:1, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:6, col:2, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:6, col:3, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:6, col:4, attr:0xf, tileId:0x74, tileIndex:4, flipX:false, flipY:false }, { row:6, col:5, attr:0x2d, tileId:0x8f, tileIndex:15, flipX:true, flipY:false }],
  },
  {
    resource: 0x1a,
    descriptorOffset: 0x1a3b10,
    rowTableOffset: 0xe88f,
    rows: 7,
    cols: 8,
    widthPx: 64,
    heightPx: 56,
    bgRowStart: 4,
    bgCol: 6,
    paletteSlot: 5,
    tileCount: 23,
    evidence: 'ROM_BG_FORMAT_VERIFIED',
    cells: [{ row:0, col:0, attr:0xd, tileId:0x80, tileIndex:0, flipX:false, flipY:false }, { row:0, col:1, attr:0xd, tileId:0x81, tileIndex:1, flipX:false, flipY:false }, { row:0, col:2, attr:0xd, tileId:0x82, tileIndex:2, flipX:false, flipY:false }, { row:0, col:3, attr:0xd, tileId:0x83, tileIndex:3, flipX:false, flipY:false }, { row:0, col:4, attr:0x2d, tileId:0x83, tileIndex:3, flipX:true, flipY:false }, { row:0, col:5, attr:0x2d, tileId:0x82, tileIndex:2, flipX:true, flipY:false }, { row:0, col:6, attr:0x2d, tileId:0x81, tileIndex:1, flipX:true, flipY:false }, { row:0, col:7, attr:0x2d, tileId:0x80, tileIndex:0, flipX:true, flipY:false }, { row:1, col:0, attr:0xd, tileId:0x84, tileIndex:4, flipX:false, flipY:false }, { row:1, col:1, attr:0xd, tileId:0x85, tileIndex:5, flipX:false, flipY:false }, { row:1, col:2, attr:0xd, tileId:0x86, tileIndex:6, flipX:false, flipY:false }, { row:1, col:3, attr:0xd, tileId:0x87, tileIndex:7, flipX:false, flipY:false }, { row:1, col:4, attr:0x2d, tileId:0x87, tileIndex:7, flipX:true, flipY:false }, { row:1, col:5, attr:0x2d, tileId:0x86, tileIndex:6, flipX:true, flipY:false }, { row:1, col:6, attr:0x2d, tileId:0x85, tileIndex:5, flipX:true, flipY:false }, { row:1, col:7, attr:0x2d, tileId:0x84, tileIndex:4, flipX:true, flipY:false }, { row:2, col:0, attr:0xd, tileId:0x88, tileIndex:8, flipX:false, flipY:false }, { row:2, col:1, attr:0xd, tileId:0x89, tileIndex:9, flipX:false, flipY:false }, { row:2, col:2, attr:0xd, tileId:0x8a, tileIndex:10, flipX:false, flipY:false }, { row:2, col:3, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:2, col:4, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:2, col:5, attr:0x2d, tileId:0x8a, tileIndex:10, flipX:true, flipY:false }, { row:2, col:6, attr:0x2d, tileId:0x89, tileIndex:9, flipX:true, flipY:false }, { row:2, col:7, attr:0x2d, tileId:0x88, tileIndex:8, flipX:true, flipY:false }, { row:3, col:0, attr:0xd, tileId:0x8b, tileIndex:11, flipX:false, flipY:false }, { row:3, col:1, attr:0xd, tileId:0x8c, tileIndex:12, flipX:false, flipY:false }, { row:3, col:2, attr:0xd, tileId:0x8d, tileIndex:13, flipX:false, flipY:false }, { row:3, col:3, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:3, col:4, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:3, col:5, attr:0x2d, tileId:0x8d, tileIndex:13, flipX:true, flipY:false }, { row:3, col:6, attr:0x2d, tileId:0x8c, tileIndex:12, flipX:true, flipY:false }, { row:3, col:7, attr:0x2d, tileId:0x8b, tileIndex:11, flipX:true, flipY:false }, { row:4, col:0, attr:0xd, tileId:0x8e, tileIndex:14, flipX:false, flipY:false }, { row:4, col:1, attr:0xd, tileId:0x8f, tileIndex:15, flipX:false, flipY:false }, { row:4, col:2, attr:0xd, tileId:0x90, tileIndex:16, flipX:false, flipY:false }, { row:4, col:3, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:4, col:4, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:4, col:5, attr:0x2d, tileId:0x90, tileIndex:16, flipX:true, flipY:false }, { row:4, col:6, attr:0x2d, tileId:0x8f, tileIndex:15, flipX:true, flipY:false }, { row:4, col:7, attr:0x2d, tileId:0x8e, tileIndex:14, flipX:true, flipY:false }, { row:5, col:0, attr:0xd, tileId:0x91, tileIndex:17, flipX:false, flipY:false }, { row:5, col:1, attr:0xd, tileId:0x92, tileIndex:18, flipX:false, flipY:false }, { row:5, col:2, attr:0xd, tileId:0x93, tileIndex:19, flipX:false, flipY:false }, { row:5, col:3, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:5, col:4, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:5, col:5, attr:0x2d, tileId:0x93, tileIndex:19, flipX:true, flipY:false }, { row:5, col:6, attr:0x2d, tileId:0x92, tileIndex:18, flipX:true, flipY:false }, { row:5, col:7, attr:0x2d, tileId:0x91, tileIndex:17, flipX:true, flipY:false }, { row:6, col:0, attr:0xd, tileId:0x94, tileIndex:20, flipX:false, flipY:false }, { row:6, col:1, attr:0xd, tileId:0x95, tileIndex:21, flipX:false, flipY:false }, { row:6, col:2, attr:0xd, tileId:0x96, tileIndex:22, flipX:false, flipY:false }, { row:6, col:3, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:6, col:4, attr:0xf, tileId:0x74, tileIndex:11, flipX:false, flipY:false }, { row:6, col:5, attr:0x2d, tileId:0x96, tileIndex:22, flipX:true, flipY:false }, { row:6, col:6, attr:0x2d, tileId:0x95, tileIndex:21, flipX:true, flipY:false }, { row:6, col:7, attr:0x2d, tileId:0x94, tileIndex:20, flipX:true, flipY:false }],
  },
];

export interface RomBgAssemblyImage {
  resource: number;
  palette: number;
  paletteHex: string;
  file: string;
  url: string;
  width: number;
  height: number;
  sha256: string;
}

export const ROM_BG_ASSEMBLY_IMAGES: readonly RomBgAssemblyImage[] = [
  { resource: 0x19, palette: 0x2d, paletteHex: '$2D', file: 'bg19-p2d.png', url: '/assets/rom-bg/bg19-p2d.png', width: 48, height: 56, sha256: 'b6d38f801f8dcd8ee1925f8f5d00511cd64de71d6967b44add1494a70050520a' },
  { resource: 0x19, palette: 0x30, paletteHex: '$30', file: 'bg19-p30.png', url: '/assets/rom-bg/bg19-p30.png', width: 48, height: 56, sha256: 'eedca228fe37f1db2d443c1fab0c667b658a7b9be1f413f1de3294431758d24b' },
  { resource: 0x19, palette: 0x31, paletteHex: '$31', file: 'bg19-p31.png', url: '/assets/rom-bg/bg19-p31.png', width: 48, height: 56, sha256: 'a5383f55044fbb37e00a0d15753eaf9db51c76069f1d31ada0f6ab1da6d44d9d' },
  { resource: 0x19, palette: 0x32, paletteHex: '$32', file: 'bg19-p32.png', url: '/assets/rom-bg/bg19-p32.png', width: 48, height: 56, sha256: 'b7f1223059e3a930f656ebaad0b92aa04551e80375fa6cd643671ba5e7ba679e' },
  { resource: 0x19, palette: 0x33, paletteHex: '$33', file: 'bg19-p33.png', url: '/assets/rom-bg/bg19-p33.png', width: 48, height: 56, sha256: 'a035fd441242e8d2805ae7e567323b9cdf47857545b68fe315b5ae2a1ecd4383' },
  { resource: 0x19, palette: 0x35, paletteHex: '$35', file: 'bg19-p35.png', url: '/assets/rom-bg/bg19-p35.png', width: 48, height: 56, sha256: '007e8d5e330ce3921928ed3887c35ea6d209a602d617ce885ff6e4f6417e7e8e' },
  { resource: 0x19, palette: 0xff, paletteHex: '$FF', file: 'bg19-pff.png', url: '/assets/rom-bg/bg19-pff.png', width: 48, height: 56, sha256: '33a4308c3c62e3d7cdce0f6ed194450bf188f2024f2ddf8ca035606f43e32852' },
  { resource: 0x1a, palette: 0x31, paletteHex: '$31', file: 'bg1a-p31.png', url: '/assets/rom-bg/bg1a-p31.png', width: 64, height: 56, sha256: '729309148eb5ab7c6a11a8cd78c3b8ad7fe533d6c625df2c6559cd3bebc7ab54' },
  { resource: 0x1a, palette: 0x33, paletteHex: '$33', file: 'bg1a-p33.png', url: '/assets/rom-bg/bg1a-p33.png', width: 64, height: 56, sha256: '85cd2097d326e669af2b257f4cb348edd8d2bfb31cc2cb35d4ffdb409486765d' },
];

/** Programa ROM para un recurso BG ($19/$1A). */
export function romBgAssemblyProgram(resource: number): RomBgAssemblyProgram | null {
  return ROM_BG_ASSEMBLY_PROGRAMS.find(p => p.resource === resource) ?? null;
}

/**
 * Imagen física ROM para (recurso, índice de paleta). Devuelve null si la
 * combinación no está demostrada: NUNCA sustituye por otro fondo.
 */
export function romBgAssemblyImage(resource: number, paletteIndex: number): RomBgAssemblyImage | null {
  return ROM_BG_ASSEMBLY_IMAGES.find(i => i.resource === resource && i.palette === paletteIndex) ?? null;
}
