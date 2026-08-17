// ═══════════════════════════════════════════════════════════
// Dev Studio — ruta de acceso (módulo ligero, sin el DevStudio)
// Separado de DevStudio.tsx para que el bundle de RELEASE pueda
// excluir todo el Dev Studio (import.meta.env.MODE === 'release').
// ═══════════════════════════════════════════════════════════

export function isDevRoute(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.MODE === 'release') return false; // nunca en release
  const q = new URLSearchParams(window.location.search);
  return window.location.hash.startsWith('#dev') || q.get('dev') === '1';
}

export function initialDevModule(): string {
  const m = window.location.hash.match(/^#dev\/([a-z]+)/);
  return m ? m[1] : 'dashboard';
}
