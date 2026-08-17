// Stub de DevStudio para builds de RELEASE (--mode release):
// el alias de vite.config.ts redirige devtools/DevStudio aquí, de modo
// que el Dev Studio completo NO entra en el bundle de producción.
import type { DevStudioProps } from './DevStudioTypes';

export function DevStudio(_: DevStudioProps): null {
  return null;
}
export { isDevRoute, initialDevModule } from './route';
