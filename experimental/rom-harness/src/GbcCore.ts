/**
 * GbcCore — contrato mínimo del núcleo emulador para el spike H0.
 *
 * IMPORTANTE: esto es un CONTRATO, no una implementación. La firma exacta
 * puede variar según lo que exponga el wrapper C de SameBoy; lo que importa
 * es el conjunto de capacidades. El nombre del archivo y de la interfaz es
 * deliberadamente genérico para poder conectar SameBoy primero (y evaluar
 * mGBA solo si SameBoy presenta un blocker real).
 *
 * H0 NO usa write8 para gameplay. write8/read8 existen únicamente para
 * DEBUG / TRACE / RESEARCH / fixtures de bootstrap experimental.
 */

/** Teclas físicas del Game Boy (joypad). */
export type GbcKey =
  | 'A'
  | 'B'
  | 'START'
  | 'SELECT'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT';

/** Regiones de memoria direccionables del GBC. */
export interface GbcMemoryRegions {
  /** Work RAM ($C000–$DFFF). */
  wram: Uint8Array;
  /** Video RAM ($8000–$9FFF). */
  vram: Uint8Array;
  /** OAM — sprite attribute table ($FE00–$FE9F). */
  oam: Uint8Array;
  /** I/O registers ($FF00–$FF7F). */
  io: Uint8Array;
}

export interface GbcCore {
  /**
   * Carga la ROM desde bytes y arranca el núcleo.
   * H0: debe validar el hash canónico ANTES de llamar a esto; si no coincide,
   * el harness devuelve ROM_UNSUPPORTED y no arranca.
   */
  loadRom(bytes: Uint8Array): Promise<void>;

  /** Avanza exactamente un frame GBC (~59.7275 FPS). */
  runFrame(): void;

  /** Pulsa/suelta una tecla del joypad (drive de input real, no WRAM). */
  setKey(key: GbcKey, pressed: boolean): void;

  /** Framebuffer RGB de 160×144, como Uint32Array (ARGB o RGB0, a definir). */
  getFramebuffer(): Uint32Array;

  /** Save-state binario (state snapshot del emulador). */
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;

  /** Regiones de memoria para observación (solo lectura en H0). */
  getMemoryRegions(): GbcMemoryRegions;

  /** DEBUG / TRACE / RESEARCH — NO usar para gameplay en H0. */
  read8(address: number): number;
  write8(address: number, value: number): void;
}
