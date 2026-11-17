import * as THREE from 'three';

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function makeCanvasTexture(w: number, h: number, draw: DrawFn): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('contexte canvas 2D indisponible');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export interface BandSpot {
  x: number;
  y: number;
  r: number;
  c1: string;
  c2: string;
}

export function drawBands(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  palette: string[], seed: number, spot: BandSpot | null
): void {
  const r = rng(seed);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const wobble = 0.5 + 0.5 * Math.sin(t * Math.PI * 13.0 + Math.sin(t * 41.0) * 0.8);
    const idx = Math.floor((t * palette.length * 2.4 + wobble * 1.4) % palette.length);
    ctx.fillStyle = palette[(idx + palette.length) % palette.length];
    ctx.fillRect(0, y, w, 1);
  }
  // turbulence douce
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h;
    const rx = 6 + r() * 40, ry = 1 + r() * 5;
    ctx.globalAlpha = 0.05 + r() * 0.1;
    ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (spot) {
    const sx = spot.x * w, sy = spot.y * h;
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, spot.r * w);
    g.addColorStop(0, spot.c1); g.addColorStop(0.55, spot.c2); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sx, sy, spot.r * w, spot.r * w * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawRocky(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  base: string, light: string, dark: string, seed: number, craters?: number
): void {
  const r = rng(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, y = r() * h, s = 0.6 + r() * 4.5;
    ctx.globalAlpha = 0.03 + r() * 0.1;
    ctx.fillStyle = r() > 0.5 ? light : dark;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < (craters || 90); i++) {
    const x = r() * w, y = r() * h, rad = 1 + r() * 8;
    ctx.globalAlpha = 0.25 + r() * 0.3;
    ctx.strokeStyle = dark; ctx.lineWidth = 0.8 + r();
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(x - rad * 0.18, y - rad * 0.18, rad * 0.62, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawBlob(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number,
  seed: number, color: string, points?: number
): void {
  const r = rng(seed);
  const n = points || 16;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.62 + r() * 0.55;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function proceduralTexture(kind: string, seed: number): THREE.CanvasTexture {
  seed = seed >>> 0;
  if (kind === 'normal') {
    return makeCanvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, w, h);
    });
  }
  if (kind === 'specular') {
    return makeCanvasTexture(512, 256, (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#cfcfcf'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 34; i++) {
        drawBlob(ctx, r() * w, h * 0.15 + r() * h * 0.7, 16 + r() * 48, 8 + r() * 30, seed + i, '#3a3a3a');
      }
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, 7); ctx.fillRect(0, h - 7, w, 7);
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'uranusRing') {
    return makeCanvasTexture(1024, 32, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const bands: Array<[number, number, number]> = [
        [0.07, 0.006, 0.20], [0.20, 0.010, 0.32], [0.34, 0.006, 0.18],
        [0.47, 0.008, 0.38], [0.62, 0.006, 0.22], [0.78, 0.010, 0.34],
        [0.92, 0.008, 0.20]
      ];
      for (const [t, width, alpha] of bands) {
        const x = t * w, ww = Math.max(1.2, width * w);
        const g = ctx.createLinearGradient(x - ww, 0, x + ww, 0);
        g.addColorStop(0, 'rgba(205,225,235,0)');
        g.addColorStop(0.5, 'rgba(215,235,245,' + alpha + ')');
        g.addColorStop(1, 'rgba(205,225,235,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - ww, 0, ww * 2, h);
      }
    });
  }
  if (kind === 'ring') {
    return makeCanvasTexture(1024, 32, (ctx, w, h) => {
      const r = rng(seed);
      for (let x = 0; x < w; x++) {
        const t = x / w;
        let a = 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 120.0 + Math.sin(t * 27.0) * 3.0));
        if (t < 0.08 || t > 0.96) a *= 0.15;
        if (t > 0.52 && t < 0.58) a *= 0.18;
        if (t > 0.71 && t < 0.735) a *= 0.08;
        a *= 0.55 + 0.45 * r();
        const v = 120 + Math.floor(75 * Math.sin(t * 40.0) + 35 * r());
        ctx.fillStyle = 'rgba(' + (v + 28) + ',' + (v + 14) + ',' + v + ',' + Math.max(0, Math.min(1, a)) + ')';
        ctx.fillRect(x, 0, 1, h);
      }
    });
  }
  if (kind === 'stars') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#010206'; ctx.fillRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < 2600; i++) {
        const x = r() * w, y = r() * h, s = r() < 0.94 ? 0.5 + r() : 1.2 + r() * 1.4;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.75) + ')';
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  if (kind === 'milkyway') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#01030a'; ctx.fillRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < 30; i++) {
        const x = r() * w, y = h * 0.2 + r() * h * 0.6, rad = 30 + r() * 130;
        const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
        const hue = 205 + r() * 60;
        g.addColorStop(0, 'hsla(' + hue + ',55%,62%,' + (0.05 + r() * 0.12) + ')');
        g.addColorStop(1, 'hsla(' + hue + ',55%,30%,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 4200; i++) {
        const x = r() * w, y = r() * h, s = r() < 0.96 ? 0.4 + r() : 1 + r() * 1.5;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.8) + ')';
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  if (kind === 'earthDay') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      const r = rng(seed);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a2d4a'); g.addColorStop(0.5, '#0f4a73'); g.addColorStop(1, '#0a2d4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 15; i++) {
        const cx = r() * w, cy = h * 0.16 + r() * h * 0.68;
        const rx = 25 + r() * 95, ry = 14 + r() * 55;
        drawBlob(ctx, cx, cy, rx, ry, seed + i * 7, r() > 0.45 ? '#2f6b3a' : '#6e6234', 18);
        drawBlob(ctx, cx + rx * 0.2, cy - ry * 0.12, rx * 0.55, ry * 0.55, seed + i * 13, '#497b3d', 14);
      }
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#eaf4ff';
      ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 13, w, 13);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 900; i++) {
        ctx.globalAlpha = 0.04 + r() * 0.08;
        ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#00121e';
        ctx.beginPath(); ctx.arc(r() * w, r() * h, 1 + r() * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'earthNight') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#010204'; ctx.fillRect(0, 0, w, h);
      for (let c = 0; c < 210; c++) {
        const cx = r() * w, cy = h * 0.12 + r() * h * 0.76;
        const count = 6 + Math.floor(r() * 40);
        for (let i = 0; i < count; i++) {
          const a = r() * Math.PI * 2, rad = r() * (5 + r() * 22);
          const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.55;
          ctx.fillStyle = r() > 0.3 ? 'rgba(255,214,130,' + (0.25 + r() * 0.75) + ')' : 'rgba(255,245,210,' + (0.2 + r() * 0.6) + ')';
          ctx.beginPath(); ctx.arc(x, y, 0.5 + r() * 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    });
  }
  if (kind === 'clouds') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) {
        const x = r() * w, y = r() * h, rad = 8 + r() * 55;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const a = 0.12 + r() * 0.4;
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        g.addColorStop(0.6, 'rgba(255,255,255,' + a * 0.5 + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, rad * (0.7 + r() * 0.8), rad * 0.45, r() * 3.14, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  if (kind === 'sun') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      const r = rng(seed);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffcc66'); g.addColorStop(0.5, '#ff9d2e'); g.addColorStop(1, '#ffcc66');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = r() * w, y = r() * h, rad = 1 + r() * 10;
        ctx.globalAlpha = 0.05 + r() * 0.22;
        ctx.fillStyle = r() > 0.48 ? '#fff3b0' : '#c44b00';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'venusAtmosphere') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = '#d9b97a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) {
        const x = r() * w, y = r() * h, rx = 10 + r() * 100, ry = 3 + r() * 18;
        ctx.globalAlpha = 0.04 + r() * 0.12;
        ctx.fillStyle = r() > 0.5 ? '#f4dfad' : '#a97c3c';
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'venusSurface') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      drawRocky(ctx, w, h, '#b06a2f', '#e0a35e', '#6f3b16', seed, 40);
      const r = rng(seed + 9);
      for (let i = 0; i < 80; i++) {
        ctx.globalAlpha = 0.08 + r() * 0.1; ctx.fillStyle = '#f0c27a';
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 80, 4 + r() * 14, r() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'jupiter') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      drawBands(ctx, w, h, ['#c9a67a', '#e8d5b5', '#a97e58', '#dfc59e', '#8e6548', '#f1e2c9'], seed,
        { x: 0.68, y: 0.62, r: 0.075, c1: 'rgba(196,74,45,0.9)', c2: 'rgba(160,80,50,0.4)' });
    });
  }
  if (kind === 'saturn') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      drawBands(ctx, w, h, ['#d8bd8a', '#ead8ae', '#c3a373', '#f0e2bd', '#b8935e'], seed, null);
    });
  }
  if (kind === 'uranus') {
    return makeCanvasTexture(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9fe3e8'); g.addColorStop(0.5, '#b9eff2'); g.addColorStop(1, '#86d3da');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.05 + r() * 0.06; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 80, 2 + r() * 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'neptune') {
    return makeCanvasTexture(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2d4fae'); g.addColorStop(0.5, '#4169d8'); g.addColorStop(1, '#253c86');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(seed);
      for (let i = 0; i < 30; i++) {
        ctx.globalAlpha = 0.06 + r() * 0.12; ctx.fillStyle = r() > 0.5 ? '#a9c6ff' : '#101c46';
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 70, 3 + r() * 10, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'moon') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      drawRocky(ctx, w, h, '#8c8c8c', '#d6d6d6', '#4a4a4a', seed, 180);
      const r = rng(seed + 4);
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#4d4d4d';
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 50, 12 + r() * 30, r() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'mercury') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => drawRocky(ctx, w, h, '#77726c', '#b9b3aa', '#3d3a37', seed, 240));
  }
  if (kind === 'mars') {
    return makeCanvasTexture(1024, 512, (ctx, w, h) => {
      drawRocky(ctx, w, h, '#9b3f1d', '#d98555', '#4e1c0c', seed, 130);
      const r = rng(seed + 3);
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#f0e6da';
      ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 10, w, 10);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#2b1008';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 10 + r() * 40, 3 + r() * 9, r() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (kind === 'pluto') {
    return makeCanvasTexture(512, 256, (ctx, w, h) => {
      drawRocky(ctx, w, h, '#8a7a6a', '#cbbba8', '#4d4138', seed, 60);
      const r = rng(seed + 5);
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#e6d8c8';
      ctx.beginPath(); ctx.ellipse(w * 0.58, h * 0.6, w * 0.16, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#3a2d25';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath(); ctx.arc(r() * w, r() * h, 2 + r() * 12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  // Repli générique
  return makeCanvasTexture(512, 256, (ctx, w, h) => drawRocky(ctx, w, h, '#777777', '#bbbbbb', '#444444', seed, 60));
}

export function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('contexte canvas 2D indisponible');
  const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,246,220,1)');
  g.addColorStop(0.12, 'rgba(255,210,130,0.9)');
  g.addColorStop(0.35, 'rgba(255,150,50,0.35)');
  g.addColorStop(0.7, 'rgba(255,110,20,0.07)');
  g.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Étiquette anamorphique additive du disque solaire : ligne horizontale,
   profil gaussien, cœur blanc -> orange. Utilisée par le lens flare et par le
   sprite de couronne (nouveauté graphique, pas de version legacy). */
export function makeStreakTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D indisponible');
  ctx.clearRect(0, 0, 512, 64);
  const img = ctx.createImageData(512, 64);
  for (let y = 0; y < 64; y++) {
    const dy = (y - 31.5) / 5.5;
    const vertical = Math.exp(-dy * dy * 0.85);
    for (let x = 0; x < 512; x++) {
      const dx = (x - 256) / 256;
      const horizontal = Math.exp(-dx * dx * 3.4);
      const core = Math.exp(-dx * dx * 46.0);
      const a = Math.max(0, Math.min(1, horizontal * vertical * 0.85 + core * vertical * 0.9));
      const k = (y * 512 + x) * 4;
      img.data[k] = 255;
      img.data[k + 1] = Math.round(157 + 80 * core);
      img.data[k + 2] = Math.round(46 + 150 * core);
      img.data[k + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* Croix de diffraction à 4 branches pour les étoiles les plus brillantes. */
export function makeStarSpikeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D indisponible');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.07, 'rgba(255,252,246,0.92)');
  g.addColorStop(0.24, 'rgba(206,226,255,0.30)');
  g.addColorStop(0.55, 'rgba(150,190,255,0.06)');
  g.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate((k * Math.PI) / 4);
    const lg = ctx.createLinearGradient(0, 0, 62, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.55)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, -0.9);
    ctx.lineTo(62, 0);
    ctx.lineTo(0, 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -0.9);
    ctx.lineTo(-62, 0);
    ctx.lineTo(0, 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
