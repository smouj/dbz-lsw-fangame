# AGENT_HANDOFF_V7 — Support/Defense Presentation Consumption + Runtime Cutover

V6 queda `CLOSED / STATIC_PHYSICAL_VERIFIED`. Este handoff abre V7.

## Qué NO reabrir (V5/V6 frozen)

- category+handler, BG $19, BG $1A=CHARA/Gather, palette $FF path-scoped,
  HOLD120, Move net0, slot8 preload boundary, CA83 mapping, Sunglasses↔Taiyoken,
  CA83 $40 suppression, `$2C30`, `$1266`, matriz/renders 48/48, aliases
  SAME_LAYOUT, macros literales, slot8 audit global, romCA53 contract.

## Residuos explícitos (trasladados, no ocultados)

```text
1. $0B/$0D/$0F final WRAM/VRAM/display composition -> V7.1
2. macro human semantics where binding unproven    -> UNRESOLVED
3. card.byte8 -> CC15                              -> UNLINKED
```

## Lo que ya está cerrado en V7

- **V7.1 (parcial)**: FSM completa de workers $0B/$0D/$0F; CA53 gate en $0B
  state $0D (CA53==0→$1E, ≠0→$14); staging $2C30 (layout→WRAM $C600/$C680
  doble buffer toggle $C417, tileCount→$C216, graphics→VRAM $8800 vía
  $10B0/$10CF); contrato $3E7F/$3E8B/$3E5E/$3E92/$3F18/$3F60/$39CF.
- **V7.2**: `supportCommonProfile(cardId)` → `{family:'SUPPORT_COMMON',
  cardVisual, fixedBg:{resource:0x19}, holdTicks:120, palette, macro[],
  provenance:'ROM_PRESENTATION'}`. No es una película semántica.
- **V7.3**: `compileRomSupportPresentation()` → BattleTimeline ROM-backed.
- **V7.4**: `verify:rom-support-presentation-compiler` — determinismo,
  BG19+HOLD120 en 26 cartas $00/$02, 48/48 SUPPORT_VISUAL_LOAD, 0 cues que
  muten Engine, palette $FF nunca NONE.

## Siguiente trabajo (en orden)

```text
V7.1 close: seguir el job de transferencia VRAM ($C211+ / VBlank) y los
            escritores de tilemap BG ($9800) para identificar el compose
            exacto del card-indexed visual en $0B/$0D/$0F.
V7.5 runtime cutover $0B/$0D/$0F
V7.6 Defense profiles/cutover (slot8 preload; 1 loader / 2 starts)
V7.7 propagar semanticOutcomeForCA53 hasta Presentation
V7.8 Presenter/display validation (Pixi recibe datos, no reconstruye ROM)
```

## Reglas

- Engine/EventLog intactos.
- No anchors, no slot bindings, no nombres humanos no demostrados.
- No convertir `CA53=2` en MISS por switch.
- No reproducir AnimationResource automáticamente (Kiai/Paralysis,
  Teleport/TimeFreeze).
- Los cues ROM describen; nunca disparan postActionMaintenance (§193).
