// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattlePixiStage (integración Pixi en BattleScreen)
// ═══════════════════════════════════════════════════════════
// Renderiza el MASTER SHOT TÁCTICO real (docs/CINEMATIC_GRAMMAR.md §4) en el
// campo de batalla: fondo overview del escenario + sprites overworld en sus
// posiciones lógicas (BattlePosition) — todo vía PixiJS 8 + reloj GBC único.
//
// GATED detrás de `?pixiField=1` (ver `isPixiField` en renderer/pixi/flag.ts):
// por defecto NO se monta, de modo que el camino DOM/CSS existente queda
// intacto (cero regresión). El módulo se carga con React.lazy (code-split):
// pixi.js (~790KB) solo se descarga cuando el flag está activo.

import { useEffect, useRef } from 'react';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { BATTLE_LOGICAL_W, BATTLE_LOGICAL_H } from '../renderer/pixi/config';
import type { BattleScenario } from '../data/scenarios';
import { SPECIAL_ACTION_BACKGROUND } from '../data/scenarios';
import type { BattlePosition } from '../data/positions';

interface BattlePixiStageProps {
  scenario: BattleScenario;
  playerFormId: string;
  enemyFormId: string;
  playerPos: BattlePosition;
  enemyPos: BattlePosition;
  /** Ref donde el stage publica su PixiBattlePresentation (para enrutar el timeline). */
  presentationRef?: { current: PixiBattlePresentation | null };
  onPresentationReady?: (ready: boolean) => void;
}

export function BattlePixiStage({ scenario, playerFormId, enemyFormId, playerPos, enemyPos, presentationRef, onPresentationReady }: BattlePixiStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Letterbox centrado (aspect-fit de producción) ──
  // Escala ENTERA máxima que cabe en el contenedor (pixel-perfect, sin
  // distorsión): el canvas lógico 320×160 se escala a 2×/3×/4×… y se centra;
  // el hueco sobrante queda como "barras" (letterbox) del propio battlefield.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const apply = () => {
      const r = stage.getBoundingClientRect();
      const s = Math.max(1, Math.floor(Math.min(r.width / BATTLE_LOGICAL_W, r.height / BATTLE_LOGICAL_H)));
      canvas.style.width = `${BATTLE_LOGICAL_W * s}px`;
      canvas.style.height = `${BATTLE_LOGICAL_H * s}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // ── Renderer + presentación ──
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
        specialActionBackground: SPECIAL_ACTION_BACKGROUND,
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
      onPresentationReady?.(true);
      // Master shot inicial: plano FIELD con overworld en sus posiciones.
      renderer.sync(0);
    })();

    return () => {
      disposed = true;
      if (presentationRef && presentationRef.current === presentation) {
        presentationRef.current = null;
      }
      onPresentationReady?.(false);
      renderer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, playerFormId, enemyFormId]);

  // ── MOVE táctico: recoloca el overworld del FIELD sin reinicializar ──
  // La primera invocación es no-op (la presentación aún no está lista); init
  // ya coloca las posiciones iniciales.
  useEffect(() => {
    presentationRef?.current?.updateTactical(playerPos, enemyPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos, enemyPos]);

  return (
    <div ref={stageRef} className="battle-pixi-stage">
      <canvas ref={canvasRef} className="battle-pixi" style={{ width: BATTLE_LOGICAL_W, height: BATTLE_LOGICAL_H }} />
    </div>
  );
}
