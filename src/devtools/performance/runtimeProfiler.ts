// Dev-only runtime measurement. This module is never imported by production
// game code; it observes browser APIs without changing the BattleRuntime.

export interface PerformanceSnapshot {
  active: boolean;
  startedAt: number | null;
  elapsedMs: number;
  frames: number;
  fps: number;
  lastFrameMs: number;
  averageFrameMs: number;
  worstFrameMs: number;
  longTasks: number;
  resources: number;
  resourceBytes: number;
  heapUsedBytes: number | null;
  heapLimitBytes: number | null;
  marks: Array<{ name: string; elapsedMs: number }>;
}

type MemoryPerformance = Performance & {
  memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number };
};

/**
 * A small, deterministic profiler for development sessions.
 *
 * It intentionally reports only values exposed by the browser. Texture count,
 * draw calls and GPU memory are left out because Pixi does not expose stable
 * cross-renderer counters; showing a made-up value would make this panel less
 * useful for performance decisions.
 */
class RuntimeProfiler {
  private active = false;
  private startedAt: number | null = null;
  private lastFrameAt: number | null = null;
  private frames = 0;
  private totalFrameMs = 0;
  private lastFrameMs = 0;
  private worstFrameMs = 0;
  private longTasks = 0;
  private marks: Array<{ name: string; elapsedMs: number }> = [];
  private raf: number | null = null;
  private longTaskObserver: PerformanceObserver | null = null;

  start(): void {
    this.stop();
    this.active = true;
    this.startedAt = performance.now();
    this.lastFrameAt = null;
    this.frames = 0;
    this.totalFrameMs = 0;
    this.lastFrameMs = 0;
    this.worstFrameMs = 0;
    this.longTasks = 0;
    this.marks = [];
    this.installLongTaskObserver();
    this.raf = requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    this.active = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
  }

  mark(name: string): void {
    if (!this.active || this.startedAt === null) return;
    const cleanName = name.trim().slice(0, 48);
    if (!cleanName) return;
    this.marks = [...this.marks, { name: cleanName, elapsedMs: Math.max(0, performance.now() - this.startedAt) }].slice(-12);
    try { performance.mark(`dbzlsw-dev:${cleanName}`); } catch { /* unsupported or duplicate mark */ }
  }

  snapshot(): PerformanceSnapshot {
    const now = performance.now();
    const elapsedMs = this.startedAt === null ? 0 : Math.max(0, now - this.startedAt);
    const resources = typeof performance.getEntriesByType === 'function'
      ? performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      : [];
    const resourceBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
    const memory = (performance as MemoryPerformance).memory;
    return {
      active: this.active,
      startedAt: this.startedAt,
      elapsedMs,
      frames: this.frames,
      fps: elapsedMs > 0 ? (this.frames * 1000) / elapsedMs : 0,
      lastFrameMs: this.lastFrameMs,
      averageFrameMs: this.frames > 0 ? this.totalFrameMs / this.frames : 0,
      worstFrameMs: this.worstFrameMs,
      longTasks: this.longTasks,
      resources: resources.length,
      resourceBytes,
      heapUsedBytes: typeof memory?.usedJSHeapSize === 'number' ? memory.usedJSHeapSize : null,
      heapLimitBytes: typeof memory?.jsHeapSizeLimit === 'number' ? memory.jsHeapSizeLimit : null,
      marks: [...this.marks],
    };
  }

  private installLongTaskObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: string[] }).supportedEntryTypes;
    if (supported && !supported.includes('longtask')) return;
    try {
      this.longTaskObserver = new PerformanceObserver(list => {
        this.longTasks += list.getEntries().length;
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      this.longTaskObserver = null;
    }
  }

  private onFrame = (timestamp: number): void => {
    if (!this.active) return;
    if (this.lastFrameAt !== null) {
      const delta = Math.max(0, timestamp - this.lastFrameAt);
      this.frames += 1;
      this.lastFrameMs = delta;
      this.totalFrameMs += delta;
      this.worstFrameMs = Math.max(this.worstFrameMs, delta);
    }
    this.lastFrameAt = timestamp;
    this.raf = requestAnimationFrame(this.onFrame);
  };
}

export const runtimePerformanceProfiler = new RuntimeProfiler();
