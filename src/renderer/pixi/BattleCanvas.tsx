// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattleCanvas (puente React → PixiJS)
// ═══════════════════════════════════════════════════════════
// React monta/desmonta el canvas y expone un handle IMPERATIVO. El juego
// (React) NO re-renderiza por frame: llama a `addFighter`/`tick`/`resize`
// vía ref. Pixi controla el resto directamente sobre el canvas.
//
// El handle aguarda a que la Application Pixi esté lista (init async), de modo
// que `addFighter` no resuelve null por una carrera con la creación.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { BattleSide } from '../../data/facing';
import { BattleRenderer } from './BattleRenderer';
import type { FighterActor } from './actors/FighterActor';

export interface BattleCanvasHandle {
  /** Resuelve true cuando la Application Pixi está lista. */
  ready(): Promise<boolean>;
  addFighter(formId: string, side: BattleSide, scale?: number): Promise<FighterActor | null>;
  tick(ticks?: number): void;
  sync(tick: number): void;
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
    const createPromiseRef = useRef<Promise<BattleRenderer | null> | null>(null);
    const disposedRef = useRef(false);

    useEffect(() => {
      disposedRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      createPromiseRef.current = BattleRenderer.create(canvas)
        .then(r => {
          if (disposedRef.current) {
            r.destroy();
            return null;
          }
          rendererRef.current = r;
          r.resize(width, height);
          return r;
        })
        .catch(() => {
          rendererRef.current = null;
          return null;
        });

      return () => {
        disposedRef.current = true;
        createPromiseRef.current = null;
        rendererRef.current?.destroy();
        rendererRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        ready: async () => {
          const p = createPromiseRef.current;
          if (!p) return false;
          return (await p) !== null;
        },
        addFighter: async (formId, side, scale = 1) => {
          const p = createPromiseRef.current;
          if (!p) return null;
          const r = await p;
          return r ? r.addFighter(formId, side, scale) : null;
        },
        tick: (ticks = 1) => rendererRef.current?.tick(ticks),
        sync: (tick: number) => rendererRef.current?.sync(tick),
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
