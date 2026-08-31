# Story ROM Dialogue Canon

## Scope

This document defines the production contract for Story presentation in the remake.

The remake implements **dialogue/cutscene Story only**:

- canonical Story order and identity;
- Story dialogue text;
- speaker identity;
- Story portrait / character form / expression;
- physical Story cutscene background;
- transition into the corresponding battle.

The remake deliberately **does not implement the cartridge Story Map / RPG exploration layer**. The ROM research for `$29-$2F` remains in `src/data/storyRom.ts` as reverse-engineering evidence, but production Story presentation must not depend on it.

Excluded from the remake Story flow:

- `$29 INIT_STORY_MAP_RUNTIME`;
- `$2A RUN_STORY_MAP_RUNTIME_UNTIL_EXIT`;
- `$2C` map triggers;
- `$2D` player map actor;
- `$2E` map entities / NPC movement;
- `$2F` map scene bounds/camera runtime;
- free movement, hotspots, pickups or RPG-style exploration.

## Authority hierarchy

Story presentation uses these layers, in this order:

1. `src/data/storyRom.ts`
   - ROM structural SSOT.
   - Story directory / physical program locations.
   - Story VM opcodes.
   - `$10 PRINT_LITERAL_TEXT` authority.
   - speaker/nameplate table and portrait-resource structure.
   - `$3E LOAD_SCENE_RESOURCE` structural authority.

2. `src/data/storyCanonical.ts`
   - canonical 30 MAIN + 2 EX identity.
   - separates cartridge identity from the remake's legacy progression index `1..32`.

3. `src/data/storyCutsceneCanon.ts`
   - 71 physical Story images extracted from the cartridge.
   - their physical filenames/order.
   - dialogue-only Story grouping with explicit evidence level.

4. `src/data/storyPortraits.ts` + `src/data/storyPortraitCanon.ts`
   - physical Story portrait corpus.
   - form/age/timeline identity corrections.
   - no invented portrait for absent physical variants.

5. `src/data/generated/storyDialogueRom.generated.ts`
   - target generated corpus for literal `$10` dialogue beats.
   - runtime may call text ROM-literal only when an entry carries `ROM_LITERAL_TEXT` evidence.

6. `src/data/storyNarrativeCanon.ts`
   - one dialogue-only presentation source.
   - exact ROM text takes precedence automatically when generated data exists.
   - until then, MAIN Story text comes from the legacy editorial reconstruction and is explicitly labelled `EDITORIAL_RECONSTRUCTION`.
   - EX stories never borrow Buu dialogue; while literal EX streams are absent they use neutral `REFERENCE_SUMMARY` lines.

7. `src/data/storyPanels.ts`
   - projection layer only.
   - converts the narrative canon to the existing `StoryPanel` contract consumed by production and Story Studio.

`storyScript.ts` is therefore **not a ROM authority**. It is an editorial fallback source only.

## Canonical Story order

The cartridge does not contain 32 MAIN Stories. The campaign identity is:

| Remake sequenceIndex | Canonical identity | ROM Story id |
|---:|---|---:|
| 1 | Story 1 | 1 |
| 2 | Story 2 | 2 |
| 3 | Story 3 | 3 |
| 4 | Story 4 | 4 |
| 5 | Story 5 | 5 |
| 6 | Story 6 | 6 |
| 7 | Story 7 | 7 |
| 8 | Story 8 | 8 |
| 9 | Story 9 | 9 |
| 10 | Story 10 | 10 |
| 11 | Story 11 | 11 |
| 12 | Story 12 | 12 |
| 13 | Story 13 | 13 |
| 14 | Story 14 | 14 |
| 15 | Story 15 | 15 |
| 16 | Story 16 | 16 |
| 17 | Story 17 | 17 |
| 18 | Story 18 | 18 |
| 19 | Story 19 | 19 |
| 20 | Story 20 | 20 |
| 21 | **EX Story 1** | **33** |
| 22 | **EX Story 2** | **34** |
| 23 | Story 21 | 21 |
| 24 | Story 22 | 22 |
| 25 | Story 23 | 23 |
| 26 | Story 24 | 24 |
| 27 | Story 25 | 25 |
| 28 | Story 26 | 26 |
| 29 | Story 27 | 27 |
| 30 | Story 28 | 28 |
| 31 | Story 29 | 29 |
| 32 | Story 30 | 30 |

`sequenceIndex` is retained only because battle tables and existing save/progression state already use a monotonic 1..32 sequence. UI, tooling and narrative lookup must resolve a `CanonicalStoryIdentity` before doing anything else.

### Critical invariant

Never write this again:

```ts
const script = STORY_SCRIPT[sequenceIndex];
```

It is wrong from `sequenceIndex=21` onward.

Always resolve canonical identity first.

## Physical Story cutscenes

`public/assets/cutscenes/` contains **71 extracted physical Story images**:

- `001..004`: Dragon Ball / Raditz recap before Story 1;
- `005..026`: Saiyan + Namek/Freezer narrative block;
- `027..048`: Android/Cell narrative block;
- `049`: Future Trunks EX Story 1 family;
- `050`: Future Trunks EX Story 2 family;
- `051..070`: Majin Buu narrative block and ending;
- `071`: blue Story transition/system graphic.

`storyCutsceneCanon.ts` catalogs every asset and guarantees filename/order identity.

### Evidence distinction

The physical PNG itself is:

`ROM_EXTRACTED_PHYSICAL`

The current per-Story grouping is:

`SEMANTIC_PHYSICAL_ORDER`

That means the images are authentic ROM assets and are kept in physical narrative order, but a per-dialogue image must **not** be called `ROM_EXACT` until the corresponding `$3E LOAD_SCENE_RESOURCE` callsite is persisted and reconciled to the physical PNG.

This distinction is intentional. It prevents a visually plausible mapping from being promoted into false ROM evidence.

## Dialogue text provenance

There are three allowed text evidence levels:

### `ROM_LITERAL_TEXT`

Only for text persisted from the cartridge `$10 PRINT_LITERAL_TEXT` stream with ROM provenance.

The generated record contract is:

```ts
interface RomStoryDialogueBeat {
  romStoryId: number;
  beatIndex: number;
  pc: number;
  speakerId: number | null;
  portraitId: number | null;
  sceneResource: { bank: number; index: number } | null;
  textBytes: readonly number[];
  text: string;
  evidence: 'ROM_LITERAL_TEXT';
}
```

### `EDITORIAL_RECONSTRUCTION`

Current MAIN Story fallback from `storyScript.ts`.

It is useful for a playable dialogue flow, but it is reconstructed text and must never be labelled as literal ROM text.

### `REFERENCE_SUMMARY`

Used only where the literal stream is absent and no safe editorial dialogue exists. Current use: EX Story 1/2.

This specifically prevents the old bug where remake sequence 21/22 loaded `storyScript[21]` / `[22]` and therefore displayed Majin Buu-era dialogue during Future Trunks EX stories.

## Speaker and portrait canon

The ROM Story research identifies the speaker/nameplate table and physical Story portrait resource family. Production uses the extracted Story portrait corpus rather than battle/menu art whenever a Story portrait exists.

Form identity is resolved before generic character aliasing.

Important corrected cases:

- `trunks_kid` → kid Trunks portrait, never Future Trunks base;
- `trunks_future` → Future Trunks physical portrait family;
- Future Trunks SSJ → physical Future Trunks base fallback because no dedicated Story SSJ portrait exists in the verified corpus;
- `gohan_adult` → adult Gohan family;
- adult Gohan SSJ → `gohan_adult_ssj.png`;
- adult Gohan Ultimate → adult/Ultimate physical portrait;
- Majin Vegeta → `majin_vegeta_01.png` / `majin_vegeta_02.png`, never `gohan_adult_ssj.png`;
- Goku SSJ3 → no fabricated Story portrait when the physical Story corpus has no dedicated asset.

A missing physical form is a fallback condition, not permission to manufacture an alias.

## Production panel contract

`panelsForChapter(sequenceIndex)` now performs:

```text
sequenceIndex
  -> CanonicalStoryIdentity
  -> CanonicalStoryNarrative
  -> physical cutscene beat
  -> speaker + character/form/emotion
  -> Story portrait
  -> text with evidence
  -> StoryPanel
  -> battle transition
```

It does **not** perform:

```text
sequenceIndex
  -> STORY_SCRIPT[sequenceIndex]
  -> one guessed CS(sequenceIndex)
```

The old `CS()` one-background-per-chapter shortcut and generic `/assets/backgrounds/NN_world.png` Story backgrounds are no longer production Story authority.

## Story Studio

Story Studio now displays the cartridge ordering:

```text
Story 1 ... Story 20 | EX1 | EX2 | Story 21 ... Story 30
```

For each panel it exposes:

- canonical Story id;
- ROM Story id;
- ROM bank/address;
- cutscene physical id/file;
- background evidence;
- text evidence;
- portrait/form/emotion;
- portrait evidence;
- explicit `Story Map: NO`.

This makes provenance visible instead of hiding it behind a visually plausible preview.

## Verification

Run:

```bash
npx tsx scripts/verify-story-dialogue-canon.ts
```

The verifier enforces:

- exactly 30 MAIN + 2 EX identities;
- EX1 at sequence 21 / ROM Story id 33;
- EX2 at sequence 22 / ROM Story id 34;
- Story 21 resumes at sequence 23;
- all 71 physical cutscene assets are cataloged;
- cutscene 049 is isolated to EX1 and 050 to EX2;
- no legacy `/assets/backgrounds/` leaks into generated Story panels;
- no panel opts into Story Map runtime;
- Majin Vegeta, adult Gohan and kid/future Trunks portrait invariants;
- fallback text cannot masquerade as `ROM_LITERAL_TEXT`.

## What is ROM-exact now vs pending

| Area | Status |
|---|---|
| Story directory / ROM program locations | ROM static verified |
| 30 MAIN + 2 EX identity/order | Canonical / ROM-backed |
| 71 physical cutscene PNG assets | ROM extracted physical |
| Story portrait asset corpus | ROM extracted physical |
| key character/form portrait identity corrections | Canonical semantic binding |
| Story Map/RPG | intentionally excluded |
| MAIN text currently displayed | editorial reconstruction unless generated ROM beat exists |
| EX text currently displayed | neutral reference summary unless generated ROM beat exists |
| literal `$10` text stream per dialogue | pending persisted corpus |
| exact `$3E` scene-resource → per-dialogue PNG binding | pending persisted callsite reconciliation |

The last two pending items are intentionally represented as data/provenance gaps, not guessed values. Once an extractor writes `storyDialogueRom.generated.ts`, the narrative layer switches to literal ROM text automatically without requiring another Story UI rewrite.
