// ═══════════════════════════════════════════════════════════
// DBZ LSW — AtlasLoader (renderer PixiJS 8)
// ═══════════════════════════════════════════════════════════
// Carga el manifest.json de una forma + TODOS sus frames PNG como texturas
// Pixi, keyed `${pose}:${index}`, y computa la caja de anclaje (maxW/maxH)
// para que el luchador quede "clavado" en su ground line (sin el efecto
// "respirar" de los frames recortados a bounding box).
//
// Este módulo es AGNÓSTICO de React: se puede usar desde el BattleRenderer
// o desde cualquier otro consumidor. El cache es por formId (igual que
// SPRITE_MANIFEST_CACHE en main.tsx, pero a nivel de texturas Pixi).

import { Assets, Texture } from 'pixi.js';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../../../data/spriteManifest';

export interface PoseFrame {
  file: string;
  w: number;
  h: number;
  name?: string;
}

export interface PoseAnim {
  fps: number;
  loop: boolean;
  frames: PoseFrame[];
}

export interface FormManifest {
  [pose: string]: PoseAnim;
}

export interface FormAtlas {
  formId: string;
  /** Directorio de sprites (slug snake_case) — para debug/anclaje. */
  dir: string;
  /** texturas keyed `${pose}:${index}`. */
  textures: Map<string, Texture>;
  /** metadatos de animación por pose (fps/loop/frames). */
  anims: Map<string, PoseAnim>;
  /** Ancho máximo de todos los frames (caja de anclaje). */
  maxW: number;
  /** Alto máximo de todos los frames (caja de anclaje). */
  maxH: number;
}

const CACHE = new Map<string, Promise<FormAtlas | null>>();
const TEXTURE_CACHE = new Map<string, Promise<Texture | null>>();

/**
 * Carga una textura suelta (fondo, overworld, proyectil) con nearest-neighbour
 * y cache por URL. Devuelve null si falla (sin romper la escena).
 */
export function loadPixelTexture(url: string): Promise<Texture | null> {
  let p = TEXTURE_CACHE.get(url);
  if (p) return p;
  p = (async () => {
    try {
      const t = await Assets.load<Texture>(url);
      return t ? pixelate(t) : null;
    } catch {
      return null;
    }
  })();
  TEXTURE_CACHE.set(url, p);
  return p;
}

async function fetchManifest(formId: string): Promise<FormManifest | null> {
  const url = spriteManifestUrl(formId);
  if (!url) return null;
  try {
    const r = await fetch(url);
    return r.ok ? (r.json() as Promise<FormManifest>) : null;
  } catch {
    return null;
  }
}

/** Nearest-neighbour + sin mipmaps: pixel art nítido, sin blur. */
function pixelate(t: Texture): Texture {
  const src = t.source;
  src.scaleMode = 'nearest';
  src.autoGenerateMipmaps = false;
  return t;
}

export function loadFormAtlas(formId: string): Promise<FormAtlas | null> {
  let p = CACHE.get(formId);
  if (p) return p;
  p = build(formId);
  CACHE.set(formId, p);
  return p;
}

async function build(formId: string): Promise<FormAtlas | null> {
  const manifest = await fetchManifest(formId);
  if (!manifest) return null;

  const textures = new Map<string, Texture>();
  const anims = new Map<string, PoseAnim>();
  let maxW = 0;
  let maxH = 0;

  for (const [pose, anim] of Object.entries(manifest)) {
    if (!anim || !Array.isArray(anim.frames) || anim.frames.length === 0) continue;
    anims.set(pose, anim);
    for (let i = 0; i < anim.frames.length; i++) {
      const f = anim.frames[i];
      if (f.w > maxW) maxW = f.w;
      if (f.h > maxH) maxH = f.h;
      const url = spriteFrameUrl(formId, f.file);
      try {
        textures.set(`${pose}:${i}`, pixelate(await Assets.load(url)));
      } catch {
        // frame ausente: no romper el atlas; se saltará ese frame
      }
    }
  }

  if (textures.size === 0) return null;
  return {
    formId,
    dir: spriteDirFor(formId) ?? formId,
    textures,
    anims,
    maxW,
    maxH,
  };
}
