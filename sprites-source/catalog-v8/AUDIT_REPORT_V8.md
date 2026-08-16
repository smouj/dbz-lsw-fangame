# DBZ LSW SPRITES — V8 CATALOGUED / ACTION-SEQUENCE PACKAGE

Baseline GitHub: `349e54824d397a47df4fa7d615cde1ef5a8e2241`

## Resultado
- 1952 / 1952 frames canónicos inventariados.
- 42 / 42 formas canónicas inventariadas.
- 1952 aliases PNG con nombre semántico NO destructivo.
- 1726 frames enlazados a evidencia semántica V5.
- 225 componentes V7 sin old_ref auditados y tipados por geometría/visual.
- 44 directorios runtime cubiertos (42 V7 + goku_ssj2/ginyu_goku FIXED-only).
- 21 familias/poses runtime documentadas por forma; 924 filas de matriz.
- 125 / 125 cartas catalogadas.
- Todos los command/damage/beam tienen perfil o grupo de secuencia resuelto.
- Stage Attack: 24 secuencias canónicas, 6 por nivel, y mapa input->pose actual del repo.

## Importante sobre nombres
Los `NNN.png` del V7 siguen siendo IDs de fuente y NO se reemplazan. `semantic_named/` crea una segunda vista descriptiva.
Una etiqueta concreta `punch_right`, `beam_charge`, etc. solo es verdad runtime cuando la declara el manifest del repo.
Por ello `tools/reconcile_with_repo.py` materializa el join exacto manifest runtime <-> frame canónico por píxel visible.

## Hallazgo de efectos
El paquete V7 contiene 225 componentes sin old_ref. No todos son FX: visualmente aparecen chibis, poses OW, tiles de aura, composites actor+aura y proyectiles. La V8 evita llamarlos todos `effect`. `effects_catalog` los separa por rol candidato y confianza.

## Fuentes de contrato
- `src/battle/spriteConfig.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/battle/actionProfiles.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/battle/stageSequences.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/battle/stageInputMap.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/battle/transforms.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/data/cards.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `src/data/spriteManifest.ts` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
- `docs/CANONICAL_SPRITE_SOURCES.md` @ 349e54824d397a47df4fa7d615cde1ef5a8e2241
