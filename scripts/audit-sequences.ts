// Auditoría de secuencias cinematográficas (spec V1/V2): vuelca los eventos
// del timeline por tick para cada perfil clave y valida la gramática:
//   - Stage Attack: SHOT duelo → MOVEMENT_COMMIT → RUSH → N contactos → finisher → retorno
//   - Guard/gather/support: poses coherentes sin cortes
//   - Melee/beam: contacto → hit-stop → resolve → retorno
import { compileActionProfile, ACTION_PROFILE_REGISTRY, type ActionProfileSpec } from '../src/battle/actionProfiles';

type Ev = { tick: number; type: string; payload?: unknown };
type Row = { tick: number; scene: string; actor: string; target: string };

const FOCUS = ['stage_3', 'stage_4', 'guard', 'gather', 'support', 'cont_punch', 'energy_wave', 'energy_bomb', 'kamehameha', 'kaio_ken'];

const SCENE_NAMES: Record<string, string> = {
  FIELD: 'FIELD', ACTION_SOLO: 'SOLO', ACTION_DUEL: 'DUEL', ACTION_TEAM: 'TEAM', PROJECTILE: 'PROJ', IMPACT: 'IMPACT',
};

function poseOf(e: Ev): string | null {
  const p = e.payload as { pose?: string } | undefined;
  return p?.pose ?? null;
}

function summarize(events: Ev[]): Row[] {
  const rows: Row[] = [];
  let scene = 'FIELD', actor = 'idle', target = 'idle';
  for (const e of events) {
    switch (e.type) {
      case 'SHOT': { const s = (e.payload as { shot?: string })?.shot; if (s) scene = SCENE_NAMES[s] ?? s; break; }
      case 'ACTOR_POSE': { const p = poseOf(e); if (p) actor = p; break; }
      case 'TARGET_POSE': { const p = poseOf(e); if (p) target = p; break; }
      case 'MOVEMENT_COMMIT': rows.push({ tick: e.tick, scene, actor, target }); rows[rows.length - 1].scene = `${scene}·MOVE`; break;
      case 'RUSH': rows.push({ tick: e.tick, scene: `${scene}·RUSH`, actor, target }); break;
      case 'HIT_FRAME': rows.push({ tick: e.tick, scene: `${scene}·HIT`, actor, target }); break;
      case 'HIT_STOP_START': rows.push({ tick: e.tick, scene: `${scene}·HS!`, actor, target }); break;
      case 'HIT_STOP_END': rows.push({ tick: e.tick, scene: `${scene}·HS`, actor, target }); break;
      case 'APPLY_DAMAGE': rows.push({ tick: e.tick, scene: `${scene}·DMG`, actor, target }); break;
      case 'PROJECTILE': {
        const p = e.payload as { action?: string; kind?: string };
        rows.push({ tick: e.tick, scene: `${scene}·PRJ:${p.action ?? '?'}${p.kind ? `(${p.kind})` : ''}`, actor, target });
        break;
      }
      case 'CHARGE_LOOP': rows.push({ tick: e.tick, scene: `${scene}·CHARGE`, actor, target }); break;
      case 'CLEANUP': rows.push({ tick: e.tick, scene: `${scene}·CLEAN`, actor, target }); break;
      case 'FIELD_RETURN': rows.push({ tick: e.tick, scene: 'FIELD·RETURN', actor, target }); break;
      default: break;
    }
  }
  return rows;
}

function compile(spec: ActionProfileSpec): Ev[] {
  return compileActionProfile(spec).tracks.map(t => ({ tick: t.tick, type: t.event.type, payload: t.event.payload }));
}

function audit(spec: ActionProfileSpec): string[] {
  const events = compile(spec);
  const rows = summarize(events);
  const issues: string[] = [];
  const types = events.map(e => e.type);
  // 1) contact → hit-stop → resolve → retorno (nunca resolve antes de contact)
  const hitIdx = types.lastIndexOf('HIT_FRAME');
  const dmgIdx = types.lastIndexOf('APPLY_DAMAGE');
  if (hitIdx >= 0 && dmgIdx >= 0 && dmgIdx < hitIdx) issues.push('APPLY_DAMAGE ANTES de HIT_FRAME');
  if (hitIdx >= 0 && !types.includes('HIT_STOP_START')) issues.push('sin HIT_STOP_START tras contacto');
  // 2) cleanup antes de retorno
  const retIdx = types.lastIndexOf('FIELD_RETURN');
  if (retIdx >= 0 && !types.slice(0, retIdx).includes('CLEANUP')) issues.push('sin CLEANUP antes de FIELD_RETURN');
  // 3) melee con rush → MOVEMENT_COMMIT presente
  if (spec.rush && !types.includes('MOVEMENT_COMMIT')) issues.push('rush sin MOVEMENT_COMMIT');
  // 4) beam → spawn antes de impacto
  const spawn = events.findIndex(e => e.type === 'PROJECTILE' && (e.payload as { action?: string })?.action === 'spawn');
  const impact = events.findIndex(e => e.type === 'PROJECTILE' && (e.payload as { action?: string })?.action === 'impact');
  if (spec.projectile && spawn >= 0 && impact >= 0 && impact < spawn) issues.push('impact de proyectil ANTES de spawn');
  return issues;
}

console.log('=== AUDITORÍA DE SECUENCIAS (spec V2) ===');
let total = 0, withIssues = 0;
for (const spec of ACTION_PROFILE_REGISTRY) {
  const events = compile(spec);
  const issues = audit(spec);
  const rows = summarize(events);
  total++;
  const focus = FOCUS.includes(spec.id);
  if (focus || issues.length) {
    console.log(`\n▶ ${spec.id} (${spec.label}) — ${events.length} eventos, ${rows.length} hitos`);
    for (const r of rows) console.log(`   ${String(r.tick).padStart(3)} ${r.scene.padEnd(22)} A:${r.actor.padEnd(16)} T:${r.target}`);
    if (issues.length) { withIssues++; console.log(`   ⚠ ${issues.join('; ')}`); }
    else if (focus) console.log('   ✅ gramática V2 correcta');
  } else if (issues.length) { withIssues++; }
}
console.log(`\n${total} perfiles auditados · ${withIssues} con problemas`);
process.exit(withIssues ? 1 : 0);
