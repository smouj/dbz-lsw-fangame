# P0 Character ROM Physical Correction

Status: active gate.

## Authority

`ROM_PHYSICAL_FIGHTERS` is only canonical when the same profile key drives all
three domains:

- form actor visual profile
- fighter graphics bank
- fighter palette

Physical identity includes:

```text
actorVisualProfileKey + graphicsBank + AnimationResource + visualFrameId
```

Frame instances remain separate:

```text
formId + sequence selector + sequence + frameIndex + durationTicks + dx/dy
```

## Selector Rule

Dev Studio and runtime must not default to sequence 0. For BEAM_BASE, the
selected sequence comes from the ROM selector table generated into
`romBeamSequenceSelectors.generated.ts`.

If a card/form/resource pair has no selector, it fails closed as unresolved or
explicit fallback. `STANDARD_DAMAGE` is still ROM-grammatical, but it is not
counted as ROM fighter-physical production until branch/sequence evidence is
connected without a seq0 shortcut.

## Facing Rule

The stored PNG remains ROM raw/trimmed. Dev Studio may show a separate
right-facing "canonical display" preview for runtime readability, implemented
as display transform only. The transform does not mutate physical PNGs,
physical IDs, hashes, bounds, or provenance.

## Dev Studio Rule

Character Studio must show selected sequences separately from all resource
sequences:

- `ROM Selected Sequences`: selected by card + profile selector.
- `All Resource Sequences`: research view only unless explicitly selected.

Per-frame inspection must expose trimmed PNG, raw canvas, display preview,
profile key, graphics bank, palette, bounds, origin, resource, sequence,
frame index, visualFrameId, duration and signed offsets.
