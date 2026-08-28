// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattleRenderer (motor gráfico del combate: PixiJS 8)
// ═══════════════════════════════════════════════════════════
// Renderer 2D GPU con scene graph. React monta/desmonta el canvas; a partir
// de ahí Pixi controla sprite.position/texture/visible/alpha directamente,
// SIN setState/reconciliación por frame.
//
// Reloj: el BattleRenderer NO genera su propio ticker de animación de sprites.
// Recibe `tick(ticks)` (frames GBC) desde el BattleTimeline/consumidor, de modo
// que el MISMO reloj que dispara los eventos cinematográficos avanza la
// animación de los luchadores (principio "reloj único").

import { Application, Container } from 'pixi.js';
import { loadFormAtlas, loadPixelTexture } from './assets/AtlasLoader';
import { FighterActor } from './actors/FighterActor';
import { SceneDirector } from './director/SceneDirector';
import { ImpactSystem } from './systems/ImpactSystem';
import type { BattleSide } from '../../data/facing';

export class BattleRenderer {
  readonly app: Application;
  /** Mundo transformable (cámara): aquí cuelgan escenas y actores. */
  readonly world: Container;
  /** Director de planos (FIELD ↔ ACTION). */
  readonly sceneDirector: SceneDirector;
  /** Sistema de impacto (hitstop/flash/shake) — activado por HIT_FRAME. */
  readonly impactSystem = new ImpactSystem();

  private readonly fighters: FighterActor[] = [];
  private tickCount = 0;

  private constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    app.stage.addChild(this.world);
    this.sceneDirector = new SceneDirector(this.world);
  }

  static async create(canvas: HTMLCanvasElement): Promise<BattleRenderer> {
    const app = new Application();
    await app.init({
      canvas,
      // Fondo transparente: el CSS de la escena se ve a través del canvas.
      backgroundAlpha: 0,
      // Pixel art: sin suavizado; snapping a píxeles enteros.
      antialias: false,
      // WebGL para producción (WebGPU aún con inconsistencias entre navegadores).
      preference: 'webgl',
      // Resolución 1:1; el escalado nítido lo hace CSS con image-rendering.
      resolution: 1,
      autoDensity: false,
    });
    return new BattleRenderer(app);
  }

  /** Tick absoluto GBC actual. */
  get currentTick(): number {
    return this.tickCount;
  }

  /** Carga una textura suelta (fondo/overworld/proyectil) con cache + pixelate. */
  loadTexture(url: string) {
    return loadPixelTexture(url);
  }

  /** Carga el atlas de una forma y crea su luchador (SIN añadirlo al mundo). */
  async addFighter(formId: string, side: BattleSide, scale = 1): Promise<FighterActor | null> {
    const atlas = await loadFormAtlas(formId);
    if (!atlas) return null;
    const actor = new FighterActor(atlas, formId, side);
    actor.setScale(scale);
    actor.setPose('idle', 0);
    this.fighters.push(actor);
    return actor;
  }

  /** Avanza el reloj de la presentación `ticks` frames GBC (relativo). */
  tick(ticks = 1): void {
    this.sync(this.tickCount + ticks);
  }

  /**
   * M8.P0 — Auditor de identidad de luchadores: verifica que el scene graph
   * tiene EXACTAMENTE 2 FighterActor con parents estables (nunca creados en
   * cambios de plano, nunca reparentados por setRoles). Devuelve el estado
   * para Dev overlay / tests de invariante.
   */
  debugActorRegistry(): {
    fighters: number;
    playerActionInstances: number;
    enemyActionInstances: number;
    actionFighterCount: number;
    parentsStable: boolean;
    detail: Array<{ formId: string; parent: string | null; visible: boolean }>;
  } {
    const action = this.sceneDirector.action;
    const fighters = this.fighters;
    const left = fighters[0] ?? null;
    const right = fighters[1] ?? null;
    const parentsStable = fighters.every(f => f.parent !== null && (f.parent === action || f.parent === this.sceneDirector.tactical));
    return {
      fighters: fighters.length,
      playerActionInstances: fighters.filter(f => f.formId === left?.formId && f.parent === action).length,
      enemyActionInstances: fighters.filter(f => f.formId === right?.formId && f.parent === action).length,
      actionFighterCount: action.fighterCount,
      parentsStable,
      detail: fighters.map(f => ({
        formId: f.formId,
        parent: f.parent ? (f.parent === action ? 'ActionScene' : f.parent === this.sceneDirector.tactical ? 'TacticalScene' : 'other') : null,
        visible: f.visible,
      })),
    };
  }

  /** Sincroniza TODO el renderer al tick GBC absoluto `tick` (reloj ÚNICO).
   *  P0 CAMERA PRESENTER: world.position is set by CameraPresenter (via
   *  PixiBattlePresentation.sync), NOT here. CameraPresenter is the sole
   *  authority for screen position. */
  sync(tick: number): void {
    this.tickCount = tick;
    const snap = this.impactSystem.snapshot(this.tickCount);

    // Hitstop: durante la congelación los luchadores NO avanzan (peso del golpe).
    if (snap.hitstop) return;

    for (const f of this.fighters) f.sync(tick);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.fighters.length = 0;
    // NO destruir las texturas: están cacheadas a nivel de módulo (CACHE/
    // TEXTURE_CACHE en AtlasLoader) y se reutilizan entre montajes (varias
    // batallas/HMR). Destruirlas aquí provoca el warning de Pixi
    // "TextureSource managed by Assets was destroyed" y deja el cache stale
    // (luchadores en blanco en la segunda batalla).
    // removeView: false → el canvas React persiste en el DOM y puede
    // reutilizarse al recrear el renderer (Dev Studio / cambios de forma).
    this.app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
  }
}
