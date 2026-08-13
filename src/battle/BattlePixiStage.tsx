// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattlePixiStage (primer slice de integración Pixi en BattleScreen)
// ═══════════════════════════════════════════════════════════
// Renderiza el MASTER SHOT TÁCTICO real (docs/CINEMATIC_GRAMMAR.md §4) en el
// campo de batalla: fondo overview del escenario + sprites overworld en sus
// posiciones lógicas (BattlePosition) — todo vía PixiJS 8 + reloj GBC único.
//
// GATED detrás de `?pixiField=1`: por defecto NO se monta, de modo que el
// camino DOM/CSS existente queda intacto (cero regresión). Es el primer paso
// verificable de la integración "BattleScreen → Pixi"; los planos de ACCIÓN
// y la sincronización con BattleTimeline son el siguiente slice.

import { useEffect, useRef } from 'react';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { BATTLE_LOGICAL_W, BATTLE_LOGICAL_H } from '../renderer/pixi/config';
import type { BattleScenario } from '../data/scenarios';
import type { BattlePosition } from '../data/positions';

/** True si el master shot Pixi del campo está activado (dev flag). */
export function isPixiField(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pixiField');
}

interface BattlePixiStageProps {
  scenario: BattleScenario;
  playerFormId: string;
  enemyFormId: string;
  playerPos: BattlePosition;
  enemyPos: BattlePosition;
}

export function BattlePixiStage({ scenario, playerFormId, enemyFormId, playerPos, enemyPos }: BattlePixiStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let renderer: BattleRenderer | null = null;

    (async () => {
      renderer = await BattleRenderer.create(canvas);
      if (disposed) {
        renderer.destroy();
        return;
      }
      renderer.resize(BATTLE_LOGICAL_W, BATTLE_LOGICAL_H);

      const pres = new PixiBattlePresentation(renderer, {
        playerFormId,
        enemyFormId,
        overviewBackground: scenario.overviewBackground,
        actionBackground: scenario.actionBackground,
        playerPos,
        enemyPos,
        scale: 3,
      });
      await pres.init();
      // Master shot inicial: plano FIELD con overworld en sus posiciones.
      renderer.sync(0);
    })();

    return () => {
      disposed = true;
      renderer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, playerFormId, enemyFormId]);

  return (
    <canvas
      ref={canvasRef}
      className="battle-pixi"
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
    />
  );
}
