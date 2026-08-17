// Tipos del Dev Studio (módulo ligero, sin el componente).
export interface DevStudioProps {
  onExit: () => void;
  onLaunchBattle?: (playerFormId: string, enemyFormId: string, chapter: number | null) => void;
}
