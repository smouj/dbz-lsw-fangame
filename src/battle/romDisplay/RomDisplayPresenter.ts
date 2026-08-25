// ═══════════════════════════════════════════════════════════════════════
// V7.8 — RomDisplayPresenter: capa de display para los visuales ROM.
// Consume los cues ROM de Support/Defense y produce CONSECUENCIAS GRÁFICAS
// OBSERVABLES (nunca no-ops silenciosos). NO conoce bancos ROM, WRAM ni
// direcciones: recibe primitivas ya resueltas por el decoder/compiler.
// Separado de Fighter/Projectile/HUD (capa propia).
// ═══════════════════════════════════════════════════════════════════════
import type { PresentationCue } from '../engine/presentation/PresentationCue';

export type RomDisplayEventKind =
  | 'VISUAL_LOADED'
  | 'PALETTE_APPLIED'
  | 'BG_ASSEMBLED'
  | 'FX_WINDOW_APPLIED'
  | 'COMPOSED'
  | 'MACRO_RUN'
  | 'CLEARED'
  | 'PENDING';

export interface RomDisplayEvent {
  kind: RomDisplayEventKind;
  cardId: number;
  tick: number;
  detail: string;
}

export interface RomDisplayState {
  activeCardId: number | null;
  paletteIndex: number | null;
  composed: boolean;
  bgAssembled: boolean;
  fxWindows: number;
  macroRuns: number;
  cleared: boolean;
  pendingReasons: string[];
  events: RomDisplayEvent[];
}

const KNOWN_DISPLAY_CUES = new Set<PresentationCue['type']>([
  'SUPPORT_VISUAL_LOAD',
  'PALETTE_LOAD',
  'BG_ASSEMBLY',
  'DISPLAY_COMPOSE',
  'SUPPORT_MACRO',
  'DISPLAY_CLEAR',
  'ROM_FX_WINDOW',
  'ROM_WAIT',
  'ROM_SFX',
  'ROM_RESULT_BRANCH',
  'DEFENSE_FX',
]);

/**
 * Presenter de capa ROM display. Cada cue termina en un evento observable o
 * en un PENDING explícito (nunca silencioso).
 */
export class RomDisplayPresenter {
  readonly state: RomDisplayState = {
    activeCardId: null,
    paletteIndex: null,
    composed: false,
    bgAssembled: false,
    fxWindows: 0,
    macroRuns: 0,
    cleared: false,
    pendingReasons: [],
    events: [],
  };

  private push(kind: RomDisplayEventKind, cardId: number, tick: number, detail: string): RomDisplayEvent {
    const ev: RomDisplayEvent = { kind, cardId, tick, detail };
    this.state.events.push(ev);
    return ev;
  }

  /** Alimenta un cue ROM display; devuelve el evento generado. */
  consume(cue: PresentationCue): RomDisplayEvent {
    const cardId = this.state.activeCardId ?? 0;
    switch (cue.type) {
      case 'SUPPORT_VISUAL_LOAD': {
        this.state.activeCardId = cardId;
        this.state.cleared = false;
        const ev = this.push('VISUAL_LOADED', this.state.activeCardId ?? cardId, cue.tick, `visual card-indexed (tiles=${cue.tileCount})`);
        return ev;
      }
      case 'PALETTE_LOAD': {
        this.state.paletteIndex = cue.paletteIndex;
        const ev = this.push('PALETTE_APPLIED', cardId, cue.tick, `palette $${cue.paletteIndex.toString(16).padStart(2, '0')} (physical=${cue.paletteIsPhysical})`);
        return ev;
      }
      case 'BG_ASSEMBLY': {
        this.state.bgAssembled = true;
        const ev = this.push('BG_ASSEMBLED', cardId, cue.tick, `BG $19 ${cue.rows}x${cue.cols} @ row${cue.bgRowStart} col${cue.bgCol} slot${cue.paletteSlot}`);
        return ev;
      }
      case 'ROM_FX_WINDOW': {
        this.state.fxWindows++;
        const ev = this.push(
          'FX_WINDOW_APPLIED',
          cardId,
          cue.tick,
          `FX ${cue.physicalId} ${cue.phase} ${cue.sourceMap} rows ${cue.viewport.sourceRows} -> ${cue.screen.bgMap} row${cue.screen.bgRow} col${cue.screen.bgCol} (${cue.status})`,
        );
        return ev;
      }
      case 'DISPLAY_COMPOSE': {
        this.state.composed = true;
        const ev = this.push('COMPOSED', cardId, cue.tick, `display compose (${cue.composeEvidence})`);
        return ev;
      }
      case 'SUPPORT_MACRO': {
        this.state.macroRuns++;
        const ev = this.push('MACRO_RUN', cardId, cue.tick, `macro ${cue.macroHex ?? cue.macroId.toString(16)} (${cue.literalProgramStatus})`);
        return ev;
      }
      case 'DISPLAY_CLEAR': {
        this.state.composed = false;
        this.state.bgAssembled = false;
        this.state.cleared = true;
        this.state.activeCardId = null;
        const ev = this.push('CLEARED', cardId, cue.tick, 'display cleared');
        return ev;
      }
      case 'ROM_PENDING': {
        this.state.pendingReasons.push(cue.reason);
        const ev = this.push('PENDING', cardId, cue.tick, cue.reason);
        return ev;
      }
      case 'ROM_WAIT':
      case 'ROM_SFX':
      case 'ROM_RESULT_BRANCH':
      case 'DEFENSE_FX':
        // Consecuencia observable: registro de la operación (sin conocimiento ROM).
        return this.push(
          cue.type === 'ROM_WAIT' ? 'PENDING' : cue.type === 'ROM_RESULT_BRANCH' ? 'PENDING' : 'COMPOSED',
          cardId,
          cue.tick,
          `cue ${cue.type} procesado`,
        );
      default:
        // Cualquier cue ROM display no reconocido: PENDING explícito, nunca no-op.
        this.state.pendingReasons.push(`unhandled display cue ${cue.type}`);
        return this.push('PENDING', cardId, cue.tick, `unhandled display cue ${cue.type}`);
    }
  }

  reset() {
    this.state.activeCardId = null;
    this.state.paletteIndex = null;
    this.state.composed = false;
    this.state.bgAssembled = false;
    this.state.fxWindows = 0;
    this.state.macroRuns = 0;
    this.state.cleared = false;
    this.state.pendingReasons = [];
    this.state.events = [];
  }

  /** Cues ROM display que este presenter cubre (para verifiers). */
  static readonly coveredCues = KNOWN_DISPLAY_CUES;
}
