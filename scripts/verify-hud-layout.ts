// ═══════════════════════════════════════════════════════════════════════
// VERIFY: HUD LAYOUT — valida el contrato visual canónico (baseline V1).
// Comprueba que el CSS del combate usa las vars del contrato (--hud-layout-*)
// y que las invariantes estructurales se cumplen (botones=cartas=diálogo,
// card-art dentro de la carta, caja contiene botones).
// Uso: npm run verify:hud-layout
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { HUD_LAYOUT, validateHudLayout } from '../src/data/hudLayout';

const ROOT = resolve(import.meta.dirname);
let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

console.log('═══ HUD LAYOUT — contrato visual (baseline V1) ═══\n');

// 1) Invariantes del contrato
console.log('▸ Invariantes');
const v = validateHudLayout();
check('validateHudLayout() ok', v.ok, v.errors.join(' · '));
check('botones = cartas = 96×80', HUD_LAYOUT.buttonWidth === 96 && HUD_LAYOUT.buttonHeight === 80 && HUD_LAYOUT.cardWidth === 96 && HUD_LAYOUT.cardHeight === 80);
check('card-art 64×48 en 18,18', HUD_LAYOUT.cardArtWidth === 64 && HUD_LAYOUT.cardArtHeight === 48 && HUD_LAYOUT.cardArtX === 18 && HUD_LAYOUT.cardArtY === 18);
check('diálogo 80px = botones', HUD_LAYOUT.dialogueHeight === 80);
check('caja controles contiene botones', HUD_LAYOUT.controlsHeight >= HUD_LAYOUT.buttonHeight + 8);

// 2) El CSS del combate consume las vars del contrato (fallback último)
console.log('\n▸ Conexión CSS ← contrato');
const css = readFileSync(join(ROOT, 'src', 'styles.css'), 'utf8');
const main = readFileSync(join(ROOT, 'src', 'main.tsx'), 'utf8');
const defenseJointView = main.match(/\{defendMenu === 'joint'[\s\S]*?\{defendMenu === 'limit'/)?.[0] ?? '';
const defenseLimitView = main.match(/\{defendMenu === 'limit'[\s\S]*?\n\s*<\/div>\n\s*\)}/)?.[0] ?? '';
for (const k of ['controls-h', 'hud-controls-h', 'hud-layout-controls-h']) {
  check(`battle-controls usa var(--${k})`, css.includes(`var(--${k}`) || css.includes(`--${k}`), 'en battle-controls height');
}
check('contrato inyectado en :root (applyHudLayout en main)', main.includes('applyHudLayout()'));
check('HUD Studio muestra el contrato', readFileSync(join(ROOT, 'src', 'devtools', 'hud.tsx'), 'utf8').includes('HUD_LAYOUT'));

// 3) Paridad de las vistas que antes escapaban del visual compacto.
console.log('\n▸ Paridad runtime del panel inferior');
check('carta robada reutiliza hand-cards', main.includes('className="draw-fx hand-cards"'));
check('robo espera a completar el banner ATTACK', main.includes("showPhaseCue('ATTACK', drawJointForAttack)"));
check('robo tiene frontera visual exclusiva', main.includes("drawFx ? 'is-drawing' : ''") && css.includes('.battle-screen.is-drawing .battle-controls > *:not(.draw-fx)'));
check('sin ayudas textuales encima de botones', !main.includes('className="command-help"') && !main.includes('className="control-label"'));
check('JOINT defensivo usa CardVisual', defenseJointView.includes('<CardVisual') && defenseJointView.includes('defendJoint'));
check('LIMIT defensivo usa frame + CardArtHole', defenseLimitView.includes('className="limit-card"') && defenseLimitView.includes('<CardArtHole'));
check('selectores defensivos sin títulos flotantes', !defenseJointView.includes('limit-title') && !defenseLimitView.includes('limit-title'));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) process.exit(1);
