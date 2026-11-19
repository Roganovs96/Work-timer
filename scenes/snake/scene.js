// Змейка: ползает по полю, а каждые 0,5% рабочего дня появляется яблоко. Съела — выросла на клетку.
// Поле ровно такого размера, какой змейка станет к концу дня: когда остаётся последнее яблоко,
// свободна ровно одна клетка, а в 100% змейка занимает всё поле.
// Чтобы так получилось без тупиков, змейка ходит по замкнутому маршруту через все клетки поля
// и срезает путь к яблоку, только когда это безопасно.

const APPLES = 200;
let START = 10;                                   // стартовая длина: клеток на поле − 200 яблок
const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); pointer-events: none; white-space: nowrap;
    padding: 6px 14px; border-radius: 14px; background: rgba(15, 17, 22, 0.72); border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 600 14px -apple-system, sans-serif; color: #f2efe6; }
  .hud b { font-variant-numeric: tabular-nums; }
  .hud span { color: #8a90a0; font-weight: 500; }
`);
html('<div class="hud">🍎 <b id="eaten">0</b><span> из 200</span> · 🐍 <b id="len">0</b><span> из <b id="cells">0</b> клеток</span></div>');

const sn = { g: null, body: [], oldTail: null, dir: [1, 0], grow: 0, apples: [], spawned: 0, eaten: 0, acc: 0, last: 0, bursts: [] };
const spawnedAt = p => Math.max(0, Math.min(APPLES, Math.floor(p * 2 + 1e-9)));     // каждые 0,5%
const key = (x, y) => y * 1000 + x;

// поле cols×rows: клеток чуть больше 200, хотя бы одна сторона чётная (нужно для замкнутого обхода), форма — под экран
function pickBoard(aw, ah) {
  let best = null;
  for (let cols = 6; cols <= 40; cols++) for (let rows = 6; rows <= 40; rows++) {
    const n = cols * rows; if (n < 206 || n > 224 || (cols % 2 && rows % 2)) continue;
    const score = Math.abs(Math.log(cols / rows / (aw / ah))) + (n - 206) * 0.004;
    if (!best || score < best.score) best = { cols, rows, score };
  }
  return best;
}
// замкнутый маршрут через все клетки: ряды «змейкой» по столбцам 1..cols-1, обратно — по столбцу 0
function buildCycle(cols, rows) {
  const T = rows % 2 !== 0;                                            // нужно чётное число рядов — иначе строим транспонированно
  const C = T ? rows : cols, R = T ? cols : rows, path = [];
  for (let y = 0; y < R; y++) for (let i = 1; i < C; i++) path.push([y % 2 ? C - i : i, y]);
  for (let y = R - 1; y >= 0; y--) path.push([0, y]);
  return T ? path.map(([x, y]) => [y, x]) : path;
}

function set(k, force) {
  if (force || !sn.g) {
    const W = area.clientWidth, H = area.clientHeight; if (!W || !H) return;
    const top = 44, pad = 10, aw = W - pad * 2, ah = H - top - pad;
    const { cols, rows } = pickBoard(aw, ah), c = Math.floor(Math.min(aw / cols, ah / rows));
    const cycle = buildCycle(cols, rows), idx = new Map(cycle.map((p, i) => [key(...p), i]));
    START = cols * rows - APPLES;
    sn.g = { W, H, cols, rows, c, N: cols * rows, cycle, idx, ox: Math.round((W - cols * c) / 2), oy: Math.round(top + (ah - rows * c) / 2) };
    fitCanvas(cv);
    $('cells').textContent = sn.g.N;
    reset();
  }
  const now = spawnedAt(curPct);
  // вернулись из «уйти пораньше» или время скакнуло вперёд — перестраиваем змейку под нужную длину
  if (now < sn.spawned || (now - sn.spawned > 3 && !fast)) reset();
  while (sn.spawned < spawnedAt(curPct)) { addApple(); sn.spawned++; }
}

// змейка нужной длины лежит на маршруте; все яблоки, кроме последнего, уже съедены
function reset() {
  const g = sn.g, spawned = spawnedAt(curPct), eaten = Math.max(0, spawned - 1), len = START + eaten;
  sn.body = []; for (let i = len - 1; i >= 0; i--) sn.body.push(g.cycle[i].slice());
  sn.oldTail = sn.body[sn.body.length - 1].slice();
  const [hx, hy] = sn.body[0], [nx, ny] = sn.body[1];
  sn.dir = [hx - nx, hy - ny];
  sn.grow = 0; sn.apples = []; sn.eaten = eaten; sn.spawned = eaten;
}

function occupied() { const s = new Set(); for (const p of sn.body) s.add(key(...p)); return s; }
function addApple() {
  const g = sn.g, occ = occupied(); for (const a of sn.apples) occ.add(key(a.x, a.y));
  const free = []; for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (!occ.has(key(x, y))) free.push([x, y]);
  if (!free.length) return;
  const [x, y] = free[Math.floor(rng(sn.spawned * 7919 + 17)() * free.length)];
  sn.apples.push({ x, y, t0: performance.now() });
}
const inside = (x, y) => x >= 0 && y >= 0 && x < sn.g.cols && y < sn.g.rows;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function step() {
  const g = sn.g, N = g.N, head = sn.body[0], tail = sn.body[sn.body.length - 1];
  const at = p => g.idx.get(key(...p)), d = (a, b) => (b - a + N) % N, h = at(head), toTail = d(h, at(tail));
  const occ = occupied(), apples = sn.apples.map(a => d(h, at([a.x, a.y]))), target = apples.length ? Math.min(...apples) : 0;
  // по умолчанию — следующая клетка маршрута (всегда безопасно)
  let best = g.cycle[(h + 1) % N], bestD = 1;
  // срезаем вперёд по маршруту, пока змейка короче половины поля и не обгоняем свой хвост и яблоко
  if (target > 1 && sn.body.length < N * 0.6) {
    for (const [dx, dy] of DIRS) {
      const x = head[0] + dx, y = head[1] + dy; if (!inside(x, y) || occ.has(key(x, y))) continue;
      const dd = d(h, at([x, y])), slack = toTail - dd;
      if (dd > bestD && dd <= target && slack > 4) { best = [x, y]; bestD = dd; }
    }
  }
  sn.body.unshift(best.slice()); sn.dir = [best[0] - head[0], best[1] - head[1]];
  // съела яблоко — растёт сразу (хвост остаётся на месте), иначе хвост подтягивается
  const ai = sn.apples.findIndex(a => a.x === best[0] && a.y === best[1]);
  if (ai >= 0) {
    sn.apples.splice(ai, 1); sn.eaten++; sn.bursts.push({ x: best[0], y: best[1], t0: performance.now() });
    sn.oldTail = sn.body[sn.body.length - 1].slice();
  } else sn.oldTail = sn.body.pop();
}

function frame(now) {
  const g = sn.g; if (!g) return;
  const dt = Math.min(250, now - (sn.last || now)); sn.last = now;
  const stepMs = fast ? 45 : 140;
  sn.acc += dt; while (sn.acc >= stepMs) { sn.acc -= stepMs; step(); }
  const q = sn.acc / stepMs, { c, ox, oy, cols, rows } = g;
  beginFrame(cv, g);
  // поле в шахматную клетку
  ctx.fillStyle = '#16251d'; ctx.beginPath(); ctx.roundRect(ox - 6, oy - 6, cols * c + 12, rows * c + 12, 12); ctx.fill();
  ctx.fillStyle = '#1c3024';
  for (let y = 0; y < rows; y++) for (let x = (y % 2); x < cols; x += 2) ctx.fillRect(ox + x * c, oy + y * c, c, c);
  // яблоки
  for (const a of sn.apples) {
    const pop = Math.max(0.01, Math.min(1, (now - a.t0) / 350)), s = c * 0.42 * (pop < 1 ? 1.3 - 0.3 * pop : 1) * pop, x = ox + (a.x + 0.5) * c, y = oy + (a.y + 0.55) * c;
    const gr = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s); gr.addColorStop(0, '#ff7a7a'); gr.addColorStop(1, '#c81d2a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = Math.max(1, c * 0.07); ctx.beginPath(); ctx.moveTo(x, y - s * 0.8); ctx.lineTo(x + s * 0.15, y - s * 1.25); ctx.stroke();
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(x + s * 0.4, y - s * 1.1, s * 0.35, s * 0.16, -0.5, 0, 7); ctx.fill();
  }
  // змейка: все изгибы стоят ровно в центрах клеток, плавно двигаются только кончик головы и хвоста —
  // поэтому на поворотах тело не дрожит и не срезает углы
  const n = sn.body.length, C = p => [ox + (p[0] + 0.5) * c, oy + (p[1] + 0.5) * c], L = (a, b) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  const pts = [n > 1 ? C(L(sn.body[1], sn.body[0])) : C(sn.body[0])];
  for (let i = 1; i < n; i++) pts.push(C(sn.body[i]));
  pts.push(C(L(sn.oldTail || sn.body[n - 1], sn.body[n - 1])));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = pts.length - 1; i > 0; i--) {
    const t = i / (pts.length - 1);
    ctx.strokeStyle = `hsl(${lerp(150, 95, t)}, 62%, ${lerp(52, 34, t)}%)`; ctx.lineWidth = c * lerp(0.78, 0.5, t);
    ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i - 1]); ctx.stroke();
  }
  // голова с глазами и язычком
  const [hx, hy] = pts[0], [dx, dy] = sn.dir;
  ctx.fillStyle = 'hsl(150, 62%, 55%)'; ctx.beginPath(); ctx.arc(hx, hy, c * 0.46, 0, 7); ctx.fill();
  for (const sd of [-1, 1]) {
    const ex = hx + dx * c * 0.14 - dy * sd * c * 0.2, ey = hy + dy * c * 0.14 + dx * sd * c * 0.2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, c * 0.13, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + dx * c * 0.05, ey + dy * c * 0.05, c * 0.07, 0, 7); ctx.fill();
  }
  if ((now / 900) % 1 < 0.25) {
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = Math.max(1, c * 0.06); ctx.beginPath();
    const tx = hx + dx * c * 0.75, ty = hy + dy * c * 0.75;
    ctx.moveTo(hx + dx * c * 0.42, hy + dy * c * 0.42); ctx.lineTo(tx, ty);
    ctx.moveTo(tx, ty); ctx.lineTo(tx + dx * c * 0.12 - dy * c * 0.1, ty + dy * c * 0.12 + dx * c * 0.1);
    ctx.moveTo(tx, ty); ctx.lineTo(tx + dx * c * 0.12 + dy * c * 0.1, ty + dy * c * 0.12 - dx * c * 0.1); ctx.stroke();
  }
  // хрум: искорки и «+1»
  sn.bursts = sn.bursts.filter(b => now - b.t0 < 800);
  for (const b of sn.bursts) {
    const t = (now - b.t0) / 800, x = ox + (b.x + 0.5) * c, y = oy + (b.y + 0.5) * c;
    ctx.fillStyle = `rgba(255, 220, 120, ${1 - t})`;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * c * (0.3 + t), y + Math.sin(a) * c * (0.3 + t), Math.max(1, c * 0.08), 0, 7); ctx.fill(); }
    ctx.font = `700 ${Math.max(11, c * 0.6)}px -apple-system, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('+1', x, y - c * (0.6 + t));
  }
}

function tick() { $('eaten').textContent = sn.eaten; $('len').textContent = sn.body.length; }
function sub() {
  const s = spawnedAt(curPct);
  if (s >= APPLES) return [{ t: 'Все 200 яблок появились 🍎' }];
  return [{ t: 'Следующее яблоко через ' }, { ms: ((s + 1) / 2 - curPct) / 100 * dayLenMs(), b: true }];
}

registerScene({ name: 'Змейка', icon: '🐍', author: 'Roganovs96', steps: 200, set, frame, tick, sub });
