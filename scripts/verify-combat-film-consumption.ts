// ═══════════════════════════════════════════════════════════════════════
// verify:combat-film-consumption — P0 ROM PRESENTATION → PIXI CONSUMPTION
// ═══════════════════════════════════════════════════════════════════════
// Gate de consumo (no de re-descubrimiento ROM). Sobre las películas REALES
// que el runtime produce para STANDARD_DAMAGE (player+enemy × HIT/MISS/
// SPECIAL_DEFENSE) verifica que el frontend consume la ROM, no una peli
// inventada:
//
//   1. Cleanup anclado al final visual real (endTick): STOP slot0/slot1 +
//      RESTORE_TACTICAL en el MISMO tick final; nunca antes del fin del film.
//   2. Un único boundary de resultado por película (ROM_RESULT_BRANCH).
//   3. El slot1 (target) NO tiene frames/animación antes de su entrada ROM
//      (FIGHTER_VISIBILITY target=true): el target no "existe" antes.
//   4. Ningún frame del target se resuelve con el FORM del actor (anti-swap);
//      los frames de reacción del slot1 llevan evidencia Bank61 de la rama
//      (macros $2F/$30/$31) y su secuencia es la fija de la rama, jamás la
//      seq1 de la carta del actor en slot1 (regresión V3).
//   5. El actor (slot0) tras el branch reproduce su seq1 de follow-through.
//   6. Guardas de fuente: FIGHTER_VISIBILITY no arranca playback; el único
//      opt-in de playback es setPose (cue FIGHTER_POSE/animación).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { getCard } from '../src/data/cards';
import { actionDescriptorForCard } from '../src/battle/engine/commands/buildActionDescriptor';
import type { BattleEventEnvelope } from '../src/battle/engine/events';
import type { TimelineEntry } from '../src/battle/engine/presentation/PresentationCue';
import { latestStandardDamageRuntimeCutover } from '../src/battle/standardDamageRomCutover';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const ACTOR = 'gohan_young';
const TARGET = 'piccolo_evil';

function runtimeCutover(side: 'player' | 'enemy', outcome: 'HIT' | 'MISS' | 'SPECIAL_DEFENSE') {
  const card = getCard(5)!; // Cont.Punch — handler $0A STANDARD_DAMAGE
  const action = actionDescriptorForCard(card);
  const target = side === 'player' ? 'enemy' : 'player';
  const outcomeEvent = outcome === 'MISS'
    ? { type: 'ATTACK_MISSED' as const, source: side, target }
    : { type: 'ATTACK_HIT' as const, source: side, target, outcome: outcome === 'HIT' ? 'hit' as const : 'block' as const };
  const events: BattleEventEnvelope[] = [
    { sequence: 1, tick: 20, event: { type: 'ACTION_STARTED', side, action } },
    { sequence: 2, tick: 20, event: outcomeEvent },
    { sequence: 3, tick: 20, event: { type: 'ACTION_RESOLVED', side, action } },
  ];
  const actorForm = side === 'player' ? ACTOR : TARGET;
  const targetForm = side === 'player' ? TARGET : ACTOR;
  const cutover = latestStandardDamageRuntimeCutover(events, side, card, actorForm, targetForm);
  if (!cutover) throw new Error(`no cutover for ${side}/${outcome}`);
  return { cutover, actorForm, targetForm };
}

const cardResource = 44; // Cont.Punch actor animation resource (descriptor slot6)

for (const side of ['player', 'enemy'] as const) {
  for (const outcome of ['HIT', 'MISS', 'SPECIAL_DEFENSE'] as const) {
    const { cutover, actorForm, targetForm } = runtimeCutover(side, outcome);
    const label = `${side}/${outcome}`;
    const entries = cutover.timeline.entries;
    const endTick = cutover.timeline.endTick;

    // Monotonicidad (entrada → salida ordenada por tick).
    let monotonic = true;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].cue.tick < entries[i - 1].cue.tick) monotonic = false;
    }
    check(`${label}:film ticks monotonic`, monotonic);

    const branches = entries.filter(e => e.cue.type === 'ROM_RESULT_BRANCH');
    check(`${label}:single ROM result boundary`, branches.length === 1, String(branches.length));
    const branchTick = branches[0]?.cue.tick ?? -1;
    check(`${label}:film ends after the branch`, endTick > branchTick, `${endTick} > ${branchTick}`);

    // 1 — Cleanup anclado al endTick real.
    const atEnd = entries.filter(e => e.cue.tick === endTick);
    const hasStop0 = atEnd.some(e => e.cue.type === 'ACTION_OBJECT_STOP' && e.cue.slot === 0);
    const hasStop1 = atEnd.some(e => e.cue.type === 'ACTION_OBJECT_STOP' && e.cue.slot === 1);
    const hasRestore = atEnd.some(e => e.cue.type === 'SCENE_LOAD' && e.cue.mode === 'RESTORE_TACTICAL');
    check(`${label}:cleanup STOP slot0 at real film end`, hasStop0);
    check(`${label}:cleanup STOP slot1 at real film end`, hasStop1);
    check(`${label}:RESTORE_TACTICAL at real film end`, hasRestore);
    check(`${label}:cleanup never before endTick`, !entries.some(e =>
      e.cue.tick < endTick && (e.cue.type === 'SCENE_LOAD' && e.cue.mode === 'RESTORE_TACTICAL')));

    // 3 — El target no tiene frames antes de su entrada ROM.
    const targetVisibleIn = entries.findIndex(e =>
      e.cue.type === 'FIGHTER_VISIBILITY' && e.cue.role === 'TARGET' && e.cue.visible);
    const slot1Frames = entries.filter(e =>
      (e.cue.type === 'ROM_PHYSICAL_FRAME' || e.cue.type === 'ANIMATION_START') && e.cue.slot === 1);
    const entranceTick = targetVisibleIn >= 0 ? entries[targetVisibleIn].cue.tick : -1;
    if (entranceTick >= 0) {
      check(`${label}:no slot1 (target) frames before ROM entrance`,
        slot1Frames.every(e => e.cue.tick >= entranceTick),
        `first target frame @${slot1Frames[0]?.cue.tick ?? '-'} entrance@${entranceTick}`);
    }

    // 4 — Anti-swap de forms + secuencias fijas Bank61 de la rama en slot1.
    const slot1Physical = entries.filter(e => e.cue.type === 'ROM_PHYSICAL_FRAME' && e.cue.slot === 1);
    check(`${label}:target frames never use the actor form`,
      slot1Physical.every(e => e.cue.formId === targetForm), `${slot1Physical[0]?.cue.formId ?? 'none'}`);
    check(`${label}:slot1 never plays card seq1 (V3 regression)`,
      !entries.some(e => e.cue.type === 'ANIMATION_START' && e.cue.slot === 1 && e.cue.resource === cardResource && e.cue.sequence === 1));
    check(`${label}:slot1 reaction frames carry Bank61 branch evidence`,
      slot1Physical.length > 0 && slot1Physical.every(e =>
        (e.cue.evidence ?? []).some(item => item.startsWith('ROM_STANDARD_DAMAGE_RESULT_BANK61'))),
      `${slot1Physical.length} frames`);

    // 5 — Actor follow-through (slot0 seq1 de la carta) tras el branch.
    const postBranchActor = entries.filter(e =>
      e.cue.type === 'ROM_PHYSICAL_FRAME' && e.cue.slot === 0 && e.cue.tick > branchTick);
    check(`${label}:actor follow-through seq1 on slot0 after branch`,
      postBranchActor.length > 0 && postBranchActor.every(e => e.cue.sequence === 1 && e.cue.resource === cardResource),
      `${postBranchActor.length} frames`);
  }
}

// ── Guards de fuente (P0.2/G7) ──
{
  const adapter = readFileSync('src/renderer/pixi/presentation/ProductionRomPresentationAdapter.ts', 'utf8');
  const visibilityCase = adapter.slice(adapter.indexOf("case 'FIGHTER_VISIBILITY'"), adapter.indexOf("case 'ANIMATION_START'"));
  check('source:FIGHTER_VISIBILITY only composes (no pose/playback start)',
    !/set(?:Actor|Target)?Pose|setPlaybackEnabled|advanceAnimation/.test(visibilityCase));

  const actor = readFileSync('src/renderer/pixi/actors/FighterActor.ts', 'utf8');
  const playbackEnablers = (actor.match(/playbackEnabled\s*=\s*true/g) ?? []).length;
  check('source:single playback opt-in (setPose only)', playbackEnablers === 1, String(playbackEnablers));

  const scene = readFileSync('src/renderer/pixi/scenes/ActionScene.ts', 'utf8');
  check('source:scene visibility never starts playback',
    !/setPlaybackEnabled|setPose\(|freezeTrack/.test(scene));
}

console.log(`\n═══ COMBAT FILM CONSUMPTION ═══`);
console.log(`checks=${checks} failures=${failures}`);
process.exit(failures === 0 ? 0 : 1);
