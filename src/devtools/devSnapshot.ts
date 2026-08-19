// ═══════════════════════════════════════════════════════════
// DEV STUDIO — devSnapshot: FUENTE COMÚN de métricas de producción.
// DEV-SYNC — Dashboard · Validation · GameConfig · Characters
// consumen ESTE agregado. Es imposible que una página diga 42 formas
// y otra 48: todas derivan de los mismos registros.
// 0 gameplay · 0 estado de batalla · solo lectura de registros reales.
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { SCENARIOS } from '../data/scenarios';
import { spriteDirFor } from '../data/spriteManifest';
import { SPRITE_CANON } from '../data/generated/spriteCanon.generated';
import { SFX_CATALOG } from '../data/generated/sfxCatalog.generated';
import { ACTION_FIDELITY_REGISTRY, FidelityLevel } from '../data/actionFidelity';
import { GBC_CINEMATIC_CANON, GBC_CINEMATIC_FAMILIES, isGbcCanon } from '../battle/cinematic/GbcCinematicCanon';
import { listActionProfiles } from '../battle/actionProfiles';
import { listAnimationCanon } from '../battle/animationCanon';
import { COMBAT_POSE_ORDER } from '../battle/spriteConfig';
import { MUSIC_TRACK_LIST } from '../audio/music';
import { resolveSpeakerPortrait } from '../data/speakerPortraits';

export interface DevSnapshot {
  roster: { forms: number; formsTotal: number; characters: number; withSpriteDir: number; withoutSpriteDir: string[] };
  cards: { count: number; total: number; byType: Record<string, number>; stageLevels: number[] };
  sprites: { canonFrames: number; byStatus: Record<string, number>; unknown: number; runtimePoseCount: number; poseOrder: number };
  cinematics: {
    gbcFamilies: number; gbcVerified: number; gbcInferred: number;
    actionProfiles: number; animationCanonFamilies: number;
    fidelityByLevel: { level: string; count: number }[]; fidelityTotal: number;
  };
  story: { chapters: number; teamBattles: number; portraitsResolved: number };
  audio: { musicTracks: number; sfx: number };
  scenarios: number;
  canonIntegrity: { duplicateIds: number; ambiguousCanonical: number };
}

/** Agregado único de métricas (DEV-SYNC) — todas las páginas lo consumen. */
export function getDevProjectSnapshot(): DevSnapshot {
  const forms = Object.values(FORMS);
  const withSpriteDir = forms.filter(f => spriteDirFor(f.id)).length;

  const canonFrames = SPRITE_CANON.forms.flatMap(f => f.frames);
  const byStatus: Record<string, number> = {};
  for (const fr of canonFrames) byStatus[fr.canonStatus] = (byStatus[fr.canonStatus] ?? 0) + 1;

  const byType: Record<string, number> = {};
  for (const c of CARDS) byType[c.type] = (byType[c.type] ?? 0) + 1;
  const stageLevels = [...new Set(
    CARDS.filter(c => c.type === 'command' && /stage/i.test(c.name))
      .map(c => (c.name.match(/(\d)\s*Stage/i)?.[1] ? Number(c.name.match(/(\d)\s*Stage/i)![1]) : 0))
      .filter(n => n >= 3 && n <= 6),
  )].sort();

  const gbcSequences = GBC_CINEMATIC_CANON.filter(s => isGbcCanon(s.evidence.fidelity));
  const fidelityByLevel = Object.values(FidelityLevel).map(level => ({
    level,
    count: Object.values(ACTION_FIDELITY_REGISTRY).filter(a => a.fidelity === level).length,
  }));

  const ids = new Set<string>();
  let duplicateIds = 0;
  for (const fr of canonFrames) {
    if (ids.has(fr.canonicalId)) duplicateIds++;
    ids.add(fr.canonicalId);
  }
  const ambiguousCanonical = canonFrames.filter(f =>
    f.canonStatus === 'CANONICAL' && /movement_or_attack|idle_or_stance|downed_or_hurt|multi_evidence/.test(`${f.variant}`)).length;

  return {
    roster: {
      forms: forms.length, formsTotal: 48, characters: CHARACTERS.length,
      withSpriteDir,
      withoutSpriteDir: forms.filter(f => !spriteDirFor(f.id)).map(f => f.id),
    },
    cards: { count: CARDS.length, total: 125, byType, stageLevels },
    sprites: {
      canonFrames: canonFrames.length,
      byStatus,
      unknown: byStatus.UNCLASSIFIED ?? 0,
      runtimePoseCount: new Set(canonFrames.flatMap(f => f.runtimePoses)).size,
      poseOrder: COMBAT_POSE_ORDER.length,
    },
    cinematics: {
      gbcFamilies: GBC_CINEMATIC_FAMILIES.length,
      gbcVerified: gbcSequences.length,
      gbcInferred: GBC_CINEMATIC_CANON.length - gbcSequences.length,
      actionProfiles: listActionProfiles().length,
      animationCanonFamilies: listAnimationCanon().length,
      fidelityByLevel,
      fidelityTotal: Math.max(1, Object.keys(ACTION_FIDELITY_REGISTRY).length),
    },
    story: {
      chapters: Object.keys(STORY_ENEMY_DECKS).length,
      teamBattles: Object.keys(TEAM_BATTLES).length,
      portraitsResolved: CHARACTERS.filter(c => resolveSpeakerPortrait(c.id)).length,
    },
    audio: { musicTracks: MUSIC_TRACK_LIST.length, sfx: SFX_CATALOG.length },
    scenarios: SCENARIOS.length,
    canonIntegrity: { duplicateIds, ambiguousCanonical },
  };
}
