// ═══════════════════════════════════════════════════════════
// DBZ LSW — PixiBattlePresentation (adaptador BattleTimeline → Pixi)
// ═══════════════════════════════════════════════════════════
// Implementa el contrato BattlePresentation sobre el BattleRenderer. El
// BattleTimeline NO conoce Pixi: un adaptador en la capa de integración mapea
// sus eventos (SHOT/ACTOR_POSE/TARGET_POSE/PROJECTILE/HIT_FRAME/CAMERA/
// FIELD_RETURN) a estos métodos. Cada método es determinista: el frame es
// consecuencia del tick GBC absoluto (renderer.tick).

import { Sprite, Texture } from 'pixi.js';
import type { BattleSide } from '../../../data/facing';
import { facingFlip } from '../../../data/facing';
import { overworldUrl } from '../../../data/overworld';
import type { BattlePosition } from '../../../data/positions';
import type { BattleRenderer } from '../BattleRenderer';
import type { FighterActor } from '../actors/FighterActor';
import { ACTION_ACTOR_X, ACTION_TARGET_X } from '../scenes/ActionScene';
import { ACTION_GROUND_Y, rushX, easeOutCubic } from '../systems/MotionSystem';
import type { BattlePresentation, BattleScene } from './BattlePresentation';
import { resolveProjectileVisualMode, type ProjectileVisualMode } from './projectileVisual';

export interface PixiPresentationConfig {
  playerFormId: string;
  enemyFormId: string;
  overviewBackground: string;
  actionBackground: string;
  playerPos: BattlePosition;
  enemyPos: BattlePosition;
  /** Escala del luchador grande en ACTION (px por píxel de asset). */
  scale?: number;
}

export class PixiBattlePresentation implements BattlePresentation {
  private readonly renderer: BattleRenderer;
  private readonly cfg: PixiPresentationConfig;
  private readonly scale: number;

  private leftActor: FighterActor | null = null;
  private rightActor: FighterActor | null = null;
  private attacker: BattleSide = 'left';
  private projectile: Sprite | null = null;
  private projectileMode: ProjectileVisualMode = 'special';
  private projectileSpawnTick: number | null = null;
  private projectileContactTick: number | null = null;
  /** Nº de frames del rayo real (beam_ray) del atacante; 0 = fallback genérico. */
  private rayFrames = 0;
  /** True cuando el proyectil es el rayo real (modo stretch GBC). */
  private raySprite = false;
  /** Ancho nativo del frame de rayo actual (px del PNG). */
  private rayBaseWidth = 0;
  /** Escala aplicada al rayo (distancia actor→target / ancho nativo). */
  private rayScale = 1;
  /** Dirección horizontal del rayo: 1 jugador, -1 rival (textura espejada). */
  private rayDirection = 1;

  // Rush: movimiento del atacante calculado como f(tick − rushStartTick).
  private rushActive = false;
  private rushStartTick = 0;
  private rushDuration = 0;
  private rushFromX = 0;
  private rushToX = 0;

  constructor(renderer: BattleRenderer, cfg: PixiPresentationConfig) {
    this.renderer = renderer;
    this.cfg = cfg;
    this.scale = cfg.scale ?? 3;
  }

  /** Carga fondos, overworld y luchadores; deja el plano en FIELD. */
  async init(): Promise<void> {
    const dir = this.renderer.sceneDirector;

    const overview = await this.renderer.loadTexture(this.cfg.overviewBackground);
    dir.tactical.setBackground(overview);
    const action = await this.renderer.loadTexture(this.cfg.actionBackground);
    dir.action.setBackground(action);

    const pOwUrl = overworldUrl(this.cfg.playerFormId);
    const eOwUrl = overworldUrl(this.cfg.enemyFormId);
    const pOw = pOwUrl ? await this.renderer.loadTexture(pOwUrl) : null;
    const eOw = eOwUrl ? await this.renderer.loadTexture(eOwUrl) : null;
    dir.tactical.setOverworld('left', pOw, this.cfg.playerPos, facingFlip(this.cfg.playerFormId, 'left'));
    dir.tactical.setOverworld('right', eOw, this.cfg.enemyPos, facingFlip(this.cfg.enemyFormId, 'right'));

    this.leftActor = await this.renderer.addFighter(this.cfg.playerFormId, 'left', this.scale);
    this.rightActor = await this.renderer.addFighter(this.cfg.enemyFormId, 'right', this.scale);
    if (this.leftActor) this.renderer.sceneDirector.action.setActor(this.leftActor);
    if (this.rightActor) this.renderer.sceneDirector.action.setTarget(this.rightActor);

    this.renderer.sceneDirector.setScene('FIELD');
  }

  /** Fija quién ataca en este exchange (player → 'left', enemy → 'right'). */
  setAttacker(side: BattleSide): void {
    this.attacker = side;
    const a = side === 'left' ? this.leftActor : this.rightActor;
    const t = side === 'left' ? this.rightActor : this.leftActor;
    this.renderer.sceneDirector.action.setActor(a);
    this.renderer.sceneDirector.action.setTarget(t);
  }

  private get actor(): FighterActor | null {
    return this.attacker === 'left' ? this.leftActor : this.rightActor;
  }

  private get target(): FighterActor | null {
    return this.attacker === 'left' ? this.rightActor : this.leftActor;
  }

  setScene(scene: BattleScene): void {
    this.prepareScene(scene);
    this.renderer.sceneDirector.setScene(scene);
  }

  /** Refleja un cambio de posición táctica (MOVE) en el overworld del FIELD.
   *  El plano táctico debe mostrar el estado real del combate (gramática §0):
   *  recoloca los sprites overworld sin reinicializar el renderer. */
  updateTactical(playerPos: BattlePosition, enemyPos: BattlePosition): void {
    this.renderer.sceneDirector.tactical.setOverworldPosition('left', playerPos);
    this.renderer.sceneDirector.tactical.setOverworldPosition('right', enemyPos);
  }

  setActorPose(pose: string): void {
    this.actor?.setPose(pose, this.renderer.currentTick);
  }

  setTargetPose(pose: string): void {
    this.target?.setPose(pose, this.renderer.currentTick);
  }

  moveActor(durationTicks: number): void {
    const a = this.actor;
    if (!a) return;
    const fromX = this.attacker === 'left' ? ACTION_ACTOR_X : ACTION_TARGET_X;
    const toX = this.attacker === 'left' ? ACTION_TARGET_X : ACTION_ACTOR_X;
    const dir = toX > fromX ? 1 : -1;
    const endX = toX - dir * 34; // se detiene antes de solaparse con el rival
    this.rushActive = true;
    this.rushStartTick = this.renderer.currentTick;
    this.rushDuration = Math.max(1, Math.round(durationTicks));
    this.rushFromX = fromX;
    this.rushToX = endX;
    a.setPos(fromX, ACTION_GROUND_Y);
  }

  spawnProjectile(kind: string, timing?: { spawnTick: number; contactTick: number }): void {
    this.clearProjectile();
    this.projectileSpawnTick = timing?.spawnTick ?? null;
    this.projectileContactTick = timing?.contactTick ?? null;
    // Rayo real: si el atacante tiene frames beam_ray en su manifest (V6),
    // usarlos en vez del rectángulo genérico — el rayo sale desde el lado del
    // personaje y viaja hasta el rival (frame = f(progress), determinista).
    const actor = this.actor;
    this.projectileMode = resolveProjectileVisualMode(kind);
    this.rayFrames = 0;
    if (actor && this.projectileMode === 'ray') {
      const n = actor.poseFrameCount('beam_ray');
      if (n > 0) {
        this.rayFrames = n;
        const tex = actor.getPoseTexture('beam_ray', 0);
        if (tex) {
          const p = new Sprite(tex);
          p.anchor.set(0, 0.5);
          this.rayDirection = this.attacker === 'left' ? 1 : -1;
          // Escala para cubrir la distancia actor→target: el rayo nativo
          // (~115px) debe llegar al rival cuando progress=1. El alto escala
          // con la misma proporción (coherente con el luchador a `scale`×).
          const dist = Math.abs(ACTION_TARGET_X - ACTION_ACTOR_X);
          const sx = dist / tex.width;
          p.scale.set(sx * this.rayDirection, sx);
          this.raySprite = true;
          this.rayBaseWidth = tex.width;
          this.rayScale = sx;
          this.renderer.sceneDirector.projectileLayer.addChild(p);
          this.projectile = p;
          this.setProjectileProgress(0);
          return;
        }
      }
    }
    // Fallbacks pixel-art diferenciados cuando el manifest no ofrece un asset.
    const p = new Sprite(Texture.WHITE);
    p.anchor.set(0.5);
    p.roundPixels = true;
    switch (this.projectileMode) {
      case 'ray':
        p.tint = 0x00ccff;
        p.width = 24;
        p.height = kind === 'wave' ? 7 : 4;
        break;
      case 'ball':
        p.tint = 0xffd040;
        p.width = 10;
        p.height = 10;
        p.rotation = Math.PI / 4;
        break;
      case 'disk':
        p.tint = 0xfff17a;
        p.width = 18;
        p.height = 4;
        break;
      case 'sword':
        p.tint = 0x8ffcff;
        p.width = 20;
        p.height = 3;
        p.rotation = this.attacker === 'left' ? -0.35 : 0.35;
        break;
      case 'special':
        p.tint = 0xff8a40;
        p.width = 8;
        p.height = 8;
        break;
    }
    this.renderer.sceneDirector.projectileLayer.addChild(p);
    this.projectile = p;
    this.setProjectileProgress(0);
  }

  setProjectileProgress(progress: number): void {
    if (!this.projectile) return;
    const fromX = this.attacker === 'left' ? ACTION_ACTOR_X : ACTION_TARGET_X;
    const toX = this.attacker === 'left' ? ACTION_TARGET_X : ACTION_ACTOR_X;
    const p = Math.max(0, Math.min(1, progress));
    if (this.raySprite) {
      // Beam estilo GBC: el rayo se EXTENDE desde el personaje hacia el rival.
      // Posición fija en el actor; el ancho crece con progress (anclado izq.).
      const dist = Math.abs(toX - fromX);
      const full = this.rayBaseWidth * this.rayScale;
      this.projectile.position.set(fromX, ACTION_GROUND_Y - 40);
      const stretch = Math.max(0.001, (dist * p) / Math.max(1, full));
      this.projectile.scale.set(stretch * this.rayDirection, this.rayScale);
      if (this.rayFrames > 1) {
        const idx = Math.min(this.rayFrames - 1, Math.floor(p * this.rayFrames));
        const tex = this.actor?.getPoseTexture('beam_ray', idx);
        if (tex && this.projectile.texture !== tex) {
          this.projectile.texture = tex;
          this.rayBaseWidth = tex.width;
          // re-aplicar stretch con el nuevo ancho base
          const s2 = Math.max(0.001, (dist * p) / Math.max(1, tex.width * this.rayScale));
          this.projectile.scale.set(s2 * this.rayDirection, this.rayScale);
        }
      }
      return;
    }
    this.projectile.position.set(fromX + (toX - fromX) * p, ACTION_GROUND_Y - 40);
    // Animación del rayo: frame = f(progress) — determinista (reloj único).
    if (this.rayFrames > 1) {
      const idx = Math.min(this.rayFrames - 1, Math.floor(p * this.rayFrames));
      const tex = this.actor?.getPoseTexture('beam_ray', idx);
      if (tex && this.projectile.texture !== tex) this.projectile.texture = tex;
    }
  }

  impact(): void {
    this.renderer.impactSystem.impact(this.renderer.currentTick, { hitstop: 2, flash: 4, shake: 6, mag: 0.4 });
  }

  camera(shake: number): void {
    this.renderer.impactSystem.shake(this.renderer.currentTick, shake);
  }

  returnToField(): void {
    this.renderer.sceneDirector.setScene('FIELD');
    this.clearProjectile();
    this.cancelRush();
    this.leftActor?.setFlash(0);
    this.rightActor?.setFlash(0);
    this.leftActor?.setPose('idle', this.renderer.currentTick);
    this.rightActor?.setPose('idle', this.renderer.currentTick);
    this.leftActor?.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
    this.rightActor?.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
  }

  sync(tick: number): void {
    this.renderer.sync(tick);
    if (this.projectile && this.projectileSpawnTick != null && this.projectileContactTick != null) {
      const duration = Math.max(1, this.projectileContactTick - this.projectileSpawnTick);
      this.setProjectileProgress((this.renderer.currentTick - this.projectileSpawnTick) / duration);
    }
    // Rush: position = f(tick − rushStartTick) — determinista a cualquier Hz.
    if (this.rushActive) {
      const a = this.actor;
      if (a) {
        const p = this.rushDuration > 0
          ? Math.min(1, Math.max(0, (this.renderer.currentTick - this.rushStartTick) / this.rushDuration))
          : 1;
        const x = rushX({ start: this.rushFromX, end: this.rushToX, easing: easeOutCubic }, p);
        a.setPos(x, ACTION_GROUND_Y);
        if (p >= 1) this.rushActive = false;
      }
    }
    const snap = this.renderer.impactSystem.snapshot(this.renderer.currentTick);
    this.target?.setFlash(snap.flash);
    this.actor?.setFlash(0);
  }

  /** Vuelve a un estado inicial limpio (para replay determinista del timeline). */
  reset(): void {
    this.renderer.impactSystem.reset();
    this.renderer.sync(0);
    this.clearProjectile();
    this.cancelRush();
    this.leftActor?.setFlash(0);
    this.rightActor?.setFlash(0);
    this.leftActor?.setPose('idle', 0);
    this.rightActor?.setPose('idle', 0);
    this.leftActor?.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
    this.rightActor?.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
    this.setAttacker(this.attacker);
    this.renderer.sceneDirector.setScene('FIELD');
  }

  /** Snapshot determinista para verificación/depuración. */
  debugState(): {
    tick: number;
    scene: BattleScene;
    actor: { pose: string | null; frame: number; x: number; y: number; visible: boolean } | null;
    target: { pose: string | null; frame: number; x: number; y: number; visible: boolean } | null;
  } {
    const a = this.actor;
    const t = this.target;
    return {
      tick: this.renderer.currentTick,
      scene: this.renderer.sceneDirector.scene,
      actor: a ? { pose: a.pose, frame: a.frameIndex, x: a.position.x, y: a.position.y, visible: a.visible } : null,
      target: t ? { pose: t.pose, frame: t.frameIndex, x: t.position.x, y: t.position.y, visible: t.visible } : null,
    };
  }

  private clearProjectile(): void {
    this.projectileMode = 'special';
    this.projectileSpawnTick = null;
    this.projectileContactTick = null;
    this.rayFrames = 0;
    this.raySprite = false;
    this.rayBaseWidth = 0;
    this.rayScale = 1;
    this.rayDirection = 1;
    if (this.projectile) {
      this.renderer.sceneDirector.projectileLayer.removeChild(this.projectile);
      this.projectile.destroy({ texture: false });
      this.projectile = null;
    }
  }

  private cancelRush(): void {
    this.rushActive = false;
    this.rushStartTick = 0;
    this.rushDuration = 0;
    this.rushFromX = 0;
    this.rushToX = 0;
  }

  /**
   * Cada plano tiene propiedad exclusiva de sus entidades:
   * ACTION_SOLO no muestra target, rush ni proyectil; ACTION_DUEL no muestra
   * proyectiles; PROJECTILE no arrastra un rush corporal anterior.
   */
  private prepareScene(scene: BattleScene): void {
    if (scene === 'FIELD') {
      this.clearProjectile();
      this.cancelRush();
      this.leftActor?.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
      this.rightActor?.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
      return;
    }

    if (scene === 'ACTION_SOLO') {
      this.clearProjectile();
      this.cancelRush();
      this.actor?.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
      this.target?.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
      return;
    }

    if (scene === 'ACTION_DUEL') {
      this.clearProjectile();
      return;
    }

    if (scene === 'PROJECTILE') {
      this.cancelRush();
      this.actor?.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
      this.target?.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
    }
  }
}
