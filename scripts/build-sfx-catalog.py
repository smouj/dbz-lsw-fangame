#!/usr/bin/env python3
"""Genera src/data/generated/sfxCatalog.generated.ts desde docs/audio/sfx_catalog.json
Uso: python3 scripts/build-sfx-catalog.py  (npm run canon:sfx)"""
import json, os

SRC = 'docs/audio/sfx_catalog.json'
OUT = 'src/data/generated/sfxCatalog.generated.ts'
os.makedirs(os.path.dirname(OUT), exist_ok=True)

cat = json.load(open(SRC))
assert len(cat) == 85, f"esperados 85 SFX, hay {len(cat)}"

lines = []
lines.append('// ═══════════════════════════════════════════════════════════════════════')
lines.append('// GENERADO — NO EDITAR A MANO (npm run canon:sfx → scripts/build-sfx-catalog.py)')
lines.append('// Catálogo canónico de efectos de sonido GBC extraídos de la ROM')
lines.append('// (banco 0x79, tabla SE, 85 IDs 0x00-0x54). SHA-256 ROM:')
lines.append('// 8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee')
lines.append('// ═══════════════════════════════════════════════════════════════════════')
lines.append('')
lines.append('export interface SfxCatalogEntry {')
lines.append('  sfxId: number;')
lines.append('  key: string;            // clave estable gbc_sfx_NNN (NO renombrar por intuición)')
lines.append('  channel: \'CH2_PULSE\' | \'CH4_NOISE\';')
lines.append('  durationFrames: number;')
lines.append('  durationSeconds: number;')
lines.append('  endedNaturally: boolean;')
lines.append('  sustainedOrLoopingCandidate: boolean;')
lines.append('  sequenceSha256: string;')
lines.append('  sequenceCpuAddress: string;')
lines.append('  sequenceBytes: number;')
lines.append('  apuWrites: number;')
lines.append('  file: string;           // WAV en public/assets/audio/sfx/')
lines.append('  vgm: string;')
lines.append('}')
lines.append('')
lines.append('export const SFX_CATALOG: SfxCatalogEntry[] = [')
for e in cat:
    lines.append(f"  {{ sfxId: {e['sfx_id']}, key: 'gbc_sfx_{e['sfx_id']:03d}', channel: '{e['channels']}', durationFrames: {e['duration_frames']}, durationSeconds: {e['duration_seconds']}, endedNaturally: {str(e['ended_naturally']).lower()}, sustainedOrLoopingCandidate: {str(e['looping_or_long']).lower()}, sequenceSha256: '{e['sequence_sha256']}', sequenceCpuAddress: '{e['sequence_cpu_address']}', sequenceBytes: {e['sequence_bytes']}, apuWrites: {e['apu_writes']}, file: 'audio/sfx/sfx_{e['sfx_id']:03d}.wav', vgm: 'docs/audio/vgm_sfx/sfx_{e['sfx_id']:03d}.vgm' }},")
lines.append(']')
lines.append('')
lines.append('export const SFX_BY_KEY: Record<string, SfxCatalogEntry> = Object.fromEntries(SFX_CATALOG.map(e => [e.key, e]));')
lines.append('export const SFX_BY_ID: Record<number, SfxCatalogEntry> = Object.fromEntries(SFX_CATALOG.map(e => [e.sfxId, e]));')
lines.append('')
open(OUT, 'w').write('\n'.join(lines))
print(f"✓ {OUT} ({len(cat)} entradas)")
