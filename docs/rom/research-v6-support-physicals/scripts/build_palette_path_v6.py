#!/usr/bin/env python3
"""V6.3c — SUPPORT_PALETTE_PATH_48.csv generation.

Demostrated facts (static ROM):
  - Bank00:$36CA: E = palette index -> HL = Bank30:$6E00 + E*8 -> copies 8 bytes
    (4x BGR555) into the WRAM palette buffer. No $FF == NONE check: $FF resolves
    to Bank30:$75F8 (4 real colors). (V5 + re-verified this session.)
  - CC15 (presentation palette selection) writers in the whole ROM:
      Bank01:$736E -> $31 (CHARA)
      Bank01:$7B82 -> $33 (Gather Power)
      Bank03:$5EAE -> $31 (action-scene default)
  - Support common palette readers: Bank03:$6740 / Bank03:$67CC
      (LD A,($CC15); LD E,A; ... CALL $36CA).
  - Card record byte8 (palette byte) is copied to WRAM $CC0D+8 via the generic
    card-record copy (Bank00:$2AA7 -> CALL $2A77 -> CALL $0FDA, 16 bytes).
  - NOT demonstrated: card.byte8 feeding CC15 on the Support route. The known
    CC15 writers are $31/$33 constants. So the effective palette index for the
    card-indexed visual remains CC15_PRESENTATION_STATE (default $31) and the
    card.byte8 link is UNLINKED_CARD_BYTE8.
This CSV does not invent a per-card palette binding.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
OUT = REPO / "docs" / "rom" / "research-v6-support-physicals"
DATA = OUT / "data"

rows = json.loads((DATA / "support_physical_visual_matrix_v6.json").read_text())

CC15_WRITERS = [
    {"address": "01:$736E", "value": "$31", "context": "CHARA"},
    {"address": "01:$7B82", "value": "$33", "context": "Gather Power"},
    {"address": "03:$5EAE", "value": "$31", "context": "action-scene default (non $33/$3C/$3D/$46/$47 states)"},
]

with (OUT / "SUPPORT_PALETTE_PATH_48.csv").open("w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(
        [
            "cardId",
            "name",
            "handler",
            "cardPaletteByte",
            "cardPaletteByteDest",
            "cc15WriterValue",
            "cc15WriterAddress",
            "effectivePaletteIndex",
            "paletteLoadHelper",
            "paletteSourceAddress",
            "paletteSlotHint",
            "cardByte8ToCc15Link",
            "evidence",
        ]
    )
    for r in rows:
        card_id = int(r["cardId"])
        handler = str(r["handler"])
        palette_byte = str(r["palette"])
        # Known CC15 writers are constants, not per-card. For cards whose handler
        # family is the common Support worker, the CC15 value observed at the
        # common palette read is the presentation state (default $31).
        cc15_value = "$31"
        cc15_addr = "03:$5EAE"
        effective = "CC15_PRESENTATION_STATE(default $31)"
        link = "UNLINKED_CARD_BYTE8"
        evidence = (
            "Bank03:$6740/$67CC read CC15 -> $36CA (Bank30:$6E00+idx*8, 8B BGR555); "
            "CC15 writers only 01:$736E=$31, 01:$7B82=$33, 03:$5EAE=$31; "
            "card.byte8 copied to WRAM $CC0D+8 via Bank00:$2AA7/$0FDA"
        )
        w.writerow(
            [
                card_id,
                r["name"],
                handler,
                palette_byte,
                "$CC0D+8",
                cc15_value,
                cc15_addr,
                effective,
                "Bank00:$36CA",
                "Bank30:$6E00 + idx*8",
                "WRAM palette buffer ($C600+B*8; Support passes B=$06,C=$05)",
                link,
                evidence,
            ]
        )

print("wrote SUPPORT_PALETTE_PATH_48.csv")
print("CC15 writers:", CC15_WRITERS)
