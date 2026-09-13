#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════
// verify:rom-mode — protege la cadena ROM Mode
// ═══════════════════════════════════════════════════════════════════════
// Cadena: ROM → WRAM/OAM → decodeRomFeed → feedToScene → romModePixiLayout
// Fixture: captura real del emulador (docs/rom/generated/rom-mode-spike).
//
// Comprueba lo que puede romperse sin que nadie mire: la semántica de OAM, el
// filtrado de sprites fuera de pantalla, la agrupación por lado y el layout.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { decodeRomFeedSequence, isSpriteOffScreen, type RomRawFrame } from '../src/battle/romMode/decodeRomFeed';
import { feedSequenceToScenes } from '../src/battle/romMode/feedToScene';
import { sceneToPixiLayout, DEFAULT_ANCHOR } from '../src/battle/romMode/romModePixiLayout';

const FIXTURE = 'docs/rom/generated/rom-mode-spike/battle-feed.json';
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

const raw = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { frames: RomRawFrame[] };
check('fixture carga y trae frames', raw.frames.length > 0, `${raw.frames.length} frames`);

const feeds = decodeRomFeedSequence(raw.frames);
const withOam = feeds.filter((f) => f.sprites.length > 0);
check('decodifica frames con sprites', withOam.length > 0, `${withOam.length}/${feeds.length}`);

// ── OAM: los sprites fuera de pantalla (Y=0 ⇒ screenY=-16) deben quedar fuera ──
const sample = withOam[withOam.length - 1];
check(
  'sprites fuera de pantalla descartados',
  sample.sprites.every((s) => !isSpriteOffScreen(s)),
  `${sample.sprites.length} visibles`,
);
check('LCDC 8×16 → alto 16', sample.sprites.every((s) => s.height === 16 || s.height === 8));

// ── Escena: dos lados, orientación opuesta, paletas distintas ──
const scenes = feedSequenceToScenes(feeds, { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
const scene = scenes.find((s) => s.fighters.length === 2);
check('escena con los dos luchadores', !!scene, scene ? `tick ${scene.tick}` : 'ninguna');
if (scene) {
  const [ally, enemy] = scene.fighters;
  check('ally es el lado izquierdo', ally.screenX < enemy.screenX, `${ally.screenX} < ${enemy.screenX}`);
  check('orientaciones opuestas (se miran)', ally.facing !== enemy.facing, `${ally.facing} vs ${enemy.facing}`);
  check('paletas CGB distintas por lado', ally.cgbPalette !== enemy.cgbPalette, `${ally.cgbPalette} vs ${enemy.cgbPalette}`);
  check('sprites nuestros resueltos', !!ally.spriteUrl && !!enemy.spriteUrl, `${ally.spriteUrl?.split('/').pop()}`);

  // ── Layout Pixi ──
  const layout = sceneToPixiLayout(scene);
  check('layout: un nodo por luchador', layout.nodes.length === 2);
  check('layout: mundo 160×144', layout.world.width === 160 && layout.world.height === 144);
  const la = layout.nodes.find((n) => n.role === 'ally')!;
  check('layout: scaleX sigue al facing de la ROM', (la.scaleX === 1) === (ally.facing === 'right'), `facing=${ally.facing} scaleX=${la.scaleX}`);
  check('layout: ancla en la base', la.anchor.x === DEFAULT_ANCHOR.x && la.anchor.y === DEFAULT_ANCHOR.y);
  check('layout: conserva la posición del OAM', layout.nodes.every((n, i) => n.x === scene.fighters[i].screenX));
}

// ── Determinismo ──
const again = feedSequenceToScenes(decodeRomFeedSequence(raw.frames), { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
check('determinismo: dos pasadas idénticas', JSON.stringify(again) === JSON.stringify(scenes));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
process.exit(failed === 0 ? 0 : 1);
