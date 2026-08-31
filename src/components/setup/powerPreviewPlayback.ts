export interface PowerPreviewFrame {
  phase: 'settling' | 'charging' | 'powered';
  power?: string;
  aura?: string;
}

const images = new Map<string, Promise<string | undefined>>();
function loadImage(url: string | undefined): Promise<string | undefined> {
  if (!url) return Promise.resolve(undefined);
  const existing = images.get(url);
  if (existing) return existing;
  const pending = new Promise<string | undefined>(resolve => {
    const image = new Image();
    const finish = (loaded: boolean) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (!loaded) images.delete(url);
      resolve(loaded ? url : undefined);
    };
    const timeout = setTimeout(() => finish(false), 4000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  });
  images.set(url, pending);
  return pending;
}

/** UI playback only. Preload before charging; never show a stale or broken
 * asset. Its cancellation function covers both pending loads and timers. */
export function startPowerPreview(
  options: { powerUrl?: string; auraUrl?: string; reducedMotion: boolean },
  update: (frame: PowerPreviewFrame) => void,
): () => void {
  let cancelled = false;
  let settled = options.reducedMotion;
  let loaded = false;
  let started = false;
  let power: string | undefined;
  let aura: string | undefined;
  let chargeTimer: ReturnType<typeof setTimeout> | undefined;

  const charge = () => {
    if (cancelled || started || !settled || !loaded) return;
    started = true;
    const assets = { power, aura: power ? aura : undefined };
    update({ ...assets, phase: options.reducedMotion ? 'powered' : 'charging' });
    if (!options.reducedMotion) {
      chargeTimer = setTimeout(() => {
        if (!cancelled) update({ ...assets, phase: 'powered' });
      }, 240);
    }
  };
  update({ phase: 'settling' });
  const settleTimer = options.reducedMotion ? undefined : setTimeout(() => {
    settled = true;
    charge();
  }, 300);
  Promise.all([loadImage(options.powerUrl), loadImage(options.auraUrl)]).then(result => {
    [power, aura] = result;
    loaded = true;
    charge();
  });
  return () => {
    cancelled = true;
    clearTimeout(settleTimer);
    clearTimeout(chargeTimer);
  };
}
