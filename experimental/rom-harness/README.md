# H0 — ROM-Backed Battle Harness (SPIKE de viabilidad)

> **Estado:** EXPERIMENTAL · REVERSIBLE · AISLADO
> Rama: `spike/h0-rom-harness`

Esto **NO** es una migración del proyecto. No sustituye `BattleEngine`, no crea
Hybrid Mode, no crea `NormalizedBattleFeed`, no modifica la BattleScreen de
producción. Es un experimento aislado para demostrar o refutar que podemos
ejecutar la ROM comercial DBZ LSW dentro de la app y observarla correctamente.

## Objetivo único (gate H0)

Demostrar o refutar, en este orden:

1. ejecutar la ROM dentro de nuestra app (WASM);
2. avanzar la emulación frame a frame;
3. enviar inputs GBC reales (joypad);
4. leer memoria del GBC;
5. observar correctamente una batalla real;
6. observar ActionObjects durante una acción;
7. guardar/restaurar estado de forma determinista.

Si funciona → paramos y entregamos el gate. **NO** continuamos hacia H1
automáticamente.

## Decisiones técnicas

- **Core preferente:** SameBoy (MIT/Expat, ~59.7275 FPS, `GB_run_frame`,
  `GB_set_key_state`, save/load state, framebuffer, memory access).
  Camino: SameBoy core → thin C wrapper → Emscripten → WASM.
- **ROM:** NO se commitea. Se aceptan bytes locales del dev. Hash canónico
  (no inventado — leído de las constantes existentes del repo):
  - Spain `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`
  - USA   `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`
  - Hash incorrecto → `ROM_UNSUPPORTED`.
- **Input:** SIEMPRE vía `setKey` (joypad real). `write8` solo DEBUG/RESEARCH.
- **No automatizar menús GBC.** Llegar a batalla vía save-state local verificado
  o navegación manual sobre el framebuffer original.

## Estructura

```
experimental/rom-harness/
├── README.md          ← este archivo
├── H0_GATE.md         ← tabla PASS/FAIL del gate
├── .gitignore         ← ignora ROMs y artefactos de build
├── src/
│   └── GbcCore.ts     ← contrato mínimo del núcleo emulador
├── core/              ← (siguiente) wrapper C + build Emscripten de SameBoy
└── dev/               ← (siguiente) panel dev #dev/rom-harness
```

## Prohibido en H0

`NormalizedBattleFeed` · `RomBattleBackend` · `NativeBattleAdapter` ·
`HybridBattleRuntime` · reestructurar Pixi · migrar BattleScreen/Game Shell ·
crear modo Classic/Hybrid · eliminar Engine · automatizar menús · battle
bootstrap · 125 mappings · nuevo emulador · otra campaña de RE.

## Progreso

- [x] Preflight: ROM canónica presente (hash verificado, 2 revisiones) + decomp dir.
- [x] Contrato `GbcCore` definido.
- [ ] Instalar Emscripten (en curso).
- [ ] Compilar SameBoy → WASM (thin wrapper).
- [ ] Panel dev de diagnóstico (framebuffer + probe de memoria + controles joypad).
- [ ] Llegar a batalla (save-state / navegación manual).
- [ ] RomHarnessSnapshot (solo campos demostrados).
- [ ] ActionObject proof + Input proof + Save-state proof.
- [ ] Rellenar H0_GATE.md y parar.
