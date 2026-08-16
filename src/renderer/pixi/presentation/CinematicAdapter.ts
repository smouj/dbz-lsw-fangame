// ═══════════════════════════════════════════════════════════
// DBZ LSW — CinematicAdapter (mapea eventos BattleTimeline → BattlePresentation)
// ═══════════════════════════════════════════════════════════
// Único punto donde los eventos del timeline se traducen a llamadas del
// contrato de presentación. El BattleTimeline emite (SHOT/ACTOR_POSE/
// TARGET_POSE/PROJECTILE/HIT_FRAME/CAMERA/FIELD_RETURN); aquí se convierten a
// métodos Pixi-agnósticos. Se sincroniza al tick del evento ANTES de aplicar
// la pose, de modo que poseStartTick == tick exacto del evento.

import type { CinematicEvent } from '../../../battle/timeline';
import type { BattlePresentation, BattleScene } from './BattlePresentation';

const VALID_SCENES: BattleScene[] = ['FIELD', 'ACTION_SOLO', 'ACTION_DUEL', 'PROJECTILE', 'IMPACT'];

function asScene(shot: string): BattleScene | null {
  return (VALID_SCENES as string[]).includes(shot) ? (shot as BattleScene) : null;
}

export function applyCinematicEvent(pres: BattlePresentation, e: CinematicEvent): void {
  // El tick del evento es la autoridad: sincroniza el reloj de la presentación
  // ANTES de aplicar poses, para que frame = f(tick, poseStartTick) exacto.
  pres.sync(e.tick);

  switch (e.type) {
    case 'SHOT': {
      const shot = (e.payload as { shot?: string })?.shot;
      if (shot) {
        const scene = asScene(shot);
        if (scene) pres.setScene(scene);
      }
      break;
    }
    case 'ACTOR_POSE': {
      const pose = (e.payload as { pose?: string })?.pose;
      if (pose) pres.setActorPose(pose);
      break;
    }
    case 'TARGET_POSE': {
      const pose = (e.payload as { pose?: string })?.pose;
      if (pose) pres.setTargetPose(pose);
      break;
    }
    case 'PROJECTILE': {
      const p = e.payload as {
        action?: string;
        progress?: number;
        kind?: string;
        spawnFrame?: number;
        contactFrame?: number;
      };
      switch (p.action) {
        case 'spawn':
          pres.spawnProjectile(p.kind ?? 'beam', typeof p.spawnFrame === 'number' && typeof p.contactFrame === 'number'
            ? { spawnTick: p.spawnFrame, contactTick: p.contactFrame }
            : undefined);
          break;
        case 'travel':
          pres.setProjectileProgress(p.progress ?? 0);
          break;
        case 'impact':
        case 'explode':
          pres.setProjectileProgress(1);
          break;
        default:
          break;
      }
      break;
    }
    case 'RUSH': {
      const p = e.payload as { duration?: number };
      pres.moveActor(typeof p.duration === 'number' ? p.duration : 44);
      break;
    }
    case 'HIT_FRAME': {
      pres.impact();
      break;
    }
    case 'CAMERA': {
      const shake = (e.payload as { shake?: number })?.shake ?? 0.35;
      pres.camera(shake);
      break;
    }
    case 'FIELD_RETURN': {
      pres.returnToField();
      break;
    }
    default:
      break;
  }
}
