#!/usr/bin/env python3
"""Reduce a raw libmgba scantrace to reviewable, hash-pinned beam evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def ranges(values: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    for value in values:
        if not out or value != out[-1][1] + 1:
            out.append([value, value])
        else:
            out[-1][1] = value
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('raw', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--card-id', type=int, required=True)
    parser.add_argument('--card-name', required=True)
    parser.add_argument('--side', choices=('LEFT', 'RIGHT'), required=True)
    parser.add_argument('--frames', type=int, required=True)
    parser.add_argument('--input', default='')
    parser.add_argument('--bootstrap-sha256', required=True)
    parser.add_argument('--bootstrap', required=True)
    args = parser.parse_args()

    raw_bytes = args.raw.read_bytes()
    samples = json.loads(raw_bytes)['samples']
    by_frame: dict[int, list[dict[str, int]]] = {}
    for sample in samples:
        by_frame.setdefault(sample['frame'], []).append(sample)

    active = [
        frame for frame, rows in sorted(by_frame.items())
        if any(0 <= row['ly'] <= 143 and (row['scx'] or row['scy']) for row in rows)
    ]
    active_ranges = ranges(active)
    reduced_frames: list[dict[str, object]] = []
    for frame in active:
        rows = sorted(
            (row for row in by_frame[frame] if 0 <= row['ly'] <= 143 and (row['scx'] or row['scy'])),
            key=lambda row: row['ly'],
        )
        bands: list[dict[str, int]] = []
        for row in rows:
            if (bands and row['ly'] == bands[-1]['lyEnd'] + 1
                    and row['scx'] == bands[-1]['scx'] and row['scy'] == bands[-1]['scy']):
                bands[-1]['lyEnd'] = row['ly']
            else:
                bands.append({'lyStart': row['ly'], 'lyEnd': row['ly'], 'scx': row['scx'], 'scy': row['scy']})
        representative = rows[0]
        reduced_frames.append({
            'frame': frame,
            'C405': representative['C405'],
            'C406': representative['C406'],
            'C407': representative['C407'],
            'C409': representative['C409'],
            'bands': bands,
        })

    output = {
        'schema': 'dbzlsw.rom.beam-scanline.v1',
        'source': {
            'rom': 'dbz-lsw-spain.gbc',
            'romSha256': 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804',
            'emulator': 'mGBA',
            'emulatorVersion': '0.10.5',
            'driver': 'tools/rom-trace/rom-driver.c scantrace',
            'rawTraceSha256': hashlib.sha256(raw_bytes).hexdigest(),
            'cardId': args.card_id,
            'cardName': args.card_name,
            'side': args.side,
            'input': args.input,
            'framesCaptured': args.frames,
            'bootstrapStateSha256': args.bootstrap_sha256.lower(),
            'bootstrap': args.bootstrap,
        },
        'observed': {
            'activeFrameRanges': active_ranges,
            'restoreFrames': [end + 1 for _, end in active_ranges],
            'frames': reduced_frames,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(f"Reduced {len(samples)} samples to {len(reduced_frames)} active frames: {active_ranges}")


if __name__ == '__main__':
    main()
