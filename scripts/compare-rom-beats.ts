#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════════════════════════════
// ROM vs REMAKE — comparación de beats (feel check)
// ═══════════════════════════════════════════════════════════════════════
// Objetivo: que el remake "se sienta" como la ROM. La forma verificable de
// acercarse es comparar los BEATS (transiciones de estado y de composición)
// del guion real de la ROM contra el timeline del remake para la misma acción.
//
// Lado ROM : docs/rom/generated/action-trace/tail-action-trace.json
//            (captura real, 90 frames: C0A0 / CA03 / activeObject / drawOrder)
// Lado remake: scripts/fixtures/m7_melee_hit.json (HIT estándar, misma acción)
//
// NO se fuerza que coincidan: se reportan coincidencias y divergencias.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';

const ROM = 'docs/rom/generated/action-trace/tail-action-trace.json';
const FIX = 'scripts/fixtures/m7_melee_hit.json';

interface RomFrame {
  frame: number;
  battle: Record<string, number>;
  activeObject: number;
  drawOrderFlag: number;
}
interface FixEvent {
  tick: number;
  type: string;
  role?: string;
  pose?: string;
  kind?: string;
  mode?: string;
  durationTicks?: number;
}

const rom = (JSON.parse(readFileSync(ROM, 'utf8')) as { frames: RomFrame[] }).frames;
const fix = (JSON.parse(readFileSync(FIX, 'utf8')) as { timeline: FixEvent[] }).timeline;

// ── Lado ROM: transiciones observadas ──
interface Beat { frame: number; what: string; }
const romBeats: Beat[] = [];
let prev: string | null = null;
for (const f of rom) {
  const key = `${f.battle.C0A0}/${f.battle.CA03}/${f.activeObject}/${f.drawOrderFlag}`;
  if (key !== prev) {
    romBeats.push({
      frame: f.frame,
      what: `C0A0=${f.battle.C0A0} CA03=${f.battle.CA03} activeObj=${f.activeObject} drawOrder=${f.drawOrderFlag}`,
    });
    prev = key;
  }
}

console.log('── Lado ROM (captura real, 90 frames) ──');
for (const b of romBeats) console.log(`  frame ${String(b.frame).padStart(3)}  ${b.what}`);

// ── Lado remake: beats del fixture ──
const fixBeats = fix.filter((e) => e.type === 'SCENE_LOAD' || e.type === 'ROM_MACRO' || e.type === 'FIGHTER_VISIBILITY' || e.type === 'ROM_WAIT' || e.type === 'PALETTE_TRANSITION' || e.type === 'FIGHTER_MOTION' || e.type === 'ANIMATION_START');
console.log('\n── Lado remake (m7_melee_hit) ──');
for (const b of fixBeats.slice(0, 14)) {
  console.log(`  tick  ${String(b.tick).padStart(3)}  ${b.type}${b.role ? ' ' + b.role : ''}${b.mode ? ' ' + b.mode : ''}${b.durationTicks ? ' dur=' + b.durationTicks : ''}`);
}

// ── Puntos de contraste explícitos ──
console.log('\n── Contraste en los beats que ambos declaran ──');
// El beat relevante del remake es la SEGUNDA visibilidad del TARGET (tick 40),
// no la inicial del tick 0: la ROM también separa "colocar" de "activar".
const romTarget = rom.find((f) => f.activeObject === 1);
const fixTargets = fix.filter((e) => e.type === 'FIGHTER_VISIBILITY' && e.role === 'TARGET');
const fixTarget = fixTargets.find((e) => e.tick > 0) ?? fixTargets[0];
console.log(
  `  objetivo activo → ROM frame ${romTarget?.frame ?? '?'} (activeObj ${romTarget?.activeObject}, drawOrder ${romTarget?.drawOrderFlag})` +
  ` · remake tick ${fixTarget?.tick ?? '?'}` +
  `${romTarget?.frame === fixTarget?.tick ? '   ✅ coinciden (frame/tick exacto)' : '   ⚠️ difieren'}`,
);

const romMacro = romBeats.find((b) => b.what.includes('C0A0=30'));
const fixMacro = fix.find((e) => e.type === 'ROM_MACRO');
console.log(
  `  macro de acción → ROM frame ${romMacro?.frame ?? '?'} (C0A0=30) · remake tick ${fixMacro?.tick ?? '?'}` +
  `${romMacro && fixMacro && Math.abs((romMacro.frame ?? 0) - (fixMacro.tick ?? 0)) <= 2 ? '   ✅ dentro de ±2t' : '   ⚠️ revisar'}`,
);

// La captura ROM es de 90 frames (longitud de captura), NO la duración del
// action: no se compara contra los 302 ticks del remake para no afirmar algo
// que la captura no sostiene.
console.log(`  captura ROM: ${rom.length} frames trazados (longitud de captura, no duración del action)`);
console.log(`  timeline remake: ${Math.max(...fix.map((e) => e.tick + (e.durationTicks ?? 0)))} ticks`);
