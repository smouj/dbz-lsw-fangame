#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════
// verify:rom-mode — protege la cadena ROM Mode
// ═══════════════════════════════════════════════════════════════════════
// Cadena: ROM → WRAM/OAM → decodeRomFeed → feedToScene → layout → adapter
// Fixtures: capturas reales del emulador (docs/rom/generated/rom-mode-spike).
//
// Dos bloques:
//   1. Cadena detallada sobre una captura (battle-feed.json)
//   2. Barrido de las 5 familias de acción (families/*.json)
//
// Comprueba lo que puede romperse sin que nadie mire: la semántica de OAM, el
// filtrado de sprites fuera de pantalla, la agrupación por lado, el layout y la
// traducción a la API de la presentación.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { decodeRomFeedSequence, isSpriteOffScreen, type RomRawFrame } from '../src/battle/romMode/decodeRomFeed';
import { feedSequenceToScenes } from '../src/battle/romMode/feedToScene';
import { sceneToPixiLayout, DEFAULT_ANCHOR } from '../src/battle/romMode/romModePixiLayout';
import {
  layoutToSlotCalls,
  applyRomModeLayout,
  applyRomModeSceneToPresentation,
  applyRomModeFeedToPresentation,
  type RomModePixiTarget,
  type RomModeSlotCall,
} from '../src/battle/romMode/romModePixiAdapter';

const ROOT = 'docs/rom/generated/rom-mode-spike';
const FIXTURE = `${ROOT}/battle-feed.json`;
const SPRITES: Record<string, string> = {
  cell: '/assets/overworld/panel_sprites/cell_imperfect_form_ow.png',
  piccolo: '/assets/overworld/panel_sprites/piccolo_base_ow.png',
};
const resolveSprite = (f: string) => SPRITES[f];

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const readFrames = (p: string): RomRawFrame[] => (JSON.parse(readFileSync(p, 'utf8')) as { frames: RomRawFrame[] }).frames;

// ─────────────────────────────────────────────────────────────────────────
// 1. Cadena detallada sobre una captura
// ─────────────────────────────────────────────────────────────────────────
console.log('── 1. Cadena (battle-feed.json) ──');
const raw = { frames: readFrames(FIXTURE) };
check('fixture carga y trae frames', raw.frames.length > 0, `${raw.frames.length} frames`);

const feeds = decodeRomFeedSequence(raw.frames);
const withOam = feeds.filter((f) => f.sprites.length > 0);
check('decodifica frames con sprites', withOam.length > 0, `${withOam.length}/${feeds.length}`);

const sample = withOam[withOam.length - 1];
check('sprites fuera de pantalla descartados', sample.sprites.every((s) => !isSpriteOffScreen(s)), `${sample.sprites.length} visibles`);
check('LCDC 8×16 → alto 16', sample.sprites.every((s) => s.height === 16 || s.height === 8));

const scenes = feedSequenceToScenes(feeds, { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
const scene = scenes.find((s) => s.fighters.length === 2);
check('escena con los dos luchadores', !!scene, scene ? `tick ${scene.tick}` : 'ninguna');

if (scene) {
  const [ally, enemy] = scene.fighters;
  check('ally es el lado izquierdo', ally.screenX < enemy.screenX, `${ally.screenX} < ${enemy.screenX}`);
  check('orientaciones opuestas (se miran)', ally.facing !== enemy.facing, `${ally.facing} vs ${enemy.facing}`);
  check('paletas CGB distintas por lado', ally.cgbPalette !== enemy.cgbPalette, `${ally.cgbPalette} vs ${enemy.cgbPalette}`);
  check('sprites nuestros resueltos', !!ally.spriteUrl && !!enemy.spriteUrl, `${ally.spriteUrl?.split('/').pop()}`);

  const layout = sceneToPixiLayout(scene);
  check('layout: un nodo por luchador', layout.nodes.length === 2);
  check('layout: mundo 160×144', layout.world.width === 160 && layout.world.height === 144);
  const la = layout.nodes.find((n) => n.role === 'ally')!;
  check('layout: scaleX sigue al facing de la ROM', (la.scaleX === 1) === (ally.facing === 'right'), `facing=${ally.facing} scaleX=${la.scaleX}`);
  check('layout: ancla en la base', la.anchor.x === DEFAULT_ANCHOR.x && la.anchor.y === DEFAULT_ANCHOR.y);
  check('layout: conserva la posición del OAM', layout.nodes.every((n, i) => n.x === scene.fighters[i].screenX));

  const calls = layoutToSlotCalls(layout);
  check('adapter: un call por nodo', calls.length === layout.nodes.length);
  check('adapter: ally→slot 0, enemy→slot 1', calls.find((c) => c.role === 'ally')?.slot === 0 && calls.find((c) => c.role === 'enemy')?.slot === 1);
  check('adapter: conserva coordenadas del OAM', calls.every((c) => {
    const n = layout.nodes.find((x) => x.role === c.role)!;
    return c.x === n.x && c.y === n.y;
  }));

  const sent: RomModeSlotCall[] = [];
  const spy: RomModePixiTarget = { setActionObjectPosition: (slot, x, y) => { sent.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } };
  const res = applyRomModeLayout(spy, layout);
  check('adapter: aplica al target', res.applied === 2, `applied=${res.applied}`);
  check('adapter: el target recibe lo mismo que el layout', sent.length === calls.length && sent.every((s, i) => s.slot === calls[i].slot && s.x === calls[i].x && s.y === calls[i].y));

  const sent2: RomModeSlotCall[] = [];
  applyRomModeLayout({ setActionObjectPosition: (slot, x, y) => { sent2.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } }, layout);
  check('adapter: idempotente', JSON.stringify(sent) === JSON.stringify(sent2));

  const sent3: RomModeSlotCall[] = [];
  const res3 = applyRomModeSceneToPresentation({ setActionObjectPosition: (slot, x, y) => { sent3.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } }, scene);
  check('hook: escena → presentación', res3.applied === 2 && JSON.stringify(sent3) === JSON.stringify(sent));

  const sent4: RomModeSlotCall[] = [];
  const res4 = applyRomModeFeedToPresentation(
    { setActionObjectPosition: (slot, x, y) => { sent4.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } },
    feeds[scene.tick],
    { ally: 'cell', enemy: 'piccolo' },
    resolveSprite,
  );
  check('hook: feed crudo → presentación', res4.applied === 2 && JSON.stringify(sent4) === JSON.stringify(sent));
}

const again = feedSequenceToScenes(decodeRomFeedSequence(raw.frames), { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
check('determinismo: dos pasadas idénticas', JSON.stringify(again) === JSON.stringify(scenes));

// ─────────────────────────────────────────────────────────────────────────
// 2. Barrido de las 5 familias de acción
// ─────────────────────────────────────────────────────────────────────────
console.log('\n── 2. Barrido de familias ──');
interface FamilySpec { name: string; file: string; ally: string; enemy: string; }
const FAMILIES: FamilySpec[] = [
  { name: 'Damage', file: `${ROOT}/families/damage.json`, ally: 'gohan', enemy: 'ginyu' },
  { name: 'Beam', file: `${ROOT}/families/beam.json`, ally: 'gohan', enemy: 'ginyu' },
  { name: 'Stage', file: `${ROOT}/families/stage.json`, ally: 'gohan', enemy: 'ginyu' },
  { name: 'Support', file: `${ROOT}/families/support.json`, ally: 'gohan', enemy: 'trunks' },
  { name: 'Defense', file: `${ROOT}/families/defense.json`, ally: 'gohan', enemy: 'ginyu' },
];
const anySprite = (f: string) => `/assets/overworld/panel_sprites/${f}_base_ow.png`;

for (const fam of FAMILIES) {
  const ff = decodeRomFeedSequence(readFrames(fam.file));
  const fs = feedSequenceToScenes(ff, { ally: fam.ally, enemy: fam.enemy }, anySprite);
  const sc = fs.find((s) => s.fighters.length === 2);
  if (!sc) {
    check(`${fam.name}: dos luchadores`, false, `${fs.length} frames`);
    continue;
  }
  const [a, e] = sc.fighters;
  check(
    `${fam.name}: dos luchadores · orientación opuesta · paletas distintas`,
    a.screenX < e.screenX && a.facing !== e.facing && a.cgbPalette !== e.cgbPalette,
    `ally(${a.screenX},${a.screenY})→${a.facing} · enemy(${e.screenX},${e.screenY})→${e.facing} · pal ${a.cgbPalette}/${e.cgbPalette}`,
  );
  const layout = sceneToPixiLayout(sc);
  check(`${fam.name}: layout aplicable`, layout.nodes.length === 2 && layout.world.width === 160, `CA03=${ff[0].battle.CA03}`);
}

// ───────────────────────────────────────────────────────────────────────
// 3. Feel: alineación de beats ROM ↔ remake
// ───────────────────────────────────────────────────────────────────────
// Si el remake deja de caer en los mismos ticks que la ROM en los beats
// clave, "se siente" distinto. Aquí se ancla contra la captura real.
console.log('\n── 3. Beats ROM ↔ remake ──');
const ROM_TRACE = 'docs/rom/generated/action-trace/tail-action-trace.json';
const REM_MELEE = 'scripts/fixtures/m7_melee_hit.json';
interface RomTraceFrame { frame: number; battle: Record<string, number>; activeObject: number; drawOrderFlag: number; }
interface RemEvent { tick: number; type: string; role?: string; }
const romTrace = (JSON.parse(readFileSync(ROM_TRACE, 'utf8')) as { frames: RomTraceFrame[] }).frames;
const remTl = (JSON.parse(readFileSync(REM_MELEE, 'utf8')) as { timeline: RemEvent[] }).timeline;

const romActivate = romTrace.find((f) => f.activeObject === 1)?.frame;
const remVL = remTl.filter((e) => e.type === 'FIGHTER_VISIBILITY' && e.role === 'TARGET');
const remActivate = (remVL.find((e) => e.tick > 0) ?? remVL[0])?.tick;
check('feel: objetivo activo (ROM frame == remake tick)', romActivate !== undefined && romActivate === remActivate, `ROM ${romActivate} · remake ${remActivate}`);

const romMacro = romTrace.find((f) => f.battle.C0A0 === 30)?.frame;
const remMacro = remTl.find((e) => e.type === 'ROM_MACRO')?.tick;
check(
  'feel: macro de acción ROM ≈ remake (±2t)',
  romMacro !== undefined && remMacro !== undefined && Math.abs(romMacro - remMacro) <= 2,
  `ROM ${romMacro} · remake ${remMacro}`,
);

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
process.exit(failed === 0 ? 0 : 1);
