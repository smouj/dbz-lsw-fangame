# Gameplay HUD and start flow

Canonical gameplay start:

- Default player fighter: `gohan_young`.
- Default first opponent: `piccolo_base`.
- Starter visible characters: Gohan and Piccolo.
- Battle Mode opens with Piccolo selected so it mirrors the first story encounter.

Canonical gameplay HUD:

- Top HUD is a translucent overlay, not a heavy panel.
- Top HUD contains portrait, fighter name/form/level, HP bar and current status/buffs.
- HP bars are the strongest readable element in the top HUD.
- CC does not live inside the fighter panels. It is docked at the lower-right of the battlefield, matching the GBC combat read.
- The lower control zone is a compact translucent tray. It must not become a solid container that hides the battlefield.
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
