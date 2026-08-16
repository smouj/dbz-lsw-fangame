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
