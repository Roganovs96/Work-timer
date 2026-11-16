// Зимний сад: цветы прорастают и распускаются по очереди в течение рабочего дня.
// Сколько распустилось — такая доля дня прошла. В окне — небо по настоящим часам.
// Кнопка «Выполнил задачу» выпускает бабочку, и она остаётся порхать в саду до конца дня.

const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 8px; left: 10px; font-size: 13px; color: #8a90a0; pointer-events: none;
    background: rgba(15, 17, 21, 0.75); border-radius: 10px; padding: 5px 10px; line-height: 1.45; }
  .hud b { color: #e8eaf0; font-variant-numeric: tabular-nums; }
  .done { position: absolute; top: 8px; right: 10px; background: #3ddc97; color: #0f1115; border: none; border-radius: 12px;
    padding: 9px 14px; font: 700 14px -apple-system, sans-serif; cursor: pointer; box-shadow: 0 4px 14px rgba(61, 220, 151, .35); }
  .done:active { transform: scale(.95); }
  .done.pop { animation: pop .4s ease-out; }
  @keyframes pop { 50% { transform: scale(1.12); } }
  @media (max-width: 520px) { .hud { font-size: 12px; max-width: calc(100% - 170px); } .done { padding: 8px 10px; font-size: 13px; } }
`);
html(`<div class="hud">🌷 <b id="bloom">0</b> из <b id="total">0</b> распустилось<br>🦋 задач сегодня: <b id="tasks">0</b> · за окном <b id="clock">--:--</b></div>
<button class="done" id="done">✓ Выполнил задачу</button>`);

// [вид, цвет лепестков, цвет серединки, высота (доля от максимума)]
const KINDS = [
  ['tulip', '#ff5d73', '#ffd36b', 0.7], ['daisy', '#f5f5f5', '#ffc93c', 0.6], ['sunflower', '#ffc93c', '#6b3f1f', 1],
  ['rose', '#d7263d', '#a01a2e', 0.75], ['lavender', '#a78bfa', '#7c5cd6', 0.65], ['poppy', '#ff4d2e', '#1b1b1f', 0.6],
  ['bluebell', '#6ea8ff', '#3b6fd6', 0.55], ['orchid', '#ff9bd2', '#ffe08a', 0.7], ['cactus', '#ff6fae', '#ffd36b', 0.45],
  ['lily', '#fff4e6', '#ffb347', 0.8], ['cornflower', '#4f7cff', '#2a3f9a', 0.6], ['pansy', '#8e5cf7', '#ffd36b', 0.5],
];

const garden = { g: null, butterflies: [], bursts: [], tasks: 0 };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

function set(k, force) {
  if (!force && garden.g) return;
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return;
  const n = W < 520 ? 8 : 12, rows = W < 520 ? 2 : 1, perRow = n / rows, floor = H - 14;
  const r = rng(5), order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const ww = Math.min(W * 0.42, 280), wh = ww * 0.62;
  const win = { x: (W - ww) / 2, y: W < 520 ? 74 : 56, w: ww, h: wh };
  const pots = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow, back = rows === 2 && row === 0;
    const sc = back ? 0.78 : 1, y = back ? floor - (floor - win.y - win.h) * 0.42 : floor;
    // задний ряд встаёт в промежутки между передними горшками
    const x = back ? W * (col + 1) / (perRow + 1) : W * (col + 0.5) / perRow;
    const maxH = (y - win.y - win.h * 0.4) * (back ? 0.7 : 0.62);
    pots.push({ x, y, sc, maxH, kind: KINDS[i % KINDS.length], rank: order[i], ph: r() * 7 });
  }
  // задний ряд рисуем первым
  pots.sort((a, b) => a.y - b.y);
  garden.g = { W, H, n, win, pots, floor, pot: Math.min(W / perRow * 0.4, 46) };
  fitCanvas(cv);
  $('total').textContent = n;
}

// рост цветка с номером очереди rank: 0 — ничего, 1 — распустился. Распускаются по очереди, растут с перекрытием.
function growth(rank, n, p) {
  const end = (rank + 1) / n * 100, start = Math.max(0, end - 100 / n * 2.5);
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}
const bloomedCount = (n, p) => Math.min(n, Math.floor(p / 100 * n + 1e-9));

// ===== Небо в окне по настоящему времени =====
const SKY = [[0, '#0b1026', '#1a2244'], [5, '#141a3a', '#2c335e'], [6.5, '#ff9e6d', '#7fb3e6'], [8.5, '#5aa9e6', '#bfe1f7'],
             [17, '#5aa9e6', '#bfe1f7'], [19.5, '#f08a4b', '#6a4c93'], [21, '#141a3a', '#2a2f55'], [24, '#0b1026', '#1a2244']];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, q) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], q))).join(',')})`; };
function skyAt(h) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1], q = (h - h0) / (h1 - h0);
  return [mix(t0, t1, q), mix(b0, b1, q)];
}
const darkness = h => h < 5 || h > 21 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h > 19 ? (h - 19) / 2 : 0;

function drawWindow(g, now) {
  const { win: w } = g, d = new Date(), h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const [top, bottom] = skyAt(h), dk = darkness(h);
  ctx.save(); ctx.beginPath(); ctx.roundRect(w.x, w.y, w.w, w.h, [w.w / 2, w.w / 2, 4, 4]); ctx.clip();
  const gr = ctx.createLinearGradient(0, w.y, 0, w.y + w.h); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  ctx.fillStyle = gr; ctx.fillRect(w.x, w.y, w.w, w.h);
  // звёзды ночью
  if (dk > 0) {
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(now / 600 + i * 3);
      ctx.fillStyle = `rgba(255, 255, 255, ${dk * (0.3 + 0.6 * tw)})`;
      ctx.beginPath(); ctx.arc(w.x + r() * w.w, w.y + r() * w.h * 0.8, 0.6 + r() * 1.1, 0, 7); ctx.fill();
    }
  }
  // солнце днём, луна ночью — по дуге через окно
  const arc = (q, body) => {
    const x = w.x + w.w * (0.08 + 0.84 * q), y = w.y + w.h * (0.95 - 0.75 * Math.sin(Math.PI * q));
    body(x, y, w.w * 0.07);
  };
  if (h >= 6 && h <= 20.5) arc((h - 6) / 14.5, (x, y, r) => {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3); glow.addColorStop(0, 'rgba(255, 220, 120, .6)'); glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = glow; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.fillStyle = h < 7.5 || h > 18.5 ? '#ffb36b' : '#ffe58a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  });
  else arc(((h + 24 - 20.5) % 24) / 9.5, (x, y, r) => {
    ctx.fillStyle = '#f1f0e6'; ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, 7); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.2, r * 0.75, 0, 7); ctx.fill();
  });
  // холмы за окном
  ctx.fillStyle = mix('#2f6b3a', '#0e1f16', dk); ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h);
  for (let x = 0; x <= w.w; x += 6) ctx.lineTo(w.x + x, w.y + w.h * (0.82 - 0.08 * Math.sin(x / w.w * 5 + 1)));
  ctx.lineTo(w.x + w.w, w.y + w.h); ctx.fill();
  ctx.restore();
  // рама
  ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(w.x, w.y, w.w, w.h, [w.w / 2, w.w / 2, 4, 4]); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x + w.w / 2, w.y); ctx.lineTo(w.x + w.w / 2, w.y + w.h); ctx.moveTo(w.x, w.y + w.h * 0.55); ctx.lineTo(w.x + w.w, w.y + w.h * 0.55); ctx.stroke();
  ctx.fillStyle = '#8a90a0'; ctx.fillRect(w.x - 8, w.y + w.h, w.w + 16, 6);   // подоконник
  $('clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return dk;
}

// стеклянные стены оранжереи
function drawHouse(g, dk) {
  const { W, H, floor } = g;
  ctx.fillStyle = mix('#1b2a26', '#0f1715', dk); ctx.fillRect(0, 0, W, floor);
  ctx.strokeStyle = 'rgba(201, 206, 216, 0.12)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += Math.max(60, W / 10)) { ctx.moveTo(x, 0); ctx.lineTo(x, floor); }
  for (let y = 40; y < floor; y += 90) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = '#6e4526'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, floor, 38, 3);
}

// ===== Цветы =====
function petals(n, len, wid, color, rot) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * Math.PI * 2;
    ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -len / 2, wid, len / 2, 0, 0, 7); ctx.fill(); ctx.restore();
  }
}
function head(kind, color, center, s, open, now) {
  const o = 0.25 + 0.75 * open;
  switch (kind) {
    case 'tulip':
      ctx.fillStyle = color; for (const a of [-0.35 * o, 0, 0.35 * o]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.32, s * 0.55, 0, 0, 7); ctx.fill(); ctx.restore(); } break;
    case 'daisy': case 'cornflower':
      petals(kind === 'daisy' ? 14 : 10, s * 0.9 * o, s * 0.14, color, 0); ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, 7); ctx.fill(); break;
    case 'sunflower':
      petals(18, s * 1.1 * o, s * 0.17, color, 0); ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 12; i++) { const a = i * 2.4; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.25 * (i % 3 + 1) / 3, Math.sin(a) * s * 0.25 * (i % 3 + 1) / 3, s * 0.05, 0, 7); ctx.fill(); } break;
    case 'rose':
      for (let i = 3; i >= 1; i--) { ctx.fillStyle = i % 2 ? color : center; ctx.beginPath(); ctx.arc(0, 0, s * 0.22 * i * o, 0, 7); ctx.fill(); } break;
    case 'lavender':
      ctx.fillStyle = color; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse((i % 2 ? 1 : -1) * s * 0.1 * o, -i * s * 0.16, s * 0.1 * (0.4 + o * 0.6), s * 0.08, 0, 0, 7); ctx.fill(); } break;
    case 'poppy': case 'pansy':
      petals(kind === 'poppy' ? 4 : 5, s * 0.8 * o, s * 0.38, color, 0.4); ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, 7); ctx.fill(); break;
    case 'bluebell':
      ctx.fillStyle = color; for (const [dx, dy] of [[-0.35, 0.2], [0, 0.45], [0.35, 0.2]]) { ctx.beginPath(); ctx.moveTo(dx * s - s * 0.15 * o, dy * s); ctx.quadraticCurveTo(dx * s, dy * s - s * 0.4, dx * s + s * 0.15 * o, dy * s); ctx.lineTo(dx * s, dy * s + s * 0.1); ctx.fill(); } break;
    case 'orchid':
      petals(5, s * 0.75 * o, s * 0.24, color, 0); ctx.fillStyle = '#d94f9a'; ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.15, s * 0.22 * o, 0, 0, 7); ctx.fill();
      ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, 7); ctx.fill(); break;
    case 'lily':
      petals(6, s * 1.0 * o, s * 0.18, color, 0); ctx.strokeStyle = center; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3); } ctx.stroke(); break;
    case 'cactus':
      petals(8, s * 0.6 * o, s * 0.16, color, 0); ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, s * 0.12, 0, 7); ctx.fill(); break;
  }
}

function drawFlower(g, pot, p, now) {
  const [kind, color, center, hk] = pot.kind, gr = growth(pot.rank, g.n, p), s = g.pot * pot.sc;
  const { x, y } = pot;
  // горшок
  ctx.fillStyle = '#b5532e'; ctx.beginPath(); ctx.moveTo(x - s * 0.55, y - s * 0.75); ctx.lineTo(x + s * 0.55, y - s * 0.75);
  ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x - s * 0.4, y); ctx.fill();
  ctx.fillStyle = '#c86a3e'; ctx.fillRect(x - s * 0.6, y - s * 0.85, s * 1.2, s * 0.16);
  ctx.fillStyle = '#3a2516'; ctx.fillRect(x - s * 0.5, y - s * 0.85, s, s * 0.05);
  if (gr <= 0) return;
  const base = y - s * 0.82, stemT = Math.min(1, gr / 0.6), bud = Math.max(0, Math.min(1, (gr - 0.6) / 0.2)), open = Math.max(0, (gr - 0.8) / 0.2);
  const H = pot.maxH * hk * smooth(stemT) * pot.sc, sway = Math.sin(now / 1400 + pot.ph) * H * 0.04;
  const tx = x + sway, ty = base - H;
  if (kind === 'cactus') {   // кактус растёт телом
    ctx.fillStyle = '#3f8f4a'; ctx.beginPath(); ctx.roundRect(x - s * 0.28, ty, s * 0.56, H, s * 0.28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let yy = ty + 6; yy < base; yy += 8) { ctx.moveTo(x - s * 0.1, yy); ctx.lineTo(x - s * 0.18, yy - 2); ctx.moveTo(x + s * 0.1, yy); ctx.lineTo(x + s * 0.18, yy - 2); } ctx.stroke();
  } else {
    ctx.strokeStyle = '#3f8f4a'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x - sway, base - H * 0.5, tx, ty); ctx.stroke();
    // листья появляются по мере роста
    ctx.fillStyle = '#4f9a4a';
    for (const [f, side] of [[0.3, -1], [0.55, 1], [0.75, -1]]) {
      if (stemT < f) continue;
      const lx = lerp(x, tx, f), ly = base - H * f, ls = s * 0.45 * Math.min(1, (stemT - f) * 4);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(side * 0.9); ctx.beginPath(); ctx.ellipse(0, -ls / 2, ls * 0.28, ls / 2, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  }
  if (bud <= 0) return;
  ctx.save(); ctx.translate(tx, ty);
  if (open <= 0) {   // бутон
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -s * 0.2 * bud, s * 0.16 * bud, s * 0.28 * bud, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4f9a4a'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.18 * bud, s * 0.1 * bud, 0, 0, 7); ctx.fill();
  } else head(kind, color, center, s * 0.85, smooth(open), now);
  ctx.restore();
}

// ===== Бабочки за выполненные задачи =====
const WING = ['#ff9f43', '#4f9cff', '#ff6fae', '#ffd36b', '#a78bfa', '#3ddc97', '#ff5d73'];
function addButterfly(i, t0) {
  const r = rng(i * 97 + 3);
  garden.butterflies.push({ t0, c: WING[i % WING.length], c2: WING[(i + 3) % WING.length], hx: r(), hy: r(), ph: r() * 7, sp: 0.6 + r() * 0.6 });
}
function drawButterflies(g, now) {
  const { win } = g;
  for (const b of garden.butterflies) {
    const t = (now - b.t0) / 1000, home = [g.W * (0.1 + 0.8 * b.hx), win.y + win.h + (g.floor - win.y - win.h) * (0.15 + 0.5 * b.hy)];
    const flutter = [Math.sin(t * b.sp + b.ph) * g.W * 0.08 + Math.sin(t * 2.3 * b.sp) * 10, Math.sin(t * 1.3 * b.sp + b.ph) * 30 + Math.sin(t * 3.1) * 6];
    const q = smooth(Math.min(1, t / 2.5)), start = [win.x + win.w / 2, win.y + win.h / 2];
    const x = lerp(start[0], home[0] + flutter[0], q), y = lerp(start[1], home[1] + flutter[1], q) - Math.sin(Math.PI * q) * 40;
    const flap = Math.abs(Math.sin(now / 70 + b.ph)), sz = Math.max(7, g.pot * 0.3);
    ctx.save(); ctx.translate(x, y);
    for (const side of [-1, 1]) {
      ctx.fillStyle = b.c; ctx.beginPath(); ctx.ellipse(side * sz * 0.55 * flap, -sz * 0.25, sz * 0.6 * flap + 1, sz * 0.5, side * 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = b.c2; ctx.beginPath(); ctx.ellipse(side * sz * 0.4 * flap, sz * 0.3, sz * 0.4 * flap + 1, sz * 0.32, -side * 0.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#1b1b1f'; ctx.fillRect(-1, -sz * 0.6, 2, sz * 1.2);
    ctx.restore();
  }
  // искорки от нажатия
  garden.bursts = garden.bursts.filter(bs => now - bs.t0 < 900);
  for (const bs of garden.bursts) {
    const q = (now - bs.t0) / 900;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, d = 10 + q * 50;
      ctx.fillStyle = `rgba(255, 211, 107, ${1 - q})`; ctx.beginPath(); ctx.arc(bs.x + Math.cos(a) * d, bs.y + Math.sin(a) * d, 2.5, 0, 7); ctx.fill();
    }
  }
}

function loadTasks() {
  const st = sceneStore.get('day', null);
  garden.tasks = st && st.date === today() ? Math.min(999, st.tasks | 0) : 0;
  garden.butterflies = [];
  for (let i = 0; i < Math.min(garden.tasks, 24); i++) addButterfly(i, performance.now() - 10000 - i * 777);
  $('tasks').textContent = garden.tasks;
}
$('done').onclick = () => {
  if (!garden.g) return;
  if (sceneStore.get('day', {}).date !== today()) loadTasks();      // наступил новый день
  garden.tasks++;
  sceneStore.set('day', { date: today(), tasks: garden.tasks });
  if (garden.butterflies.length < 24) addButterfly(garden.tasks - 1, performance.now());
  garden.bursts.push({ t0: performance.now(), x: garden.g.win.x + garden.g.win.w / 2, y: garden.g.win.y + garden.g.win.h / 2 });
  $('tasks').textContent = garden.tasks;
  const b = $('done'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
};
loadTasks();

function frame(now) {
  const g = garden.g; if (!g) return;
  beginFrame(cv, g);
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  drawHouse(g, darkness(h));
  const dk = drawWindow(g, now), p = livePct();
  for (const pot of g.pots) drawFlower(g, pot, p, now);
  drawButterflies(g, now);
  // ночью в оранжерее темнее
  if (dk > 0) { ctx.fillStyle = `rgba(5, 8, 25, ${dk * 0.3})`; ctx.fillRect(0, 0, g.W, g.H); }
}

function tick() { if (garden.g) $('bloom').textContent = bloomedCount(garden.g.n, curPct); }

function sub() {
  const g = garden.g; if (!g) return [{ t: 'Сад просыпается' }];
  const b = bloomedCount(g.n, curPct);
  if (b >= g.n) return [{ t: 'Все цветы распустились 🌸' }];
  return [{ t: 'Следующий цветок через ' }, { ms: ((b + 1) / g.n * 100 - curPct) / 100 * dayLenMs(), b: true }];
}

registerScene({ name: 'Зимний сад', author: 'Roganovs96', set, frame, tick, sub });
