# ROM CGB Palette Extraction Report

Source: ROM España `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`

## Contract

- Bank: `$30`
- Table CPU address: `$6E00`
- File offset formula: `bank*0x4000 + (cpuAddress-0x4000)`
- Entries: `256/256`
- Bytes: `2048/2048`
- Filtered all-00/all-FF entries: `0`

## Cross-checks

| index | CPU | file offset | raw bytes | BGR555 | RGB raw |
| --- | ---: | ---: | --- | --- | --- |
| 0x00 | 0x6e00 | 0xc2e00 | 00 00 7f 57 16 7c a5 14 | 0000 577f 7c16 14a5 | #000000 #FFDEAD #B500FF #292929 |
| 0x2c | 0x6f60 | 0xc2f60 | ff 7f 14 7f 2a 7e 60 7d | 7fff 7f14 7e2a 7d60 | #FFFFFF #A5C6FF #528CFF #005AFF |
| 0x2d | 0x6f68 | 0xc2f68 | ff 7f 1f 53 3f 2a 7f 01 | 7fff 531f 2a3f 017f | #FFFFFF #FFC6A5 #FF8C52 #FF5A00 |
| 0x2e | 0x6f70 | 0xc2f70 | ff 7f da 72 b6 65 b2 5c | 7fff 72da 65b6 5cb2 | #FFFFFF #D6B5E7 #B56BCE #9429BD |
| 0x2f | 0x6f78 | 0xc2f78 | ff 7f fe 66 fd 51 fd 3c | 7fff 66fe 51fd 3cfd | #FFFFFF #F7BDCE #EF7BA5 #EF397B |
| 0x30 | 0x6f80 | 0xc2f80 | ff 7f aa 7a 14 7f 40 7a | 7fff 7aaa 7f14 7a40 | #FFFFFF #52ADF7 #A5C6FF #0094F7 |
| 0x31 | 0x6f88 | 0xc2f88 | ff 7f 3f 42 3f 63 5f 25 | 7fff 423f 633f 255f | #FFFFFF #FF8C84 #FFCEC6 #FF524A |
| 0x32 | 0x6f90 | 0xc2f90 | ff 7f d6 69 da 72 f3 60 | 7fff 69d6 72da 60f3 | #FFFFFF #B573D6 #D6B5E7 #9C39C6 |
| 0x33 | 0x6f98 | 0xc2f98 | ff 7f 9e 2a 3e 53 1f 02 | 7fff 2a9e 533e 021f | #FFFFFF #F7A552 #F7CEA5 #FF8400 |
| 0x35 | 0x6fa8 | 0xc2fa8 | ff 7f 3e 5a fe 6a 7f 4d | 7fff 5a3e 6afe 4d7f | #FFFFFF #F78CB5 #F7BDD6 #FF5A9C |
| 0xff | 0x75f8 | 0xc35f8 | 06 06 15 1e 1e 75 75 57 | 0606 1e15 751e 5775 | #318408 #AD8439 #F742EF #ADDEAD |

## Generated Outputs

- `src/data/generated/romCgbPaletteTable.generated.ts`
- `src/data/generated/romFighterPaletteBindings.generated.ts`
- `src/data/generated/romOffensiveFxPaletteBindings.generated.ts`
- `src/data/generated/romFighterPalettes.generated.ts` compatibility view
- `docs/rom/generated/palettes/rom_cgb_palette_table.csv/json`
- `docs/rom/generated/palettes/fighter_palette_bindings_48.csv/json`
- `docs/rom/generated/palettes/offensive_fx_palette_bindings.csv/json`

## Binding Summary

- Fighter form palette bindings: `48/48`
- Offensive beam FX palette bindings: `38/38`
- Manual palette overrides: `0`
- Non-ROM palette derivations: `0`
