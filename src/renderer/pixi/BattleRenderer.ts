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
import { loadFormAtlas } from './assets/AtlasLoader';
import { FighterActor } from './actors/FighterActor';
import type { BattleSide } from '../../data/facing';

export class BattleRenderer {
  readonly app: Application;
  /** Mundo transformable (cámara): aquí cuelgan escenas y actores. */
  readonly world: Container;
  private readonly fighters: FighterActor[] = [];

  private constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    app.stage.addChild(this.world);
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

  /** Carga el atlas de una forma y crea su luchador en el mundo. */
  async addFighter(formId: string, side: BattleSide, scale = 1): Promise<FighterActor | null> {
    const atlas = await loadFormAtlas(formId);
    if (!atlas) return null;
    const actor = new FighterActor(atlas, formId, side);
    actor.setScale(scale);
    actor.setPose('idle');
    this.world.addChild(actor);
    this.fighters.push(actor);
    return actor;
  }

  /** Avanza el reloj de TODOS los luchadores (frames GBC). */
  tick(ticks = 1): void {
    for (const f of this.fighters) f.tick(ticks);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.fighters.length = 0;
    this.app.destroy(true, { children: true, texture: true, textureSource: true });
  }
}
