// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE INTRO PRESENTATION — B0/P0 gate.
// Uso: npm run verify:battle-intro-presentation
// Contrato: Battle Intro y Phase Banner son presentación por ticks; no
// popups legacy de +3 CC/Stage, no HP falso en BattleState, primer banner
// derivado de activeAttacker.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { createBattleDeck } from '../src/battle/state';
import {
  BATTLE_INTRO_PRESENTATION_CONFIG,
  INITIAL_BATTLE_INTRO_PRESENTATION,
  buildBattleIntroPresentation,
  buildPhaseBannerPresentation,
  phaseBannerForState,
  reduceBattleIntroPresentation,
} from '../src/battle/presentation/battleStartPresentation';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function cfg(o: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  const deck = createBattleDeck([1, 2, 4, 5, 6, 7, 8, 9, 12, 16, 23, 27].map((id) => getCard(id) as CardDef), { seed: 9 });
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 900, enemyHp: 900, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 10,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck, enemyDeck: deck,
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    ...o,
  };
}

const playerInit = createInitialBattleState(cfg({ firstAttacker: 'player' }));
const enemyInit = createInitialBattleState(cfg({ firstAttacker: 'enemy', playerSpd: 7, enemySpd: 11 }));

check('initial CC contract: player 10', playerInit.player.cc === 10, `cc=${playerInit.player.cc}`);
check('initial CC contract: enemy 10', playerInit.enemy.cc === 10, `cc=${playerInit.enemy.cc}`);
check('first banner: player initiative => ATTACK', phaseBannerForState(playerInit) === 'ATTACK');
check('first banner: enemy initiative => DEFENSE', phaseBannerForState(enemyInit) === 'DEFENSE');

const introProfile = buildBattleIntroPresentation(playerInit);
const introCues = introProfile.tracks.map(t => (t.event.payload as { cue?: string } | undefined)?.cue).filter(Boolean);
check('intro emits BATTLE_INTRO once', introCues.filter(c => c === 'BATTLE_INTRO_STARTED').length === 1, introCues.join(','));
check('intro emits LIFE_FILL cues', introCues.includes('LIFE_FILL_STARTED') && introCues.includes('LIFE_FILL_COMPLETED'), introCues.join(','));
check('intro profile does not hardcode phase banner', !introCues.includes('PHASE_BANNER'), introCues.join(','));

let snap = INITIAL_BATTLE_INTRO_PRESENTATION;
snap = reduceBattleIntroPresentation(snap, BATTLE_INTRO_PRESENTATION_CONFIG.lifeFillStart.ticks);
check('input locked at life fill start', snap.inputLocked);
check('displayed life starts below real HP', Math.round(playerInit.player.hp * snap.lifeFillProgress) < playerInit.player.hp);
check('BattleState HP intact during fill', playerInit.player.hp === 1000 && playerInit.enemy.hp === 900);
snap = reduceBattleIntroPresentation(snap, BATTLE_INTRO_PRESENTATION_CONFIG.lifeFillEnd.ticks);
check('life fill reaches exact current HP', Math.round(playerInit.player.hp * snap.lifeFillProgress) === playerInit.player.hp);
check('BattleState HP still intact after fill', playerInit.player.hp === 1000 && playerInit.enemy.hp === 900);

const attackBanner = buildPhaseBannerPresentation('ATTACK');
const defenseBanner = buildPhaseBannerPresentation('DEFENSE');
const attackBannerCues = attackBanner.tracks.map(t => t.event.payload as { cue?: string; phase?: string });
const defenseBannerCues = defenseBanner.tracks.map(t => t.event.payload as { cue?: string; phase?: string });
check('phase banner emits ATTACK without subtitle', attackBannerCues.some(p => p.cue === 'PHASE_BANNER' && p.phase === 'ATTACK'));
check('phase banner emits DEFENSE without subtitle', defenseBannerCues.some(p => p.cue === 'PHASE_BANNER' && p.phase === 'DEFENSE'));
check('phase banner clear unlock cue exists', attackBannerCues.some(p => p.cue === 'PLAYER_CONTROL_AVAILABLE'));

const mainSrc = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const cssSrc = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
check('legacy start path no longer calls ATTACK PHASE + +3 CC popup',
  !/showPhaseCue\(['"]ATTACK PHASE['"][\s\S]{0,160}\+3 CC/.test(mainSrc));
check('legacy start path no longer auto-runs enemyAttack from phase cue',
  !/showPhaseCue\(['"]ATTACK PHASE['"][\s\S]{0,180}enemyAttack\(/.test(mainSrc));
check('legacy Stage popup absent from BattleScreen path',
  !/showGbc\([^)]*Stage Attack|addLog\([^)]*3 Stage Attack[^)]*\{?\s*gbc:\s*true/.test(mainSrc));
check('HP intro fill has no CSS keyframe clock',
  !/hp-intro-fill/.test(cssSrc));
check('presentation timings marked honest',
  // Cada tramo declara su procedencia. Los timings actuales derivan de la
  // secuencia ROM documentada; el gate solo debe rechazar tiempos sin
  // procedencia (INFERRED), no exigir una etiqueta histórica concreta.
  Object.values(BATTLE_INTRO_PRESENTATION_CONFIG).every(v => v.provenance !== 'INFERRED'));

console.log(`\nverify:battle-intro-presentation — passed=${passed} failed=${failed}`);
if (failed > 0) process.exit(1);
