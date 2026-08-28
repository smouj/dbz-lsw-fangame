# H0 GATE — tabla de viabilidad

Rellenar únicamente tras cada prueba real. No marcar PASS sin evidencia.

| Check | Estado |
|---|---|
| ROM LOAD (Spain, hash verificado) | ⬜ |
| WASM CORE (SameBoy Core API, CGB_E) | ⬜ |
| FRAME STEP (1× GB_run_frame) | ⬜ |
| FRAMEBUFFER (160×144 real) | ⬜ |
| INPUT A/B/DPAD (joypad, no write8) | ⬜ |
| DIRECT WRAM ACCESS | ⬜ |
| DIRECT VRAM ACCESS | ⬜ |
| DIRECT OAM ACCESS | ⬜ |
| DIRECT IO ACCESS | ⬜ |
| CPU read8 WRAM | ⬜ |
| CPU read8 sample consistency (direct vs CPU) | ⬜ |
| BATTLE PROBE VALID (bloques/HP/CC/hand/ActionObjects/SCX coherentes) | ⬜ |
| ACTIONOBJECT LIVE READ | ⬜ |
| SCX/SCY LIVE READ (GB_read_memory) | ⬜ |
| SAVE STATE (en pausa) | ⬜ |
| LOAD STATE | ⬜ |
| DETERMINISTIC RESTORE (A==A') | ⬜ |
| DETERMINISTIC RESTORE (Z1==Z2, input script X) | ⬜ |
| PERFORMANCE BLOCKER | ⬜ |

## Conclusión

`HARNESS_FEASIBLE` / `HARNESS_NOT_FEASIBLE` — **aún sin determinar.**

## Protocolos de evidencia

### Battle probe
`battleProbeValid` (NO una máquina de estados universal). PASS cuando los datos
conocidos de la ROM coinciden con lo que vemos en pantalla: fighter/roster
esperado, HP, CC, hand (donde esté probado), ActionObjects durante la acción, y
SCX/SCY. La detección completa de state-machine es H1.

### Save/load determinista
1. PAUSA → `saveState()` → snapshot probe A.
2. Avanzar (p. ej. 120 frames) → B.
3. PAUSA → `loadState(A)` → snapshot probe A'.
4. Exigir: WRAM relevante A==A', ActionObject[0] A==A', ActionObject[1] A==A',
   SCX/SCY A==A'.
5. Prueba más fuerte: A → N frames + input script X → Z1; restore A → mismo N +
   mismo X → Z2; exigir Z1==Z2 (hash/probe).

### ROM hash
Spain `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`.
USA `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee` (allowlist).
Hash incorrecto → `ROM_UNSUPPORTED`.
