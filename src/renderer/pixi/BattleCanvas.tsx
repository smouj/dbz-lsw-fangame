// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattleCanvas (puente React → PixiJS)
// ═══════════════════════════════════════════════════════════
// React monta/desmonta el canvas y expone un handle IMPERATIVO. El juego
// (React) NO re-renderiza por frame: llama a `addFighter`/`tick`/`resize`
// vía ref. Pixi controla el resto directamente sobre el canvas.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { BattleSide } from '../../data/facing';
import { BattleRenderer } from './BattleRenderer';
import type { FighterActor } from './actors/FighterActor';

export interface BattleCanvasHandle {
  addFighter(formId: string, side: BattleSide, scale?: number): Promise<FighterActor | null>;
  tick(ticks?: number): void;
  resize(width: number, height: number): void;
}

interface BattleCanvasProps {
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}

export const BattleCanvas = forwardRef<BattleCanvasHandle, BattleCanvasProps>(
  function BattleCanvas({ width, height, className, style }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<BattleRenderer | null>(null);
    const disposedRef = useRef(false);

    useEffect(() => {
      disposedRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      BattleRenderer.create(canvas).then(r => {
        if (disposedRef.current) {
          r.destroy();
          return;
        }
        rendererRef.current = r;
        r.resize(width, height);
      });

      return () => {
        disposedRef.current = true;
        rendererRef.current?.destroy();
        rendererRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        addFighter: (formId, side, scale = 1) =>
          rendererRef.current?.addFighter(formId, side, scale) ?? Promise.resolve(null),
        tick: (ticks = 1) => rendererRef.current?.tick(ticks),
        resize: (w, h) => rendererRef.current?.resize(w, h),
      }),
      [],
    );

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width, height, imageRendering: 'pixelated', ...style }}
      />
    );
  },
);
