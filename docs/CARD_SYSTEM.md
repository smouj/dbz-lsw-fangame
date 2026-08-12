# DBZ LSW — Card System Reference (Mecánicas reales)

Fuente: investigación comunitaria (GameFAQs, legendarysuperwarriors.wordpress.com, Google Sheets).
Este documento es la referencia canónica para implementar los efectos de las 125 cartas.

## Atributos

- **STR** → potencia ataques `Damage`
- **Ki** → potencia ataques `Beam`
- **Speed** → iniciativa y sistema de precisión/evasión
- **Guard** → reduce daño recibido

Buffs estándar: **+8** por uso (acumulables). Debuffs: **−8**.

## Compatibilidad por personaje (implementada en cards.ts)

El campo `compatible` de cada carta indica qué personajes pueden usarla
(`undefined`/vacío = todos los luchadores). Se construyó con tres fuentes:

1. **Mazos oficiales** `STORY_ENEMY_DECKS` (spreadsheet): qué cartas usa cada jefe.
2. **Walkthrough** `LIMIT_DEFAULTS`: qué cartas recomienda equipar a cada personaje.
3. **CSV de ROM** (columna Users): `Users=48` ⇒ sin restricción (todos).

La compatibilidad se aplica en combate:

- La mano inicial y el robo Joint solo dan cartas usables por el personaje activo.
- El pool de ataque de la IA incluye las cartas compatibles con el jefe enemigo
  (antes `!c.compatible` excluía TODAS las cartas de personaje — bug corregido).
- Las curaciones de la IA también filtran por compatibilidad.

Ejemplos derivados: Kamehameha (12) → goku/cell/buu/goten; S.Kamehameha (13) →
buu/cell/cell_jr/ginyu/gohan/goku/vegito; Ene.Absorber (102), Trunks Sword (104),
Champ.Belt (111) y H's Choco. (112) son Users=48 ⇒ todos (antes restringidas).

## Variantes ofensivas implementadas (CARD_SYSTEM.md → código)

- **damage_pierce** (Tail 29): ignora Avoiding/Shockwave; bloqueo parcial ×0.5 sin esquiva.
- **beam_varhp** (Body Change 62): daño ≈ 50% de la HP restante del rival (CONFIRMED_MANUAL).
- **beam_suicide** (Suicide 33): deja al USUARIO con 1 HP tras el ataque.
- **damage_special_team / beam_team** (V-ball Crash 41, P.Comet Z 58, F.Kamehameha 14,
  Purple Comet 57): sin compañero en 2v2 el daño se reduce −40% (HYPOTHESIS).
- **damage_low_acc / damage_special_lowacc** (R.F.B. 55, Rocket Punch 69): la precisión
  de la carta (50%/30%) ya se aplica en el roll.

## Costes CC (verificados contra CSV ROM)

Solo 5 cartas cuestan 0 CC: las cuatro Stage Attacks (1-4) y Special Card (9).
El resto cuesta su CC de la tabla (rango 1-33). La spec antigua que mencionaba
"18 cartas a coste 0" era de la primera versión con errores y NO se implementa.

## Tabla defensiva (interacción táctica)

| Ataque entrante | Defensa apropiada |
|---|---|
| **Beam** | Avoiding / Barrier / Breath / Teleport / Ene.Absorb / Kibito |
| **Damage / Melee** | Shockwave / Taiyoken / Champ. Belt |
| **Beam o Damage, reduciendo daño** | Endurance |
| **Stage/Command Attack** | Time Freeze / Telepathy / Foresight |
| **Buff persistente enemigo** | Sandglass |
| **Taiyoken** | Sunglasses |

## Cartas notables (efectos reales)

| Nº | Carta | Efecto real |
|---|---|---|
| 001-004 | Stage Atk. 3-6 | Secuencia de comandos; +3/+4/+5/+6 CC si se completa |
| 009 | Special Card | Carta/autógrafo "Akira". Coleccionable, sin uso en combate |
| 014 | F. Kamehameha | Pot 60, ataque de equipo Gohan/Goku (requiere compañero) |
| 016 | Resurrection | Cura ~25% HP (mitad si se usa en defensa) |
| 019 | Taiyoken | Anula ataques Damage. Contrarrestado por Sunglasses |
| 023 | Kaio Ken | Duplica STR y Ki de Goku (potencia Damage y Beam) |
| 026 | Teleport | Evita ataques Beam y ciertos Special Defeat |
| 027 | Sup. Saiyan-2 | +8 Ki (potencia Beam) |
| 028 | Sup. Saiyan-3 | +8 STR (potencia Damage) |
| 029 | Tail | Ignora Avoiding/Shockwave; Champ. Belt lo anula; Endurance reduce |
| 033 | Suicide | Pot 70, deja al usuario con 1 HP |
| 041 | V-ball Crash | Special Defeat, Pot 60, técnica de equipo Gotenks |
| 042 | Kiai | −8 Guard enemigo |
| 045 | Barrier | Anula Beam (no Damage) |
| 051 | Paralysis | −8 Speed enemigo |
| 052 | Time Freeze | Hace fallar Stage/Command Attack enemigo (1 CC) |
| 053 | Breath | Anula Beam |
| 055 | R.F.B. Atk. | Pot 35, precisión 50% |
| 057 | Purple Comet | Requiere Jeice+Burter como compañeros |
| 058 | P. Comet Z | Special Defeat, requiere compañero |
| 059 | Speed Up | +8 Speed |
| 062 | Body Change | Daño proporcional a la vida restante del enemigo (~½ HP) |
| 068 | Lock On | "Sure hit" para el siguiente ataque; Sandglass lo elimina |
| 069 | Rocket Punch | Special Defeat, precisión 30% |
| 075 | Life Absorb | El daño causado se convierte en vida del usuario |
| 076 | Ene. Absorb | Absorbe Beam: anula daño y recupera algo de vida |
| 079 | Flesh Guard | +8 Guard (persistente) |
| 080 | Potbelly Atk. | Special Defeat |
| 083 | Bulma | −8 STR enemigo |
| 084 | Chiaotzu | −8 Speed enemigo (60% precisión) |
| 085 | Tien | Daño ligero + Knock Down |
| 086 | Yajirobe | Daño menor + Knock Down |
| 087 | Kaio | −8 Ki enemigo |
| 088 | Dende | Curación fuerte (fracción importante de HP máx.) |
| 089 | Guru | +8 STR y +8 Ki simultáneos |
| 090 | Hercule | Daño mínimo + Knock Down (aéreo) |
| 091 | Supreme Kai | −8 Speed enemigo (más fiable que Chiaotzu) |
| 092 | Kibito | Escudo: siguiente Beam impactado hace 0 daño (persistente, sustituye a Champ. Belt) |
| 093 | Babidi | Elimina power-ups positivos del rival |
| 094 | Dabura | OHKO al 20% de precisión; Reading Ki/Feint NO lo mejoran |
| 095 | Yakon | Cancela estado Gather Power del rival |
| 096 | Scouter | −8 Guard enemigo |
| 097 | Caps. Fridge | +5 CC (coste 1 → neto +4) |
| 098 | Stop Device | OHKO a Androides 16-20 a corta distancia |
| 099 | Life Preser. | Curación menor, barata |
| 100 | Medical Mac. | Anula Attack Power Down (Sealed Ball/Heart Virus) |
| 101 | Gravity Dev. | −Speed enemigo |
| 102 | Ene. Absorber | Drena vida (8 CC según GameFAQs, 9 según StrategyWiki) |
| 103 | Sealed Ball | Attack Power Down enemigo |
| 104 | Trunks Sword | +8 STR |
| 105 | Dabura Spear | +8 STR |
| 106 | Light Vest | +8 Speed |
| 107 | Btl. Jacket | +8 Guard |
| 108 | New B-Jacket | +8 Guard (1 CC menos) |
| 109 | Sunglasses | Inmunidad a Taiyoken (persistente) |
| 110 | Gamebomb | Daño directo; en defensa Protect in Guard |
| 111 | Champ. Belt | Escudo: siguiente Damage hace 0 (sustituye a Kibito) |
| 112 | H's Choco. | Pot 30 en ataque; Protect in Guard en defensa |
| 113 | Heart Virus | Attack Power Down rival |
| 114 | Heart Medi. | Cura Power Down del usuario |
| 115 | Sandglass | Dispel de efectos Support persistentes (Kibito, Champ. Belt, Lock On, Afterimage) |
| 116 | Naughty Book | Potencia oculta (????); daño pequeño en ataque |
| 117 | Full Spirit | +8 Ki |
| 118 | Afterimage | Evasión temporal: daño completo/reducido/nulo según cálculo (probabilístico) |
| 119 | Reading Ki | Accuracy Up para el siguiente Beam/Damage (no afecta Dabura/Stop Device) |
| 120 | Feint | Accuracy Up (similar a Reading Ki) |
| 121 | Endurance | Reduce daño Beam y Damage (no anula) |
| 122 | Telepathy | Hace fallar Command/Stage Attack (1 CC) |
| 123 | Foresight | Hace fallar Command/Stage Attack (1 CC) |
| 124 | Shockwave | Evita completamente Damage/melee |
| 125 | Avoiding | Evita completamente Beam (incl. algunos Special Defeat) |

## Familias de efectos (implementación)

```text
COMMAND
BEAM
DAMAGE
HEAL
STR_UP / STR_DOWN
KI_UP / KI_DOWN
SPEED_UP / SPEED_DOWN
GUARD_UP / GUARD_DOWN
ATTACK_POWER_DOWN
AVOID_BEAM
AVOID_DAMAGE
REDUCE_DAMAGE
ABSORB_BEAM
COMMAND_CANCEL
ACCURACY_UP
EVASION_UP
KNOCK_DOWN
LIFE_DRAIN
CC_RECOVERY
SUPPORT_DISPEL
POWERUP_DISPEL
POWERDOWN_CLEANSE
BEAM_SHIELD
DAMAGE_SHIELD
SPECIAL_DEFEAT
OHKO
ANDROID_KILL
VARIABLE_HP_DAMAGE
TEAM_ATTACK
```

## Fuentes

- GameFAQs Card List (Dark_Goku): https://gamefaqs.gamespot.com/gbc/563077-dragon-ball-z-legendary-super-warriors/faqs/21714
- DBZ LSW Community (WordPress): https://legendarysuperwarriors.wordpress.com/
- Google Sheets Card List: https://docs.google.com/spreadsheets/d/1qAvoQ1Ct6gl_DVPJ8pBWSKLd9iJ-xC5abzfKCTp-29A
- American & European Card Lists (Tumblr): https://legendarysuperwarriors.tumblr.com/post/89783088269/
