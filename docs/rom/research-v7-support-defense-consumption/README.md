# DBZ LSW ROM Research V7 — Support/Defense Presentation Consumption + Runtime Cutover

Estado: `V7_CLOSED — V7.1-V7.8 completados (display pipeline, profiles, compiler, cutovers, Defense, romCA53, RomDisplayPresenter + ROM Display Lab). Siguiente: PLAYABLE ALPHA (AGENT_HANDOFF_PLAYABLE_ALPHA.md).`

V6 queda `CLOSED / STATIC_PHYSICAL_VERIFIED`. V7 contesta: **cómo consume y
compone exactamente cada worker el recurso ya identificado, y cómo lo llevamos
al runtime sin tocar Engine.**

## Estructura del ciclo

```text
V7.0  congelar V6 (residuos trasladados, no ocultados)
V7.1  composición display $0B/$0D/$0F (staging WRAM -> VRAM/BG -> palette -> compose -> cleanup)
V7.2  Support common profiles ($00/$02)          ✅
V7.3  Support compiler                           ✅
V7.4  runtime cutover $00/$02 (determinista)     ✅
V7.5  runtime cutover $0B/$0D/$0F
V7.6  Defense profiles/cutover
V7.7  romCA53 contextual propagation a Presentation
V7.8  Presenter/display validation (Pixi reproduce datos, no reconstruye ROM)
```

## Residuos trasladados desde V6 (NO son fallos de V6)

```text
1. $0B/$0D/$0F final WRAM/VRAM/display composition -> V7.1
2. macro human semantics where binding unproven    -> UNRESOLVED
3. card.byte8 -> CC15                              -> UNLINKED
```

## Frontera

```text
ROM physical data
-> Presentation program
-> display composition
-> BattleTimeline
-> Pixi
```

Sin tracer: ACTOR_HOME/TARGET_HOME/CONTACT_POINT/slot binding/multi-actor
siguen PENDING_ROM_TRACE y NO se necesitan para V7.
