// ═══════════════════════════════════════════════════════════
// DBZ LSW — Perfiles de build (development | preview | release)
// Seleccionados por el modo de Vite: npm run build → production/release
// (vite build --mode release), preview, o dev.
// ═══════════════════════════════════════════════════════════

export type BuildProfileId = 'development' | 'preview' | 'release';

export interface BuildProfile {
  id: BuildProfileId;
  label: string;
  sourceMaps: boolean | 'private';
  devStudio: boolean;
  debugLogging: boolean;
  cheats: boolean;
  debugRoutes: boolean;
  minification: boolean;
  assetHashing: boolean;
  productionConfig: boolean;
}

export const BUILD_PROFILES: Record<BuildProfileId, BuildProfile> = {
  development: {
    id: 'development',
    label: 'Development',
    sourceMaps: true,
    devStudio: true,
    debugLogging: true,
    cheats: true,
    debugRoutes: true,
    minification: false,
    assetHashing: false,
    productionConfig: false,
  },
  preview: {
    id: 'preview',
    label: 'Preview',
    sourceMaps: false,
    devStudio: false,
    debugLogging: false,
    cheats: false,
    debugRoutes: false,
    minification: true,
    assetHashing: true,
    productionConfig: true,
  },
  release: {
    id: 'release',
    label: 'Release',
    sourceMaps: false,
    devStudio: false,
    debugLogging: false,
    cheats: false,
    debugRoutes: false,
    minification: true,
    assetHashing: true,
    productionConfig: true,
  },
};

/** Dev-only activos en un perfil (deben ser 0 en preview/release). */
export function devOnlyActive(p: BuildProfile): string[] {
  const out: string[] = [];
  if (p.devStudio) out.push('devStudio');
  if (p.cheats) out.push('cheats');
  if (p.debugRoutes) out.push('debugRoutes');
  return out;
}

export function validateBuildProfile(p: BuildProfile): string[] {
  const issues: string[] = [];
  if (p.id !== 'development') {
    for (const k of devOnlyActive(p)) issues.push(`${k} activo en perfil ${p.id}`);
    if (p.sourceMaps === true) issues.push('sourceMaps públicos en producción');
  }
  return issues;
}
