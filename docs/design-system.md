# DBZ LSW Fangame Design System

Direction: Neo-GBC / Dragon Ball Pixel 32-bit.

The game should feel like Dragon Ball Z: Legendary Super Warriors designed for PC, not like a generic HD remake.

## Screen

- Base composition: 16:9.
- Battle viewport: wide layered arena.
- Sprites: pixel art, nearest-neighbor scaling, no blur.
- UI: compact rectangular RPG panels, card hand at bottom.

## Battle Layers

1. Sky.
2. Distant terrain.
3. Mid terrain.
4. Arena ground.
5. Characters.
6. Pixel VFX.
7. HUD and cards.

## Palette

- Background: `#0c1018`
- Panel: `#161b25`
- Panel highlight: `#232b39`
- Text: `#f2f1e8`
- Muted: `#abb2be`
- DBZ orange: `#f28c28`
- Ki blue: `#44a7e8`
- HP red: `#d95045`
- Guard green: `#68b76b`
- Gold: `#e6ba55`

## Card Types

- command: gray-blue
- damage: dark red
- beam: cyan-blue
- support: green
- defense: indigo
- special: gold

## Interaction

- Main menu first.
- Deck/character setup before battle.
- Battle flow: command -> card select -> resolve -> enemy -> command.
- Keyboard target: 1-5 cards, arrows/D-pad navigation, Enter confirm, Esc cancel.
