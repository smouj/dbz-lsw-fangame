// ═══════════════════════════════════════════════════════════════════════
// S-MAP1 — sprite-mapping/classify.ts
// Motor de clasificación: formId × runtimePose → SpriteClassification.
// Reglas (ROM-FIRST, sin V9 como autoridad física):
//   · FX_POSES → REFERENCE_FX
//   · COMPOSITE_POSES → COMPOSITE (componentes = frames reales)
//   · alias semánticos conocidos (power_up → gather_power) → SEMANTIC_ALIAS
//   · files cuyo prefijo pertenece a otra pose → SHARED_PHYSICAL (owner)
//   · sin files → MISSING (o FALLBACK si POSE_FALLBACKS lo resuelve)
//   · resto → CANONICAL_PHYSICAL (PNG del canon oficial, sin provenance ROM)
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  FX_POSES, COMPOSITE_POSES, SEMANTIC_ALIAS_MAP, REQUIRED_POSES,
  type RuntimeSpriteBinding, type SpriteClassification,
} from './taxonomy.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SPRITES_DIR = join(ROOT, 'public/assets/sprites');

export interface PoseData {
  frame_count: number;
  fps: number;
  loop: boolean;
  frames: Array<{ name: string; file: string; w?: number; h?: number }>;
}

export interface FormManifest {
  dir: string;
  poses: Record<string, PoseData>;
}

/** Fallbacks runtime (duplicado de POSE_FALLBACKS del runtime para detección). */
const RUNTIME_FALLBACKS: Record<string, string[]> = {
  idle: ['idle'], move_front: ['move_front', 'move_back', 'attack_fwd', 'idle'],
  move_back: ['move_back', 'move_front', 'attack_fwd', 'idle'],
  guard: ['guard', 'idle'], attack_fwd: ['attack_fwd', 'move_front', 'idle'],
  attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  punch_right: ['punch_right', 'attack_fwd', 'idle'],
  punch_left: ['punch_left', 'attack_fwd', 'idle'],
  kick_right: ['kick_right', 'attack_ud', 'attack_fwd', 'idle'],
  hurt: ['hurt', 'knockback_back', 'guard', 'idle'],
  knockback_back: ['knockback_back', 'hurt', 'idle'],
  knockback_up: ['knockback_up', 'hurt', 'idle'],
  knockback_down: ['knockback_down', 'hurt', 'idle'],
  beam_guard: ['beam_guard', 'guard', 'beam_charge', 'idle'],
  evade: ['evade', 'move_back', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'gather_power', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  gather_power: ['gather_power', 'beam_charge', 'guard', 'idle'],
  power_up: ['power_up', 'gather_power', 'beam_charge', 'guard', 'idle'],
  beam_ray: ['beam_ray', 'beam_fire', 'idle'],
  beam_ray_tip: ['beam_ray_tip', 'beam_ray', 'idle'],
  aura_power: ['aura_power', 'idle'],
  aura_support: ['aura_support', 'idle'],
};

/** Prefijo de archivo → pose propietaria (p.ej. frieza_final_gather_power_00 → gather_power). */
export function filePrefixToPose(file: string, dir: string): string | null {
  const base = file.replace(/\.png$/i, '');
  const withoutDir = base.startsWith(dir + '_') ? base.slice(dir.length + 1) : base;
  const m = withoutDir.match(/^(.*?)_\d+$/);
  if (!m) return null;
  return m[1];
}

export function loadFormManifest(dir: string): FormManifest | null {
  const p = join(SPRITES_DIR, dir, 'manifest.json');
  if (!existsSync(p)) return null;
  return { dir, poses: JSON.parse(readFileSync(p, 'utf8')) };
}

/** Detecta si una pose es "propietaria" de sus archivos (prefijo == pose). */
function ownsFiles(pose: string, dir: string, files: string[]): boolean {
  if (files.length === 0) return false;
  return files.every((f) => filePrefixToPose(f, dir) === pose);
}

export function classifyPose(
  formId: string,
  dir: string,
  pose: string,
  data: PoseData,
  allPoses: Record<string, PoseData>,
): RuntimeSpriteBinding {
  const files = data.frames.map((f) => f.file);
  const evidence: string[] = [];
  const base: RuntimeSpriteBinding = { formId, runtimePose: pose, classification: 'UNRESOLVED', files };

  if (FX_POSES.has(pose)) {
    base.classification = 'REFERENCE_FX';
    evidence.push('FX pose (beam_ray/beam_ray_tip/aura_*) — dominio BG/FX, no FighterActor');
    base.evidence = evidence;
    return base;
  }

  if (COMPOSITE_POSES.has(pose)) {
    base.classification = 'COMPOSITE';
    base.components = data.frames.map((f) => ({ file: f.file, pose: filePrefixToPose(f.file, dir) ?? undefined }));
    evidence.push('Pose compuesta construida con frames de otras familias físicas');
    if (data.frames.some((f) => filePrefixToPose(f.file, dir) === pose)) {
      evidence.push('Core físico propio presente (al menos un frame con prefijo de la pose)');
    }
    base.evidence = evidence;
    return base;
  }

  // Alias semántico conocido (mismo asset físico, función ≈ propietaria).
  if (SEMANTIC_ALIAS_MAP[pose]) {
    const owner = SEMANTIC_ALIAS_MAP[pose];
    base.classification = 'SEMANTIC_ALIAS';
    base.ownerPose = owner;
    evidence.push(`Mismo asset físico que ${owner} (función semántica distinta del PNG, no identidad física nueva)`);
    base.evidence = evidence;
    return base;
  }

  // Archivos cuyo prefijo pertenece a OTRA pose → reutilización física.
  if (files.length > 0 && !ownsFiles(pose, dir, files)) {
    const owners = new Set(files.map((f) => filePrefixToPose(f, dir)).filter(Boolean));
    if (owners.size === 1) {
      const owner = [...owners][0]!;
      if (owner !== pose) {
        base.classification = 'SHARED_PHYSICAL';
        base.ownerPose = owner;
        evidence.push(`Reutiliza los frames físicos de ${owner} (${files.length} archivos)`);
        base.evidence = evidence;
        return base;
      }
    } else {
      // Frames de varias poses: composición no declarada → COMPOSITE por evidencia.
      base.classification = 'COMPOSITE';
      base.components = data.frames.map((f) => ({ file: f.file, pose: filePrefixToPose(f.file, dir) ?? undefined }));
      evidence.push(`Frames con prefijos mixtos (${[...owners].join(', ')}) → composición por evidencia`);
      if (data.frames.some((f) => filePrefixToPose(f.file, dir) === pose)) {
        evidence.push('Core físico propio presente (al menos un frame con prefijo de la pose)');
      }
      base.evidence = evidence;
      return base;
    }
  }

  // Sin archivos → MISSING o FALLBACK si existe cadena de fallback.
  if (files.length === 0) {
    const fb = RUNTIME_FALLBACKS[pose] ?? [];
    const resolved = fb.find((p) => p !== pose && allPoses[p] && allPoses[p].frames.length > 0);
    if (resolved) {
      base.classification = 'FALLBACK';
      evidence.push(`Sin archivos propios; runtime resuelve vía ${resolved} (POSE_FALLBACKS)`);
    } else {
      base.classification = 'MISSING';
      evidence.push('Debería existir según contrato (COMBAT_REQUIRED/OPTIONAL) pero no hay archivos');
    }
    base.evidence = evidence;
    return base;
  }

  base.classification = 'CANONICAL_PHYSICAL';
  base.canonicalIds = data.frames.map((f, i) => `${formId}.${pose}.${i}.${f.file}`);
  evidence.push('PNG físico de Canonical_Frames_Official (vía import-canonical-frames) — sin provenance ROM aún');
  base.evidence = evidence;
  return base;
}

export function classifyForm(formId: string, dir: string): RuntimeSpriteBinding[] | null {
  const m = loadFormManifest(dir);
  if (!m) return null;
  const out: RuntimeSpriteBinding[] = [];
  for (const pose of Object.keys(m.poses)) {
    out.push(classifyPose(formId, dir, pose, m.poses[pose], m.poses));
  }
  return out;
}

export function requiredPosesPresent(bindings: RuntimeSpriteBinding[]): { pose: string; status: string }[] {
  const have = new Set(bindings.map((b) => b.runtimePose));
  return REQUIRED_POSES.map((p) => ({
    pose: p,
    status: have.has(p) ? 'present' : 'absent',
  }));
}
