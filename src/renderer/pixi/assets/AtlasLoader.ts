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
  trimmedPixelHash?: string;
  sourceFileSha256?: string;
  hash?: string;
  /** ROM-native duration in GBC ticks for THIS frame. When present, the
   *  SpriteAnimator uses per-frame durations instead of the uniform anim.fps.
   *  Null/undefined = fall back to uniform timing. */
  durationTicks?: number;
}

export interface PoseAnim {
  fps: number;
  loop: boolean;
  frames: PoseFrame[];
}

export interface FormManifest {
  [pose: string]: PoseAnim;
}

interface PhysicalManifestFrame {
  file: string;
  physicalId: string;
  originInTrimX?: number;
  originInTrimY?: number;
  sourceFileSha256?: string;
  trimmedPixelHash?: string;
}

interface RomPhysicalManifest {
  sequences?: Record<string, { frames: PhysicalManifestFrame[] }>;
  stageSequences?: Record<string, { frames: PhysicalManifestFrame[] }>;
}

export interface FormAtlas {
  formId: string;
  /** Directorio de sprites (slug snake_case) — para debug/anclaje. */
  dir: string;
  /** texturas keyed `${pose}:${index}`. */
  textures: Map<string, Texture>;
  /** ROM object origin within each trimmed image, keyed by physicalId/file. */
  physicalOrigins?: Map<string, { x: number; y: number }>;
  /** metadatos de animación por pose (fps/loop/frames). */
  anims: Map<string, PoseAnim>;
  /** Ancho máximo de todos los frames (caja de anclaje). */
  maxW: number;
  /** Alto máximo de todos los frames (caja de anclaje). */
  maxH: number;
}

const CACHE = new Map<string, Promise<FormAtlas | null>>();
const TEXTURE_CACHE = new Map<string, Promise<Texture | null>>();

function versionedFrameUrl(formId: string, frame: PoseFrame): string {
  const url = spriteFrameUrl(formId, frame.file);
  const version = frame.trimmedPixelHash ?? frame.sourceFileSha256 ?? frame.hash;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

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

async function fetchRomPhysicalManifest(formId: string): Promise<RomPhysicalManifest | null> {
  const dir = spriteDirFor(formId);
  if (!dir) return null;
  try {
    const r = await fetch(`/assets/sprites/${dir}/rom-physical.manifest.json`);
    return r.ok ? (r.json() as Promise<RomPhysicalManifest>) : null;
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
  const romPhysicalManifest = await fetchRomPhysicalManifest(formId);

  // ── ROM duration overlay: form→resource→sequence→frameIndex ──
  // If public/assets/sprites/<dir>/rom-durations.json exists, load it.
  // The overlay enriches PoseFrame.durationTicks when a ROM resource+sequence
  // maps to a manifest pose. The overlay SSOT is form+resource+sequence+frameIndex
  // because the same physicalId can appear with different durations.
  let romDurations: {
    formId: string;
    resources: Record<string, Record<string, Array<{ vf: number; dur: number; ox: number; oy: number }>>>;
    source: string;
  } | null = null;
  try {
    const dir = spriteDirFor(formId) ?? formId;
    const r = await fetch(`/assets/sprites/${dir}/rom-durations.json`);
    if (r.ok) romDurations = await r.json() as typeof romDurations;
  } catch { /* overlay optional */ }

  const textures = new Map<string, Texture>();
  const physicalOrigins = new Map<string, { x: number; y: number }>();
  const anims = new Map<string, PoseAnim>();
  let maxW = 0;
  let maxH = 0;

  // Primera pasada: recoger (pose:index → url) y metadatos SIN cargar aún.
  // Enrich PoseFrame.durationTicks from ROM overlay when available.
  const jobs: Array<{ key: string; url: string }> = [];
  for (const [pose, anim] of Object.entries(manifest)) {
    if (!anim || !Array.isArray(anim.frames) || anim.frames.length === 0) continue;
    // ROM enrichment: if overlay has timings for this pose's resource+sequence,
    // apply durationTicks, offsetX, offsetY from the ROM frame record.
    // The pose→resource mapping is resolved externally (characterFrameMap/productionFrameResolver);
    // for poses that DON'T have a ROM mapping, they stay LEGACY_FPS.
    // Note: the overlay is keyed by resource→sequence, not by pose name.
    // The enrichment here is a BRIDGE: when we KNOW the pose's ROM resource/sequence
    // (from the production frame resolver), we can write the timings directly.
    // For now, the overlay is loaded and available for runtime enrichment;
    // the FighterActor/RomPresentationPlayer will consume it directly.
    anims.set(pose, anim);
    for (let i = 0; i < anim.frames.length; i++) {
      const f = anim.frames[i];
      if (f.w > maxW) maxW = f.w;
      if (f.h > maxH) maxH = f.h;
      jobs.push({ key: `${pose}:${i}`, url: versionedFrameUrl(formId, f) });
    }
  }

  const dir = spriteDirFor(formId) ?? formId;
  const physicalFrames = [
    ...Object.values(romPhysicalManifest?.sequences ?? {}).flatMap(sequence => sequence.frames),
    ...Object.values(romPhysicalManifest?.stageSequences ?? {}).flatMap(sequence => sequence.frames),
  ];
  for (const frame of physicalFrames) {
    if (!frame.file || !frame.physicalId) continue;
    if (Number.isFinite(frame.originInTrimX) && Number.isFinite(frame.originInTrimY)) {
      const origin = { x: frame.originInTrimX!, y: frame.originInTrimY! };
      physicalOrigins.set(frame.physicalId, origin);
      physicalOrigins.set(frame.file, origin);
    }
    const version = frame.trimmedPixelHash ?? frame.sourceFileSha256;
    const url = `/assets/sprites/${dir}/${frame.file}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    jobs.push({ key: frame.file, url });
    jobs.push({ key: frame.physicalId, url });
  }

  // Segunda pasada: cargar en PARALELO (un round-trip por frame, no
  // secuencial). Assets.load cachea por URL, así que los archivos
  // reutilizados entre poses solo se descargan una vez.
  const unique = [...new Set(jobs.map(j => j.url))];
  const loaded = new Map<string, Texture>();
  await Promise.all(unique.map(async url => {
    try {
      loaded.set(url, pixelate(await Assets.load<Texture>(url)));
    } catch { /* frame ausente: se saltará */ }
  }));
  for (const j of jobs) {
    const t = loaded.get(j.url);
    if (t) textures.set(j.key, t);
  }

  if (textures.size === 0) return null;
  return {
    formId,
    dir: spriteDirFor(formId) ?? formId,
    textures,
    physicalOrigins,
    anims,
    maxW,
    maxH,
  };
}
