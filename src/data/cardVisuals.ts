// ═══════════════════════════════════════════════════════════════════════
// CARD VISUAL REGISTRY — registro ÚNICO de assets visuales de carta.
// Compartido por el juego real (main.tsx) y el HUD Studio (hud.tsx).
// CardDef → frame GBC · icono de tipo · arte · coste.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef, CardType } from './cards';
import { cardIconUrl } from './icons';

// Marcos GBC por tipo: los frame_card_*_color del paquete diferencian el
// tipo por COLOR (los card_type_*_frame genéricos son casi todos naranjas).
export const CARD_FRAME_BY_TYPE: Record<CardType, string> = {
  command: '/assets/ui/card_frames/card_type_stage_attack_frame.png', // naranja (Stage Attack)
  damage: '/assets/ui/card_frames/frame_card_red.png',                // rojo
  beam: '/assets/ui/card_frames/frame_card_blue.png',                 // azul
  support: '/assets/ui/card_frames/frame_card_green.png',             // verde
  defense: '/assets/ui/card_frames/frame_card_teal.png',              // teal
  special: '/assets/ui/card_frames/frame_card_gold.png',              // dorado
};

export const CARD_FRAME_SELECTED = '/assets/ui/card_frames/card_type_bonus_gold_frame.png';
export const CARD_FRAME_DISABLED = '/assets/ui/card_frames/card_type_blocked_or_invalid_frame.png';

/** Frame GBC para una carta (por su tipo). */
export function cardFrameFor(card: CardDef): string {
  return CARD_FRAME_BY_TYPE[card.type] ?? CARD_FRAME_BY_TYPE.command;
}

/** Arte/ilustración de la carta (sprite ROM del icono). */
export function cardArtFor(card: CardDef): string | undefined {
  return cardIconUrl(card.id);
}

export interface CardVisual {
  frame: string;
  art: string | undefined;
  cost: number;
  type: CardType;
}

/** Visual completo de una carta (frame + arte + coste + tipo). */
export function cardVisualFor(card: CardDef): CardVisual {
  return {
    frame: cardFrameFor(card),
    art: cardArtFor(card),
    cost: card.cc,
    type: card.type,
  };
}
