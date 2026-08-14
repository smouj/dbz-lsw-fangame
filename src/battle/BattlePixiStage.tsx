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
  /** Ref donde el stage publica su PixiBattlePresentation (para enrutar el timeline). */
  presentationRef?: { current: PixiBattlePresentation | null };
}

export function BattlePixiStage({ scenario, playerFormId, enemyFormId, playerPos, enemyPos, presentationRef }: BattlePixiStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let renderer: BattleRenderer | null = null;
    let presentation: PixiBattlePresentation | null = null;

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
      if (disposed) {
        renderer.destroy();
        return;
      }
      presentation = pres;
      if (presentationRef) presentationRef.current = pres;
      // Master shot inicial: plano FIELD con overworld en sus posiciones.
      renderer.sync(0);
    })();

    return () => {
      disposed = true;
      if (presentationRef && presentationRef.current === presentation) {
        presentationRef.current = null;
      }
      renderer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, playerFormId, enemyFormId]);

  // Refleja MOVE (cambio de posición táctica) SIN reinicializar el renderer:
  // el overworld del FIELD se recoloca en su nueva posición lógica. La primera
  // invocación es no-op (la presentación aún no está lista); init ya coloca
  // las posiciones iniciales.
  useEffect(() => {
    presentationRef?.current?.updateTactical(playerPos, enemyPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos, enemyPos]);

  return (
    <canvas
      ref={canvasRef}
      className="battle-pixi"
      style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
    />
  );
}
