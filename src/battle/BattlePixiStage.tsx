// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattlePixiStage (integración Pixi en BattleScreen)
// ═══════════════════════════════════════════════════════════
// Renderiza el MASTER SHOT TÁCTICO real (docs/CINEMATIC_GRAMMAR.md §4) en el
// campo de batalla: fondo overview del escenario + sprites overworld en sus
// posiciones lógicas (BattlePosition) — todo vía PixiJS 8 + reloj GBC único.
//
// Se monta por defecto en BattleScreen (ver `isPixiField` en
// renderer/pixi/flag.ts). El camino DOM/CSS se conserva como fallback explícito
// `?domField=1` para comparar o recuperar una regresión. El módulo se carga con
// React.lazy (code-split), de modo que pixi.js (~790KB) no se descarga en el
// menú ni en las pantallas que no muestran una batalla.

import { useEffect, useRef } from 'react';
import { BattleRenderer } from '../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../renderer/pixi/presentation/PixiBattlePresentation';
import { BATTLE_LOGICAL_W, BATTLE_OUTPUT_H, resolveBattleOutputScale } from '../renderer/pixi/config';
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
  // Aspect-fit sin distorsión: escala ENTERA cuando el panel permite ≥2×;
  // en el panel compacto (HUD inferior visible) usa la fracción necesaria
  // para llenar la altura sin dejar un canvas 1× diminuto ni desbordar.
  // El mundo ROM 320×160 queda centrado dentro del output 320×180.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const apply = () => {
      const r = stage.getBoundingClientRect();
      const s = resolveBattleOutputScale(r.width, r.height);
      canvas.style.width = `${BATTLE_LOGICAL_W * s}px`;
      canvas.style.height = `${BATTLE_OUTPUT_H * s}px`;
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
      renderer.resize(BATTLE_LOGICAL_W, BATTLE_OUTPUT_H);

      const pres = new PixiBattlePresentation(renderer, {
        playerFormId,
        enemyFormId,
        overviewBackground: scenario.overviewBackground,
        actionBackground: scenario.actionBackground,
        specialActionBackground: SPECIAL_ACTION_BACKGROUND,
        playerPos,
        enemyPos,
        // Los frames ROM se mantienen a 1:1 dentro del mundo ACTION nativo;
        // ActionScene proyecta el plano completo a ×2.
        scale: 1,
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
      <canvas ref={canvasRef} className="battle-pixi" style={{ width: BATTLE_LOGICAL_W, height: BATTLE_OUTPUT_H }} />
    </div>
  );
}
