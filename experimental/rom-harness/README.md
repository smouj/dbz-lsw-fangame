# H0 — ROM-Backed Battle Harness (SPIKE de viabilidad)

> **Estado:** EXPERIMENTAL · REVERSIBLE · AISLADO · single-threaded
> Rama: `spike/h0-rom-harness`

Esto **NO** es una migración. No sustituye `BattleEngine`, no crea Hybrid Mode,
no crea `NormalizedBattleFeed`, no toca la BattleScreen de producción. Es un
experimento aislado para demostrar o refutar que podemos ejecutar la ROM
comercial DBZ LSW dentro de la app y observarla correctamente.

## Objetivo único (gate H0)

Demostrar o refutar, en este orden:

1. ejecutar la ROM dentro de nuestra app (WASM);
2. avanzar la emulación frame a frame;
3. enviar inputs GBC reales (joypad);
4. leer memoria del GBC (directa + CPU-semántica);
5. observar correctamente una batalla conocida (battle probe);
6. observar ActionObjects durante una acción;
7. guardar/restaurar estado de forma determinista.

Si funciona → paramos y entregamos el gate. **NO** continuamos hacia H1.

## Decisiones fijadas para H0

- **ROM primaria:** Spain `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`.
  USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` queda solo
  en allowlist. NO duplicar el spike para las dos ROM. Hash incorrecto → `ROM_UNSUPPORTED`.
- **Core:** SameBoy **CORE API directamente**, NO libretro (solo evaluar libretro
  si compilar Core resulta bloqueante). `GB_run_frame`, `GB_set_key_state`,
  `GB_get_direct_access`, `GB_read_memory`, `GB_save_state_to_buffer`, etc.
- **Pin SameBoy:** NO compilar contra `master` flotante. Registrar
  `SAMEBOY_REPO` / `SAMEBOY_COMMIT` / `SAMEBOY_LICENSE` / `EMSCRIPTEN_VERSION`
  en `build/sameboy-version.json`. El build script hace checkout del commit exacto.
- **Modelo GBC explícito:** `GB_MODEL_CGB_E` + boot ROM **libre** de SameBoy
  (`BootROMs/`). NUNCA una boot ROM propietaria de Nintendo en el repo.
- **Timing:** `Run Frame` = exactamente 1× `GB_run_frame()`. `Run` usa un
  acumulador (wall time → budget de frames emulados → 0/1/ocasionalmente >1
  `GB_run_frame()`), NO `1 requestAnimationFrame = 1 GBC frame`. El GBC va a
  ~59.7275 Hz; el navegador presenta ~60 Hz. No scheduler perfecto, solo evitar
  falso positivo de "tiempo real perfecto".
- **Sin threads:** no Web Workers, no pthreads WASM, no SharedArrayBuffer, no
  COOP/COEP. Todo single-threaded.
- **Sin audio** en H0.
- **Input:** SIEMPRE vía `setKey` (joypad real). `debugWrite8` solo DEBUG.
- **`.sav` ≠ save-state:** los `.sav` existentes son battery/SRAM (progreso).
  Se cargan con `loadBattery` para llegar antes a Battle; dentro de Battle se
  genera un save-state REAL de SameBoy para las pruebas de restore. No asumir
  compatibilidad con un state de otro emulador.
- **No automatizar menús GBC.** Llegar a batalla vía battery save + navegación
  manual sobre el framebuffer original, o save-state local verificado.

## Estructura

```
experimental/rom-harness/
├── README.md          ← este archivo
├── H0_GATE.md         ← tabla PASS/FAIL del gate
├── .gitignore         ← ignora ROMs, .sav y artefactos de build
├── src/
│   └── GbcCore.ts     ← contrato mínimo del núcleo emulador
├── build/
│   ├── sameboy-version.json   ← pin: repo/commit/license/emscripten
│   └── build-wasm.sh          ← checkout commit exacto + thin C wrapper + emcc
├── core/              ← thin C wrapper (NO vendorear SameBoy completo)
└── dev/               ← panel dev #dev/rom-harness
```

## Prohibido en H0

`NormalizedBattleFeed` · `BattleBackend` · `RomBattleRuntime` · `Hybrid mode` ·
reestructurar Pixi · modern UI mapping · battle bootstrap · migrar
BattleScreen/Game Shell · eliminar Engine · automatizar menús · 125 mappings ·
nuevo emulador · detección universal Title/Menu/Battle/Results · audio ·
threads · otra campaña de RE.

## Progreso

- [x] Preflight: ROM canónica presente (hash verificado) + decomp dir.
- [x] Emscripten instalado (emsdk, ver `build/sameboy-version.json`).
- [x] Contrato `GbcCore` definido (read8 CPU-semántico + debugWrite8 + battery).
- [ ] Pin SameBoy (commit exacto + licencia + versión Emscripten).
- [ ] Thin C wrapper + build SameBoy → WASM (Core API, modelo CGB_E, boot ROM libre).
- [ ] Panel dev de diagnóstico (framebuffer + probe de memoria + joypad + Run Frame/Run).
- [ ] Llegar a batalla (battery save + navegación manual / save-state verificado).
- [ ] RomBattleProbe (solo campos demostrados, `battleProbeValid`).
- [ ] ActionObject proof + Input proof + Save/load determinista (Z1==Z2).
- [ ] Rellenar H0_GATE.md y parar.
