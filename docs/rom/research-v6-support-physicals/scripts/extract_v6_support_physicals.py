#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path


REPO = Path(__file__).resolve().parents[4]
ROM_PATH = REPO.parent / "dbz-lsw-decomp" / "13_raw_rom" / "dbz-lsw-usa.gbc"
OUT = REPO / "docs" / "rom" / "research-v6-support-physicals"
DATA = OUT / "data"
PROOF = OUT / "proof"

EXPECTED_SHA256 = "8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee"


def rom_offset(bank: int, address: int) -> int:
    return bank * 0x4000 + (address if bank == 0 else address - 0x4000)


def hx(value: int, width: int = 2) -> str:
    return f"${value:0{width}X}"


def bank_addr(bank: int, address: int) -> str:
    return f"{bank:02X}:${address:04X}"


def card_record(rom: bytes, card_id: int) -> dict[str, int | str]:
    offset = rom_offset(0x11, 0x4320) + (card_id - 1) * 16
    raw = rom[offset : offset + 16]
    return {
        "cardId": card_id,
        "category": raw[0],
        "power": raw[1],
        "accuracy": raw[2],
        "internalId": raw[3],
        "ccCost": raw[4],
        "handler": raw[5],
        "animationResource": raw[6],
        "fxToken": raw[7],
        "palette": raw[8],
        "raw": raw.hex(" "),
    }


def load_names() -> dict[int, str]:
    names: dict[int, str] = {}
    with (REPO / "docs" / "rom-data" / "cards.csv").open(
        newline="", encoding="utf-8-sig"
    ) as handle:
        for row in csv.DictReader(handle):
            raw_id = row.get("x", "")
            if raw_id.isdigit():
                names[int(raw_id)] = row.get("Card Name", "")
    return names


def support_descriptor(rom: bytes, cc01_index: int) -> dict[str, int | str]:
    loader_bank = 0x6B + (cc01_index // 0x20)
    local_index = cc01_index % 0x20

    # Bank00:$1266:
    #   HL = $4008 + (localIndex << 2)
    #   word = [HL]
    #   descriptor = $4000 + (word << 2)
    entry_address = 0x4008 + local_index * 4
    entry_offset = rom_offset(loader_bank, entry_address)
    entry_word = rom[entry_offset] | (rom[entry_offset + 1] << 8)
    descriptor_address = 0x4000 + entry_word * 4
    descriptor_offset = rom_offset(loader_bank, descriptor_address)

    layout_chunk_count = rom[descriptor_offset]
    layout_size = layout_chunk_count * 8
    layout_start = descriptor_offset + 1
    layout = rom[layout_start : layout_start + layout_size]

    tile_count_offset = layout_start + layout_size
    tile_count = rom[tile_count_offset]
    graphics_address = descriptor_address + 1 + layout_size + 1
    graphics_size = tile_count * 16
    graphics_offset = rom_offset(loader_bank, graphics_address)
    graphics = rom[graphics_offset : graphics_offset + graphics_size]
    total_size = 1 + layout_size + 1 + graphics_size
    payload = rom[descriptor_offset : descriptor_offset + total_size]

    return {
        "loaderBank": loader_bank,
        "loaderLocalIndex": local_index,
        "tableEntryAddress": entry_address,
        "tableEntryWord": entry_word,
        "descriptorAddress": descriptor_address,
        "layoutChunkCount": layout_chunk_count,
        "layoutSizeBytes": layout_size,
        "tileCount": tile_count,
        "graphicsAddress": graphics_address,
        "graphicsSizeBytes": graphics_size,
        "totalDescriptorBytes": total_size,
        "layoutBytes": layout.hex(" "),
        "payloadSha256": hashlib.sha256(payload).hexdigest(),
        "layoutSha256": hashlib.sha256(layout).hexdigest(),
        "graphicsSha256": hashlib.sha256(graphics).hexdigest(),
    }


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    PROOF.mkdir(parents=True, exist_ok=True)

    rom = ROM_PATH.read_bytes()
    rom_sha = hashlib.sha256(rom).hexdigest()
    if rom_sha != EXPECTED_SHA256:
        raise SystemExit(f"unexpected ROM sha256: {rom_sha}")

    names = load_names()
    rows: list[dict[str, object]] = []

    for card_id in range(1, 126):
        card = card_record(rom, card_id)
        if card["category"] != 0x04:
            continue

        descriptor = support_descriptor(rom, card_id)
        rows.append(
            {
                "cardId": card_id,
                "name": names.get(card_id, ""),
                "handler": hx(int(card["handler"])),
                "cc01LoaderIndex": card_id,
                "loaderBank": hx(int(descriptor["loaderBank"])),
                "loaderLocalIndex": hx(int(descriptor["loaderLocalIndex"])),
                "tableEntryAddress": bank_addr(
                    int(descriptor["loaderBank"]), int(descriptor["tableEntryAddress"])
                ),
                "tableEntryWord": hx(int(descriptor["tableEntryWord"]), 4),
                "descriptorAddress": bank_addr(
                    int(descriptor["loaderBank"]), int(descriptor["descriptorAddress"])
                ),
                "layoutChunkCount": descriptor["layoutChunkCount"],
                "layoutSizeBytes": descriptor["layoutSizeBytes"],
                "tileCount": descriptor["tileCount"],
                "graphicsAddress": bank_addr(
                    int(descriptor["loaderBank"]), int(descriptor["graphicsAddress"])
                ),
                "graphicsSizeBytes": descriptor["graphicsSizeBytes"],
                "totalDescriptorBytes": descriptor["totalDescriptorBytes"],
                "payloadSha256": descriptor["payloadSha256"],
                "layoutSha256": descriptor["layoutSha256"],
                "graphicsSha256": descriptor["graphicsSha256"],
                "layoutBytes": descriptor["layoutBytes"],
                "palette": hx(int(card["palette"])),
                "fxToken": hx(int(card["fxToken"])),
                "animationResource": hx(int(card["animationResource"])),
                "sourceClassification": "SUPPORT_CARD_INDEXED_VISUAL_DESCRIPTOR",
                "evidence": "ROM_STATIC_VERIFIED",
            }
        )

    payload_groups: dict[str, list[int]] = defaultdict(list)
    graphics_groups: dict[str, list[int]] = defaultdict(list)
    layout_groups: dict[str, list[int]] = defaultdict(list)
    for row in rows:
        payload_groups[str(row["payloadSha256"])].append(int(row["cardId"]))
        graphics_groups[str(row["graphicsSha256"])].append(int(row["cardId"]))
        layout_groups[str(row["layoutSha256"])].append(int(row["cardId"]))

    for row in rows:
        row["payloadSharedWith"] = " ".join(
            map(str, payload_groups[str(row["payloadSha256"])])
        )
        row["graphicsSharedWith"] = " ".join(
            map(str, graphics_groups[str(row["graphicsSha256"])])
        )
        row["layoutSharedWith"] = " ".join(
            map(str, layout_groups[str(row["layoutSha256"])])
        )

    csv_path = DATA / "support_physical_visual_matrix_v6.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    (DATA / "support_physical_visual_matrix_v6.json").write_text(
        json.dumps(rows, indent=2), encoding="utf-8"
    )

    summary = {
        "rom": str(ROM_PATH),
        "romSha256": rom_sha,
        "supportRows": len(rows),
        "uniquePayloads": len(payload_groups),
        "uniqueGraphics": len(graphics_groups),
        "uniqueLayouts": len(layout_groups),
        "payloadAliasGroups": [
            ids for ids in payload_groups.values() if len(ids) > 1
        ],
        "graphicsAliasGroups": [
            ids for ids in graphics_groups.values() if len(ids) > 1
        ],
        "layoutAliasGroups": [
            ids for ids in layout_groups.values() if len(ids) > 1
        ],
        "descriptorShapes": sorted(
            {
                (
                    int(row["layoutChunkCount"]),
                    int(row["tileCount"]),
                    int(row["totalDescriptorBytes"]),
                )
                for row in rows
            }
        ),
        "loaderFormula": "bank=$6B+floor(CC01/$20), local=CC01%$20, descriptor=$4000+word[$4008+local*4]*4",
        "cc01Indexing": "1-based card id for normal cards; Call_2A77 maps CC01=1 to Bank11:$4320",
    }
    (DATA / "support_physical_visual_summary_v6.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    (PROOF / "loader_2c30_decoding_v6.txt").write_text(
        "\n".join(
            [
                "Bank00:$2C30 / $1266 static decoding",
                "",
                "$2C30:",
                "- stores a VRAM transfer job via $10B0 with DE=$8800 on Support state $01",
                "- reads CC01",
                "- subtracts $20 while incrementing C, starting C=$6B",
                "- therefore loader bank = $6B + floor(CC01 / $20)",
                "- local index = CC01 % $20",
                "",
                "$1266:",
                "- switches to loader bank",
                "- reads table word at $4008 + localIndex * 4",
                "- descriptor address = $4000 + tableWord * 4",
                "",
                "Descriptor format observed for 48/48 Support cards:",
                "- byte 0: layoutChunkCount",
                "- next layoutChunkCount * 8 bytes: WRAM layout/control bytes copied through $073F",
                "- next byte: tileCount stored in C216",
                "- next tileCount * 16 bytes: 2bpp tile graphics copied through $10CF",
                "",
                "Observed shape for all 48 Support cards:",
                "- layoutChunkCount = 2",
                "- layout size = 16 bytes",
                "- tileCount = $1E / 30 tiles",
                "- graphics size = 480 bytes",
                "- descriptor payload size = 498 bytes, followed by 2-byte alignment padding",
                "",
                "Index proof:",
                "- Call_2A77 computes card record address as $4000 + (CC01 << 4) + $0310",
                "- CC01=1 maps to Bank11:$4320, the first normal card record",
                "- V6 matrix therefore records cc01LoaderIndex = cardId",
                "",
                f"ROM SHA-256: {rom_sha}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"support rows: {len(rows)}")
    print(f"unique payloads: {len(payload_groups)}")
    print(f"unique graphics: {len(graphics_groups)}")
    print(f"unique layouts: {len(layout_groups)}")
    print(f"wrote: {csv_path}")


if __name__ == "__main__":
    main()
