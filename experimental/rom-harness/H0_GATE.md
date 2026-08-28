# H0 GATE — tabla de viabilidad

Rellenar únicamente tras cada prueba real. No marcar PASS sin evidencia.

| Check | Estado |
|---|---|
| ROM LOAD | ⬜ |
| WASM CORE | ⬜ |
| FRAME STEP | ⬜ |
| FRAMEBUFFER | ⬜ |
| INPUT A/B/DPAD | ⬜ |
| WRAM ACCESS | ⬜ |
| VRAM ACCESS | ⬜ |
| OAM ACCESS | ⬜ |
| IO ACCESS | ⬜ |
| BATTLE DETECTION | ⬜ |
| HP READ | ⬜ |
| CC READ | ⬜ |
| ACTIONOBJECT LIVE READ | ⬜ |
| SCX/SCY LIVE READ | ⬜ |
| SAVE STATE | ⬜ |
| LOAD STATE | ⬜ |
| DETERMINISTIC RESTORE | ⬜ |
| PERFORMANCE BLOCKER | ⬜ |

## Conclusión

`HARNESS_FEASIBLE` / `HARNESS_NOT_FEASIBLE` — **aún sin determinar.**

## Evidencia requerida por ítem

- ROM LOAD: hash verificado + arranque OK.
- FRAMEBUFFER: captura real del GBC corriendo.
- INPUT: acción desencadenada por joypad, no por write8.
- BATTLE/HP/CC/ActionObject/SCX: snapshot leído desde WRAM en vivo.
- SAVE/LOAD/DETERMINISTIC: state A → avanzar 120 frames → state B → load(A)
  → mismos valores observables (framebuffer hash + battle block + SCX/SCY).
