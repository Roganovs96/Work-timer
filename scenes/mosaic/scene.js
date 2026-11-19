// Мозаика: 10 000 кубиков — это раскраска. Незакрашенные кубики — светлая «бумага» с лёгким намёком на рисунок,
// а с ходом рабочего дня они закрашиваются яркими цветами и проявляют закат над горами и озером.
// Цвет растекается органичными пятнами от центра, свежие кубики вспыхивают, по фронту ходит «кисть».

const TOTAL = 10000;
const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); pointer-events: none; text-align: center;
    padding: 6px 14px; border-radius: 14px; background: rgba(15, 17, 22, 0.72); border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-family: -apple-system, sans-serif; white-space: nowrap; }
  .hud .big { font: 700 17px -apple-system, sans-serif; font-variant-numeric: tabular-nums; color: #f2efe6; }
  .hud .big i { font-style: normal; color: rgba(242, 239, 230, 0.5); font-weight: 500; }
  .hud .small { font-size: 11.5px; color: #8a90a0; margin-top: 1px; }
  @media (max-width: 500px) { .hud .big { font-size: 15px; } }
`);
html('<div class="hud"><div class="big">🎨 <span id="done">0</span><i> из 10 000 кубиков</i></div><div class="small" id="rate"></div></div>');

const mz = { g: null, k: -1, recent: [] };

// ===== Картина: закат над горами и озером (цвет каждого кубика считается один раз) =====
function noise(x, y, seed) {   // гладкий шум из синусов — без библиотек
  return Math.sin(x * 1.7 + seed) * 0.5 + Math.sin(y * 2.3 + seed * 1.3) * 0.5 + Math.sin((x + y) * 3.1 + seed * 2.1) * 0.25
       + Math.sin(x * 5.3 - y * 4.1 + seed) * 0.15 + Math.sin(x * 9.7 + y * 8.9 + seed * 3) * 0.08;
}
const mixC = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
const ramp = (stops, t) => { t = Math.max(0, Math.min(1, t)); let i = 0; while (i < stops.length - 2 && stops[i + 1][0] <= t) i++;
  const [t0, c0] = stops[i], [t1, c1] = stops[i + 1]; return mixC(c0, c1, (t - t0) / (t1 - t0)); };
const SKY = [[0, [58, 128, 226]], [0.4, [112, 178, 246]], [0.7, [255, 186, 150]], [0.88, [255, 140, 100]], [1, [255, 206, 140]]];
function paint(cols, rows) {
  const px = new Uint8ClampedArray(cols * rows * 3), r = rng(5), horizon = 0.6, sun = [0.68, 0.24], aspect = cols / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const u = x / cols, v = y / rows;
    let c;
    // горы: три слоя, дальние светлее
    const ridge = k => horizon - 0.06 - 0.09 * k + (noise(u * (3 + k * 2), k * 1.7, k * 5) * 0.06 + Math.sin(u * (7 + k * 3) + k) * 0.03) * (1 + k * 0.4);
    if (v < horizon) {
      c = ramp(SKY, v / horizon);
      const d = Math.hypot((u - sun[0]) * aspect, v - sun[1]);
      c = mixC(c, [255, 236, 190], Math.max(0, 0.55 - d * 2.2));                          // свечение
      if (d < 0.055) c = mixC([255, 246, 210], [255, 200, 120], d / 0.055);               // солнце
      for (let k = 2; k >= 0; k--) if (v > ridge(k)) c = mixC([74, 62, 158], [160, 150, 230], k / 2);
    } else {
      // озеро: отражение неба с рябью
      const mv = horizon - (v - horizon) * 1.4, ripple = Math.sin(v * 220 + noise(u * 6, v * 30, 2) * 3) * 0.06;
      c = mixC(ramp(SKY, mv / horizon + ripple), [36, 96, 170], 0.25 + (v - horizon) * 0.7);
      const d = Math.abs(u - sun[0]) * aspect;
      if (d < 0.05 + (v - horizon) * 0.3) c = mixC(c, [255, 210, 140], 0.45 * (1 - (v - horizon) * 2) * (0.6 + 0.4 * Math.sin(v * 160 + u * 40)));
    }
    // ели по краям на переднем плане
    for (const [tx, tw] of [[0.05, 0.09], [0.13, 0.06], [0.9, 0.08], [0.97, 0.07]]) {
      const top = 0.48 + Math.abs(tx - 0.5) * 0.2;
      if (v > top && Math.abs(u - tx) < tw * Math.max(1, 1.3 / aspect) * (v - top) / (1 - top) * 0.55) c = (x + y) % 3 ? [26, 110, 72] : [40, 140, 90];
    }
    const j = (r() - 0.5) * 14, i = (y * cols + x) * 3;                                    // живая фактура мозаики
    px[i] = c[0] + j; px[i + 1] = c[1] + j; px[i + 2] = c[2] + j;
  }
  return px;
}

// ===== Сетка, порядок закрашивания и холсты =====
function set(k, force) {
  if (force || !mz.g) {
    const W = area.clientWidth, H = area.clientHeight; if (!W || !H) return;
    const port = H > W * 1.05, cols = port ? 80 : 125, rows = TOTAL / cols;
    // порядок: пятна по шуму плюс расстояние от центра — краска растекается органично
    const pr = rng(9), keys = new Float32Array(TOTAL), order = new Uint32Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const x = i % cols / cols, y = Math.floor(i / cols) / rows;
      keys[i] = noise(x * 4, y * 4, 11) * 0.35 + Math.hypot(x - 0.5, (y - 0.5) * rows / cols) * 1.4 + pr() * 0.06;
      order[i] = i;
    }
    order.sort((a, b) => keys[a] - keys[b]);
    const art = paint(cols, rows), off = document.createElement('canvas'); off.width = cols; off.height = rows;
    const octx = off.getContext('2d'), img = octx.createImageData(cols, rows);
    const top = 48, pad = 10, s = Math.min((W - pad * 2) / cols, (H - top - pad) / rows);
    mz.g = { W, H, cols, rows, order, art, off, octx, img, s, ox: (W - cols * s) / 2, oy: top + (H - top - pad - rows * s) / 2 };
    fitCanvas(cv);
    paintFrom(0); mz.k = 0; mz.recent = [];
  }
  setDone(Math.max(0, Math.min(TOTAL, Math.floor(curPct / 100 * TOTAL + 1e-6))));
}
// все кубики заново: светлая «бумага» с лёгким серым намёком на рисунок
function paintFrom(n) {
  const { art, img, order } = mz.g, d = img.data;
  for (let i = 0; i < TOTAL; i++) {
    const o = i * 4, a = i * 3;
    const lum = art[a] * 0.3 + art[a + 1] * 0.59 + art[a + 2] * 0.11, hint = (255 - lum) * 0.16;
    d[o] = 222 - hint; d[o + 1] = 216 - hint; d[o + 2] = 204 - hint; d[o + 3] = 255;
  }
  for (let j = 0; j < n; j++) fill(order[j]);
  mz.dirty = true;
}
function fill(i) { const d = mz.g.img.data, a = mz.g.art, o = i * 4, c = i * 3; d[o] = a[c]; d[o + 1] = a[c + 1]; d[o + 2] = a[c + 2]; }
function setDone(n) {
  const g = mz.g; if (!g || n === mz.k) return;
  if (n < mz.k) { paintFrom(n); mz.recent = []; }                        // вернулись из «уйти пораньше»
  else {
    const now = performance.now();
    for (let j = mz.k; j < n; j++) { fill(g.order[j]); if (n - j <= 400) mz.recent.push([g.order[j], now]); }
  }
  mz.k = n; mz.dirty = true;
}

function frame(now) {
  const g = mz.g; if (!g) return;
  setDone(Math.max(0, Math.min(TOTAL, Math.floor(livePct() / 100 * TOTAL + 1e-6))));   // плавно, без ожидания тика
  if (mz.dirty) { g.octx.putImageData(g.img, 0, 0); mz.dirty = false; }
  beginFrame(cv, g);
  // рамка картины
  ctx.fillStyle = '#0b0d11'; ctx.fillRect(g.ox - 6, g.oy - 6, g.cols * g.s + 12, g.rows * g.s + 12);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(g.off, g.ox, g.oy, g.cols * g.s, g.rows * g.s);
  // тонкая сетка, когда кубики крупные
  if (g.s >= 3) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 1; x < g.cols; x++) { const X = Math.round(g.ox + x * g.s) + 0.5; ctx.moveTo(X, g.oy); ctx.lineTo(X, g.oy + g.rows * g.s); }
    for (let y = 1; y < g.rows; y++) { const Y = Math.round(g.oy + y * g.s) + 0.5; ctx.moveTo(g.ox, Y); ctx.lineTo(g.ox + g.cols * g.s, Y); }
    ctx.stroke();
  }
  // вспышки свежих кубиков и «кисть» на фронте
  mz.recent = mz.recent.filter(([, t]) => now - t < 1400).slice(-400);
  ctx.save();
  const sz = Math.max(g.s, 2);
  for (const [i, t] of mz.recent) {
    const q = (now - t) / 1400, x = g.ox + (i % g.cols) * g.s, y = g.oy + Math.floor(i / g.cols) * g.s;
    ctx.strokeStyle = `rgba(255, 176, 32, ${0.95 * (1 - q)})`; ctx.lineWidth = Math.max(1.5, sz * 0.25);
    ctx.strokeRect(x - sz * q * 0.6, y - sz * q * 0.6, sz * (1 + 1.2 * q), sz * (1 + 1.2 * q));
  }
  if (mz.k > 0 && mz.k < TOTAL) {
    const i = g.order[mz.k - 1], x = g.ox + (i % g.cols + 0.5) * g.s, y = g.oy + (Math.floor(i / g.cols) + 0.5) * g.s;
    const r = 10 + 3 * Math.sin(now / 250), gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255, 170, 30, 0.75)'); gr.addColorStop(1, 'rgba(255, 170, 30, 0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function tick() {
  $('done').textContent = Math.max(0, mz.k).toLocaleString('ru-RU');
  const sec = dayLenMs() / TOTAL / 1000;
  $('rate').textContent = mz.k >= TOTAL ? 'Картина готова 🖼️' : '+1 кубик каждые ' + sec.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' с';
}
function sub() {
  if (mz.k >= TOTAL) return [{ t: 'Картина закрашена целиком 🖼️' }];
  return [{ t: (TOTAL - Math.max(0, mz.k)).toLocaleString('ru-RU') + ' кубиков осталось' }];
}

registerScene({ name: 'Мозаика', icon: '🎨', author: 'Roganovs96', set, frame, tick, sub });
