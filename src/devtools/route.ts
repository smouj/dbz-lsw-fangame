// ═══════════════════════════════════════════════════════════
// Dev Studio — ruta de acceso (módulo ligero, sin el DevStudio)
// Separado de DevStudio.tsx para que el bundle de RELEASE pueda
// excluir todo el Dev Studio (import.meta.env.MODE === 'release').
// ═══════════════════════════════════════════════════════════

export function isDevRoute(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.MODE === 'release') return false; // nunca en release
  const q = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  // Solo aceptamos el namespace exacto #dev / #dev/<módulo>. Esto evita que
  // cualquier hash parecido (por ejemplo #developer) active la herramienta.
  const devHash = hash === '#dev' || hash.startsWith('#dev/');
  return devHash || q.get('dev') === '1';
}

export function initialDevModule(): string {
  const m = window.location.hash.match(/^#dev\/([a-z-]+)/);
  return m ? m[1] : 'dashboard';
}
