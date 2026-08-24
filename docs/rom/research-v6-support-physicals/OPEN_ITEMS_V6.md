# Open Items after V6 P1

V6 has closed: $2C30/$1266, 48/48 matrix, 48/48 inspection renders, palette
path (CC15; card.byte8 UNLINKED), macros $2B/$2C/$34/$35 literal
(ROM-verified + call-sites), global slot8 audit (1 loader / 2 starts / 0
macros), romCA53 contract with fixtures, generated RomSupportPhysicalVisual
and static RomSupportPresentationProfile. V6 overall is NOT closed yet:

## Closed in this partial

- `$2C30` loader bank/local formula.
- `$1266` table-word descriptor resolution.
- `CC01` normal-card indexing as 1-based card id.
- 48/48 Support descriptor rows.
- Descriptor shape: 2 layout chunks, 30 tiles, 498-byte payload.
- Payload/graphics/layout hashes.
- Payload/graphics aliases: none.
- Layout aliases: #85/#86 and #88/#89.

## Still required for V6 close

- Render all 48 Support physical visuals from ROM graphics/layout bytes.
- Decide whether the 16 layout/control bytes are pure placement data, attrs, or
  a mixed structure by following the exact consumers after `$073F/$0763`.
- Separate palette path per route, including common Support `$FF` path.
- Confirm final VRAM/BG destination and visible composition for each Support
  family, especially `$0B/$0D/$0F`.
- Decode macros `$2B/$2C/$34/$35` literally:

```text
macro
-> opcode
-> ActionObject index
-> animation state
-> waits
-> frame delta
-> motion
-> screen operation
-> audio
-> cleanup
```

- Run final global slot8 audit for Teleport `$28` and Time Freeze `$2A`:

```text
direct starts
indirect wrappers
category dispatchers
macros
special handlers
CHARA
Command/Stage
Support
Defense
```

- Keep `romCA53` numeric. Do not derive semantic outcome from `CA53` alone.
- Do not invent anchors, contact points, ActionObject semantic slot binding, or
  multi-actor absolute binding.


## V6 CLOSED — residuos trasladados a V7 (NO son fallos de V6)

```text
1. $0B/$0D/$0F final WRAM/VRAM/display composition -> V7.1
   (docs/rom/research-v7-support-defense-consumption/LEDGER.md)
2. macro human semantics where binding unproven -> UNRESOLVED
3. card.byte8 -> CC15 -> UNLINKED
```

V6 no se reabre salvo contradicción ROM. Continuación: AGENT_HANDOFF_V7.md
(en esta carpeta) + docs/rom/research-v7-support-defense-consumption/.
