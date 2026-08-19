// M8.F0 — captura de frames del vídeo GBC en el navegador (harness forense).
// Se inyecta en la pestaña de YouTube: hace seek + captura canvas + calcula
// métricas para detectar cambios de plano (localizar batallas sin visión).
// Uso: window.__gbcScan(intervalS, rangeS) → Promise<array de picos>
(function () {
  if (window.__gbcScan) return window.__gbcScan;
  const v = document.querySelector('video');
  if (!v) return null;

  async function grab(t) {
    v.currentTime = t;
    await new Promise(r => setTimeout(r, 900));
    const c = document.createElement('canvas');
    c.width = 160; c.height = 90;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, 160, 90);
    return { data: ctx.getImageData(0, 0, 160, 90).data, w: 160, h: 90 };
  }

  function diff(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]);
    return d / (a.length / 4);
  }

  // Promedio de color + saturación (para clasificar pantalla: menú/batalla/negro)
  function stats(d) {
    let r = 0, g = 0, b = 0, sat = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2];
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      sat += mx - mn;
    }
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), sat: Math.round(sat / n) };
  }

  async function scan(intervalS, rangeS, startS) {
    v.muted = true;
    await v.play().catch(() => {});
    const out = [];
    let prev = null;
    const end = startS + rangeS;
    for (let t = startS; t < end; t += intervalS) {
      const cur = await grab(t);
      const s = stats(cur.data);
      let d = 0;
      if (prev) d = diff(prev.data, cur.data);
      out.push({ t, diff: Math.round(d), ...s });
      prev = cur;
    }
    return out;
  }

  window.__gbcScan = scan;
  return scan;
})();
