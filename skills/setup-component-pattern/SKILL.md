---
name: "setup-component-pattern"
description: "Team/Rival setup component patterns: read-only modes, locked roster visuals, ROM data SSOT, and unlock gates in DBZ LSW Fangame."
---

# Setup Component Patterns (DBZ LSW)

Patterns for the Team Setup / Versus screen — rival read-only, locked roster, ROM loadout SSOT, and unlock gates.

## Read-Only Component Mode

When a setup sub-component (LimitLoadoutPanel, DeckAssignment) needs a read-only variant:

1. **Make action callbacks optional in the interface** (`onEquip?: (...) => void`, `onClear?: (...) => void`, `onAssign?: (...) => void`, `onEditDecks?: () => void`).
2. **Derive `readOnly` from callback absence**: `const readOnly = !onEquip || !onClear;` (Limits) or `const readOnly = !onAssign || !onEditDecks;` (Deck).
3. **Disable interactive elements when readOnly**: buttons get `disabled={readOnly}` or `onClick={readOnly ? undefined : handler}`, slot clicks become no-ops, clear/equip buttons hide.
4. **Show locked label instead of edit affordance**: LimitLoadoutPanel shows `🔒 ROM LOADOUT` header; DeckAssignment shows `🔒 ROM LOADOUT` button text.

## Locked Character Roster

When characters should be lockable (unlock progression):

1. **Block at the selection function**, not just CSS. In `CharacterRoll.select()`, check `item.locked` before calling `onSelect`. In `useTeamSetupState.addMember()`, skip characters where `isFormUnlocked(baseFormIdOf(c.id))` returns false.
2. **Apply strong visual treatment to the sprite itself** (not the wrapper): `filter: grayscale(1) saturate(.15) brightness(.32) contrast(.9)` on `.setup-roll-chibi img` and `.setup-roll-chibi canvas`. The wrapper also gets `opacity:.55` and `pointer-events:none`.
3. **Add lock overlay**: `<span className="setup-roll-lock-overlay">🔒</span>` inside `.setup-roll-chibi`, absolutely positioned over the sprite, `z-index:5`.
4. **Disable keyboard navigation**: `tabIndex={-1}`, `disabled={!!item.locked}`.
5. **Aria**: `aria-label={item.locked ? \`${item.name} (locked)\` : item.name}`.
6. **Rail dots also disable**: `disabled={disabled || !!item.locked}`.

## ROM Data SSOT

When creating a canonical data source derived from ROM/memory:

1. **Always include `provenance`** (`ROM_STATIC_VERIFIED`, `ROM_ENCOUNTER_DERIVED`, `ROM_DYNAMIC_VERIFIED`, `UNRESOLVED`). Never leave provenance implicit.
2. **Never invent values to fill gaps**. UNRESOLVED entries stay UNRESOLVED until traced from ROM evidence.
3. **Export `isLoadoutResolved(preset)`** as the gate: returns true only when `preset.provenance !== 'UNRESOLVED' && preset.deck.length >= DECK_SIZE`.
4. **Separate `context`** (`'story'` | `'versus'`) from provenance. Story mode uses chapter-specific data; versus mode uses the strongest encounter per character.
5. **Keep `ENEMY_LOADOUT_EDITING_UNLOCKED = false`** as a named constant. Architecture ready, feature not activated. When progression unlocks it, flip to a runtime check.

## Rival Workshop vs Player Workshop

Rival team in Versus mode is SELECTABLE (choose opponent) and INSPECTABLE (see limits only), but NOT EDITABLE (CPU uses ROM preset):

1. **`useRivalSetupState`** applies `resolveEnemyLoadout(formId)` on every `selectCharacter`/`selectForm`/`addMember` call. Limits and deck come from ROM, not player input.
2. **`equipLimit`/`clearLimitSlot`/`assignDeck` are NO-OPs** — the interface matches `useTeamSetupState` for compatibility but does nothing.
3. **`startVersus`** resolves the rival team through `resolveEnemyLoadout()` before creating `BattleConfig`. If `isLoadoutResolved`, use preset limits+deck; otherwise keep `makeMember` defaults.
4. **TeamSetup hides DeckAssignment entirely when rival has focus** — rival deck auto-generates from ROM preset, there is nothing for the player to configure. Only LimitLoadoutPanel is shown (read-only, inspectable).
5. **Rival label**: just "RIVAL 🔒" — no "CPU" badge. It's obvious it's the CPU opponent.
6. **Player deck never changes on character switch** — the deck belongs to the player, not the character. `useTeamSetupState` keeps the same `jointDeck`/`deckId` across character changes; only the character/form changes.

## Unlock Gate Pattern

Player character unlocking uses `isFormUnlocked(formId, level)`:

1. **Pass `isFormUnlocked` through TeamSetup props** to CharacterRoll (items get `.locked` flag) and to `useTeamSetupState` (addMember skips locked characters).
2. **Rival bypasses unlock gate**: `isRivalFormUnlocked={() => true}` — CPU can use any form.
3. **Base form always unlocked**: `isFormUnlocked(formId)` returns true when `FORM_UNLOCK_LEVELS[formId]` is undefined.

## Traps

- Don't make LimitLoadoutPanel/DeckAssignment callbacks required then pass `() => {}` for read-only — make them optional and derive `readOnly` from their absence. Empty callbacks fire and cause state mutations on no-ops.
- Don't apply locked CSS only to the wrapper div — the sprite image/canvas needs the filter directly, or it shows at full brightness under the dimmed wrapper.
- Don't use `require()` for ESM module imports — pass arrays as parameters (`allVersusPresets(formIds: string[])`) instead.
- Don't conflate `useTeamSetupState.addMember` (which skips locked characters) with `useRivalSetupState.addMember` (which skips used characters but not locked — rival can use any form).
