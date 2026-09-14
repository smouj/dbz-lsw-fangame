// ═══════════════════════════════════════════════════════════
// DBZ LSW — SceneDirector (cambia planos sin que React decida visibilidad)
// ═══════════════════════════════════════════════════════════
// Coordina los planos: FIELD (táctico) ↔ ACTION (SOLO/DUEL/PROJECTILE/IMPACT).
// La visibilidad de los sprites la decide este director (SHOT), NO React. El
// BattleTimeline emite SHOT → el adaptador llama setScene() → el director
// conmuta los Contenedores.

import { Container } from 'pixi.js';
import { TacticalScene } from '../scenes/TacticalScene';
import { ActionScene } from '../scenes/ActionScene';
import type { BattleScene } from '../presentation/BattlePresentation';
import { ACTION_WORLD_SCALE } from '../config';

export class SceneDirector {
  readonly tactical: TacticalScene;
  readonly action: ActionScene;
  /** Capa de proyectiles/VFX (beams, trails, partículas). */
  readonly projectileLayer: Container;
  private current: BattleScene = 'FIELD';

  constructor(world: Container) {
    this.tactical = new TacticalScene();
    this.action = new ActionScene();
    this.projectileLayer = new Container();
    // PROJECTILE pertenece al mismo plano ACTION: sus coordenadas son ROM
    // nativas y deben recibir exactamente la misma proyección que los actores.
    this.projectileLayer.scale.set(ACTION_WORLD_SCALE);
    this.projectileLayer.label = 'projectile-layer-native-action';
    world.addChild(this.tactical, this.action, this.projectileLayer);
  }

  get scene(): BattleScene {
    return this.current;
  }

  setScene(scene: BattleScene): void {
    this.current = scene;
    const field = scene === 'FIELD';
    this.tactical.visible = field;
    this.action.visible = !field;
    this.projectileLayer.visible = !field;
    if (!field) this.action.setScene(scene);
  }
}
