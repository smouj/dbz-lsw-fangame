# M8.F0 — GBC Cinematic Ground Truth

**Estado**: en curso (formato de evidencia + guardrail creados; canon vacío hasta verificar vídeo).

## Principio (F0)

Separación estricta de tres capas:

```text
REGLAS          manual / ROM            → qué puede ocurrir        (BattleEngine)
CINEMATOGRAFÍA  vídeo GBC + frames ROM  → cómo se ve realmente     (GbcCinematicCanon)
ARQUITECTURA    Engine→EventLog→Timeline→Pixi → cómo lo reproducimos
```

NUNCA codificar cinematografía "que parece razonable" como canon GBC. Hasta
que una secuencia se registre con fidelity ≥ `VIDEO_VERIFIED`, el Timeline no
puede reclamar que reproduce el cartucho.

## Regla de fidelidad (guardrail)

```text
FRAME_VERIFIED      → puede llamarse CANON
VIDEO_VERIFIED      → puede llamarse CANON
ROM_ASSET_VERIFIED  → asset canónico, timing NO necesariamente
MANUAL_VERIFIED     → regla canónica, visual NO necesariamente
INFERRED            → jamás etiquetar como GBC canonical
```

## Formato de evidencia

`src/battle/cinematic/GbcCinematicCanon.ts`:

- `GbcShot` (FIELD / ACTION / ACTION_DUEL / SPECIAL) — qué vemos.
- `GbcFocus` (NONE / ACTOR / TARGET / DEFENDER) — quién protagoniza (rol, no nodo).
- `GbcTransition` (NONE / CUT / FADE_BLACK / FLASH_WHITE / FLASH_BLACK).
- `GbcCinematicBeat` — shot + transition + focus + pose + startFrame/endFrame.
- `GbcCinematicSequence` — id + family + evidence (source/timestamps/fidelity) + beats.
- `GBC_CINEMATIC_CANON` — **VACÍO a propósito** (sin vídeo local aún).
- `GBC_CINEMATIC_FAMILIES` — 20 familias a verificar (stage→ko, F0.5).
- `isGbcCanon(fidelity)` — guardrail.

### F0.3 — SHOT/FOCUS separados

`DEFENDER_ACTION` como escena física NO es canon GBC: es la combinación
`SHOT=ACTION + FOCUS=DEFENDER`. El Timeline actual usa `DEFENDER_ACTION`
como modo interno etiquetado **INFERRED** (profileId `defense_prep`,
fidelity `INFERRED`) — provisional hasta observarlo en vídeo.

## Orden de investigación (F0.5)

1. Stage Attack completo (prioridad máx — F0.6)
2. Melee HIT / MISS / knockback back / up / down (F0.7)
3. Ray beam · Ball beam · Beam HIT/BLOCK/AVOID (F0.8)
4. Guard · Move H/V · Gather · Support def/off · Limit · Counter Stage · KO

Una vez verificadas las familias, las 125 cartas se convierten en
`card → familia verificada → perfil firma → variantes` (no 125 películas).

## Evidencia disponible

- Longplay completo 6:23:11 (GameFAQs videos).
- Vídeos de gameplay adicionales (GameFAQs).
- Manual/FAQ (GameFAQs by thegromer) — respalda la estructura lógica
  (Attack Phase / Defense Phase; Defense cards; Basic → Defense/Guard + Move),
  NO la cinematografía frame a frame.

## Guardrails automatizados

- `npm run verify:canon` (NUEVO): regenera build-sprite-canon.py y comprueba
  determinismo (mismos hashes) + invariantes V9 (0 duplicados, 0 mismatch,
  clasificación estable por frame, roles posicionales, 0 buckets ambiguos
  como CANONICAL). Si falla, el canon está corrupto.
- `verify:presentation` F0 checks: canon GBC vacío · isGbcCanon solo
  FRAME_VERIFIED/VIDEO_VERIFIED · 20 familias · prep defensiva INFERRED.

## Estado actual (INFERRED — NO canon GBC)

| Concepto | Fidelidad |
|---|---|
| STAGE_PREP_TICKS = 60 (beats 0/12/30/48) | INFERRED (confrontar con vídeo) |
| DEFENDER_ACTION + prep defensiva 12t | INFERRED |
| idle→guard en contacto | INFERRED |
| fades ACTION→FIELD→ACTION | INFERRED |
| actionProfiles (cont_punch→punch_right…) | INFERRED |
| V9 (canonicalId/family/role/variant/sequenceIndex) | RUNTIME_VERIFIED (asset/pose) — timing NO |
