# Changelog

Todos los cambios notables en `dbz-lsw-fangame`. Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [Unreleased]

## [2026-08-13] — Movement de 2 ejes + robo de carta animado + director cinematográfico

### Movement canónico (manual GBC §9)
- **MOVE con SOLO 2 ejes** (`e969041` + `44e3dcc`): desaparecen los 4 botones
  de posición directa. Ahora hay HORIZONTAL ↔ (FRONT/BACK) y VERTICAL ↕
  (AIR/GROUND); cada uno transforma UN eje y conserva el otro. Imposible
  teletransporte diagonal (Air/Back → Ground/Front requiere 2 acciones).
- `moveHorizontal()` / `moveVertical()` / `applyMoveAxis()` en `positions.ts`.
- **Preview CURRENT → RESULT** al pasar el cursor sobre cada eje (sin confirmar):
  `GROUND / BACK ↔ GROUND / FRONT`. Hover solo con puntero (sin layout shift).
- **Empuje Front/Back SOLO en eje horizontal** (manual §9): al avanzar a FRONT
  con rival en BACK, el rival pasa a FRONT. Vertical jamás toca Front/Back.
- i18n: 3 keys nuevas (`battle.chooseAxis` / `axisHorizontal` / `axisVertical`)
  en los 10 idiomas.

### Robo de carta animado (manual GBC)
- **+1 carta al entrar en Attack Phase** (confirmado por LP del GBC original:
  "draw one in every Attack Phase"). Máx 6 transitorio / 5 persistente.
- **Animación de robo**: la carta sale del mazo (fuera de pantalla, borde
  inferior-izquierdo) y se desliza con flip 3D hasta la mano (~460ms),
  con SFX propio (`Sfx.draw`: fricción de mazo + tono al aterrizar).
  La carta se añade a la mano SOLO al terminar la animación.
- Solo cartas compatibles con el personaje activo (`cardUsableBy`).

### Director cinematográfico
- `src/battle/timeline.ts` + `profiles.ts` + `spriteSemantics.ts` +
  `debugCinematics.ts`: reloj ÚNICO determinista en frames GBC; cada carta
  declara su cinematografía (beam 54+54+44, rush 50+44+38, support 118);
  `playCardCinematic` migrado al timeline (sin setTimeout como autoridad).
- Fix: `PROJECTILE action:'rush'` y `HIT_FRAME` ahora avanzan el step CSS
  (attacker→travel→target).

## [2026-08-12] — Pulido de combate, HUD GBC auténtico y datos ROM

### Fixes
- **Orden de defensa GBC** (`011a7a1`): el defensor elige su defensa ANTES de que
  se anime el ataque. Antes el enemigo animaba y luego se pedía defensa.
- **Timing de cinemática** (`b0a273d`): los pasos GBC ahora cubren las animaciones
  CSS completas (damage attacker 44→50f, travel 32→44f, beam travel 50→54f) — las
  animaciones ya no se cortan a mitad (efecto "brusco").
- **Compatibilidad de cartas aplicada** (`257cc25`): la IA excluía TODAS las cartas
  de personaje del pool de ataque (`!c.compatible`) — los jefes nunca usaban sus
  cartas firma. Ahora filtran por el personaje enemigo.
- **IDs de androides normalizados** (`abb3dc3`): `no16..no20`/`celljr` → `android_16..20`/
  `cell_jr` (rompía getCharacter, compatibilidad de IA y carga de límites).
- **Mazos iniciales** (`abb3dc3`): reconstruidos solo con cartas genéricas (Users=48)
  — antes quedaban 9-14/20 usables tras el filtro de compatibilidad.
- **Facing Trunks Kid SSJ** (`abb3dc3`): `kid_trunks_super_saiwan` golpea a la
  izquierda (verificado visualmente) y necesitaba flip.
- **BaseFormId** (`abb3dc3`): mapa explícito (antes devolvía ids inexistentes como
  `frieza_base`).
- **Botones GBC** (`0d86fe8`): fix de especificidad CSS — `.command-strip button`
  (0,1,1) pisaba `--btn-frame` de las variantes (0,1,0); ahora `button.cmd-limit`
  etc. (0,2,1). Texto oscuro sobre interior claro (antes blanco sobre blanco).
- **Tooltip** (`0d86fe8`): migrado a portal React (`createPortal` al body,
  `position:fixed`, z-index 10000) — ya no se corta por overflow ni se esconde
  bajo otros elementos; se adapta arriba/abajo según el espacio.

### Features
- **Estados de batalla en HUD** (`ed596ff`): fila `.hud-status` con chips de
  buff/debuff/guard/power/acc/eva/lock para ambos luchadores; SPD con stages.
- **Tooltips de carta** (`ed596ff`): efecto + compatibilidad en `data-tip`.
- **Variantes ofensivas** (`011a7a1`): Tail pierce ignora Avoid, Body Change ≈50%
  HP rival, Suicide deja a 1 HP, team attacks −40% sin compañero.
- **Botones GBC con nombre** (`cc5d8ba`): btn_basic/joint/limit/chara/guard/move/
  power (48×40 de la ROM, nombre dentro del sprite) en command-strip, defensa y
  submenús.
- **Datos ROM completos** (`257cc25`): 48 formas = ROM (Gohan Super2, Trunks Ksuper,
  Piccolo Evil añadidos; frieza_100 duplicado eliminado); Vegito en CHARACTERS;
  sprites goku_ssj2 → `goku_super_saiyan_2`, ginyu_goku → `ginyu_gokus_body`.
- **Cinemática lateral** (`205ef45`): el sprite grande entra centrado y se coloca
  a su lado antes del lanzamiento/rush.
- **Motion feel** (`c40b54d`): paso FIELD RETURN, tiempos de presentación más
  largos, easing stepped GBC, sin escalado de sprites.

### Docs
- `docs/GAMEPLAY_HUD_AND_START_FLOW.md` — contrato de HUD/flujo actualizado
  (botones GBC, tooltips, estados, timing de cinemática).
- `docs/BATTLE_ENGINE_SPEC.md` — orden de defensa GBC + tabla de timing ACTION.
- `docs/CARD_SYSTEM.md` — compatibilidad por personaje (3 fuentes) y variantes
  ofensivas.
- `docs/HUD_BUTTONS.md` — nueva referencia de los sprites de botones.
- `README.md` — estado real (24 personajes, 48 formas, 32 capítulos).

## [2026-08-11] — Estabilización de flujo inicial

- `c83fb99` — HUD v3, CC dock abajo-derecha, flujo inicial Gohan vs Piccolo,
  Battle Mode abre con Piccolo.
- `53f7f3e` — paneles de Deck/Cards estabilizados.
- `63b174f` / `83395a9` — handoff visual y vulnerabilidad por posición.
- `e559b7f` — facing por spriteDir (NATIVE_STRIKE_DIR).
- `a8bf3d2` — coreografía de cartas estilo GBC (attacker → travel → target).
- `5f562ac` — sprites de combate V5 atómicos (43 dirs + manifest).
- `858c427` / `08eae86` / `d896c87` / `2685703` / `e121c36` / `6271bc9` — hover
  estable, diseño tokenizado, menú principal rediseñado.
