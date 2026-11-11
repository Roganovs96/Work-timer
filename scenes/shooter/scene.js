// Стрелок и 300 человечков: каждый человечек = 1/300 дня.
// Каждый 10-й — в шляпе (стрелок встаёт на колено), на ком кончается час — толстый (стрелок смотрит в оптику).
const cvs = makeCanvas();
// мс: полёт пули, падение, интервал между выстрелами (в режиме «уйти пораньше» всё быстрее)
let T_BULLET = 260, T_FALL = 420, T_GAP = 700;
// Цели идут по порядку: слева направо, ряд за рядом сверху вниз
const ORDER = [...Array(N).keys()];
const crowd = { geo: null, k: -1, dead: 0, shots: [], aim: 0 };

function crowdGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  let S, sx, sy, x0, x1, y0, y1;
  if (H > W * 1.05) {
    // вертикальный экран (телефон): стрелок внизу по центру, толпа над ним на всю ширину
    S = Math.min(W * 0.2, H * 0.16);
    sx = W / 2; sy = H - 4;
    x0 = 4; x1 = W - 4; y0 = 4; y1 = H - S * 1.3;
  } else {
    S = Math.min(H * 0.42, W * 0.12);              // рост стрелка
    sx = Math.max(S * 0.6, W * 0.07); sy = H / 2 + S / 2;
    x0 = sx + S * 1.6; x1 = W - 8; y0 = 8; y1 = H - 8;
  }
  const aw = x1 - x0, ah = y1 - y0;
  const [cols, rows] = pickGrid(aw, ah);
  const cw = aw / cols, ch = ah / rows, s = Math.min(cw * 0.75, ch * 0.85);
  const people = [...Array(N).keys()].map(i => {
    const c = i % cols, r = Math.floor(i / cols);
    return { x: x0 + (c + 0.5) * cw, y: y0 + (r + 1) * ch - ch * 0.08 };   // y — уровень ног
  });
  return { W, H, S, sx, sy, s, people };
}

const kindOf = r => isFat(r) ? 'fat' : isHat(r) ? 'hat' : 'norm';
// Подготовка к особому выстрелу (мс): на колено — по шляпе, оптика — по толстому
const PREP = { hat: 700, fat: 1500 }, HOLD = 450, BACK = 400;
const fallTime = s => T_FALL * (s.kind === 'fat' ? 1.6 : 1);

// Палочный человечек: (x, y) — ноги, a — угол падения (0 стоит, π/2 лежит), rank — его номер в очереди
function figure(x, y, s, a, color, lw, rank) {
  const fat = rank != null && isFat(rank), hat = rank != null && isHat(rank);
  const z = fat ? s * 1.3 : s, aw = fat ? 0.26 : 0.2;
  ctx.save();
  ctx.translate(x - z * 0.45 * Math.sin(a), y); ctx.rotate(a);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = (lw || Math.max(1.5, s * 0.08)) * (fat ? 1.8 : 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-z * 0.16, 0); ctx.lineTo(0, -z * 0.42); ctx.lineTo(z * 0.16, 0);          // ноги
  ctx.moveTo(0, -z * 0.42); ctx.lineTo(0, -z * 0.74);                                    // туловище
  ctx.moveTo(-z * aw, -z * 0.5); ctx.lineTo(0, -z * 0.68); ctx.lineTo(z * aw, -z * 0.5); // руки
  ctx.stroke();
  if (fat) { ctx.beginPath(); ctx.ellipse(0, -z * 0.57, z * 0.17, z * 0.2, 0, 0, 7); ctx.fill(); } // пузо
  ctx.beginPath(); ctx.arc(0, -z * 0.86, z * (fat ? 0.13 : 0.12), 0, 7); ctx.fill();               // голова
  if (hat) {
    ctx.fillStyle = '#b07a4a';
    ctx.fillRect(-z * 0.21, -z * 0.98, z * 0.42, z * 0.05);                                       // поля
    ctx.beginPath(); ctx.roundRect(-z * 0.11, -z * 1.16, z * 0.22, z * 0.2, z * 0.03); ctx.fill(); // тулья
  }
  ctx.restore();
}

// Стрелок с винтовкой. pose: kneel — на колене, scope — смотрит в оптику, recoil — отдача (всё 0..1)
function shooterJoints(g, pose) {
  const { S, sx, sy } = g, k = pose.kneel, sc = pose.scope;
  const L = (a, b) => a + (b - a) * k;
  const hipY = L(sy - S * 0.42, sy - S * 0.26), dy = hipY - (sy - S * 0.42);
  return {
    L, hipY, dy,
    neck: [sx + S * 0.03 * sc, sy - S * 0.74 + dy],
    head: [sx + S * 0.07 * sc, sy - S * 0.86 + dy - S * 0.01 * sc],
    shoulder: [sx + S * 0.02 * sc, sy - S * 0.68 + dy],
    // при прицеливании винтовка поднимается к глазу
    gun: [sx + S * 0.03 * sc, sy - S * 0.68 + dy - S * 0.13 * sc],
  };
}

function drawShooter(g, angle, pose) {
  const { S, sx, sy } = g, lw = Math.max(2.5, S * 0.06), J = shooterJoints(g, pose), L = J.L;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = '#4f9cff'; ctx.lineWidth = lw;
  ctx.beginPath();
  // задняя нога (на колене — колено на земле)
  ctx.moveTo(sx, J.hipY); ctx.lineTo(L(sx - S * 0.085, sx - S * 0.1), L(sy - S * 0.21, sy - S * 0.01));
  ctx.lineTo(L(sx - S * 0.17, sx - S * 0.32), L(sy, sy - S * 0.02));
  // передняя нога
  ctx.moveTo(sx, J.hipY); ctx.lineTo(L(sx + S * 0.085, sx + S * 0.17), L(sy - S * 0.21, sy - S * 0.22));
  ctx.lineTo(L(sx + S * 0.17, sx + S * 0.17), sy);
  // туловище
  ctx.moveTo(sx, J.hipY); ctx.lineTo(...J.neck);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(...J.head, S * 0.12, 0, 7); ctx.fill();

  // винтовка: P(d, o) — точка на расстоянии d вдоль ствола и o «вверх» от него
  const ca = Math.cos(angle), sa = Math.sin(angle), back = pose.recoil * S * 0.06;
  const P = (d, o = 0) => [J.gun[0] + ca * (d * S - back) + sa * o * S, J.gun[1] + sa * (d * S - back) - ca * o * S];
  const seg = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
  // руки держат винтовку
  ctx.strokeStyle = '#4f9cff'; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(...J.shoulder); ctx.lineTo(...P(0.06, -0.03));
  ctx.moveTo(...J.shoulder); ctx.lineTo(...P(0.32, -0.03));
  ctx.stroke();
  ctx.lineCap = 'butt';
  seg(P(-0.12, -0.01), P(0.1), lw * 2.3, '#9a6a42');            // приклад
  seg(P(0.1), P(0.4), lw * 1.5, '#6b7280');                     // ствольная коробка
  seg(P(0.4), P(0.74), lw * 0.75, '#c9ced8');                   // ствол
  seg(P(0.14, 0.055), P(0.32, 0.055), lw * 1.1, '#2f343f');     // оптика
  seg(P(0.14, 0.055), P(0.32, 0.055), lw * 0.5, '#8fc0ff');
  if (pose.flash) {
    const r = S * (pose.big ? 0.11 : 0.07), [fx, fy] = P(0.8);
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff4c9'; ctx.beginPath(); ctx.arc(fx, fy, r * 0.5, 0, 7); ctx.fill();
  }
  ctx.restore();
  return P(0.74);   // дульный срез
}

function drawCrowd(k, force) {
  k = Math.max(0, Math.min(N, k));
  if (force || !crowd.geo) {
    crowd.geo = crowdGeometry(); if (!crowd.geo) return;
    fitCanvas(cvs);
    crowd.shots = []; crowd.dead = Math.max(0, crowd.k);
  }
  if (k === crowd.k) return;
  const diff = k - crowd.k;
  if (crowd.k >= 0 && diff > 0 && (diff <= 3 || fast)) {
    const now = performance.now(), gapAfter = s => s.kind === 'norm' ? T_GAP : HOLD + BACK;
    let start = Math.max(now, ...crowd.shots.map(s => s.t0 + gapAfter(s)));
    for (let i = crowd.k; i < k; i++) {
      const kind = fast ? 'norm' : kindOf(i);        // в «уйти пораньше» без церемоний
      const s = { n: i, kind, t0: start + (PREP[kind] || 0) };
      crowd.shots.push(s); start = s.t0 + gapAfter(s);
    }
  } else { crowd.shots = []; crowd.dead = k; }   // большой скачок — без анимации
  crowd.k = k;
}

function crowdFrame(now) {
  const g = crowd.geo; if (!g) return;
  beginFrame(cvs, g);

  // какие выстрелы закончились — человечек окончательно лежит, стрелок вернулся в стойку
  crowd.shots = crowd.shots.filter(s => {
    const t = now - s.t0;
    if (t >= T_BULLET + fallTime(s)) crowd.dead = Math.max(crowd.dead, s.n + 1);
    return t < Math.max(T_BULLET + fallTime(s), s.kind === 'norm' ? 0 : HOLD + BACK);
  });
  const fall = {};
  for (const s of crowd.shots) {
    const t = now - s.t0 - T_BULLET;
    if (s.n >= crowd.dead) fall[ORDER[s.n]] = t <= 0 ? 0 : Math.min(1, t / fallTime(s));
  }

  // поза стрелка
  const pose = { kneel: 0, scope: 0, recoil: 0, flash: false, big: false };
  for (const s of crowd.shots) {
    const t = now - s.t0;
    if (t >= 0 && t < 140) { pose.recoil = 1 - t / 140; pose.flash = t < 90; pose.big = s.kind === 'fat'; }
    if (s.kind === 'norm') continue;
    const pre = PREP[s.kind];
    if (t < -pre || t > HOLD + BACK) continue;
    const p = t < 0 ? Math.min(1, (t + pre) / (pre * 0.5)) : t < HOLD ? 1 : Math.max(0, 1 - (t - HOLD) / BACK);
    const e = p * p * (3 - 2 * p);
    if (s.kind === 'hat') pose.kneel = Math.max(pose.kneel, e); else pose.scope = Math.max(pose.scope, e);
  }

  // толпа
  const lw = Math.max(1.5, g.s * 0.08);
  g.people.forEach((p, i) => {
    const rank = ORDER.indexOf(i);
    if (rank < crowd.dead) {
      ctx.fillStyle = 'rgba(192, 70, 70, 0.35)';
      const pr = isFat(rank) ? 1.3 : 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - g.s * 0.04, g.s * 0.45 * pr, g.s * 0.07 * pr, 0, 0, 7); ctx.fill();
      figure(p.x, p.y - g.s * 0.08, g.s, Math.PI / 2, '#6b6f7a', lw, rank);
    } else if (i in fall) {
      const f = fall[i], e = f * f;
      figure(p.x, p.y - g.s * 0.08 * e, g.s, e * Math.PI / 2, f > 0 ? '#e07a7a' : '#e8eaf0', lw, rank);
    } else {
      figure(p.x, p.y, g.s, 0, '#e8eaf0', lw, rank);
    }
  });

  // цель: текущий выстрел (или подготовка к нему) либо следующий по очереди
  const started = crowd.shots.filter(s => now >= s.t0 - Math.max(T_GAP * 0.6, PREP[s.kind] || 0));
  const shot = started[started.length - 1];
  const n = shot ? shot.n : crowd.k;
  const J = shooterJoints(g, pose);
  if (n >= 0 && n < N) {
    const p = g.people[ORDER[n]], big = isFat(n) ? 1.3 : 1, tx = p.x, ty = p.y - g.s * 0.6 * big;
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.8)'; ctx.lineWidth = 1.5;
    if (!shot) {   // обычный прицел на следующем
      const r = g.s * 0.42 * big;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, 7);
      ctx.moveTo(tx - r * 1.3, ty); ctx.lineTo(tx - r * 0.6, ty); ctx.moveTo(tx + r * 0.6, ty); ctx.lineTo(tx + r * 1.3, ty);
      ctx.moveTo(tx, ty - r * 1.3); ctx.lineTo(tx, ty - r * 0.6); ctx.moveTo(tx, ty + r * 0.6); ctx.lineTo(tx, ty + r * 1.3);
      ctx.stroke();
    } else if (pose.scope > 0.05) {   // вид через оптику: большое кольцо сходится на толстом
      const r = g.s * (2.6 - 1.4 * pose.scope);
      ctx.save(); ctx.globalAlpha = pose.scope;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20, 22, 28, 0.85)';
      ctx.beginPath(); ctx.arc(tx, ty, r + 3, 0, 7); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255, 90, 90, 0.95)';
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, 7);
      ctx.moveTo(tx - r, ty); ctx.lineTo(tx + r, ty); ctx.moveTo(tx, ty - r); ctx.lineTo(tx, ty + r);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 90, 90, 0.95)'; ctx.beginPath(); ctx.arc(tx, ty, 2, 0, 7); ctx.fill();
      ctx.restore();
    }
    const want = Math.atan2(ty - J.gun[1], tx - J.gun[0]);
    crowd.aim += (want - crowd.aim) * 0.15;   // плавно наводит винтовку
  }
  const tip = drawShooter(g, crowd.aim, pose);
  // все пули в полёте (в быстром режиме их несколько сразу)
  ctx.fillStyle = '#ffd36b';
  for (const s of crowd.shots) {
    const t = now - s.t0; if (t < 0 || t >= T_BULLET) continue;
    const p = g.people[ORDER[s.n]], q = t / T_BULLET, tx = p.x, ty = p.y - g.s * 0.6 * (s.kind === 'fat' ? 1.3 : 1);
    ctx.beginPath(); ctx.arc(tip[0] + (tx - tip[0]) * q, tip[1] + (ty - tip[1]) * q, Math.max(2, g.S * 0.025), 0, 7); ctx.fill();
  }
}

registerScene({
  name: 'Стрелок', author: 'Roganovs96',
  words: ['выстрел', 'каждые', 'следующий выстрел', 'следующий'],
  set: drawCrowd, frame: crowdFrame,
  // «уйти пораньше»: вся очередь отстреливается за ~5 секунд
  onFast(f) {
    if (f) { T_GAP = f.per; T_BULLET = Math.min(260, Math.max(80, f.per * 2)); T_FALL = Math.min(420, Math.max(150, f.per * 4)); }
    else { T_BULLET = 260; T_FALL = 420; T_GAP = 700; crowd.shots = []; }
  },
});
