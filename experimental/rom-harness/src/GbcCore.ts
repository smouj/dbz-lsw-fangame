/**
 * GbcCore — contrato mínimo del núcleo emulador para el spike H0.
 *
 * IMPORTANTE: esto es un CONTRATO, no una implementación. La firma exacta
 * puede variar según lo que exponga el wrapper C de SameBoy; lo que importa
 * es el conjunto de capacidades. El nombre es deliberadamente genérico para
 * poder conectar SameBoy primero (y evaluar mGBA solo si SameBoy presenta un
 * blocker real).
 *
 * Decisiones fijadas para H0 (ver README.md):
 * - SameBoy CORE API directamente (NO libretro).
 * - Modelo explícito GB_MODEL_CGB_E + boot ROM libre de SameBoy (nunca una
 *   boot ROM propietaria de Nintendo en el repo).
 * - Single-threaded: sin Web Workers, sin pthreads, sin SharedArrayBuffer.
 * - Sin audio en H0.
 *
 * SEMÁNTICA DE MEMORIA (importante):
 * - `read8`/`debugWrite8` usan la lectura CPU-semántica de SameBoy
 *   (GB_read_memory / GB_write_memory). Es la vía correcta para direcciones
 *   CPU reales y para registros IO (SCX/SCY, FF41, etc.), porque el acceso
 *   directo no respeta la semántica de ciertos registros IO.
 * - `getMemoryRegions()` usa GB_get_direct_access() y sirve para DEMOSTRAR el
 *   acceso directo y para bulk snapshots donde sea seguro. NO asumir que
 *   acceso directo IO == lectura CPU.
 *
 * SAVE-STATE vs BATTERY (no mezclar):
 * - saveState/loadState = snapshot exacto de la máquina (GB_save_state_to_buffer).
 *   SOLO se toma en PAUSA (SameBoy documenta que no debe ejecutarse mientras
 *   la instancia corre).
 * - loadBattery/saveBattery = battery/SRAM save (GB_load_battery_from_buffer),
 *   solo progreso persistente (personajes/cartas desbloqueadas), para llegar
 *   antes a una batalla. NO es un save-state.
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

/** Regiones de memoria direccionables del GBC (acceso directo, GB_get_direct_access). */
export interface GbcMemoryRegions {
  /** Work RAM ($C000–$DFFF). */
  wram: Uint8Array;
  /** Video RAM ($8000–$9FFF). */
  vram: Uint8Array;
  /** OAM — sprite attribute table ($FE00–$FE9F). */
  oam: Uint8Array;
  /** I/O registers ($FF00–$FF7F). NO asumir equivalencia con read8. */
  io: Uint8Array;
}

export interface GbcCore {
  /**
   * Carga la ROM desde bytes y arranca el núcleo.
   * H0: validar el hash canónico ANTES de llamar a esto; si no coincide,
   * el harness devuelve ROM_UNSUPPORTED y no arranca.
   */
  loadRom(bytes: Uint8Array): Promise<void>;

  /** Avanza exactamente un frame GBC (~59.7275 FPS). Devuelve el tiempo transcurrido. */
  runFrame(): number;

  /** Pulsa/suelta una tecla del joypad (drive de input real, no WRAM). */
  setKey(key: GbcKey, pressed: boolean): void;

  /** Framebuffer RGB de 160×144 (RGBA8888 en Uint32Array). */
  getFramebuffer(): Uint32Array;

  /**
   * Save-state binario (snapshot exacto de máquina). Solo en PAUSA.
   */
  saveState(): Uint8Array;
  loadState(state: Uint8Array): void;

  /**
   * Battery/SRAM save (progreso persistente). NO es save-state.
   */
  loadBattery(bytes: Uint8Array): void;
  saveBattery(): Uint8Array;

  /** Regiones de memoria por acceso directo (GB_get_direct_access). */
  getMemoryRegions(): GbcMemoryRegions;

  /**
   * Lectura CPU-semántica (GB_read_memory). Vía PREFERIDA del probe para
   * direcciones CPU conocidas (battle block, ActionObject, SCX/SCY, IO).
   */
  read8(address: number): number;

  /**
   * Escritura CPU-semántica (GB_write_memory). EXCLUSIVAMENTE DEV/DEBUG/
   * RESEARCH. NUNCA para gameplay en H0.
   */
  debugWrite8(address: number, value: number): void;
}
