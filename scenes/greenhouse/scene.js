// Зимний сад — уютная ботаническая оранжерея.
// Растения на длинной грядке прорастают и распускаются по очереди в течение рабочего дня:
// сколько распустилось — такая доля дня прошла. Свет меняется вместе с днём:
// утро → полдень → золотой час → сумерки с фонариками → ночь.
// Кнопка «Выполнил задачу» выпускает бабочку, а каждая третья задача сажает росток на полку.
//
// Сцена рисуется слоями: фон (небо, стекло, каркас, полки, пол, грядка) кешируется
// в отдельный холст и перерисовывается редко; растения, свет, светлячки и бабочки — каждый кадр.

const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 10px; left: 10px; display: flex; gap: 6px; align-items: stretch; pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
  .chip { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 9px; border-radius: 14px;
    background: rgba(18, 24, 22, 0.55); border: 1px solid rgba(255, 255, 255, 0.09);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); }
  .chip .ic { font-size: 16px; line-height: 1; }
  .chip .v { font: 650 16px/1.1 -apple-system, sans-serif; color: #f2efe6; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .chip .v i { font-style: normal; color: rgba(242, 239, 230, 0.5); font-weight: 500; }
  .chip small { display: block; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: rgba(242, 239, 230, 0.55); margin-top: 1px; }
  .phase { align-self: center; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: rgba(242, 239, 230, 0.7);
    padding: 4px 10px; border-radius: 10px; background: rgba(18, 24, 22, 0.35); border: 1px solid rgba(255, 255, 255, 0.06); }
  .acts { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; align-items: stretch; }
  .reset { min-width: 38px; padding: 0 11px; border-radius: 14px; cursor: pointer; color: rgba(242, 239, 230, 0.8);
    background: rgba(18, 24, 22, 0.55); border: 1px solid rgba(255, 255, 255, 0.1); font: 600 15px -apple-system, sans-serif;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: background .2s, color .2s; white-space: nowrap; }
  .reset.ask { background: rgba(200, 70, 60, 0.75); color: #fff; font-size: 13px; border-color: rgba(255, 160, 150, 0.4); }
  .done { display: flex; align-items: center; gap: 7px; cursor: pointer;
    padding: 9px 15px 9px 11px; border-radius: 14px; border: 1px solid rgba(160, 240, 190, 0.35);
    background: linear-gradient(180deg, rgba(92, 196, 132, 0.85), rgba(52, 150, 96, 0.85)); color: #f4fff7;
    font: 650 14px -apple-system, sans-serif; letter-spacing: .01em;
    box-shadow: 0 6px 20px rgba(40, 140, 80, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: transform .15s; }
  .done .ck { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: rgba(255, 255, 255, 0.22); font-size: 12px; }
  .done:active { transform: scale(.96); }
  .done.glow { animation: glow 1.1s ease-out; }
  @keyframes glow { 0% { box-shadow: 0 0 0 0 rgba(140, 255, 190, .7), 0 6px 20px rgba(40, 140, 80, .35); }
    100% { box-shadow: 0 0 0 22px rgba(140, 255, 190, 0), 0 6px 20px rgba(40, 140, 80, .35); } }
  .toast { position: absolute; left: 50%; top: 58px; transform: translate(-50%, 0); pointer-events: none; opacity: 0;
    padding: 7px 14px; border-radius: 14px; font: 600 13px -apple-system, sans-serif; color: #fff8e6; white-space: nowrap;
    background: rgba(30, 36, 32, 0.6); border: 1px solid rgba(255, 230, 170, 0.25);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 0 30px rgba(255, 210, 120, 0.25); }
  .toast.on { animation: toast 2.8s ease-out; }
  @keyframes toast { 0% { opacity: 0; transform: translate(-50%, 8px); } 12% { opacity: 1; transform: translate(-50%, 0); }
    80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -6px); } }
  @media (max-width: 560px) {
    .hud { flex-direction: column; gap: 5px; } .phase { align-self: flex-start; }
    .chip { padding: 5px 10px 5px 8px; } .chip .v { font-size: 14px; }
    .done { padding: 8px 12px 8px 9px; font-size: 13px; } .reset { min-width: 34px; padding: 0 9px; } .toast { top: auto; bottom: 18%; }
  }
`);
html(`<div class="hud">
  <div class="chip"><span class="ic">🌷</span><div><div class="v"><span id="bloom">0</span><i> / <span id="total">0</span></i></div><small>распустилось</small></div></div>
  <div class="chip"><span class="ic">🦋</span><div><div class="v" id="tasks">0</div><small>задач сегодня</small></div></div>
  <div class="phase" id="phase">утро</div>
</div>
<div class="acts"><button class="reset" id="reset" title="Сбросить задачи за сегодня">↺</button>
<button class="done" id="done"><span class="ck">✓</span>Выполнил задачу</button></div>
<div class="toast" id="toast"></div>`);

// ===== Цвета и свет по ходу рабочего дня =====
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const rgb = a => `rgb(${a.map(v => Math.round(v)).join(',')})`;
const mixA = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));
// [процент дня, верх неба, низ неба, оттенок света (multiply), лучи, фонарики, название]
const LIGHT = [
  [0, '#86aee0', '#f6cfae', '#f3eadf', 0.16, 0.0, 'утро'],
  [30, '#4f9fe6', '#cfe8f8', '#ffffff', 0.18, 0.0, 'полдень'],
  [62, '#6b9fd2', '#f4cc8a', '#fbe6c8', 0.24, 0.05, 'золотой час'],
  [84, '#2a3566', '#d27c68', '#c2b4c8', 0.06, 0.75, 'сумерки'],
  [100, '#0b1029', '#1c2450', '#7f84a8', 0.0, 1.0, 'ночь'],
].map(([p, top, bot, tint, rays, lamps, name]) => ({ p, top: hex(top), bot: hex(bot), tint: hex(tint), rays, lamps, name }));
function lightAt(p) {
  let i = 0; while (i < LIGHT.length - 2 && LIGHT[i + 1].p <= p) i++;
  const a = LIGHT[i], b = LIGHT[i + 1], q = smooth(Math.max(0, Math.min(1, (p - a.p) / (b.p - a.p))));
  return { top: mixA(a.top, b.top, q), bot: mixA(a.bot, b.bot, q), tint: mixA(a.tint, b.tint, q),
           rays: lerp(a.rays, b.rays, q), lamps: lerp(a.lamps, b.lamps, q), name: q < 0.5 ? a.name : b.name };
}
// солнце идёт по дуге и садится к сумеркам
const sunAt = (g, p) => { const q = Math.min(1.1, p / 86); return [g.W * (0.08 + 0.84 * q), g.wallY - (g.wallY - g.skyTop) * 0.95 * Math.sin(Math.PI * Math.min(1, q))]; };

// ===== Растения, которые растут весь день =====
// [вид, высота (доля от максимума), горшок]
const KINDS_PHONE = [['orchid', 0.75, 'ceramic'], ['monstera', 0.9, 'terra'], ['fern', 0.6, 'glaze'], ['succulent', 0.35, 'terra'],
  ['tulip', 0.65, 'ceramic'], ['peacelily', 0.7, 'glaze'], ['hydrangea', 0.6, 'terra'], ['anthurium', 0.7, 'ceramic']];
const KINDS_WIDE = [...KINDS_PHONE, ['sunflower', 0.82, 'terra'], ['lavender', 0.6, 'glaze'], ['rose', 0.72, 'terra'], ['cactus', 0.5, 'ceramic']];

const garden = { g: null, bg: null, bgKey: '', butterflies: [], seedlings: [], tasks: 0, toastT: 0 };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

function set(k, force) {
  if (!force && garden.g) return;
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return;
  const phone = W < 560, kinds = phone ? KINDS_PHONE : KINDS_WIDE, n = kinds.length;
  const floorY = H * (phone ? 0.86 : 0.84), benchY = H * (phone ? 0.74 : 0.72), beamY = Math.max(phone ? 96 : 54, H * 0.14);
  const bx0 = W * (phone ? 0.03 : 0.07), bx1 = W * (phone ? 0.97 : 0.86);
  const r = rng(5), order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const step = (bx1 - bx0) / n, ps = Math.min(step * 0.52, H * 0.07, 34);
  const plants = kinds.map(([kind, hk, pot], i) => ({
    kind, hk, pot, rank: order[i], ph: r() * 7, x: bx0 + step * (i + 0.5), y: benchY + (i % 2 ? 3 : -1), s: ps * (i % 2 ? 1 : 0.94),
    maxH: (benchY - beamY - 24) * hk,
  }));
  const shelfW = phone ? W * 0.2 : W * 0.15;
  const shelves = phone
    ? [{ x: W * 0.02, y: H * 0.45, w: shelfW }, { x: W - shelfW - W * 0.02, y: H * 0.45, w: shelfW }]
    : [{ x: W * 0.02, y: H * 0.36, w: shelfW }, { x: W * 0.02, y: H * 0.52, w: shelfW }, { x: W * 0.87, y: H * 0.40, w: W * 0.11 }];
  garden.g = {
    W, H, phone, n, floorY, benchY, beamY, bx0, bx1, plants, shelves, wallY: floorY, skyTop: beamY * 0.2,
    hang: phone ? [W * 0.33, W * 0.67] : [W * 0.3, W * 0.52, W * 0.72],
    table: phone ? null : { x: W * 0.015, y: H * 0.88, w: W * 0.12 },
    big: { x: phone ? W * 1.02 : W * 0.935, y: H + 6, s: Math.min(H * 0.34, W * (phone ? 0.2 : 0.12)) },
  };
  garden.bgKey = '';
  fitCanvas(cv);
  $('total').textContent = n;
}

function growth(rank, n, p) {
  const end = (rank + 1) / n * 100, start = Math.max(0, end - 100 / n * 2.5);
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}
const bloomedCount = (n, p) => Math.min(n, Math.floor(p / 100 * n + 1e-9));

// ===== Рисовальные помощники =====
// лист: от основания (x, y) под углом a, длина len, ширина wid; c1 — тёмный, c2 — светлый край
function leaf(x, y, a, len, wid, c1, c2, vein = true) {
  if (len < 0.5) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const gr = ctx.createLinearGradient(0, -wid, 0, wid); gr.addColorStop(0, c2); gr.addColorStop(1, c1);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -wid, len * 0.7, -wid * 0.9, len, 0);
  ctx.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.25, wid, 0, 0); ctx.fill();
  if (vein && len > 8) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = Math.max(0.6, wid * 0.08); ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke(); }
  ctx.restore();
}
function stem(x0, y0, x1, y1, bend, w, c = '#4c8a46') {
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); ctx.stroke();
}
function petalRing(n, len, wid, c1, c2, rot = 0) {
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.rotate(rot + i / n * Math.PI * 2);
    const gr = ctx.createLinearGradient(0, 0, 0, -len); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -len / 2, wid, len / 2, 0, 0, 7); ctx.fill(); ctx.restore();
  }
}
function pot(x, y, s, style) {
  const top = y - s * 0.95, body = { terra: ['#b9603a', '#8e4325'], ceramic: ['#ece6da', '#bdb4a3'], glaze: ['#3f8f8a', '#2a615e'] }[style];
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 1, s * 0.62, s * 0.12, 0, 0, 7); ctx.fill();
  const gr = ctx.createLinearGradient(x - s * 0.6, 0, x + s * 0.6, 0); gr.addColorStop(0, body[1]); gr.addColorStop(0.35, body[0]); gr.addColorStop(1, body[1]);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - s * 0.52, top); ctx.lineTo(x + s * 0.52, top); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x - s * 0.4, y); ctx.fill();
  ctx.fillStyle = body[0]; ctx.beginPath(); ctx.roundRect(x - s * 0.6, top - s * 0.16, s * 1.2, s * 0.2, s * 0.05); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'; ctx.fillRect(x - s * 0.55, top - s * 0.15, s * 1.1, s * 0.04);
  ctx.fillStyle = '#3b2a1e'; ctx.beginPath(); ctx.ellipse(x, top - s * 0.06, s * 0.5, s * 0.07, 0, 0, 7); ctx.fill();
  return top - s * 0.06;
}

// ===== Каждое растение: g — рост 0..1, s — размер горшка, H — высота растения =====
const PLANT = {
  orchid(g, s, H, t, ph) {
    const lf = Math.min(1, g / 0.4);
    for (const [a, l] of [[-2.7, 0.9], [-0.45, 0.95], [-2.9, 0.6], [-0.2, 0.65]]) leaf(0, 0, a, s * 1.1 * l * lf, s * 0.28 * lf, '#2f6b3a', '#5d9a55');
    const st = Math.max(0, Math.min(1, (g - 0.25) / 0.45)); if (st <= 0) return;
    const tipX = H * 0.38 * st, tipY = -H * st;
    stem(0, -2, tipX, tipY, -H * 0.25 * st, Math.max(1.2, s * 0.05), '#6a8f4a');
    for (let i = 0; i < 5; i++) {                                   // цветки раскрываются по очереди вдоль стрелки
      const q = 0.35 + i * 0.15, open = Math.max(0, Math.min(1, (g - 0.62 - i * 0.07) / 0.18)); if (st < q) continue;
      const fx = tipX * q * 1.05 - H * 0.08 * Math.sin(q * 3), fy = tipY * q, sz = s * 0.42 * (0.35 + 0.65 * open);
      ctx.save(); ctx.translate(fx, fy);
      if (open <= 0.05) { ctx.fillStyle = '#d9c6e8'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.11, 0, 0, 7); ctx.fill(); }
      else { petalRing(5, sz, sz * 0.42, '#f6eef8', '#ffffff'); ctx.fillStyle = '#c2386f'; ctx.beginPath(); ctx.ellipse(0, sz * 0.2, sz * 0.22, sz * 0.3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0, -sz * 0.05, sz * 0.09, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  },
  monstera(g, s, H, t) {
    const leaves = [[-2.05, 0.75], [-1.4, 1], [-0.85, 0.85], [-1.75, 0.6], [-1.1, 0.65]];
    leaves.forEach(([a, l], i) => {
      const q = Math.max(0, Math.min(1, (g - i * 0.13) / 0.38)); if (q <= 0) return;
      const len = H * 0.62 * l * q, ex = Math.cos(a) * len, ey = Math.sin(a) * len;
      stem(0, 0, ex, ey, len * 0.12, Math.max(1.4, s * 0.06), '#3e7a3d');
      const L = s * 1.25 * l * q;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + Math.PI / 2 + 0.35 * Math.cos(a));
      const gr = ctx.createLinearGradient(-L, 0, L, 0); gr.addColorStop(0, '#1f5a2c'); gr.addColorStop(0.5, '#3f8a45'); gr.addColorStop(1, '#245f30');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-L * 0.9, -L * 0.1, -L * 0.8, -L * 1.1, 0, -L * 1.25); ctx.bezierCurveTo(L * 0.8, -L * 1.1, L * 0.9, -L * 0.1, 0, 0); ctx.fill();
      if (q > 0.85) {                                               // взрослые листья — с прорезями
        ctx.strokeStyle = 'rgba(16, 40, 24, 0.45)'; ctx.lineWidth = Math.max(0.8, L * 0.035); ctx.lineCap = 'round'; ctx.beginPath();
        for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const yy = -L * (0.3 + k * 0.28); ctx.moveTo(sd * L * 0.78 * (1 - k * 0.15), yy); ctx.lineTo(sd * L * 0.35, yy - L * 0.05); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L * 1.15); ctx.stroke();
      ctx.restore();
    });
  },
  fern(g, s, H, t) {
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const q = Math.max(0, Math.min(1, (g - i * 0.05) / 0.55)); if (q <= 0) continue;
      const a = -Math.PI / 2 + (i - (fronds - 1) / 2) * 0.32, len = H * 0.85 * q * (0.75 + 0.25 * Math.cos(i * 1.3));
      const curl = 1 - q;                                             // молодые вайи закручены улиткой
      let px = 0, py = 0, ang = a;
      const seg = 12, sl = len / seg;
      ctx.strokeStyle = '#4c8a46'; ctx.lineWidth = Math.max(1, s * 0.035);
      for (let k = 0; k < seg; k++) {
        const nx = px + Math.cos(ang) * sl, ny = py + Math.sin(ang) * sl;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        const lw = s * 0.32 * (1 - k / seg) * Math.min(1, q * 1.4);
        if (k > 0 && k < seg - 1) { leaf(nx, ny, ang - 1.2, lw, lw * 0.28, '#3c7e3e', '#6fae5c', false); leaf(nx, ny, ang + 1.2, lw, lw * 0.28, '#3c7e3e', '#6fae5c', false); }
        px = nx; py = ny; ang += (a < -Math.PI / 2 ? -1 : 1) * (0.05 + curl * 0.5 * k / seg);
      }
    }
  },
  succulent(g, s, H, t) {
    const q = Math.min(1, g / 0.7), R = s * 0.85 * (0.3 + 0.7 * q);
    for (let ring = 2; ring >= 0; ring--) {
      const n = 7 + ring * 2, len = R * (0.45 + ring * 0.28);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI + (i + ring * 0.5) / n * Math.PI;
        leaf(0, -R * 0.15, a, len, len * 0.32, '#5f8f8a', ring === 2 ? '#a6c6bf' : '#8fb8b0', false);
        if (ring === 2) { ctx.fillStyle = 'rgba(214, 120, 150, 0.6)'; ctx.beginPath(); ctx.arc(Math.cos(a) * len * 0.95, -R * 0.15 + Math.sin(a) * len * 0.95, Math.max(1, len * 0.07), 0, 7); ctx.fill(); }
      }
    }
    const b = Math.max(0, (g - 0.7) / 0.3); if (b <= 0) return;       // цветонос с колокольчиками
    const tx = s * 0.4, ty = -R - H * 0.6 * b;
    stem(0, -R * 0.4, tx, ty, s * 0.3, Math.max(1, s * 0.04), '#c27a6a');
    for (let i = 0; i < 4; i++) { const q2 = 0.6 + i * 0.12; ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.ellipse(tx * q2 + s * 0.08 * (i % 2 ? 1 : -1), -R * 0.4 + (ty + R * 0.4) * q2, s * 0.07 * b, s * 0.1 * b, 0, 0, 7); ctx.fill(); }
  },
  tulip(g, s, H, t) { bulbFlower(g, s, H, (open, sz) => {
    for (const [a, c] of [[-0.42, '#e8435e'], [0.42, '#e8435e'], [0, '#ff6b7f']]) {
      ctx.save(); ctx.rotate(a * (0.3 + 0.7 * open));
      const gr = ctx.createLinearGradient(0, 0, 0, -sz * 1.1); gr.addColorStop(0, '#b8203a'); gr.addColorStop(1, c);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -sz * 0.55, sz * 0.36, sz * 0.6, 0, 0, 7); ctx.fill(); ctx.restore();
    } }, [[-2.5, 0.9], [-0.7, 0.85]]); },
  peacelily(g, s, H, t) {
    for (const [a, l] of [[-2.4, 0.8], [-1.9, 1], [-1.3, 0.95], [-0.75, 0.85], [-1.6, 0.7]]) {
      const q = Math.min(1, g / 0.55); leaf(0, 0, a, H * 0.5 * l * q, s * 0.5 * q, '#1f5a2c', '#3f8a45');
    }
    const b = Math.max(0, (g - 0.55) / 0.45); if (b <= 0) return;
    for (const [dx, h] of [[-0.25, 0.95], [0.3, 0.8]]) {
      const tx = dx * s * 2, ty = -H * h * Math.min(1, b * 1.5);
      stem(0, -2, tx, ty, dx * s, Math.max(1.2, s * 0.045), '#4c8a46');
      const sz = s * 0.55 * Math.min(1, b * 1.2);
      ctx.save(); ctx.translate(tx, ty);
      const gr = ctx.createLinearGradient(0, 0, 0, -sz * 1.6); gr.addColorStop(0, '#dfe9d8'); gr.addColorStop(1, '#ffffff');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-sz * 0.7, -sz * 0.4, -sz * 0.4, -sz * 1.3, 0, -sz * 1.6);
      ctx.bezierCurveTo(sz * 0.4, -sz * 1.3, sz * 0.7, -sz * 0.4, 0, 0); ctx.fill();
      ctx.fillStyle = '#f2e3a0'; ctx.beginPath(); ctx.ellipse(0, -sz * 0.55, sz * 0.09, sz * 0.32, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  },
  hydrangea(g, s, H, t) {
    const q = Math.min(1, g / 0.5);
    for (const [a, l] of [[-2.6, 0.8], [-0.5, 0.8], [-2.0, 0.7], [-1.1, 0.7]]) leaf(0, -H * 0.15 * q, a, s * 0.95 * l * q, s * 0.34 * q, '#2f6b3a', '#5d9a55');
    stem(0, 0, 0, -H * 0.5 * q, s * 0.1, Math.max(1.3, s * 0.06));
    const b = Math.max(0, (g - 0.5) / 0.5); if (b <= 0) return;
    const R = s * 0.75 * (0.25 + 0.75 * b), cy = -H * 0.5 * q - R * 0.6, r2 = rng(Math.round(s * 13));
    for (let i = 0; i < 26; i++) {                                    // шапка из маленьких цветков
      const a = r2() * Math.PI * 2, d = Math.sqrt(r2()) * R, fx = Math.cos(a) * d, fy = cy + Math.sin(a) * d * 0.85;
      const c = i % 3 ? '#7fa6f0' : '#b59cf2', fs = R * 0.2;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
      ctx.fillStyle = c; for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, -fs * 0.45, fs * 0.32, fs * 0.45, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#eef'; ctx.beginPath(); ctx.arc(0, 0, fs * 0.12, 0, 7); ctx.fill(); ctx.restore();
    }
  },
  anthurium(g, s, H, t) {
    for (const [a, l] of [[-2.3, 0.85], [-0.8, 0.9], [-1.55, 0.75]]) {
      const q = Math.min(1, g / 0.5), len = H * 0.55 * l * q, ex = Math.cos(a) * len, ey = Math.sin(a) * len;
      stem(0, 0, ex, ey, len * 0.1, Math.max(1.2, s * 0.045), '#3e7a3d');
      leaf(ex, ey, a + 0.6, s * 1.0 * q, s * 0.36 * q, '#1f5a2c', '#3f8a45');
    }
    const b = Math.max(0, (g - 0.5) / 0.5); if (b <= 0) return;
    const tx = s * 0.35, ty = -H * 0.9 * Math.min(1, b * 1.4), sz = s * 0.55 * Math.min(1, b * 1.2);
    stem(0, -2, tx, ty, -s * 0.4, Math.max(1.2, s * 0.045), '#4c8a46');
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.3);
    const gr = ctx.createRadialGradient(-sz * 0.2, -sz * 0.3, 0, 0, 0, sz * 1.2); gr.addColorStop(0, '#ff6a6a'); gr.addColorStop(1, '#b3122a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, sz * 0.5); ctx.bezierCurveTo(-sz * 1.1, -sz * 0.1, -sz * 0.6, -sz * 1.1, 0, -sz * 0.6);
    ctx.bezierCurveTo(sz * 0.6, -sz * 1.1, sz * 1.1, -sz * 0.1, 0, sz * 0.5); ctx.fill();
    ctx.strokeStyle = '#f2d36b'; ctx.lineWidth = Math.max(2, sz * 0.16); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -sz * 0.1); ctx.lineTo(sz * 0.25, -sz * 0.75); ctx.stroke();
    ctx.restore();
  },
  sunflower(g, s, H, t) { bulbFlower(g, s, H, (open, sz) => {
    petalRing(20, sz * 1.15, sz * 0.17, '#e8a317', '#ffd447'); petalRing(14, sz * 0.9, sz * 0.15, '#e39a12', '#ffcd3c', 0.2);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 0.5); gr.addColorStop(0, '#3b2412'); gr.addColorStop(1, '#6b3f1f');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, sz * 0.48, 0, 7); ctx.fill(); }, [[-2.6, 1.1], [-0.55, 1.1], [-2.2, 0.8], [-0.95, 0.8]], 1.5); },
  lavender(g, s, H, t) {
    for (let k = -3; k <= 3; k++) {
      const q = Math.min(1, g / 0.6), tx = k * s * 0.18, ty = -H * (0.75 + 0.2 * Math.cos(k)) * q;
      stem(0, 0, tx, ty, k * 2, Math.max(1, s * 0.03), '#6f9a6a');
      const b = Math.max(0, (g - 0.6) / 0.4);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#9a7fe0' : '#b39af0'; ctx.beginPath(); ctx.ellipse(tx + (i % 2 ? 1.5 : -1.5), ty + i * s * 0.09, s * 0.06 * (0.3 + 0.7 * b), s * 0.08 * (0.3 + 0.7 * b), 0, 0, 7); ctx.fill(); }
    }
  },
  rose(g, s, H, t) {
    const q = Math.min(1, g / 0.55);
    stem(0, 0, 0, -H * q, s * 0.15, Math.max(1.3, s * 0.05), '#3e6e36');
    for (let i = 0; i < 6; i++) leaf(0, -H * q * (0.2 + i * 0.12), i % 2 ? -0.4 : -2.7, s * 0.55 * q, s * 0.22 * q, '#2a5e30', '#4f8a48');
    const b = Math.max(0, (g - 0.55) / 0.45); if (b <= 0) return;
    for (const [dx, dy, k] of [[0, -H * q, 1], [-s * 0.45, -H * q * 0.72, 0.75], [s * 0.4, -H * q * 0.6, 0.65]]) {
      const sz = s * 0.42 * k * (0.35 + 0.65 * b);
      ctx.save(); ctx.translate(dx, dy);
      for (let r = 3; r >= 1; r--) { ctx.fillStyle = r % 2 ? '#c81d3a' : '#e8435e'; ctx.beginPath(); ctx.arc(0, 0, sz * r / 3, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(80, 0, 20, 0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-sz * 0.1, 0, sz * 0.45, 0.5, 3.6); ctx.stroke();
      ctx.restore();
    }
  },
  cactus(g, s, H, t) {
    const q = Math.min(1, g / 0.65), h = H * 0.75 * q, w = s * 0.42;
    const gr = ctx.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, '#2c6b3a'); gr.addColorStop(0.5, '#4f9a55'); gr.addColorStop(1, '#2c6b3a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(-w, -h, w * 2, h, w); ctx.fill();
    if (q > 0.5) { ctx.beginPath(); ctx.roundRect(w * 0.6, -h * 0.6, w * 1.1, w * 0.7, w * 0.35); ctx.roundRect(w * 1.1, -h * 0.85, w * 0.7, h * 0.32, w * 0.35); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let yy = -h + 6; yy < -3; yy += 7) { ctx.moveTo(-w * 0.4, yy); ctx.lineTo(-w * 0.75, yy - 2); ctx.moveTo(w * 0.4, yy); ctx.lineTo(w * 0.75, yy - 2); } ctx.stroke();
    const b = Math.max(0, (g - 0.65) / 0.35); if (b <= 0) return;
    ctx.save(); ctx.translate(0, -h); petalRing(10, s * 0.45 * b, s * 0.11, '#ff4f9a', '#ffb0d4');
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, 7); ctx.fill(); ctx.restore();
  },
};
// цветок на одном стебле: листья у основания, бутон, раскрытие
function bulbFlower(g, s, H, drawHead, leaves, k = 1) {
  const q = Math.min(1, g / 0.55);
  for (const [a, l] of leaves) leaf(0, -2, a, H * 0.42 * l * q, s * 0.26 * q * k, '#2f6b3a', '#5d9a55');
  const st = Math.max(0, Math.min(1, (g - 0.1) / 0.55)); if (st <= 0) return;
  stem(0, 0, 0, -H * st, s * 0.12, Math.max(1.3, s * 0.06 * k));
  const bud = Math.max(0, Math.min(1, (g - 0.6) / 0.2)), open = Math.max(0, (g - 0.78) / 0.22); if (bud <= 0) return;
  ctx.save(); ctx.translate(0, -H * st);
  if (open <= 0) { ctx.fillStyle = '#5d9a55'; ctx.beginPath(); ctx.ellipse(0, -s * 0.18 * bud, s * 0.13 * bud * k, s * 0.24 * bud * k, 0, 0, 7); ctx.fill(); }
  else drawHead(smooth(open), s * 0.5 * k * (0.5 + 0.5 * smooth(open)));
  ctx.restore();
}

// ===== Фон: небо, стекло, каркас, полки, пол, грядка (кешируется) =====
function renderBackground(g, L, p) {
  const c = garden.bg || (garden.bg = document.createElement('canvas'));
  c.width = Math.round(g.W * dpr()); c.height = Math.round(g.H * dpr());
  const prev = ctx; ctx = c.getContext('2d'); ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  const { W, H, wallY, beamY, benchY, floorY } = g;
  // небо
  const sky = ctx.createLinearGradient(0, 0, 0, wallY); sky.addColorStop(0, rgb(L.top)); sky.addColorStop(1, rgb(L.bot));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, wallY);
  const night = Math.max(0, (p - 80) / 20);
  if (night > 0) { const r = rng(3); for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${night * (0.3 + r() * 0.6)})`; ctx.beginPath(); ctx.arc(r() * W, r() * wallY * 0.7, 0.5 + r() * 1.1, 0, 7); ctx.fill(); } }
  // солнце или луна
  if (p < 88) {
    const [sx, sy] = sunAt(g, p), R = Math.min(W, H) * 0.05;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 6); glow.addColorStop(0, 'rgba(255, 236, 190, 0.55)'); glow.addColorStop(1, 'rgba(255, 236, 190, 0)');
    ctx.fillStyle = glow; ctx.fillRect(sx - R * 6, sy - R * 6, R * 12, R * 12);
    ctx.fillStyle = p > 60 ? '#ffc477' : '#fff3c4'; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
  } else {
    const mx = W * 0.78, my = wallY * 0.32, R = Math.min(W, H) * 0.035;
    ctx.fillStyle = `rgba(240, 238, 225, ${night})`; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill();
    ctx.fillStyle = rgb(L.top); ctx.beginPath(); ctx.arc(mx + R * 0.4, my - R * 0.2, R * 0.85, 0, 7); ctx.fill();
  }
  // сад за стеклом: холмы и деревья
  const far = mixA(hex('#4f7f6a'), hex('#141c2c'), Math.max(0, (p - 70) / 30)), near = mixA(hex('#2f5e44'), hex('#0c1320'), Math.max(0, (p - 70) / 30));
  ctx.fillStyle = rgb(far); ctx.beginPath(); ctx.moveTo(0, wallY);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wallY - H * 0.16 - Math.sin(x / W * 4 + 1) * H * 0.04);
  ctx.lineTo(W, wallY); ctx.fill();
  ctx.fillStyle = rgb(near); const tr = rng(17);
  for (let i = 0; i < W / 26; i++) { const x = tr() * W, h = H * (0.06 + tr() * 0.1); ctx.beginPath(); ctx.ellipse(x, wallY - h * 0.6, h * 0.35, h * 0.6, 0, 0, 7); ctx.fill(); }
  // стекло: лёгкий холодный отлив и блики
  ctx.fillStyle = 'rgba(200, 230, 245, 0.07)'; ctx.fillRect(0, 0, W, wallY);
  const bay = g.phone ? W / 4 : W / 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let x = 0; x < W; x += bay) { ctx.beginPath(); ctx.moveTo(x + bay * 0.15, wallY); ctx.lineTo(x + bay * 0.35, wallY); ctx.lineTo(x + bay * 0.75, beamY); ctx.lineTo(x + bay * 0.55, beamY); ctx.fill(); }
  // каркас: стойки, перекладины, арки под крышей
  const frame = rgb(mixA(hex('#33443d'), hex('#1b2420'), Math.max(0, (p - 70) / 30)));
  ctx.strokeStyle = frame; ctx.lineCap = 'butt';
  ctx.lineWidth = 3;
  for (let x = 0; x <= W + 1; x += bay) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, wallY); ctx.stroke(); }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H * 0.46); ctx.lineTo(W, H * 0.46); ctx.stroke();
  ctx.lineWidth = 1.2; for (let x = bay / 2; x < W; x += bay) { ctx.beginPath(); ctx.moveTo(x, beamY); ctx.lineTo(x, wallY); ctx.stroke(); }
  ctx.lineWidth = 2.5;
  for (let x = 0; x < W; x += bay) { ctx.beginPath(); ctx.moveTo(x, beamY); ctx.quadraticCurveTo(x + bay / 2, beamY - bay * 0.45, x + bay, beamY); ctx.stroke(); }
  // кованые завитки в арках
  ctx.lineWidth = 1; for (let x = 0; x < W; x += bay) { ctx.beginPath(); ctx.arc(x + bay / 2, beamY - bay * 0.12, bay * 0.08, 0, Math.PI * 2); ctx.stroke(); }
  // главная балка
  const bm = ctx.createLinearGradient(0, beamY - 5, 0, beamY + 5); bm.addColorStop(0, '#4d5f57'); bm.addColorStop(1, frame);
  ctx.fillStyle = bm; ctx.fillRect(0, beamY - 4, W, 8);
  // большое арочное окно в центре — «окошко» сада
  const aw = Math.min(W * (g.phone ? 0.42 : 0.24), 260), ax = W / 2 - aw / 2, ay0 = beamY + 18, ay1 = H * 0.62;
  ctx.strokeStyle = '#6b7c73'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, ay1); ctx.lineTo(ax, ay0 + aw / 2); ctx.arc(W / 2, ay0 + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw, ay1); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2, ay0); ctx.lineTo(W / 2, ay1); ctx.moveTo(ax, ay0 + aw * 0.75); ctx.lineTo(ax + aw, ay0 + aw * 0.75); ctx.stroke();
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(W / 2, ay0 + aw / 2); ctx.lineTo(W / 2 + Math.cos(Math.PI + k * Math.PI / 4) * aw / 2, ay0 + aw / 2 + Math.sin(Math.PI + k * Math.PI / 4) * aw / 2); ctx.stroke(); }
  // пол: плитка со сходящимися швами
  const fl = ctx.createLinearGradient(0, floorY, 0, H); fl.addColorStop(0, '#5b4636'); fl.addColorStop(1, '#3b2c22');
  ctx.fillStyle = fl; ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(W / 2 + i * W * 0.06, floorY); ctx.lineTo(W / 2 + i * W * 0.16, H); }
  for (let y = floorY + 6, d = 6; y < H; d *= 1.5, y += d) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; ctx.fillRect(0, floorY, W, 3);
  // полки на стеклянной стене со своими горшочками
  for (const sh of g.shelves) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; ctx.fillRect(sh.x + 3, sh.y + 4, sh.w, 6);
    const wd = ctx.createLinearGradient(0, sh.y, 0, sh.y + 7); wd.addColorStop(0, '#a77a52'); wd.addColorStop(1, '#6e4a2e');
    ctx.fillStyle = wd; ctx.fillRect(sh.x, sh.y, sh.w, 7);
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sh.x + 8, sh.y + 7); ctx.lineTo(sh.x + 8, sh.y + 20); ctx.lineTo(sh.x + 18, sh.y + 7);
    ctx.moveTo(sh.x + sh.w - 8, sh.y + 7); ctx.lineTo(sh.x + sh.w - 8, sh.y + 20); ctx.lineTo(sh.x + sh.w - 18, sh.y + 7); ctx.stroke();
  }
  // грядка-скамья
  const { bx0, bx1 } = g, bh = Math.max(14, H * 0.05);
  ctx.fillStyle = '#2b2018'; for (const x of [bx0 + 10, bx1 - 14, (bx0 + bx1) / 2]) ctx.fillRect(x, benchY + bh, 6, floorY - benchY - bh + 6);
  const bt = ctx.createLinearGradient(0, benchY, 0, benchY + bh); bt.addColorStop(0, '#8d6440'); bt.addColorStop(1, '#5a3d27');
  ctx.fillStyle = bt; ctx.fillRect(bx0 - 6, benchY, bx1 - bx0 + 12, bh);
  ctx.fillStyle = '#a9805a'; ctx.fillRect(bx0 - 8, benchY - 3, bx1 - bx0 + 16, 4);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; ctx.beginPath(); for (let x = bx0 + 40; x < bx1; x += 60) { ctx.moveTo(x, benchY + 2); ctx.lineTo(x, benchY + bh); } ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.beginPath(); ctx.ellipse((bx0 + bx1) / 2, floorY + 4, (bx1 - bx0) * 0.55, 6, 0, 0, 7); ctx.fill();
  ctx = prev;
}

// постоянные горшочки на полках и ростки-награды
function drawShelves(g, now) {
  const slots = [];
  g.shelves.forEach((sh, si) => { const n = Math.max(2, Math.floor(sh.w / 26)); for (let i = 0; i < n; i++) slots.push([sh.x + sh.w * (i + 0.5) / n, sh.y, si * 10 + i]); });
  slots.forEach(([x, y, id], i) => {
    const reward = garden.seedlings[i];
    if (!reward && i % 2) return;                                    // свободные места ждут наград
    const s = Math.min(14, g.W * 0.03);
    let grow = 1;
    if (reward) grow = Math.min(1, (now - reward.t0) / 1400);
    ctx.save(); ctx.translate(x, y);
    if (reward && grow < 1) { const gl = ctx.createRadialGradient(0, -s, 0, 0, -s, s * 3); gl.addColorStop(0, `rgba(190, 255, 200, ${0.6 * (1 - grow)})`); gl.addColorStop(1, 'rgba(190,255,200,0)'); ctx.fillStyle = gl; ctx.fillRect(-s * 3, -s * 4, s * 6, s * 6); }
    const top = pot(0, 0, s, ['terra', 'ceramic', 'glaze'][id % 3]);
    ctx.translate(0, top);
    const sw = Math.sin(now / 2000 + id) * 0.04; ctx.rotate(sw);
    if (reward) { for (const a of [-2.4, -0.7, -1.55]) leaf(0, 0, a, s * 1.1 * smooth(grow), s * 0.35 * smooth(grow), '#3f8a45', '#7cc26a'); }
    else if (id % 3 === 0) PLANT.succulent(0.6, s, s * 2, now);
    else { for (const a of [-2.8, -2.2, -1.6, -1.0, -0.4]) leaf(0, 0, a, s * 1.2, s * 0.22, '#2f6b3a', '#5d9a55', false); }
    ctx.restore();
  });
}

// подвесные кашпо с ампельными растениями
function drawHanging(g, now) {
  g.hang.forEach((x, i) => {
    const len = (g.H * 0.12) * (1 + (i % 2) * 0.35), sway = Math.sin(now / 2600 + i * 1.7) * 0.05;
    ctx.save(); ctx.translate(x, g.beamY + 4); ctx.rotate(sway);
    ctx.strokeStyle = 'rgba(210, 200, 180, 0.6)'; ctx.lineWidth = 1;
    const s = Math.min(18, g.W * 0.04), by = len;
    ctx.beginPath(); for (const dx of [-s * 0.8, 0, s * 0.8]) { ctx.moveTo(0, 0); ctx.lineTo(dx, by - s * 0.3); } ctx.stroke();
    const gr = ctx.createLinearGradient(-s, 0, s, 0); gr.addColorStop(0, '#6b3f26'); gr.addColorStop(0.4, '#b9603a'); gr.addColorStop(1, '#6b3f26');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, by - s * 0.3, s, 0, Math.PI); ctx.fill();
    // свисающие плети
    for (let k = 0; k < 6; k++) {
      const vx = (k - 2.5) * s * 0.35, vl = s * (2.5 + (k % 3) * 1.2), ph = now / 1900 + k + i;
      let px = vx, py = by - s * 0.2;
      for (let j = 0; j < 8; j++) {
        const nx = px + Math.sin(ph + j * 0.6) * 1.2 + (k < 3 ? -0.6 : 0.6), ny = py + vl / 8;
        ctx.strokeStyle = '#4c7a3e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        leaf(nx, ny, (j % 2 ? 0.4 : 2.7), s * 0.45 * (1 - j / 12), s * 0.2, '#3a7a3c', '#7cbf63', false);
        px = nx; py = ny;
      }
    }
    for (const a of [-2.6, -2, -1.4, -0.8]) leaf(0, by - s * 0.3, a, s * 1.1, s * 0.3, '#2f6b3a', '#6aae5a', false);
    ctx.restore();
  });
}

// гирлянда под балкой и столик с фонарём
function lampPoints(g) {
  const pts = [], n = g.phone ? 9 : 16;
  for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, x = g.W * (0.03 + 0.94 * q); pts.push([x, g.beamY + 8 + Math.sin(q * Math.PI * (g.phone ? 2 : 4)) * 10]); }
  return pts;
}
function drawGarland(g, lamps, now) {
  const pts = lampPoints(g);
  ctx.strokeStyle = 'rgba(40, 40, 36, 0.8)'; ctx.lineWidth = 1; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  pts.forEach(([x, y], i) => {
    const f = lamps * (0.85 + 0.15 * Math.sin(now / 300 + i * 1.7));
    ctx.fillStyle = lamps > 0.05 ? `rgba(255, ${200 + 30 * f | 0}, ${120 + 40 * f | 0}, ${0.35 + 0.65 * f})` : 'rgba(230, 225, 210, 0.5)';
    ctx.beginPath(); ctx.arc(x, y + 3, 2.4, 0, 7); ctx.fill();
  });
}
function drawTable(g, lamps, now) {
  const t = g.table; if (!t) return;
  const { x, y, w } = t, h = g.H - y;
  ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x + w * 0.12, y + 6, 5, h); ctx.fillRect(x + w * 0.85, y + 6, 5, h);
  const tp = ctx.createLinearGradient(0, y, 0, y + 7); tp.addColorStop(0, '#9b7048'); tp.addColorStop(1, '#5e3f28');
  ctx.fillStyle = tp; ctx.fillRect(x, y, w, 7);
  // лейка
  const lx = x + w * 0.28, ly = y, ls = Math.min(22, w * 0.25);
  const lg = ctx.createLinearGradient(lx - ls, 0, lx + ls, 0); lg.addColorStop(0, '#2f6e6a'); lg.addColorStop(0.4, '#5fb0a6'); lg.addColorStop(1, '#2a5e5a');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.roundRect(lx - ls * 0.6, ly - ls, ls * 1.2, ls, 3); ctx.fill();
  ctx.strokeStyle = '#3f8f88'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx + ls * 0.5, ly - ls * 0.3); ctx.lineTo(lx + ls * 1.25, ly - ls * 1.05); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly - ls, ls * 0.45, Math.PI, 0); ctx.stroke();
  // совок и пакетик семян
  ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.ellipse(x + w * 0.62, y - 3, ls * 0.35, ls * 0.15, -0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#7a5232'; ctx.fillRect(x + w * 0.62 + ls * 0.25, y - 4, ls * 0.6, 3);
  ctx.save(); ctx.translate(x + w * 0.5, y - 2); ctx.rotate(-0.15); ctx.fillStyle = '#e8d6a8'; ctx.fillRect(-6, -14, 12, 14); ctx.fillStyle = '#e8435e'; ctx.beginPath(); ctx.arc(0, -8, 3, 0, 7); ctx.fill(); ctx.restore();
  // фонарь со свечой
  const fx = x + w * 0.82, fy = y, fh = Math.min(26, w * 0.28);
  ctx.strokeStyle = '#2b2b28'; ctx.lineWidth = 1.5; ctx.strokeRect(fx - fh * 0.3, fy - fh, fh * 0.6, fh);
  ctx.fillStyle = `rgba(255, 210, 140, ${0.15 + 0.6 * lamps})`; ctx.fillRect(fx - fh * 0.27, fy - fh * 0.97, fh * 0.54, fh * 0.94);
  ctx.fillStyle = '#efe6d2'; ctx.fillRect(fx - 2, fy - fh * 0.4, 4, fh * 0.4);
  if (lamps > 0.05) { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(fx, fy - fh * 0.5 + Math.sin(now / 120) * 0.6, 1.6, 3.2, 0, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(fx - fh * 0.35, fy - fh); ctx.lineTo(fx, fy - fh * 1.3); ctx.lineTo(fx + fh * 0.35, fy - fh); ctx.fillStyle = '#2b2b28'; ctx.fill();
}

// большое напольное растение на переднем плане (монстера в кадке)
function drawBigPlant(g, now) {
  const { x, y, s } = g.big, sw = Math.sin(now / 3000) * 0.02;
  ctx.save(); ctx.translate(x, y - s * 0.55); ctx.rotate(sw);
  PLANT.monstera(1, s * 0.5, s * 1.25, now);
  ctx.restore();
  const gr = ctx.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0); gr.addColorStop(0, '#2b2f36'); gr.addColorStop(0.4, '#4a515c'); gr.addColorStop(1, '#23262c');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - s * 0.36, y - s * 0.58); ctx.lineTo(x + s * 0.36, y - s * 0.58); ctx.lineTo(x + s * 0.3, y); ctx.lineTo(x - s * 0.3, y); ctx.fill();
  ctx.fillStyle = '#5a626e'; ctx.fillRect(x - s * 0.4, y - s * 0.62, s * 0.8, s * 0.06);
}

// лучи солнца сквозь стекло
function drawRays(g, L, p, now) {
  if (L.rays <= 0.01) return;
  const [sx] = sunAt(g, Math.min(p, 86)), dir = (sx - g.W / 2) / g.W;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const drift = Math.sin(now / 9000 + i * 1.3) * g.W * 0.015, x0 = g.W * (0.08 + i * 0.2) + drift, w0 = g.W * 0.05, dx = -dir * g.H * 0.9;
    const gr = ctx.createLinearGradient(0, 0, 0, g.floorY); gr.addColorStop(0, `rgba(255, 238, 200, ${L.rays})`); gr.addColorStop(1, 'rgba(255, 238, 200, 0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w0, 0); ctx.lineTo(x0 + w0 * 2.4 + dx, g.floorY); ctx.lineTo(x0 + dx, g.floorY); ctx.fill();
  }
  // пылинки в лучах
  const r = rng(41);
  for (let i = 0; i < 24; i++) {
    const x = (r() * g.W + now / 1000 * (4 + r() * 6)) % g.W, y = (r() * g.floorY + Math.sin(now / 3000 + i) * 12) % g.floorY;
    ctx.fillStyle = `rgba(255, 245, 220, ${L.rays * 2 * (0.4 + 0.6 * Math.sin(now / 900 + i))})`; ctx.beginPath(); ctx.arc(x, y, 1, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// тёплые огни: гирлянда, фонарь, подсветка грядки
function drawGlow(g, lamps, now) {
  if (lamps <= 0.02) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const halo = (x, y, r, a) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255, 190, 110, ${a})`); gr.addColorStop(1, 'rgba(255, 190, 110, 0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  lampPoints(g).forEach(([x, y], i) => halo(x, y + 3, 26, 0.32 * lamps * (0.85 + 0.15 * Math.sin(now / 300 + i * 1.7))));
  if (g.table) halo(g.table.x + g.table.w * 0.82, g.table.y - 12, 70, 0.4 * lamps * (0.9 + 0.1 * Math.sin(now / 150)));
  const cx = (g.bx0 + g.bx1) / 2, rr = (g.bx1 - g.bx0) * 0.6;
  const gr = ctx.createRadialGradient(cx, g.benchY - 20, 0, cx, g.benchY - 20, rr); gr.addColorStop(0, `rgba(255, 200, 130, ${0.28 * lamps})`); gr.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = gr; ctx.fillRect(cx - rr, g.benchY - 20 - rr, rr * 2, rr * 2);
  ctx.restore();
}

// светлячки в сумерках
function drawFireflies(g, lamps, now) {
  if (lamps <= 0.1) return;
  const r = rng(77), t = now / 1000;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const bx = r() * g.W, by = g.beamY + r() * (g.floorY - g.beamY), sp = 0.15 + r() * 0.2;
    const x = bx + Math.sin(t * sp + i) * 40, y = by + Math.sin(t * sp * 1.3 + i * 2) * 20, blink = Math.max(0, Math.sin(t * (0.8 + r()) + i * 3));
    const a = lamps * blink * 0.9; if (a < 0.03) continue;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, `rgba(220, 255, 140, ${a})`); gr.addColorStop(1, 'rgba(220,255,140,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 9, y - 9, 18, 18);
  }
  ctx.restore();
}

// иногда с цветка падает лепесток
function drawPetal(g, p, now) {
  const period = 23000, k = Math.floor(now / period), t = (now % period) / 5200; if (t > 1) return;
  const bloomed = g.plants.filter(pl => growth(pl.rank, g.n, p) >= 1); if (!bloomed.length) return;
  const pl = bloomed[k % bloomed.length], x = pl.x + Math.sin(t * 9) * 14 + t * 20, y = pl.y - pl.maxH * 0.8 + t * (pl.maxH * 0.8 + 6);
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 7); ctx.fillStyle = 'rgba(255, 170, 190, 0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2, 0, 0, 7); ctx.fill(); ctx.restore();
}

// божья коровка изредка проползает по краю грядки
function drawLadybug(g, now) {
  const period = 47000, t = (now % period) / 14000; if (t > 1) return;
  const x = lerp(g.bx0, g.bx1, t), y = g.benchY - 3;
  ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.arc(x, y, 3.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 3, y - 1, 1.5, 0, 7); ctx.arc(x - 1, y - 2, 0.8, 0, 7); ctx.arc(x - 2.5, y - 0.8, 0.7, 0, 7); ctx.fill();
}

// ===== Бабочки за выполненные задачи =====
const WINGS = [['#ff9f43', '#ffd36b'], ['#4f9cff', '#a5d0ff'], ['#ff6fae', '#ffc1dc'], ['#a78bfa', '#e0d4ff'], ['#3ddc97', '#c6f5df'], ['#ffd36b', '#fff2c2']];
function addButterfly(i, t0) {
  const r = rng(i * 97 + 3);
  garden.butterflies.push({ t0, w: WINGS[i % WINGS.length], hx: r(), hy: r(), ph: r() * 7, sp: 0.4 + r() * 0.4 });
}
function drawButterflies(g, now) {
  const start = [g.W / 2, g.beamY + 40];
  garden.butterflies = garden.butterflies.filter(b => !b.leave || now - b.leave < 2500);
  for (const b of garden.butterflies) {
    const t = (now - b.t0) / 1000;
    const home = [g.W * (0.12 + 0.76 * b.hx), g.beamY + (g.benchY - g.beamY) * (0.25 + 0.55 * b.hy)];
    const fl = [Math.sin(t * b.sp + b.ph) * g.W * 0.07 + Math.sin(t * 1.9 * b.sp) * 8, Math.sin(t * 1.2 * b.sp + b.ph) * 22 + Math.sin(t * 2.7) * 4];
    const q = smooth(Math.min(1, t / 3));
    let x = lerp(start[0], home[0] + fl[0], q), y = lerp(start[1], home[1] + fl[1], q) - Math.sin(Math.PI * q) * 30;
    if (b.leave) { const k = smooth(Math.min(1, (now - b.leave) / 2500)); x = lerp(x, g.W / 2, k); y = lerp(y, -20, k); }
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(now / 90 + b.ph)), sz = Math.max(7, Math.min(12, g.W * 0.018));
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * b.sp + b.ph) * 0.3);
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd * flap, 1);
      const gr = ctx.createRadialGradient(sz * 0.3, -sz * 0.2, 0, sz * 0.3, -sz * 0.2, sz); gr.addColorStop(0, b.w[1]); gr.addColorStop(1, b.w[0]);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sz * 0.55, -sz * 0.3, sz * 0.62, sz * 0.48, -0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sz * 0.42, sz * 0.32, sz * 0.4, sz * 0.32, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(30, 20, 30, 0.55)'; ctx.beginPath(); ctx.arc(sz * 0.75, -sz * 0.45, sz * 0.1, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2a2025'; ctx.beginPath(); ctx.ellipse(0, 0, 1.3, sz * 0.55, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

// ===== Задачи: бабочка, а каждая третья — ещё и росток на полке =====
function loadTasks() {
  const st = sceneStore.get('day', null);
  garden.tasks = st && st.date === today() ? Math.min(999, st.tasks | 0) : 0;
  garden.butterflies = []; garden.seedlings = [];
  const past = performance.now() - 60000;
  for (let i = 0; i < Math.min(garden.tasks, 24); i++) addButterfly(i, past - i * 777);
  for (let i = 0; i < Math.floor(garden.tasks / 3); i++) garden.seedlings.push({ t0: past });
  $('tasks').textContent = garden.tasks;
}
function toast(text) { const el = $('toast'); el.textContent = text; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
$('done').onclick = () => {
  if (!garden.g) return;
  if (sceneStore.get('day', {}).date !== today()) loadTasks();      // наступил новый день
  garden.tasks++;
  sceneStore.set('day', { date: today(), tasks: garden.tasks });
  const now = performance.now();
  if (garden.butterflies.length < 24) addButterfly(garden.tasks - 1, now);
  let msg = '🦋 Прилетела бабочка · задача №' + garden.tasks;
  if (garden.tasks % 3 === 0) { garden.seedlings.push({ t0: now }); msg = '🌱 На полке новый росток · задача №' + garden.tasks; }
  toast(msg);
  $('tasks').textContent = garden.tasks;
  const b = $('done'); b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow');
};
// Сброс: первое нажатие спрашивает, второе в течение 3 секунд — сбрасывает
let askUntil = 0;
$('reset').onclick = () => {
  const btn = $('reset'), now = performance.now();
  if (now > askUntil) {
    askUntil = now + 3000; btn.textContent = 'Точно сбросить?'; btn.classList.add('ask');
    setTimeout(() => { if (performance.now() >= askUntil) { btn.textContent = '↺'; btn.classList.remove('ask'); } }, 3050);
    return;
  }
  askUntil = 0; btn.textContent = '↺'; btn.classList.remove('ask');
  for (const b of garden.butterflies) b.leave = now;                  // бабочки улетают в окно
  garden.seedlings = [];
  garden.tasks = 0;
  sceneStore.set('day', { date: today(), tasks: 0 });
  $('tasks').textContent = 0;
  toast('↺ Задачи за сегодня сброшены');
};
loadTasks();

// ===== Кадр =====
function frame(now) {
  const g = garden.g; if (!g) return;
  const p = livePct(), L = lightAt(p);
  const key = g.W + 'x' + g.H + ':' + Math.round(p * 4);                 // фон перерисовываем раз в 0,25% дня
  if (key !== garden.bgKey) { renderBackground(g, L, p); garden.bgKey = key; }
  beginFrame(cv, g);
  ctx.drawImage(garden.bg, 0, 0, g.W, g.H);
  drawShelves(g, now);
  drawHanging(g, now);
  drawGarland(g, L.lamps, now);
  // растения на грядке: сначала задний ряд
  for (const pl of [...g.plants].sort((a, b) => a.y - b.y)) {
    const gr = growth(pl.rank, g.n, p);
    const top = pot(pl.x, pl.y, pl.s, pl.pot);
    if (gr > 0) {
      ctx.save(); ctx.translate(pl.x, top); ctx.rotate(Math.sin(now / 1700 + pl.ph) * 0.025);
      if (gr < 0.12) { const q = gr / 0.12; leaf(0, 0, -2.2, pl.s * 0.5 * q, pl.s * 0.15 * q, '#3f8a45', '#8bd06e'); leaf(0, 0, -0.9, pl.s * 0.5 * q, pl.s * 0.15 * q, '#3f8a45', '#8bd06e'); }
      else PLANT[pl.kind]((gr - 0.12) / 0.88, pl.s, pl.maxH, now, pl.ph);
      ctx.restore();
    }
  }
  drawPetal(g, p, now);
  drawLadybug(g, now);
  drawTable(g, L.lamps, now);
  drawBigPlant(g, now);
  drawButterflies(g, now);
  // свет: тёплый или вечерний оттенок на всю сцену
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgb(L.tint); ctx.fillRect(0, 0, g.W, g.H); ctx.restore();
  drawRays(g, L, p, now);
  drawGlow(g, L.lamps, now);
  drawFireflies(g, L.lamps, now);
  // мягкая виньетка
  const vg = ctx.createRadialGradient(g.W / 2, g.H * 0.55, Math.min(g.W, g.H) * 0.35, g.W / 2, g.H * 0.55, Math.max(g.W, g.H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, g.W, g.H);
}

function tick() {
  if (!garden.g) return;
  $('bloom').textContent = bloomedCount(garden.g.n, curPct);
  $('phase').textContent = lightAt(curPct).name;
}

function sub() {
  const g = garden.g; if (!g) return [{ t: 'Сад просыпается' }];
  const b = bloomedCount(g.n, curPct);
  if (b >= g.n) return [{ t: 'Все растения распустились 🌸' }];
  return [{ t: 'Следующее растение через ' }, { ms: ((b + 1) / g.n * 100 - curPct) / 100 * dayLenMs(), b: true }];
}

registerScene({ name: 'Зимний сад', author: 'Roganovs96', set, frame, tick, sub });
