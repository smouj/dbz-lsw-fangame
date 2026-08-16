# Gameplay HUD and start flow

Canonical gameplay start:

- Default player fighter: `gohan_young`.
- Default first opponent: `piccolo_base`.
- Starter visible characters: Gohan and Piccolo.
- Battle Mode opens with Piccolo selected so it mirrors the first story encounter.
- Starter decks (`STARTER_DAMAGE_DECK` / `STARTER_BEAM_DECK`) and the `DEFAULT_DECK` contain ONLY generic cards (CSV Users=48). Character-locked cards would be filtered at draw time, so generic-only decks are 20/20 usable by any fighter.

Canonical gameplay HUD:

- Top HUD is a translucent overlay, not a heavy panel.
- Top HUD contains portrait, fighter name/form/level, HP bar and current status/buffs.
- HP bars are the strongest readable element in the top HUD.
- Below the stats there is a `.hud-status` row of pixel chips that shows the real battle state: `STR+/KI+/SPD+/G+` (buff), red debuff variants, active guard (`BEAM⚡/DAMAGE🛡/ABSORB/GUARD/CANCEL`), `ACC+/EVA+/LOCK`, `BUFF×n` and the Power state (`FULL/HALF POWER`). A single `—` means no active states. The enemy HUD shows the same row on the right from its own stages.
- SPD shown in the HUD already includes stage modifiers (`spd + stages.spd * 8`).
- CC does not live inside the fighter panels. It is docked at the lower-right of the battlefield (`cc-dock`, P/E pockets), matching the GBC combat read.
- The lower control zone is a compact translucent tray (`battle-controls`, `height: auto`). It must not become a solid container that hides the battlefield.
- Lower control buttons are the authentic GBC sprites (48×40, scaled 1.5× = 72×60, `image-rendering: pixelated`) with the button name already inside the sprite:
  - `btn_basic.png` (BASIC orange) — B command / BASIC DEFENSE source
  - `btn_joint.png` (JOINT green) — J command / JOINT DEFENSE source
  - `btn_limit.png` (LIMIT blue) — L command / LIMIT DEFENSE source
  - `btn_chara.png` (CHARA cyan) — C command, 2v2 only
  - `btn_guard.png` (GUARD) — DEFEND action in the basic defense submenu
  - `btn_move.png` (MOVE) — MOVE action in the basic defense submenu
  - `btn_power.png` (POWER) — GATHER POWER action in the basic attack menu
  - `btn_team.png` / `btn_list.png` — reserved (not wired yet)
  - `frame_orange.png` — STAGE ATTACK action (text overlaid)
  - `frame_teal.png` — BACK buttons
  - `no_card_red.png` — empty hand slot ("NO CARD")
- CSS note: the variant selectors must beat the base rule. `.command-strip button` is (0,1,1), so variants are written `button.cmd-limit` etc. (0,2,1) so `--btn-frame` wins the cascade.
- Button descriptions live in a global tooltip (see Tooltips below), never inside the button text.

Tooltips:

- The game uses a global React tooltip (`GlobalTooltip`) rendered through `createPortal` into `document.body` with `position: fixed` and `z-index: 10000`, so it can never be clipped by `overflow: hidden` parents or hidden behind other layers.
- Any element with a `data-tip` attribute shows its text on hover.
- Placement is adaptive: `dir-top` (above the element) when there is room at the top, `dir-bottom` (below) near the top edge. Horizontal position clamps to the viewport.
- Cards show their effect summary + compatibility ("Usable por: …") in the tooltip; HUD fighter names show the full combat file (HP, STR/KI/SPD, position).
- Card action cinematics are constrained to the battlefield area between the top HUD and lower controls. They must not render over the bottom HUD tray.
- During a card/action cinematic, the lower tray becomes contextual copy for the action name/effect instead of continuing to show the hand.
- Menu/page buttons and tabs must never change layout geometry on hover. Feedback is color, light, border or opacity only.

Sprite animation rule:

- No sprite "breathing" by scaling the character. Powered/Gather states may use flash, glow or a separate effect layer, but must not resize the battle sprite.

Canonical combat view split:

- `OVERVIEW` is the tactical field: battlefield background plus small overworld/combat-field sprites at their real Air/Ground and Front/Back positions.
- `ACTION` is a cinematic action view: larger action sprites, card/skill presentation, projectile/impact effects and then a return to `OVERVIEW`.
- The top HUD remains persistent across both views so HP, phase and identity stay readable.
- Defense, support and attack presentations should use the same view split instead of duplicating sprites in the HUD.

Motion feel:

- Action timing is frame-paced with GBC-style beats, but transitions must not hard-cut between setup, travel, impact and field return.
- Avoid springy/overshooting web easing for combat sprites. Use short stepped transitions, readable holds and a small `return` beat before clearing the cinematic layer.
- Card names/effects should fade in as contextual battle text, not pop from extreme scale.
- QTE feedback may move, flash or shake UI prompts, but must not scale the character sprite as a fake animation.
- Stage Attack resolution also keeps a short return beat before dismantling the QTE layer, so the flow reads as action view -> field return instead of instant UI replacement.
- Card cinematics start with the large action sprite centered, then place the actor on its side before the release/rush frame. Beam cards keep the actor visible while the projectile travels; physical cards keep the actor visible during the forward-and-return rush.
- **Stage Attack QTE (GBC real)**: during the QTE the fighter stays in a NEUTRAL pose (idle) — the action animation is only shown when the sequence is completed. The sequence uses one global window by relative depth (BACK/BACK 1.2s, BACK/FRONT 1.7s, FRONT/BACK 2.4s, FRONT/FRONT 2.9s). On wrong input or timeout the rival enters the ENTER COMMAND counter window: A banks earned CC and avoids the counter, B repairs with stricter timing, otherwise the counter hits the attacker.
- Cinematic step durations (in GBC frames, aligned so CSS animations never get cut mid-way):
  - Beam: attacker 54f (0.90s, covers center 0.82s + charge), travel 54f (0.90s, covers release+beam 0.86s), target 44f (0.74s) — total 152f ≈ 2.54s.
  - Damage/Command: attacker 50f (0.84s, covers center 0.82s), travel 44f (0.74s, covers rush 0.70s), target 38f (0.64s) — total 132f ≈ 2.21s.
  - Support (no target cut): uses `presentationMs` = 118f ≈ 1.98s, which covers the aura pulse (1.36s).

Combat order (canonical GBC, per `BATTLE_ENGINE_SPEC.md`):

- A TURN has 2 EXCHANGES. Each exchange has one attacker and one defender; order is fixed by effective SPD for the whole turn, recalculated each turn (speed tie is random 50/50, marked UNKNOWN until ROM capture).
- The attacker receives +3 CC on entering its Attack Phase and draws one Joint card (transient max 6, persistent max 5).
- The defender chooses their defense BEFORE the attack animation plays: BASIC (Defense/Move), JOINT (defense/support cards) or LIMIT (defense/support, requires Powered). Then the attacker's cinematic plays and the damage resolves.
