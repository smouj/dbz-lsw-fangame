# DBZ LSW — STATE.md (Estado actual del proyecto)

> **Última actualización**: 2026-08-17 · HEAD `b59e433` · origin/main sincronizado.
> Este documento es LA referencia del estado real del motor. Si un doc antiguo
> contradice esto, ESTE gana (los obsoletos se archivan en `docs/archive/`).

---

## 1. Arquitectura del motor (fuente única de reglas)

```
src/battle/
├── state.ts     → reglas PURAS del mazo/CC/descarte (JointDeckState)
├── engine.ts    → máquina de FASES/TURNOS (transiciones puras compartidas)
└── evidence.ts  → marco de confianza GBC (niveles + RULE_EVIDENCE, 15 reglas)

src/data/
├── cardVisuals.ts  → CardVisualRegistry (frame por tipo + arte) [juego + dev]
├── hudAssets.ts    → HudAssetRegistry (botones por acción) [juego + dev]
└── generated/spriteCanon.generated.ts → canon semántico V9 (fuente única)
```

**Consumidores del motor**: el juego real (`src/main.tsx`, flujo alineado con
`state.ts` + reglas de `evidence.ts`) y el HUD Studio (`src/devtools/hud.tsx`,
que usa `engine.ts` para sus visualizaciones). El HUD Studio es SOLO
configurador del tema — las demos/batallas viven en el Combat Lab.

## 2. Separación de responsabilidades (HUD System / BattleEngine)

```
┌─────────────────────────┐   ┌──────────────────────────┐
│ HUD SYSTEM (visual)     │   │ BATTLE ENGINE (lógica)   │
│ · hudLayout.ts (contrato│   │ · battle/state.ts (reglas│
│   GEOMÉTRICO baseline V1│   │   mazo/CC/HAND CHECK)    │
│ · hudTheme.ts (colores/ │   │ · battle/engine.ts (fases│
│   escala/tipografía)    │   │   y turnos, compartido)  │
│ · hudAssets.ts (botones)│   │ · battle/combat.ts (daño/│
│ · cardVisuals.ts (cartas│   │   defensa)               │
│                         │   │ · battle/evidence.ts (niv│
└───────────┬─────────────┘   └───────────┬──────────────┘
            │                             │
            ▼                             ▼
   Battle Presentation (pantalla de combate)
```

- **HUD Studio = fuente de verdad VISUAL** (baseline V1 congelada — no cambiar
  de dirección). Juego real, preview y Combat Lab consumen el MISMO CSS y las
  vars `--hud-layout-*` (contrato en `:root` vía `applyHudLayout()`).
- **BattleEngine = fuente de verdad LÓGICA**. No se mezclan.
- Contrato: `src/data/hudLayout.ts` (HUD_LAYOUT: controles 96, botones/cartas
  96×80, card-art 64×48 en 18,18, diálogo 80, HP bar 16, hand gap 5).
  Validado por `npm run verify:hud-layout` (10 checks: invariantes + conexión
  CSS + bootstrap + dev).

## 3. Reglas estructurales y su nivel de evidencia (resumen)

| Regla | Nivel | Estado |
|---|---|---|
| Mazo Joint = 20 configuradas (sin filtrar al crear) | MANUAL_CONFIRMED | ✅ implementado (V10) |
| Mano inicial 3 · drawPile 17 · +1 robo por Attack Phase | COMMUNITY_VERIFIED | ✅ |
| **NO reshuffle** al agotar (discard ≠ segunda baraja) | COMMUNITY_VERIFIED | ✅ (pendiente ROM) |
| +3 CC al entrar en Attack Phase (solo atacante) | MANUAL_CONFIRMED | ✅ |
| HAND CHECK: >5 tras la acción → el jugador ELIGE descarte | MANUAL_CONFIRMED | ✅ (fase `discard`) |
| **StatStages persisten toda la batalla** (máx ±3; solo dispel los anula) | MANUAL_CONFIRMED | ✅ (V10) |
| GATHER POWER con duración (FULL→HALF→NORMAL), aparte de Stats | MANUAL_CONFIRMED | ✅ |
| Stage Attack: ventana por distancia (más cerca = más tiempo) | MANUAL_CONFIRMED | ✅ extremos; mixtas HYPOTHESIS |
| Stage fail → A=BANK (daño parcial) · B=REPAIR (continúa) | MANUAL_CONFIRMED + HYPOTHESIS (fórmula/ventanas) | ✅ |
| Defense: sin CHARA; JOINT/LIMIT solo Def/Support; BASIC = Def\|Move | MANUAL_CONFIRMED | ✅ |
| TACTICAL↔ACTION con CORTE DURO (sin fade) | COMMUNITY_VERIFIED | ✅ (V10) |
| Reloj del combate en TICKS 59.7275 Hz | ROM_CONFIRMED | ✅ (gbcMs) |
| Timings de perfiles (beam/melee templates) | INFERRED | ⏳ pendiente FRAME_VERIFIED |
| Patrón IA enemigo (ataques→gather→5-stage→beam) | COMMUNITY_VERIFIED | ✅ (state machine exacta UNKNOWN) |
| El resultado de defensa cambia la película (HIT/BLOCK/AVOID/ABSORB) | INFERRED | ⏳ ramas pendientes |

Detalle completo y notas: `src/battle/evidence.ts` (ejecutable).

## 3. Flujo de fases canónico (máquina objetivo)

```
BATTLE_ENTRY → TACTICAL_FIELD → ROUND_START (SPD) → EXCHANGE 1
  ATTACK_PHASE_ENTER (+3 CC → robo del drawPile si quedan)
    → COMMAND (LIMIT·JOINT·BASIC·CHARA)
      → acción declarada → DEFENSE_SELECT → CALCULATE_OUTCOME
        → CORTE a ACTION → CINEMATIC TIMELINE
          (poses → motion → projectile → CONTACT → hitstop → APPLY_DAMAGE)
        → FIELD_RETURN → HAND_CHECK (>5 → descarte elegido)
  → EXCHANGE 2 (roles invertidos) → ROUND_END → recalcular SPD
```

El commit del daño ocurre en `APPLY_DAMAGE` (impacto), no al final de la
película (fase 3 de la auditoría, implementada en `d86fdf1`).

## 4. Suites de verificación (todas verdes)

```bash
npm run typecheck          # TS estricto
npm run build              # build de producción
npm run verify:gbc         # canon GBC (posiciones, cartas, manifests, V9)
npm run verify:sequences   # 42 perfiles — gramática V2 del contrato
npm run verify:profiles    # perfiles firma registrados
npm run verify:battle      # 71 tests DETERMINISTAS del motor (state + engine)
npm run verify:v9          # catálogo V9 + canon semántico
npm run audit:sprites      # manifests de combate
npm run audit:sheets       # sheets sin cyan
npm run audit:sprite-canon # reporte del canon semántico
npm run release:verify     # gate completo (contenido real + suites + repo limpio)
```

**CI de GitHub**: ejecuta typecheck · verify:profiles · audit:sprites ·
verify:gbc · build — pendiente ampliar con verify:battle · verify:v9 ·
audit:sprite-canon (P1).

## 5. Contenido real verificado por el release gate

- Cartas: 125/125 · Cinemáticas: 125/125 · Música: 20/20 · Formas roster: 48/48
  · SPRITE_DIRS: 48 · Manifests sprites: 44+effects.
- Version real desde `package.json` (0.1.0) — nunca hardcodeada.

## 6. Pendientes priorizados (para continuar el desarrollo)

### P0 (fidelidad — requieren captura forense, no código)
1. **Captura forense frame-a-frame** (BGB/SameBoy): golden corpus de 15 casos
   (3Stage BB/FF/mixtas, fail A/B, MOVE ±push, Gather, Damage hit/block/avoid,
   Beam hit/avoid/absorb) → después medir los 42 perfiles a FRAME_VERIFIED.
2. Confirmar en ROM: reshuffle sí/no · ventanas mixtas del Stage (1.7/2.4) ·
   fórmula del daño parcial del Stage fail · fórmula exacta de IA.

### P1 (código, sin bloqueo)
3. Migración COMPLETA de `main.tsx` al `BattleEngine` (hoy alineado pero con
   su propio flujo de timers).
4. Ramas cinematográficas HIT/BLOCK/AVOID/ABSORB (la defensa cambia la película).
5. SFX del juego final: recibir carta, turn change, A/B feedback, estrella HUD,
   movimiento defensivo.
6. `HUD_ASSET_REGISTRY` como única fuente (el CSS `cmd-*` aún hardcodea URLs).
7. CI de GitHub ampliado (verify:battle, verify:v9, audit:sprite-canon).

### P2 (pasada forense)
8. Medir los 42 perfiles firma individualmente (entry/pose/spawn/contact/
   hitstop/damage/recovery/return).
9. Extraer la IA exacta de la ROM.

## 7. Historial reciente relevante (este ciclo)

| Commit | Contenido |
|---|---|
| `495c7d9`→`bb16f9e` | HUD Studio provisional → motor compartido (battle/state) |
| `0353902` | Auditoría: HAND CHECK stale + descarte + buffs enemigos |
| `d86fdf1` | P0: debuffs con duración · mazo real del enemigo · daño en APPLY_DAMAGE |
| `8e5f926` | BattleEngine (engine.ts) + HUD Studio sobre el mismo controlador + release gate real |
| `ae86f40` | **GBC FIDELITY V10**: no-reshuffle · stats persistentes · stage A/B parcial · deck 20 sin filtrar · reloj en ticks · corte duro · evidence.ts |
| `5c7e6c0` | Icono del stage (id N-2) + legibilidad del HUD superior |
| `b59e433` | Stage rellenado con FitArt (como las cartas) + glitch hover corregido |
