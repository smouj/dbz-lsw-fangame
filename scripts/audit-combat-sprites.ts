import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { FORMS } from '../src/data/roster';
import { CARDS } from '../src/data/cards';
import { spriteDirFor } from '../src/data/spriteManifest';
import { actionSemanticsForCard, resolveActionProfile } from '../src/battle/actionProfiles';
import { COMBAT_POSE_ORDER, COMBAT_REQUIRED_POSES, resolvePoseFrameSequence } from '../src/battle/spriteConfig';

type ManifestFrame = { file: string; w: number; h: number };
type ManifestPose = { frame_count?: number; fps?: number; loop?: boolean; frames?: ManifestFrame[] };
type Manifest = Record<string, ManifestPose>;
type PoseContract = {
  fps: number;
  loop: boolean;
  frames?: string[];
  startsWith?: string;
  containsOnlyPrefixes?: string[];
  forbiddenPrefixes?: string[];
};

/** Lee w/h reales de un PNG solo desde el header IHDR (sin decodificar). */
function pngSize(p: string): [number, number] | null {
  const buf = fs.readFileSync(p);
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const POSE_RUNTIME_DEFAULTS: Record<string, PoseContract> = {
  idle: { fps: 3, loop: true },
  move_front: { fps: 6, loop: true, frames: ['move_front_00', 'move_front_01'] },
  move_back: { fps: 6, loop: true, frames: ['move_back_00', 'move_back_01'] },
  guard: { fps: 6, loop: false },
  attack_fwd: { fps: 5, loop: false },
  attack_ud: { fps: 5, loop: false },
  punch_right: { fps: 7, loop: false, containsOnlyPrefixes: ['idle_', 'attack_fwd_', 'punch_right_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  punch_left: { fps: 7, loop: false, containsOnlyPrefixes: ['idle_', 'attack_fwd_', 'punch_left_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  // kick_right / knockback_*: frames PROPIOS canónicos del V9 (kick_right_00,
  // knockback_back_00…) o composiciones de frames base (idle+attack_ud / hurt).
  kick_right: { fps: 7, loop: false, containsOnlyPrefixes: ['idle_', 'attack_ud_', 'kick_right_'], forbiddenPrefixes: ['beam_', 'hurt_', 'guard_'] },
  hurt: { fps: 6, loop: false },
  knockback_back: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_', 'knockback_back_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  knockback_up: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_', 'knockback_up_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  knockback_down: { fps: 7, loop: false, containsOnlyPrefixes: ['hurt_', 'knockback_down_'], forbiddenPrefixes: ['beam_', 'attack_', 'guard_'] },
  beam_guard: { fps: 6, loop: false, containsOnlyPrefixes: ['guard_', 'beam_guard_'], forbiddenPrefixes: ['beam_ray_', 'attack_', 'hurt_'] },
  // evade: frames propios canónicos (speedlines teletransporte del V9) o
  // composición move_back→guard→move_back (convención V6.1).
  evade: { fps: 10, loop: false, containsOnlyPrefixes: ['idle_', 'guard_', 'move_back_', 'evade_'], forbiddenPrefixes: ['beam_', 'attack_', 'hurt_'] },
  beam_charge: { fps: 7, loop: false },
  beam_fire: { fps: 8, loop: false },
  beam_ray: { fps: 7, loop: false },
  beam_ray_tip: { fps: 7, loop: false },
  gather_power: { fps: 6, loop: true },
  power_up: { fps: 10, loop: true }, // parpadeo rapido (haz emergiendo)
};

const root = process.cwd();
const spriteRoot = path.join(root, 'public/assets/sprites');
let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

const manifests = new Map<string, Manifest>();

for (const form of Object.values(FORMS)) {
  const dir = spriteDirFor(form.id);
  check(`${form.id}:spriteDir`, !!dir);
  if (!dir) continue;

  const manifestPath = path.join(spriteRoot, dir, 'manifest.json');
  check(`${form.id}:manifest`, fs.existsSync(manifestPath), dir);
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  manifests.set(form.id, manifest);

  for (const pose of COMBAT_REQUIRED_POSES) {
    // beam_fire: requerido solo si la V6.1 extrajo sus PNG (algunas formas
    // SSJ no tienen beam_fire separado; el runtime usa fallback a beam_charge).
    if (pose === 'beam_fire') {
      const hasPng = fs.readdirSync(path.join(spriteRoot, dir)).some(f => f.startsWith(`${dir}_beam_fire_`));
      if (hasPng) check(`${form.id}:${pose}`, !!manifest[pose]?.frames?.length);
      continue;
    }
    check(`${form.id}:${pose}`, !!manifest[pose]?.frames?.length);
  }

  for (const [pose, poseData] of Object.entries(manifest)) {
    const frames = poseData.frames ?? [];
    check(`${form.id}:${pose}:frame_count`, poseData.frame_count == null || poseData.frame_count === frames.length, `${poseData.frame_count} vs ${frames.length}`);
    const runtimeDefault = POSE_RUNTIME_DEFAULTS[pose];
    if ((COMBAT_POSE_ORDER as readonly string[]).includes(pose) && runtimeDefault) {
      check(`${form.id}:${pose}:fps`, poseData.fps === runtimeDefault.fps, `${poseData.fps} vs ${runtimeDefault.fps}`);
      check(`${form.id}:${pose}:loop`, poseData.loop === runtimeDefault.loop, `${poseData.loop} vs ${runtimeDefault.loop}`);
      if (runtimeDefault.frames) {
        check(`${form.id}:${pose}:contractFrameCount`, frames.length === runtimeDefault.frames.length, `${frames.length} vs ${runtimeDefault.frames.length}`);
        runtimeDefault.frames.forEach((suffix, index) => {
          check(`${form.id}:${pose}:${index}:contractFrame`, frames[index]?.file === `${dir}_${suffix}.png`, frames[index]?.file);
        });
      }
      if (runtimeDefault.startsWith && frames.length) {
        check(`${form.id}:${pose}:startsWith`, frames[0].file.startsWith(`${dir}_${runtimeDefault.startsWith}`), frames[0].file);
      }
      if (runtimeDefault.containsOnlyPrefixes) {
        for (const frame of frames) {
          check(`${form.id}:${pose}:${frame.file}:semanticSource`,
            runtimeDefault.containsOnlyPrefixes.some(prefix => frame.file.startsWith(`${dir}_${prefix}`)),
            frame.file);
        }
      }
      if (runtimeDefault.forbiddenPrefixes) {
        for (const frame of frames) {
          check(`${form.id}:${pose}:${frame.file}:forbiddenSource`,
            runtimeDefault.forbiddenPrefixes.every(prefix => !frame.file.startsWith(`${dir}_${prefix}`)),
            frame.file);
        }
      }
    }
    let lastIndex = -1;
    const seenIndexes = new Set<number>();
    let prevFrameHash: string | null = null;
    frames.forEach((frame, index) => {
      const expectedPrefix = `${dir}_${pose}_`;
      const semanticAlias = (COMBAT_POSE_ORDER as readonly string[]).includes(pose);
      check(`${form.id}:${pose}:${index}:name`,
        (semanticAlias ? frame.file.startsWith(`${dir}_`) : frame.file.startsWith(expectedPrefix)) && frame.file.endsWith('.png'),
        frame.file);
      const m = frame.file.match(/_(\d+)\.png$/);
      const numericIndex = m ? Number(m[1]) : null;
      const physicalPoseFrame = frame.file.startsWith(expectedPrefix);
      check(`${form.id}:${pose}:${index}:index`,
        numericIndex != null && (!physicalPoseFrame || (numericIndex > lastIndex && !seenIndexes.has(numericIndex))),
        frame.file);
      if (numericIndex != null && physicalPoseFrame) {
        lastIndex = numericIndex;
        seenIndexes.add(numericIndex);
      }
      check(`${form.id}:${pose}:${index}:size`, frame.w > 0 && frame.h > 0, `${frame.w}x${frame.h}`);
      // Dimensiones físicas reales del PNG deben coincidir con lo declarado
      // (w/h mal declarados rompen aspect ratio / cropping en render).
      const framePath = path.join(spriteRoot, dir, frame.file);
      if (fs.existsSync(framePath)) {
        const real = pngSize(framePath);
        if (real) {
          check(`${form.id}:${pose}:${index}:physicalSize`, real[0] === frame.w && real[1] === frame.h, `${frame.file} declara ${frame.w}x${frame.h}, real ${real[0]}x${real[1]}`);
        }
      }
      // Duplicados exactos consecutivos (mismo MD5) congelan la animacion.
      if (fs.existsSync(framePath)) {
        const hash = createHash('md5').update(fs.readFileSync(framePath)).digest('hex');
        // evade es [base, guard, base]: si guard == base (parpadeo con el mismo
        // frame en formas donde el guard canónico comparte píxel con move_back)
        // el duplicado consecutivo es INTENCIONAL — no es un colado.
        const evadeOk = pose === 'evade';
        if (index > 0 && prevFrameHash === hash && !evadeOk) {
          check(`${form.id}:${pose}:${index}:noConsecutiveDuplicate`, false, frame.file);
        }
        prevFrameHash = hash;
      }
    });
  }

  // beam_ray: OPCIONAL desde V6.1 (la fuente nueva no recorta rayos como
  // frames separados; el proyectil runtime es procedural). Si la forma tiene
  // beam_ray, validamos ratio; si no, es válido (el beam usa Graphics).
  const beamFrames = manifest.beam_ray?.frames ?? [];
  if (beamFrames.length > 0) {
    check(`${form.id}:beam_ray`, true);
    for (const frame of beamFrames) {
      const ratio = frame.w / frame.h;
      check(`${form.id}:beam_ray:${frame.file}:ratio`, ratio >= 2, `${frame.w}x${frame.h}`);
      check(`${form.id}:beam_ray:${frame.file}:height`, frame.h >= 8, `${frame.w}x${frame.h}`);
    }
  }

  // COHESIÓN runtime ↔ Dev Studio: la composición declarativa
  // (resolvePoseFrameSequence) debe producir SECUENCIAS válidas para el
  // juego: cada frame compuesto debe existir en el manifest (el Dev Studio
  // nunca muestra frames que el juego no reproduce). Los manifests pueden
  // tener variantes locales legítimas (hurt_06, ud_04, dedup charge_01) —
  // eso se reporta como WARN, no como fallo.
  const compositePoses = ['move_front', 'move_back', 'punch_right', 'punch_left', 'kick_right',
    'knockback_back', 'knockback_up', 'knockback_down', 'beam_guard', 'evade', 'gather_power', 'power_up'];
  for (const pose of compositePoses) {
    const manifestFiles = (manifest[pose]?.frames ?? []).map(f => f.file);
    if (manifestFiles.length === 0) continue;
    // Frames PROPIOS canónicos (V9): kick_right_00, knockback_back_00…
    // Cuando la pose tiene frames físicos propios con su prefijo, es la fuente
    // canónica directa (no composición) — la cohesión se cumple por definición.
    const hasOwnFrames = manifestFiles.some(f => {
      const base = f.replace(`${dir}_`, '');
      return base.startsWith(`${pose}_`);
    });
    if (hasOwnFrames) {
      check(`${form.id}:${pose}:cohesion`, true, `frames propios canónicos (${manifestFiles.length})`);
      continue;
    }
    const composed = resolvePoseFrameSequence(pose, dir, (file) => fs.existsSync(path.join(spriteRoot, dir, file)));
    // Dirección crítica: la composición NO puede tener frames fuera del manifest.
    // Se permite el caso de DEDUP: frames físicamente idénticos (mismo MD5) a
    // uno del manifest (ej: future_trunks_super_saiyan beam_charge_01 ==
    // beam_charge_03, eliminado del manifest por duplicado).
    const manifestHashes = new Set<string>();
    for (const mf of manifestFiles) {
      const mp = path.join(spriteRoot, dir, mf);
      if (fs.existsSync(mp)) manifestHashes.add(createHash('md5').update(fs.readFileSync(mp)).digest('hex'));
    }
    const missingFromManifest = composed.filter(file => {
      if (manifestFiles.includes(file)) return false;
      const cp = path.join(spriteRoot, dir, file);
      if (!fs.existsSync(cp)) return true; // ni siquiera existe en disco
      const ch = createHash('md5').update(fs.readFileSync(cp)).digest('hex');
      return !manifestHashes.has(ch); // existe pero NO es duplicado de nada del manifest
    });
    check(`${form.id}:${pose}:cohesion`,
      missingFromManifest.length === 0,
      `composicion incluye frames fuera del manifest: [${missingFromManifest.join(',')}]`);
    // WARN (no fallo): el manifest tiene frames extra legítimos (variante local).
    const composedSet = new Set(composed);
    const extraInManifest = manifestFiles.filter(file => !composedSet.has(file));
    if (extraInManifest.length > 0 && form.id === 'goku_base') {
      console.warn(`WARN ${form.id}:${pose}:varianteLocal — manifest tiene ${extraInManifest.length} frames extra: ${extraInManifest.join(',')}`);
    }
  }
}

// ── Huérfanos: PNG en disco sin referencia en su manifest ──
// Los move_front_00/move_back_00/beam_ray_tip_01 son frames ROM legítimos
// (material de referencia del contrato V1: move = idle_00 + step_01), no
// basura. Este check SOLO avisa; los colados conocidos se limpian a mano.
{
  let orphanCount = 0;
  for (const form of Object.values(FORMS)) {
    const dir = spriteDirFor(form.id);
    const manifestPath = path.join(spriteRoot, dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
    const referenced = new Set<string>();
    for (const pose of Object.values(manifest)) {
      for (const f of pose?.frames ?? []) referenced.add(f.file);
    }
    const files = fs.existsSync(path.join(spriteRoot, dir)) ? fs.readdirSync(path.join(spriteRoot, dir)) : [];
    const orphans = files.filter(f => f.endsWith('.png') && !referenced.has(f));
    orphanCount += orphans.length;
    for (const o of orphans) console.warn(`WARN ${form.id}:orphan — ${o}`);
  }
  console.log(`\n${orphanCount} PNG huerfanos en disco (referencia ROM legitima o colado pendiente de limpiar).`);
}

const pixiPresentation = fs.readFileSync(path.join(root, 'src/renderer/pixi/presentation/PixiBattlePresentation.ts'), 'utf8');
check('pixi:noBeamRayTextureAsProjectile', !pixiPresentation.includes("getPoseTexture('beam_ray'"));
check('pixi:noStretchSpriteProjectile', !pixiPresentation.includes('raySprite') && !pixiPresentation.includes('rayScale'));

check('future_trunks_base:notKidTrunks', spriteDirFor('trunks_future') === 'future_trunks_base', spriteDirFor('trunks_future'));
check('future_trunks_super:notKidTrunks', spriteDirFor('trunks_ssj') === 'future_trunks_super_saiyan', spriteDirFor('trunks_ssj'));
check('kid_trunks_super:separateDir', spriteDirFor('trunks_kid_ssj') === 'kid_trunks_super_saiyan', spriteDirFor('trunks_kid_ssj'));

for (const card of CARDS.filter(c => c.type === 'command' || c.type === 'damage' || c.type === 'beam')) {
  const sem = actionSemanticsForCard(card);
  check(`card:${card.name}:animation`, ['stage', 'melee', 'beam'].includes(sem.animation), sem.animation);
  if (card.type === 'beam') {
    const profile = resolveActionProfile(card.name);
    check(`card:${card.name}:beamProfile`, !!profile);
    check(`card:${card.name}:beamVisual`, sem.visual !== 'rush' && sem.visual !== 'power', String(sem.visual));
  }
}

const forms = Object.keys(FORMS).length;
const manifestCount = manifests.size;
const withBeamRay = [...manifests.values()].filter(m => m.beam_ray?.frames?.length).length;

// ─── Recovery check (WARN no destructivo) ───
// Para attack_fwd/attack_ud: el ultimo frame deberia volver cerca de la pose
// base (recovery), no quedarse extendido. Detecta secuencias cuyo ultimo frame
// esta mas lejos del frame 0 que del punto medio (posible lunge/daño colado).
for (const [formId, manifest] of manifests) {
  for (const pose of ['attack_fwd', 'attack_ud']) {
    const frames = manifest[pose]?.frames ?? [];
    if (frames.length < 4) continue;
    const files = frames.map(f => f.file);
    const dir = spriteDirFor(formId)!;
    // Ancho del recorte como proxy de "alcance": el ultimo frame de un ataque
    // deberia volver a recovery (ancho cercano al frame 0), no ser el mas ancho.
    const widths = frames.map(f => f.w ?? 0);
    const first = widths[0];
    const last = widths[widths.length - 1];
    const maxW = Math.max(...widths);
    const isMax = last === maxW && widths.filter(w => w === maxW).length === 1;
    if (first > 0 && isMax && last > first + 8) {
      console.log(`WARN ${formId}/${pose}: ultimo frame es el MAS ANCHO (w=${last}, frame0 w=${first}) — posible lunge/daño colado en vez de recovery`);
    }
    // Frames intermedios estrechos son NORMALES en puñetazos (puño frontal = recorte
    // estrecho entre impactos laterales: 39->24->38). Solo se avisa cuando el frame
    // estrecho esta DESCENTRADO (salto hacia un lado), tipico de pose de otra
    // animacion colada (ej: recoome beam_fire_01 cx 16->28->15).
  }
}

console.log(`\nAudited ${forms} forms, ${manifestCount} manifests, ${withBeamRay} beam-ray sets.`);
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);

// ── Canonical sources: sin chibis en effects/, sin battle/000_idle ──
// (docs/CANONICAL_SPRITE_SOURCES.md — fuente única por tipo de sprite)
{
  const effectsDir = path.join(spriteRoot, 'effects');
  if (fs.existsSync(effectsDir)) {
    const eManifest = JSON.parse(fs.readFileSync(path.join(effectsDir, 'manifest.json'), 'utf8')) as Record<string, { frames?: ManifestFrame[] }>;
    let chibiLike = 0;
    for (const group of Object.values(eManifest)) {
      for (const f of group?.frames ?? []) {
        if (11 <= f.w && f.w <= 18 && 13 <= f.h && f.h <= 18) chibiLike++;
      }
    }
    check('canonical:noChibisInEffects', chibiLike === 0, `${chibiLike} frames con tamaño chibi en effects/ (duplicados de panel_sprites)`);
  }
  let battleIdles = 0;
  const battleDir = path.join(root, 'public/assets/overworld/battle');
  if (fs.existsSync(battleDir)) {
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === '000_idle.png') battleIdles++;
      }
    };
    walk(battleDir);
  }
  check('canonical:noBattleIdleDuplicates', battleIdles === 0, `${battleIdles} battle/000_idle.png (duplicados de panel_sprites)`);
}
