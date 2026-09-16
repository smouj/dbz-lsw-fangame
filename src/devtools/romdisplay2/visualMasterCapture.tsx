// ═══════════════════════════════════════════════════════════════════════
// DEV-ONLY — Deterministic Pixi capture for the ROM Visual Master gate.
// ═══════════════════════════════════════════════════════════════════════
// Route (dev studio):
//   /?dev=1#dev/romdisplay&vmCapture=1&vmTick=<n>
//      [&vmCard=12&vmPlayer=gohan_kid&vmEnemy=piccolo_base&vmSeed=23089&vmScenario=01]
//
// What it does, using ONLY production components:
//   1. Boots the REAL BattleRuntime with a FIXED seed and a FIXED deck.
//   2. Dispatches the card action (PLAY_CARD) and keeps its PresentationCue
//      timeline — the same timeline the production presenter consumes.
//   3. Replays that timeline through the SAME production consumer
//      (ProductionRomPresentationAdapter → PixiBattlePresentation) with NO
//      requestAnimationFrame and NO wall clock: every GBC tick is applied
//      explicitly (sync(tick) → consume(cues at tick)), exactly like
//      RomPresentationPlayer.presentCurrentTick does.
//   4. Renders EXACTLY ONE frame (renderer.render(stage)) and extracts it.
//
// Determinism: the frame is a pure function of (seed, deck, tick, assets).
// Running the same capture twice must produce byte-identical PNGs.
//
// Publishes `window.__VISUAL_MASTER_CAPTURE__` for the Playwright driver and
// NEVER mutates the ROM side of the visual master.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Rectangle } from 'pixi.js';
import { BATTLE_LOGICAL_W, BATTLE_OUTPUT_H } from '../../renderer/pixi/config';
import { BattleRenderer } from '../../renderer/pixi/BattleRenderer';
import { PixiBattlePresentation } from '../../renderer/pixi/presentation/PixiBattlePresentation';
import { ProductionRomPresentationAdapter } from '../../renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { BattleRuntime } from '../../battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../../battle/engine/state/createInitialBattleState';
import { getCard, type CardDef } from '../../data/cards';
import { getForm } from '../../data/roster';
import { BattlePosition } from '../../data/positions';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../../data/scenarios';

export interface VisualMasterCaptureRequest {
  tick: number;
  cardId: number;
  playerFormId: string;
  enemyFormId: string;
  seed: number;
  scenarioIndex: number;
  /** Exploratory only: capture several ticks in ONE page load. */
  sweepTicks?: number[] | null;
}

export interface VisualMasterCaptureResult {
  status: 'ok' | 'error';
  error?: string;
  tick: number;
  width: number;
  height: number;
  dataUrl: string;
  /** SHA-256 of the raw RGBA pixel buffer (independent of PNG encoding). */
  pixelsSha256?: string;
  /** Presentation stats straight from the production adapter. */
  stats?: Record<string, unknown>;
  /** Timeline cue summary (ticks + types) actually replayed. */
  timelineStartTick?: number;
  timelineEndTick?: number;
  cueCount?: number;
  cueTicks?: number[];
  stateTick?: number;
  dispatchedOk?: boolean;
  measured?: { webglCanvas: { width: number; height: number }; extracted: { width: number; height: number } };
}

const FIXED_SEED = 23089;

export function readCaptureRequest(search: string, hash: string): VisualMasterCaptureRequest | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  if (params.get('vmCapture') !== '1') return null;
  const hashParams = new URLSearchParams((hash || '').replace(/^#/, '').replace(/^[^?]*\??/, ''));
  const get = (key: string) => params.get(key) ?? hashParams.get(key);
  return {
    tick: Number(get('vmTick') ?? 0),
    cardId: Number(get('vmCard') ?? 12),
    playerFormId: get('vmPlayer') ?? 'gohan_kid',
    enemyFormId: get('vmEnemy') ?? 'piccolo_base',
    seed: Number(get('vmSeed') ?? FIXED_SEED),
    scenarioIndex: Number(get('vmScenario') ?? 1),
    sweepTicks: get('vmSweep')
      ? get('vmSweep')!.split(',').map(Number).filter(Number.isFinite)
      : null,
  };
}

function deckOf(ids: number[]): { drawPile: CardDef[]; hand: CardDef[]; discardPile: CardDef[] } {
  return { drawPile: [], hand: ids.map(id => getCard(id)).filter((c): c is CardDef => !!c), discardPile: [] };
}

function initialConfig(req: VisualMasterCaptureRequest): InitialBattleConfig {
  return {
    playerFormId: req.playerFormId, playerName: 'Gohan', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 200, playerHp: 200, playerStr: 20, playerKi: 20, playerSpd: 10,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: req.enemyFormId, enemyName: 'Piccolo', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 200, enemyHp: 200, enemyStr: 20, enemyKi: 20, enemySpd: 9,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deckOf([req.cardId]), enemyDeck: deckOf([req.cardId]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player', seed: req.seed,
  };
}

async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deterministic capture of ONE tick through the production Pixi path.
 * Pure function of (seed, deck, tick, assets) — no rAF, no wall clock.
 */
export async function runVisualMasterCapture(
  canvas: HTMLCanvasElement,
  request: VisualMasterCaptureRequest,
): Promise<VisualMasterCaptureResult> {
  const base: VisualMasterCaptureResult = {
    status: 'error', tick: request.tick, width: BATTLE_LOGICAL_W, height: BATTLE_OUTPUT_H, dataUrl: '',
  };

  // ── 1. Runtime: fixed seed + fixed deck ──
  const scenario = SCENARIOS[Math.max(0, Math.min(SCENARIOS.length - 1, request.scenarioIndex - 1))];
  const runtime = new BattleRuntime({
    state: createInitialBattleState(initialConfig(request)),
    context: {
      playerFormId: request.playerFormId,
      enemyFormId: request.enemyFormId,
      overviewBackground: scenario.overviewBackground,
      actionBackground: scenario.actionBackground,
      specialActionBackground: SPECIAL_ACTION_BACKGROUND,
    },
  });
  runtime.state = { ...runtime.state, phase: 'cardSelect' as never };
  // La carta se valida contra el PERSONAJE (no el form id): misma autoridad
  // que Production (`getForm(formId).character` en main.tsx).
  const characterId = getForm(request.playerFormId)?.character ?? request.playerFormId;
  const dispatched = runtime.dispatch(
    { type: 'PLAY_CARD', handIndex: 0 },
    { side: 'player', characterId },
  );
  const timeline = dispatched.timeline;

  // ── 2. Production renderer + presentation + adapter ──
  const renderer = await BattleRenderer.create(canvas);
  renderer.resize(BATTLE_LOGICAL_W, BATTLE_OUTPUT_H);
  // NO wall clock: the Pixi ticker must never advance the presentation.
  renderer.app.ticker.stop();

  const pres = new PixiBattlePresentation(renderer, {
    playerFormId: request.playerFormId,
    enemyFormId: request.enemyFormId,
    overviewBackground: scenario.overviewBackground,
    actionBackground: scenario.actionBackground,
    specialActionBackground: SPECIAL_ACTION_BACKGROUND,
    playerPos: BattlePosition.DOWN_BACK,
    enemyPos: BattlePosition.DOWN_BACK,
    // Los frames ROM se mantienen a 1:1 dentro del mundo ACTION nativo.
    scale: 1,
  });
  await pres.init();
  pres.reset();
  pres.setAttacker('left');
  const adapter = new ProductionRomPresentationAdapter(pres, pres.romPresenter);
  adapter.reset('ROM');

  // ── 3. Deterministic replay: sync(tick) → consume(cues at tick) ──
  const target = Math.max(0, Math.floor(request.tick));
  const entries = [...timeline.entries].sort((a, b) => a.cue.tick - b.cue.tick);
  for (let tick = timeline.startTick; tick <= target; tick++) {
    adapter.sync(tick);
    for (const entry of entries) {
      if (entry.cue.tick === tick) adapter.consume(entry.cue);
    }
  }

  // ── 4. Render exactly one frame and extract the FULL 320×180 output ──
  // La captura es el buffer de producción completo (320×180), no un recorte
  // implícito por bounds del scene graph: el crop ROM↔REMAKE se aplica de
  // forma EXPLÍCITA en el contrato (remakeCapture.crop), nunca aquí.
  renderer.app.renderer.render(renderer.app.stage);
  const view = renderer.app.canvas as HTMLCanvasElement;
  const extracted = renderer.app.renderer.extract.canvas({
    target: renderer.app.stage,
    frame: new Rectangle(0, 0, BATTLE_LOGICAL_W, BATTLE_OUTPUT_H),
    resolution: 1,
  }) as HTMLCanvasElement;
  const ectx = extracted.getContext('2d');
  let pixelsSha256: string | undefined;
  if (ectx) {
    const img = ectx.getImageData(0, 0, extracted.width, extracted.height);
    pixelsSha256 = await sha256HexOfBytes(new Uint8Array(img.data.buffer.slice(0)));
  }
  const dataUrl = extracted.toDataURL('image/png');

  const stats = adapter.snapshot as unknown as Record<string, unknown>;
  return {
    ...base,
    status: 'ok',
    dataUrl,
    pixelsSha256,
    stats,
    timelineStartTick: timeline.startTick,
    timelineEndTick: timeline.endTick,
    cueCount: entries.length,
    cueTicks: entries.map(e => e.cue.tick),
    stateTick: runtime.state.tick,
    dispatchedOk: dispatched.ok,
    // Dimensiones reales medidas (evidencia del contrato de coordenadas).
    measured: {
      webglCanvas: { width: view.width, height: view.height },
      extracted: { width: extracted.width, height: extracted.height },
    },
  };
}

interface CaptureState { status: 'running' | 'ok' | 'error'; message?: string }

/**
 * Dev-only route body. Mounted by RomDisplayLab when `vmCapture=1` is present.
 * Renders a 1:1 canvas (320×180 CSS px) so the driver can also element-screenshot
 * without CSS resampling.
 */
export function VisualMasterCaptureRoute({ request }: { request: VisualMasterCaptureRequest }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CaptureState>({ status: 'running' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (request.sweepTicks && request.sweepTicks.length > 0) {
          // Exploratory sweep: fresh canvas + renderer per tick (no state bleed),
          // same deterministic replay. Not the official capture path.
          const out: Array<{ tick: number; dataUrl: string; pixelsSha256?: string; stats?: Record<string, unknown>; dispatchedOk?: boolean }> = [];
          for (const sweepTick of request.sweepTicks) {
            const fresh = document.createElement('canvas');
            const result = await runVisualMasterCapture(fresh, { ...request, tick: sweepTick });
            if (result.status !== 'ok') throw new Error(`sweep tick ${sweepTick}: ${result.error}`);
            out.push({
              tick: sweepTick,
              dataUrl: result.dataUrl,
              pixelsSha256: result.pixelsSha256,
              stats: result.stats,
              dispatchedOk: result.dispatchedOk,
            });
          }
          if (cancelled) return;
          (window as unknown as Record<string, unknown>).__VISUAL_MASTER_SWEEP__ = { status: 'ok', frames: out };
          setState({ status: 'ok', message: `sweep ${out.length} ticks` });
          return;
        }
        const result = await runVisualMasterCapture(canvas, request);
        if (cancelled) return;
        (window as unknown as Record<string, unknown>).__VISUAL_MASTER_CAPTURE__ = result;
        setState({ status: result.status === 'ok' ? 'ok' : 'error', message: result.error });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
        (window as unknown as Record<string, unknown>).__VISUAL_MASTER_CAPTURE__ = {
          status: 'error', error: message, tick: request.tick,
        };
        setState({ status: 'error', message });
      }
    })();
    return () => { cancelled = true; };
  }, [request]);

  return (
    <div id="vm-capture" style={{ padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ font: '12px monospace', color: state.status === 'ok' ? '#7fdc7f' : '#ffb070' }}>
        VM CAPTURE · tick {request.tick} · card {request.cardId} · {state.status}
        {state.message ? ` · ${state.message}` : ''}
      </div>
      <canvas
        ref={canvasRef}
        id="vm-capture-canvas"
        width={BATTLE_LOGICAL_W}
        height={BATTLE_OUTPUT_H}
        style={{ width: `${BATTLE_LOGICAL_W}px`, height: `${BATTLE_OUTPUT_H}px`, imageRendering: 'pixelated', background: '#000' }}
      />
    </div>
  );
}
