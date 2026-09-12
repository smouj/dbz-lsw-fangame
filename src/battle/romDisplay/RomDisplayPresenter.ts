// ═══════════════════════════════════════════════════════════════════════
// V7.8 — RomDisplayPresenter: capa de display para los visuales ROM.
// Consume los cues ROM de Support/Defense y produce CONSECUENCIAS GRÁFICAS
// OBSERVABLES (nunca no-ops silenciosos). NO conoce bancos ROM, WRAM ni
// direcciones: recibe primitivas ya resueltas por el decoder/compiler.
// Separado de Fighter/Projectile/HUD (capa propia).
// ═══════════════════════════════════════════════════════════════════════
import type { PresentationCue } from '../engine/presentation/PresentationCue';
import { romBgAssemblyImage } from '../../data/generated/romBgAssembly.generated';
import { paletteTransitionProgram, type RomPaletteTransitionProgram } from './romPaletteTransitionProgram';

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
  /**
   * P0.4R — ensamblado BG físico ROM ($19/$1A) resuelto a un PNG real.
   * `status: UNRESOLVED_PALETTE` cuando la paleta no tiene imagen demostrada:
   * nunca se sustituye por otro fondo.
   */
  bgAssembly: {
    resource: number;
    imageUrl: string | null;
    file: string | null;
    width: number;
    height: number;
    bgRowStart: number;
    bgCol: number;
    paletteSlot: number;
    status: 'RESOLVED' | 'UNRESOLVED_PALETTE';
    detail: string;
  } | null;
  fxWindows: number;
  macroRuns: number;
  cleared: boolean;
  pendingReasons: string[];
  /** Última ventana FX física ROM compuesta por el display layer. */
  fxWindow: {
    sourceImage: string;
    phase: 'PREFIX' | 'RESULT';
    sourceMap: 'SIDE_1' | 'SIDE_2';
    screenX: number;
    screenY: number;
    width: number;
    height: number;
  } | null;
  /**
   * P0.4R — transición de paleta ROM ($07F4/$080C) gobernando el display.
   * `status: UNRESOLVED_PARAMS` si el cue no trae los parámetros ROM: nunca se
   * sustituye por un fade.
   */
  paletteTransition: {
    program: RomPaletteTransitionProgram | null;
    startTick: number;
    status: 'ACTIVE' | 'UNRESOLVED_PARAMS';
    detail: string;
  } | null;
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
    bgAssembly: null,
    fxWindows: 0,
    macroRuns: 0,
    cleared: false,
    pendingReasons: [],
    fxWindow: null,
    paletteTransition: null,
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
        // P0.4R — resuelve la composición física ROM por (recurso, paleta).
        // Nunca usa cardName ni cae a overview/action/special_action.
        const image = romBgAssemblyImage(cue.resource, this.state.paletteIndex ?? -1);
        this.state.bgAssembly = {
          resource: cue.resource,
          imageUrl: image?.url ?? null,
          file: image?.file ?? null,
          width: cue.cols * 8,
          height: cue.rows * 8,
          bgRowStart: cue.bgRowStart,
          bgCol: cue.bgCol,
          paletteSlot: cue.paletteSlot,
          status: image ? 'RESOLVED' : 'UNRESOLVED_PALETTE',
          detail: image
            ? `BG $${cue.resource.toString(16)} physical ${image.file}`
            : `BG $${cue.resource.toString(16)} UNRESOLVED: sin imagen física para paleta ${this.state.paletteIndex === null ? 'NONE' : `$${this.state.paletteIndex.toString(16)}`}`,
        };
        if (!image) this.state.pendingReasons.push(this.state.bgAssembly.detail);
        const ev = this.push(image ? 'BG_ASSEMBLED' : 'PENDING', cardId, cue.tick, this.state.bgAssembly.detail);
        return ev;
      }
      case 'PALETTE_TRANSITION': {
        // P0.4R — interpolación BGR555 del worker ROM. Sin parámetros ROM no
        // hay transición física: PENDING explícito (jamás un fade sustituto).
        if (cue.mode == null || cue.paletteMask16 == null || cue.maxCounter == null || cue.channelStep == null) {
          const detail = 'PALETTE_TRANSITION sin parámetros ROM ($07F4) — no se sustituye por fade';
          this.state.paletteTransition = { program: null, startTick: cue.tick, status: 'UNRESOLVED_PARAMS', detail };
          this.state.pendingReasons.push(detail);
          return this.push('PENDING', cardId, cue.tick, detail);
        }
        const program = paletteTransitionProgram(cue.mode, cue.paletteMask16, cue.maxCounter, cue.channelStep);
        const detail = `$07F4 mode ${program.mode} mask $${program.paletteMask16.toString(16)} counter $${program.maxCounter.toString(16)} step $${program.channelStep} · ${program.totalTicks}t · BG[${program.affectedBgSlots.join(',')}] OBJ[${program.affectedObjSlots.join(',')}]`;
        this.state.paletteTransition = { program, startTick: cue.tick, status: 'ACTIVE', detail };
        return this.push('PALETTE_APPLIED', cardId, cue.tick, detail);
      }
      case 'ROM_FX_WINDOW': {
        this.state.fxWindows++;
        this.state.fxWindow = {
          sourceImage: cue.sourceImage,
          phase: cue.phase,
          sourceMap: cue.sourceMap,
          screenX: cue.screen.x,
          screenY: cue.screen.y,
          width: cue.viewport.width,
          height: cue.viewport.height,
        };
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
        this.state.bgAssembly = null;
        this.state.cleared = true;
        this.state.activeCardId = null;
        this.state.fxWindow = null;
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
    this.state.bgAssembly = null;
    this.state.fxWindows = 0;
    this.state.macroRuns = 0;
    this.state.cleared = false;
    this.state.pendingReasons = [];
    this.state.fxWindow = null;
    this.state.paletteTransition = null;
    this.state.events = [];
  }

  /** Cues ROM display que este presenter cubre (para verifiers). */
  static readonly coveredCues = KNOWN_DISPLAY_CUES;
}
