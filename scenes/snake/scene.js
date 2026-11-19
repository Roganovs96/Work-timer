// Змейка: ползает по полю, а каждые 0,5% рабочего дня появляется яблоко.
// Она находит его кратчайшим путём (стараясь не запереть себя), съедает и растёт.
// За день — 200 яблок. Длина змейки показывает, сколько дня уже прошло.

const APPLES = 200, START = 3;
const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); pointer-events: none; white-space: nowrap;
    padding: 6px 14px; border-radius: 14px; background: rgba(15, 17, 22, 0.72); border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font: 600 14px -apple-system, sans-serif; color: #f2efe6; }
  .hud b { font-variant-numeric: tabular-nums; }
  .hud span { color: #8a90a0; font-weight: 500; }
`);
html('<div class="hud">🍎 <b id="eaten">0</b><span> из 200</span> · 🐍 длина <b id="len">3</b></div>');

const sn = { g: null, body: [], prev: [], dir: [1, 0], grow: 0, apples: [], spawned: 0, eaten: 0, acc: 0, last: 0, bursts: [] };
const spawnedAt = p => Math.max(0, Math.min(APPLES, Math.floor(p * 2 + 1e-9)));     // каждые 0,5%

function set(k, force) {
  if (force || !sn.g) {
    const W = area.clientWidth, H = area.clientHeight; if (!W || !H) return;
    const top = 44, pad = 10, aw = W - pad * 2, ah = H - top - pad;
    let cols = Math.max(12, Math.round(Math.sqrt(820 * aw / ah))), rows = Math.max(10, Math.round(820 / cols));
    const c = Math.floor(Math.min(aw / cols, ah / rows));
    sn.g = { W, H, cols, rows, c, ox: Math.round((W - cols * c) / 2), oy: Math.round(top + (ah - rows * c) / 2) };
    fitCanvas(cv);
    reset();
  }
  const now = spawnedAt(curPct);
  // вернулись из «уйти пораньше» или время скакнуло вперёд — перестраиваем змейку под нужную длину
  if (now < sn.spawned || (now - sn.spawned > 3 && !fast)) reset();
  while (sn.spawned < spawnedAt(curPct)) { addApple(); sn.spawned++; }
}

// змейка нужной длины, уложенная «змейкой» снизу поля; все яблоко кроме последнего уже съедены
function reset() {
  const g = sn.g, spawned = spawnedAt(curPct), eaten = Math.max(0, spawned - 1), len = Math.min(START + eaten, g.cols * g.rows - 10);
  const cells = [];
  for (let y = g.rows - 1; y >= 0 && cells.length < len; y--)
    for (let i = 0; i < g.cols && cells.length < len; i++) cells.push([(g.rows - 1 - y) % 2 ? g.cols - 1 - i : i, y]);
  sn.body = cells.reverse(); sn.prev = sn.body.map(p => p.slice());
  const [hx, hy] = sn.body[0], [nx, ny] = sn.body[1] || [hx - 1, hy];
  sn.dir = [Math.sign(hx - nx) || 1, Math.sign(hy - ny)];
  sn.grow = 0; sn.apples = []; sn.eaten = eaten; sn.spawned = eaten;
}

const key = (x, y) => y * 1000 + x;
function occupied(skipTail) {
  const s = new Set(); const n = sn.body.length - (skipTail ? 1 : 0);
  for (let i = 0; i < n; i++) s.add(key(...sn.body[i]));
  return s;
}
function addApple() {
  const g = sn.g, occ = occupied(false); for (const a of sn.apples) occ.add(key(a.x, a.y));
  const r = rng(sn.spawned * 7919 + 17);
  for (let tries = 0; tries < 2000; tries++) {
    const x = Math.floor(r() * g.cols), y = Math.floor(r() * g.rows);
    if (!occ.has(key(x, y))) { sn.apples.push({ x, y, t0: performance.now() }); return; }
  }
}
const inside = (x, y) => x >= 0 && y >= 0 && x < sn.g.cols && y < sn.g.rows;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// сколько клеток доступно с (x, y) — чтобы не заползти в тупик
function room(x, y, walls, limit) {
  const seen = new Set([key(x, y)]), q = [[x, y]];
  while (q.length && seen.size < limit) {
    const [cx, cy] = q.pop();
    for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, k = key(nx, ny); if (inside(nx, ny) && !walls.has(k) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } }
  }
  return seen.size;
}
// кратчайший путь от start до любой клетки из goals (walls — занятые клетки); возвращает клетки пути без start
function bfs(start, goals, walls) {
  const s0 = key(...start), from = new Map([[s0, -1]]), q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const [cx, cy] = q[qi], ck = key(cx, cy);
    if (qi > 0 && goals.has(ck)) { const path = []; for (let k = ck; k !== s0; k = from.get(k)) path.unshift([k % 1000, Math.floor(k / 1000)]); return path; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (inside(nx, ny) && !from.has(k) && (!walls.has(k) || goals.has(k))) { from.set(k, ck); q.push([nx, ny]); }
    }
  }
  return null;
}
// сможет ли змейка с таким телом добраться до своего хвоста (значит, не заперта)
function tailReachable(body) {
  if (body.length < 4) return true;
  const walls = new Set(); for (let i = 1; i < body.length - 1; i++) walls.add(key(...body[i]));
  return !!bfs(body[0], new Set([key(...body[body.length - 1])]), walls);
}
// тело после того, как змейка проползёт по пути (с учётом роста)
function follow(path, grow, appleKeys) {
  const body = sn.body.map(p => p.slice());
  for (const c of path) { body.unshift(c); if (appleKeys.has(key(...c))) grow++; if (grow > 0) grow--; else body.pop(); }
  return body;
}

function step() {
  const head = sn.body[0], walls = occupied(sn.grow === 0), appleKeys = new Set(sn.apples.map(a => key(a.x, a.y)));
  let next = null;
  // 1) к яблоку — только если после еды не окажется взаперти
  if (appleKeys.size) {
    const path = bfs(head, appleKeys, walls);
    if (path && tailReachable(follow(path, sn.grow, appleKeys))) next = path[0];
  }
  // 2) иначе — безопасный ход, после которого хвост достижим; держимся от хвоста подальше, чаще ползём прямо
  if (!next) {
    const moves = DIRS.map(([dx, dy]) => [head[0] + dx, head[1] + dy]).filter(([x, y]) => inside(x, y) && !walls.has(key(x, y)));
    if (!moves.length) { reset(); return; }                            // совсем некуда — начинает заново, длина та же
    const scored = moves.map(m => {
      const body = follow([m], sn.grow, appleKeys), ok = tailReachable(body);
      const tailPath = ok && body.length >= 4 ? bfs(m, new Set([key(...body[body.length - 1])]), new Set(body.slice(1, -1).map(p => key(...p)))) : null;
      const straight = m[0] - head[0] === sn.dir[0] && m[1] - head[1] === sn.dir[1];
      return { m, ok, score: (ok ? 1000 : room(m[0], m[1], walls, 900)) + (tailPath ? tailPath.length : 0) + (straight ? 3 : 0) + Math.random() * (appleKeys.size ? 0.5 : 6) };
    });
    next = scored.sort((a, b) => (b.ok - a.ok) || (b.score - a.score))[0].m;
  }
  const pick = [next[0], next[1], next[0] - head[0], next[1] - head[1]];
  sn.prev = sn.body.map(p => p.slice());
  sn.body.unshift([pick[0], pick[1]]); sn.dir = [pick[2], pick[3]];
  if (sn.grow > 0) { sn.grow--; sn.prev.push(sn.prev[sn.prev.length - 1].slice()); } else sn.body.pop();
  const ai = sn.apples.findIndex(a => a.x === pick[0] && a.y === pick[1]);
  if (ai >= 0) { sn.apples.splice(ai, 1); sn.grow++; sn.eaten++; sn.bursts.push({ x: pick[0], y: pick[1], t0: performance.now() }); }
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
  // змейка: плавно между клетками, от хвоста к голове, цвет перетекает
  const n = sn.body.length, pos = i => { const a = sn.prev[i] || sn.body[i], b = sn.body[i]; return [ox + (lerp(a[0], b[0], q) + 0.5) * c, oy + (lerp(a[1], b[1], q) + 0.5) * c]; };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = n - 1; i > 0; i--) {
    const t = i / Math.max(1, n - 1), [x1, y1] = pos(i), [x0, y0] = pos(i - 1);
    ctx.strokeStyle = `hsl(${lerp(150, 95, t)}, 62%, ${lerp(52, 34, t)}%)`; ctx.lineWidth = c * lerp(0.78, 0.5, t);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x0, y0); ctx.stroke();
  }
  // голова с глазами и язычком
  const [hx, hy] = pos(0), [dx, dy] = sn.dir;
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
