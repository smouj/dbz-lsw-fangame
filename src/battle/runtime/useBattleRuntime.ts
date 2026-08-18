// ═══════════════════════════════════════════════════════════════════════
// M8 — useBattleRuntime: puente React → BattleRuntime.
// ═══════════════════════════════════════════════════════════════════════
// React SOLO mantiene estado de UI (botón activo, gate de presentación).
// Todo el gameplay (HP/CC/fase/posición/QTE/mano) vive en runtime.state.
// El HUD se proyecta con selectores sobre runtime.state — nunca duplica.
//
// input gate: mientras el Presenter muestra una secuencia se bloquean
// clicks repetidos (orquestación de presentación). La LEGALIDAD sigue
// siendo exclusivamente canExecute() — no se mezclan responsabilidades.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useRef, useState } from 'react';
import type { BattleCommand } from '../engine/commands';
import { BattleRuntime } from './BattleRuntime';
import type { BattlePresenter } from './BattlePresenter';

export interface UseBattleRuntimeOptions {
  runtime: BattleRuntime;
  /** Presenter que consume los timelines (se sustituye en caliente). */
  presenter?: BattlePresenter | null;
  /** Duración del gate de presentación en ms (bloqueo de clicks repetidos). */
  gateMs?: number;
}

export interface BattleRuntimeApi {
  runtime: BattleRuntime;
  /** Re-render forzado tras cada dispatch/advance (estado → UI). */
  version: number;
  /** El Presenter está mostrando una secuencia (gate de input). */
  busy: boolean;
  dispatch: (command: BattleCommand, opts?: Parameters<BattleRuntime['dispatch']>[1]) => void;
  advance: (ticks: number) => void;
  can: (command: BattleCommand, opts?: Parameters<BattleRuntime['dispatch']>[1]) => boolean;
  setPresenter: (p: BattlePresenter | null) => void;
}

export function useBattleRuntime(opts: UseBattleRuntimeOptions): BattleRuntimeApi {
  const { runtime } = opts;
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const presenterRef = useRef<BattlePresenter | null>(opts.presenter ?? null);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateMs = opts.gateMs ?? 200;

  runtime.presenter = presenterRef.current;

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const dispatch = useCallback<BattleRuntimeApi['dispatch']>((command, cmdOpts) => {
    const result = runtime.dispatch(command, cmdOpts);
    refresh();
    if (!result.ok) return;
    // Gate de presentación: solo orquestación — la legalidad ya la validó
    // canExecute dentro del Engine (nunca se mezclan responsabilidades).
    if (busyTimer.current) clearTimeout(busyTimer.current);
    setBusy(true);
    busyTimer.current = setTimeout(() => setBusy(false), gateMs);
  }, [runtime, refresh, gateMs]);

  const advance = useCallback((ticks: number) => {
    runtime.advance(ticks);
    refresh();
  }, [runtime, refresh]);

  const can = useCallback<BattleRuntimeApi['can']>((command, cmdOpts) => {
    return runtime.can(command, cmdOpts).ok;
  }, [runtime]);

  const setPresenter = useCallback((p: BattlePresenter | null) => {
    presenterRef.current = p;
    runtime.presenter = p;
    refresh();
  }, [runtime, refresh]);

  const api = useMemo<BattleRuntimeApi>(() => ({
    runtime, version, busy,
    dispatch, advance, can, setPresenter,
  }), [runtime, version, busy, dispatch, advance, can, setPresenter]);

  return api;
}
