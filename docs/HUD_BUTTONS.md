# HUD de batalla — Botones GBC auténticos

Referencia de los sprites de botones del GBC (DBZ Legendary Super Warriors) usados
en el HUD inferior del remake, con su mapeo a las acciones del juego.

## Assets

Todos en `public/assets/ui/hud_buttons/` — 48×40 px extraídos de la ROM (ZIP del
usuario, paquete `extra_*`), usados con `image-rendering: pixelated`.

| Archivo | Nombre en el sprite | Color | Uso |
|---|---|---|---|
| `btn_basic.png` | BASIC | naranja | Comando B · fuente BASIC DEFENSE |
| `btn_joint.png` | JOINT | verde | Comando J · fuente JOINT DEFENSE |
| `btn_limit.png` | LIMIT | azul | Comando L · fuente LIMIT DEFENSE |
| `btn_chara.png` | CHARA | cian | Comando C (2v2) |
| `btn_guard.png` | GUARD | naranja | Acción DEFEND (defensa básica) |
| `btn_move.png` | MOVE | naranja | Acción MOVE (defensa básica) |
| `btn_power.png` | POWER | naranja | GATHER POWER (menú básico de ataque) |
| `btn_team.png` | TEAM | naranja | Reservado (no cableado) |
| `btn_list.png` | LIST | naranja | Reservado (no cableado) |
| `frame_orange.png` | — | naranja | STAGE ATTACK (texto superpuesto) |
| `frame_teal.png` | — | celeste | Botones BACK |
| `no_card_red.png` | NO CARD | rojo | Slot de mano vacío |

## Reglas de integración

1. **Escala**: 1.5× en el `command-strip` (72×60) para que quepa en la bandeja
   inferior sin sobresalir (`battle-controls` tiene `height: auto`).
2. **Especificidad CSS**: la regla base `.command-strip button` (0,1,1) define
   `--btn-frame`; las variantes deben escribirse `button.cmd-limit` etc. (0,2,1)
   para ganar la cascada. Igual para `.basic-btn.*`.
3. **Nombre dentro del sprite**: los botones con nombre (BASIC/JOINT/LIMIT/CHARA/
   GUARD/MOVE/POWER) NO llevan texto superpuesto — el sprite ya lo incluye.
   `frame_orange`/`frame_teal` sí llevan texto HTML porque son marcos vacíos.
4. **Tooltips**: la descripción de cada botón vive en `data-tip` (tooltip global
   en portal), nunca dentro del botón.

## Historial

- `cc5d8ba` — botones con nombre integrados en todo el HUD (command-strip,
  defensa, submenús); eliminados los marcos vacíos sin uso.
- `0d86fe8` — fix especificidad CSS del marco + tooltip global en portal.
- `a910778` — primer rediseño de la bandeja inferior (escala 1.5×, tooltips).
- `011a7a1` — primeros sprites GBC (frames) + orden de defensa GBC.
