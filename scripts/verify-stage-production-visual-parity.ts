#!/usr/bin/env tsx
/**
 * Production boundary gate for the Stage recovery prompt.
 *
 * The engine/golden gate proves the ROM timing and results. This gate keeps
 * BattleScreen wired to that engine state and prevents the shared Dev/Game
 * panel from returning to manually supplied QTE PNGs.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const main = readFileSync(resolve('src/main.tsx'), 'utf8');
const panel = readFileSync(resolve('src/components/StageHudPanel.tsx'), 'utf8');
const devHud = readFileSync(resolve('src/devtools/hud.tsx'), 'utf8');
const engine = readFileSync(resolve('src/battle/engine/commands/reducers/powerReducer.ts'), 'utf8');

let failures = 0;
function check(label: string, condition: boolean): void {
  if (condition) console.log(`PASS ${label}`);
  else { failures += 1; console.error(`FAIL ${label}`); }
}

console.log('=== verify:stage-production-visual-parity ===\n');

check('BattleScreen and Dev HUD share StageHudPanel',
  main.includes('<StageHudPanel') && devHud.includes('<StageHudPanel'));
check('BattleScreen renders COUNTER_WINDOW',
  main.includes("q.state !== 'COUNTER_WINDOW'"));
check('COUNTER_WINDOW input reaches the engine recovery dispatcher',
  /st\.state === 'COUNTER_WINDOW'[\s\S]{0,180}stageRecoverInput\(key\)/.test(main));
check('A recovery dispatches QTE_COUNTER_DEFEND',
  /pressed === 'A'[\s\S]{0,220}QTE_COUNTER_DEFEND/.test(main));
check('B recovery dispatches QTE_COUNTER_CONTINUE',
  /pressed === 'B'[\s\S]{0,220}QTE_COUNTER_CONTINUE/.test(main));
check('shared panel exposes both recovery choices',
  panel.includes('command="A"') && panel.includes('command="B"') &&
  panel.includes('DEFEND') && panel.includes('CONTINUE'));
check('Dev HUD previews the real counter state with the shared panel',
  devHud.includes("'COUNTER_WINDOW'") && devHud.includes('state={stagePreviewState}'));
check('Stage prompt has no manual QTE PNG dependency',
  !panel.includes('/assets/ui/qte/') && !panel.includes('key_q.png') && !panel.includes('key_e.png'));
check('Stage command identity remains data-driven',
  panel.includes('function StageCommandGlyph') && panel.includes('command={k}'));
check('engine keeps A and B as distinct ROM outcomes',
  engine.includes("action: 'DEFEND'") && engine.includes("action: 'CONTINUE'"));
check('STOP/result timing is not duplicated in the HUD component',
  !panel.includes('setTimeout') && !panel.includes('requestAnimationFrame'));

console.log('');
if (failures === 0) {
  console.log('ALL CHECKS PASSED ✅');
  process.exit(0);
}
console.error(`${failures} CHECK(S) FAILED ❌`);
process.exit(1);
