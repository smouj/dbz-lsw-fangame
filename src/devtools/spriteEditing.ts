// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Edición de sprites y manifests (utilidades compartidas)
// Carga del manifest.json (base + overrides en localStorage),
// mutaciones inmutables, y guardado al proyecto (POST a /__dev/write
// que el middleware de Vite escribe en public/assets) o exportación
// como descarga.
// ═══════════════════════════════════════════════════════════

export interface ManifestFrame {
  name: string;
  file: string;
  w: number;
  h: number;
}
export interface ManifestPose {
  frame_count: number;
  fps: number;
  loop: boolean;
  frames: ManifestFrame[];
}
export type Manifest = Record<string, ManifestPose>;

const OVERRIDE_PREFIX = 'dbzlsw:manifest-override:';

// ─── Overrides (localStorage) ────────────────────────────────

export function loadOverride(dir: string): Manifest | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_PREFIX + dir);
    return raw ? (JSON.parse(raw) as Manifest) : null;
  } catch {
    return null;
  }
}

export function saveOverride(dir: string, m: Manifest): void {
  try { localStorage.setItem(OVERRIDE_PREFIX + dir, JSON.stringify(m)); } catch { /* cuota */ }
}

export function clearOverride(dir: string): void {
  try { localStorage.removeItem(OVERRIDE_PREFIX + dir); } catch { /* noop */ }
}

// ─── Carga del manifest (base + override) ────────────────────

export async function fetchManifest(url: string, dir: string): Promise<{ manifest: Manifest; overridden: boolean }> {
  // Cache-bust para ver los cambios guardados al instante.
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const base = (await res.json()) as Manifest;
  const ov = loadOverride(dir);
  return ov ? { manifest: ov, overridden: true } : { manifest: base, overridden: false };
}

// ─── Mutaciones inmutables ───────────────────────────────────

export function moveFrame(pose: ManifestPose, from: number, to: number): ManifestPose {
  if (from === to || from < 0 || to < 0 || from >= pose.frames.length || to >= pose.frames.length) return pose;
  const frames = pose.frames.slice();
  const [f] = frames.splice(from, 1);
  frames.splice(to, 0, f);
  return withCount({ ...pose, frames });
}

export function removeFrame(pose: ManifestPose, i: number): ManifestPose {
  if (i < 0 || i >= pose.frames.length) return pose;
  const frames = pose.frames.filter((_, idx) => idx !== i);
  return withCount({ ...pose, frames });
}

export function addFrame(pose: ManifestPose, frame: ManifestFrame, at?: number): ManifestPose {
  const frames = pose.frames.slice();
  const idx = at === undefined ? frames.length : Math.max(0, Math.min(at, frames.length));
  frames.splice(idx, 0, frame);
  return withCount({ ...pose, frames });
}

export function setFps(pose: ManifestPose, fps: number): ManifestPose {
  return { ...pose, fps: Math.max(1, Math.min(60, Math.round(fps))) };
}

export function setLoop(pose: ManifestPose, loop: boolean): ManifestPose {
  return { ...pose, loop };
}

function withCount(pose: ManifestPose): ManifestPose {
  return { ...pose, frame_count: pose.frames.length };
}

// ─── Exportación / guardado ──────────────────────────────────

export function downloadJson(name: string, obj: unknown): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  triggerDownload(blob, name);
}

export function downloadBlob(blob: Blob, name: string): void {
  triggerDownload(blob, name);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

// Guarda un archivo en public/assets (rel: 'sprites/{dir}/manifest.json' o PNG).
export async function saveToProject(rel: string, base64: string): Promise<void> {
  const res = await fetch('/__dev/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rel, data: base64 }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
