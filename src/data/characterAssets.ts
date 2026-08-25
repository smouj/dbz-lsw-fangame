// ═══════════════════════════════════════════════════════════════════════
// M8.A — characterAssets: agregador ÚNICO de assets por personaje/forma.
// Characters, Animation, Sheets, Facing y cualquier vista futura consumen
// el MISMO bundle — nunca mappings independientes por página.
//
//   CHARACTER / FORM
//   ├─ PORTRAITS  → battle (forma) · menú (personaje) ·
//   │               story: TODAS las variantes reales del catálogo
//   ├─ OVERWORLD  → táctico/chibi · battle OW idle · power pose · aura
//   ├─ COMBAT     → manifest · TODAS las poses del canon (COMBAT_POSE_ORDER)
//   │               con pose resuelta + fallback trazable + frames físicos
//   └─ SHEET      → sheet fuente (referencia HISTÓRICA V9 — NO autoridad
//                   física; la autoridad es el manifest + ROM trace)
// ═══════════════════════════════════════════════════════════════════════

import { spriteDirFor, spriteManifestUrl, resolvePoseInfo } from './spriteManifest';
import { BATTLE_PORTRAITS } from './battlePortraits';
import { MENU_PORTRAITS } from './icons';
import { STORY_PORTRAITS, storyPortraitUrl } from './storyPortraits';
import { overworldUrl } from './overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from './battleOverworld';
import { COMBAT_POSE_ORDER, combatPoseMeta } from '../battle/spriteConfig';
import { getForm } from './roster';

export interface StoryPortraitAsset {
  label: string;
  url: string;
}

export interface CombatPoseAsset {
  pose: string;
  label: string;
  group: string;
  /** ¿Existe en el manifest de la forma? (resolución real, fuente única) */
  resolvedPose: string | null;
  /** Cadena de fallback (pose pedida → pose resuelta) — vacía si directa. */
  fallback: string[];
  /** Frames físicos de la pose resuelta (del manifest). */
  frameCount: number;
  url: string | null;
}

export interface CharacterAssetBundle {
  characterId: string;
  formId: string;
  spriteDir: string | undefined;
  portraits: {
    battle: string | undefined;
    menu: string | undefined;
    story: StoryPortraitAsset[];
  };
  overworld: {
    tactical: string | undefined;
    battleIdle: string | undefined;
    powerPose: string | undefined;
    aura: string | undefined;   // resuelto async aparte (ver resolveOverworldAura)
  };
  combat: {
    manifestUrl: string | undefined;
    poses: CombatPoseAsset[];   // COMBAT_POSE_ORDER completo (requeridas + opcionales)
  };
  sheet: {
    source: string | undefined; // form.sheet (ROM sheet ref) — HISTÓRICO V9, no autoridad
    atomicJsonUrl: string | undefined;
  };
}

/**
 * Bundle SÍNCRONO (lo que no requiere fetch): portraits, overworld estático,
 * manifest URL y poses CON resolución async individual (resolvePoseInfo).
 */
export function getCharacterAssetBundle(characterId: string, formId: string): CharacterAssetBundle {
  const form = getForm(formId);
  const spriteDir = spriteDirFor(formId);
  const charKey = form?.character ?? characterId;

  // Story: todas las variantes REALES del personaje (base + emociones + formas)
  const story: StoryPortraitAsset[] = [];
  const seen = new Set<string>();
  const pushStory = (url: string | undefined, label: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    story.push({ label, url });
  };
  const entry = STORY_PORTRAITS[charKey];
  if (entry) {
    pushStory(entry.base, 'story base');
    for (const [k, v] of Object.entries(entry.emotions ?? {})) pushStory(v, `story ${k}`);
    for (const [k, v] of Object.entries(entry.forms ?? {})) pushStory(v, `story ${k}`);
  }
  pushStory(storyPortraitUrl(charKey, formId), 'story forma actual');

  return {
    characterId,
    formId,
    spriteDir,
    portraits: {
      battle: BATTLE_PORTRAITS[formId],
      menu: MENU_PORTRAITS[characterId],
      story,
    },
    overworld: {
      tactical: overworldUrl(formId),
      battleIdle: battleOverworldActorUrl(formId, 'idle') ?? overworldUrl(formId),
      powerPose: battleOverworldActorUrl(formId, 'gather_power_pose') ?? overworldUrl(formId),
      aura: undefined,
    },
    combat: {
      manifestUrl: spriteManifestUrl(formId),
      poses: COMBAT_POSE_ORDER.map(pose => {
        const meta = combatPoseMeta(pose);
        return {
          pose,
          label: meta.label,
          group: meta.group,
          resolvedPose: null,
          fallback: [],
          frameCount: 0,
          url: null,
        };
      }),
    },
    sheet: {
      source: form?.sheet,
      atomicJsonUrl: form?.sheet ? `/assets/sheets/${form.sheet.replace('.png', '.json')}` : undefined,
    },
  };
}

/** Aura del battle overworld (verificación HEAD del manifest — async). */
export async function resolveOverworldAura(formId: string): Promise<string | undefined> {
  return battleOverworldAuraUrlAsync(formId);
}

/** Resuelve TODAS las poses del bundle contra el manifest (fallbacks únicos). */
export async function resolveBundlePoses(
  bundle: CharacterAssetBundle,
): Promise<CombatPoseAsset[]> {
  return Promise.all(bundle.combat.poses.map(async (p) => {
    const info = await resolvePoseInfo(bundle.formId, p.pose, 0);
    return {
      ...p,
      resolvedPose: info?.pose ?? null,
      fallback: info?.fallback ?? [],
      url: info?.url ?? null,
      // frameCount REAL: nº de frames físicos de la pose resuelta en el
      // manifest (no el 1 hardcodeado de la V9). La vista Sheets/Character
      // usa este conteo para representar secuencias honestas.
      frameCount: info?.frameCount ?? 0,
    };
  }));
}
/**
 * M8.P0 — RETRATO CANÓNICO del hablante. Vive en ./speakerPortraits (módulo
 * ligero, sin battleOverworld) para que los verify headless lo importen;
 * aquí se re-exporta por compatibilidad con consumidores del bundle.
 */
export { resolveSpeakerPortrait } from './speakerPortraits';
