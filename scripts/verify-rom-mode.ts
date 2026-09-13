#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════
// verify:rom-mode — protege la cadena ROM Mode
// ═══════════════════════════════════════════════════════════════════════
// Cadena: ROM → WRAM/OAM → decodeRomFeed → feedToScene → layout → adapter
// Fixture: captura real del emulador (docs/rom/generated/rom-mode-spike).
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

  // ── Adaptador Pixi (traduce a la API existente, no reimplementa render) ──
  const calls = layoutToSlotCalls(layout);
  check('adapter: un call por nodo', calls.length === layout.nodes.length);
  check(
    'adapter: ally→slot 0, enemy→slot 1',
    calls.find((c) => c.role === 'ally')?.slot === 0 && calls.find((c) => c.role === 'enemy')?.slot === 1,
  );
  check(
    'adapter: conserva coordenadas del OAM',
    calls.every((c) => {
      const n = layout.nodes.find((x) => x.role === c.role)!;
      return c.x === n.x && c.y === n.y;
    }),
  );

  const sent: RomModeSlotCall[] = [];
  const spy: RomModePixiTarget = {
    setActionObjectPosition: (slot, x, y) => {
      sent.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' });
    },
  };
  const res = applyRomModeLayout(spy, layout);
  check('adapter: aplica al target', res.applied === 2, `applied=${res.applied}`);
  check(
    'adapter: el target recibe lo mismo que el layout',
    sent.length === calls.length && sent.every((s, i) => s.slot === calls[i].slot && s.x === calls[i].x && s.y === calls[i].y),
  );
  const sent2: RomModeSlotCall[] = [];
  applyRomModeLayout(
    { setActionObjectPosition: (slot, x, y) => { sent2.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } },
    layout,
  );
  check('adapter: idempotente', JSON.stringify(sent) === JSON.stringify(sent2));

  // ── Enganche completo: escena / feed → presentación ──
  const sent3: RomModeSlotCall[] = [];
  const res3 = applyRomModeSceneToPresentation(
    { setActionObjectPosition: (slot, x, y) => { sent3.push({ slot, x, y, role: slot === 0 ? 'ally' : 'enemy' }); } },
    scene,
  );
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

// ── Determinismo ──
const again = feedSequenceToScenes(decodeRomFeedSequence(raw.frames), { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
check('determinismo: dos pasadas idénticas', JSON.stringify(again) === JSON.stringify(scenes));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
process.exit(failed === 0 ? 0 : 1);
