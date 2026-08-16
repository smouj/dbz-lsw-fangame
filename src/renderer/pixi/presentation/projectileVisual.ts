export type ProjectileVisualMode = 'ray' | 'ball' | 'disk' | 'sword' | 'special';

/**
 * Normaliza la semántica declarativa del perfil a un modo que Pixi puede
 * representar. "beam" se conserva como alias para timelines antiguos.
 */
export function resolveProjectileVisualMode(kind: string): ProjectileVisualMode {
  switch (kind.trim().toLowerCase()) {
    case 'beam':
    case 'ray':
    case 'wave':
      return 'ray';
    case 'ball':
      return 'ball';
    case 'disk':
      return 'disk';
    case 'sword':
      return 'sword';
    default:
      return 'special';
  }
}
