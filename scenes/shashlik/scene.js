// Шашлык: в загоне 100 овец — по одной на каждый процент рабочего дня.
// Каждый процент одна овца уходит на бойню, а оттуда на мангал вылетает шампур. Всё мультяшно, без крови.
// Чёрные овцы — те, на которых заканчивается очередной час.
// Готовые шашлыки складываются на доску: сколько их — столько процентов дня прошло.

const SHEEP = 100;
const cv = makeCanvas();
css(`
  .hud { position: absolute; top: 8px; left: 10px; font-size: 15px; color: #8a90a0; pointer-events: none;
    background: rgba(15, 17, 21, 0.75); border-radius: 10px; padding: 4px 10px; }
  .hud b { color: #e8eaf0; font-variant-numeric: tabular-nums; }
`);
html('<div class="hud">🐑 <b id="sheepLeft">100</b> · 🍢 <b id="kebabs">0</b></div>');

const farm = { g: null, k: -1, done: 0, ev: [] };
// мс: дверь, тряска сарая, полёт шампура, жарка, перенос на доску
const D_DOOR = 260, D_SHAKE = 800, D_FLY = 600, D_GRILL = 2600, D_SERVE = 600;

// на этой овце заканчивается очередной час — она чёрная
function hourSheep(r) {
  const h = dayLenMs() / 3600000;
  return Math.floor((r + 1) * h / SHEEP + 1e-9) > Math.floor(r * h / SHEEP + 1e-9);
}
const sheepNow = () => Math.max(0, Math.min(SHEEP, Math.floor(curPct + 1e-9)));

function geometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  const port = H > W * 1.05, gy = H - 10, top = 40;
  let pen, gate, shed, grill, rack;
  if (port) {
    pen = { x: 10, y: top, w: W - 20, h: H * 0.5 };
    gate = [pen.x + pen.w / 2, pen.y + pen.h];
    const sw = W * 0.3, sh = Math.min(H * 0.2, sw * 0.8);
    shed = { x: 10, y: gy - sh, w: sw, h: sh };
    grill = { x: W * 0.45, w: W * 0.24 };
    rack = { x: W * 0.72, y: pen.y + pen.h + 24, w: W * 0.28 - 10, h: gy - pen.y - pen.h - 34 };
  } else {
    pen = { x: 10, y: top, w: W * 0.4, h: gy - top - 10 };
    gate = [pen.x + pen.w, pen.y + pen.h * 0.75];
    const sh = Math.min(H * 0.42, W * 0.16), sw = sh * 1.15;
    shed = { x: W * 0.45, y: gy - sh, w: sw, h: sh };
    grill = { x: shed.x + sw + W * 0.04, w: W * 0.12 };
    rack = { x: W * 0.84, y: top, w: W * 0.16 - 10, h: gy - top - 10 };
  }
  grill.y = gy - Math.min(H * 0.12, grill.w * 0.5); grill.top = grill.y;
  const door = [shed.x + shed.w * 0.5, gy - 2];
  // загон: сетка 100 овец, первыми уходят ближайшие к калитке
  const opts = [[4, 25], [5, 20], [10, 10], [20, 5], [25, 4]];
  const [cols, rows] = opts.reduce((a, b) => Math.abs(Math.log(b[0] / b[1] * pen.h / pen.w)) < Math.abs(Math.log(a[0] / a[1] * pen.h / pen.w)) ? b : a);
  const cw = (pen.w - 16) / cols, ch = (pen.h - 16) / rows, s = Math.min(cw * 0.85, ch * 1.25);
  const r = rng(21);
  const spots = [...Array(SHEEP).keys()].map(i => ({
    x: pen.x + 8 + (i % cols + 0.5) * cw + (r() - 0.5) * cw * 0.15,
    y: pen.y + 8 + (Math.floor(i / cols) + 0.75) * ch + (r() - 0.5) * ch * 0.1,
    ph: r() * 7, dir: r() < 0.5 ? -1 : 1,
  })).sort((a, b) => Math.hypot(a.x - gate[0], a.y - gate[1]) - Math.hypot(b.x - gate[0], b.y - gate[1]));
  const S = Math.min(H * 0.22, W * 0.12);
  return { W, H, port, gy, pen, gate, shed, door, grill, rack, spots, s, S, speed: Math.max(40, s * 3) };
}

function set(k, force) {
  if (force || !farm.g) {
    farm.g = geometry(); if (!farm.g) return;
    fitCanvas(cv); farm.ev = []; farm.done = Math.max(0, farm.k);
  }
  const n = sheepNow();
  if (n === farm.k) return;
  const diff = n - farm.k, now = performance.now(), g = farm.g;
  if (farm.k >= 0 && diff > 0 && (diff <= 3 || fast)) {
    const f = fast ? 0.2 : 1;
    let lastIn = Math.max(0, ...farm.ev.map(e => e.tIn));
    for (let i = farm.k; i < n; i++) {
      const p = g.spots[i], d1 = Math.hypot(p.x - g.gate[0], p.y - g.gate[1]), d2 = Math.hypot(g.gate[0] - g.door[0], g.gate[1] - g.door[1]);
      const t0 = now + (i - farm.k) * 40 * f, v = g.speed / f;
      const e = { r: i, t0, tGate: t0 + d1 / v * 1000 };
      e.tDoor = e.tGate + d2 / v * 1000;
      e.tIn = Math.max(e.tDoor, lastIn + (D_DOOR * 2 + D_SHAKE) * f); lastIn = e.tIn;
      e.tOut = e.tIn + (D_DOOR + D_SHAKE) * f; e.tGrill = e.tOut + D_FLY * f;
      e.tServe = e.tGrill + D_GRILL * f; e.tDone = e.tServe + D_SERVE * f; e.f = f;
      farm.ev.push(e);
    }
  } else { farm.ev = []; farm.done = n; }
  farm.k = n;
}

function tick() {
  $('sheepLeft').textContent = SHEEP - Math.max(0, farm.k);
  $('kebabs').textContent = farm.done;
}

// Овца: (x, y) — где стоит, s — размер, phase — шаг (null — стоит), black — чёрная
function sheep(x, y, s, dir, phase, black) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const legA = phase == null ? 0 : Math.sin(phase) * s * 0.08;
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(1.2, s * 0.07); ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, sg] of [[-0.22, 1], [-0.1, -1], [0.12, 1], [0.24, -1]]) { ctx.moveTo(lx * s, -s * 0.18); ctx.lineTo(lx * s + sg * legA, 0); }
  ctx.stroke();
  ctx.fillStyle = black ? '#3d3d42' : '#eceae4';
  for (const [cx, cy, cr] of [[-0.2, -0.32, 0.17], [0, -0.38, 0.19], [0.18, -0.32, 0.17], [-0.08, -0.24, 0.16], [0.1, -0.24, 0.16]]) {
    ctx.beginPath(); ctx.arc(cx * s, cy * s, cr * s, 0, 7); ctx.fill();
  }
  ctx.fillStyle = black ? '#141416' : '#2a2a2a';
  ctx.beginPath(); ctx.ellipse(s * 0.38, -s * 0.36, s * 0.11, s * 0.08, 0.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.32, -s * 0.44, s * 0.06, s * 0.025, -0.6, 0, 7); ctx.fill();
  ctx.restore();
}

// Шампур: x, y — центр, len — длина, rot — поворот, cook 0..1 — прожарка
function skewer(x, y, len, rot, cook) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = Math.max(1, len * 0.03); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
  ctx.fillStyle = '#6b4a3a'; ctx.fillRect(-len / 2 - len * 0.06, -len * 0.035, len * 0.1, len * 0.07);
  const meat = `rgb(${lerp(196, 120, cook) | 0}, ${lerp(98, 56, cook) | 0}, ${lerp(84, 34, cook) | 0})`;
  for (let i = 0; i < 4; i++) {
    const mx = -len * 0.28 + i * len * 0.2;
    ctx.fillStyle = meat; ctx.beginPath(); ctx.roundRect(mx - len * 0.07, -len * 0.08, len * 0.14, len * 0.16, len * 0.04); ctx.fill();
    if (i < 3) { ctx.fillStyle = '#f2ead8'; ctx.fillRect(mx + len * 0.075, -len * 0.06, len * 0.03, len * 0.12); }
  }
  ctx.restore();
}

function drawShed(g, now, shake, doorOpen) {
  const { shed: s } = g, dx = shake ? Math.sin(now / 30) * s.w * 0.02 : 0;
  ctx.save(); ctx.translate(dx, 0);
  ctx.fillStyle = '#6e4526'; ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = s.x + s.w / 6; x < s.x + s.w; x += s.w / 6) { ctx.moveTo(x, s.y); ctx.lineTo(x, s.y + s.h); }
  ctx.stroke();
  ctx.fillStyle = '#8a3b2e'; ctx.beginPath(); ctx.moveTo(s.x - s.w * 0.08, s.y); ctx.lineTo(s.x + s.w / 2, s.y - s.h * 0.4); ctx.lineTo(s.x + s.w * 1.08, s.y); ctx.fill();
  ctx.fillStyle = '#4a4f59'; ctx.fillRect(s.x + s.w * 0.72, s.y - s.h * 0.42, s.w * 0.1, s.h * 0.3);        // труба
  const dw = s.w * 0.32, dh = s.h * 0.55, dxl = s.x + s.w / 2 - dw / 2;
  ctx.fillStyle = '#1b1b1f'; ctx.fillRect(dxl, s.y + s.h - dh, dw, dh);                                   // проём
  ctx.fillStyle = '#9a6a42'; ctx.fillRect(dxl, s.y + s.h - dh, dw * (1 - doorOpen * 0.85), dh);           // дверь
  ctx.fillStyle = '#d9c9a3'; ctx.fillRect(s.x + s.w * 0.22, s.y + s.h * 0.08, s.w * 0.56, s.h * 0.2);
  ctx.font = `700 ${Math.max(8, Math.min(s.w * 0.11, s.h * 0.15))}px -apple-system, sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = '#3a2516'; ctx.textBaseline = 'middle'; ctx.fillText('БОЙНЯ', s.x + s.w / 2, s.y + s.h * 0.185);
  ctx.restore();
  // дым из трубы, пока внутри кипит работа
  if (shake) for (let i = 0; i < 3; i++) {
    const q = ((now / 700) + i / 3) % 1;
    ctx.fillStyle = `rgba(160, 165, 175, ${0.5 * (1 - q)})`;
    ctx.beginPath(); ctx.arc(s.x + s.w * 0.77 + q * s.w * 0.2, s.y - s.h * 0.45 - q * s.h * 0.6, s.w * (0.05 + q * 0.08), 0, 7); ctx.fill();
  }
}

function drawGrill(g, now, active) {
  const { grill: m, gy } = g, h = gy - m.y, legH = h * 0.55, boxH = h - legH;
  ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(m.x + m.w * 0.1, m.y + boxH); ctx.lineTo(m.x + m.w * 0.06, gy); ctx.moveTo(m.x + m.w * 0.9, m.y + boxH); ctx.lineTo(m.x + m.w * 0.94, gy); ctx.stroke();
  ctx.fillStyle = '#2a2d33'; ctx.fillRect(m.x, m.y, m.w, boxH);
  // угли
  for (let i = 0; i < 9; i++) {
    const f = 0.5 + 0.5 * Math.sin(now / (150 + i * 37) + i);
    ctx.fillStyle = `rgba(255, ${100 + f * 90 | 0}, 40, ${0.55 + 0.45 * f})`;
    ctx.beginPath(); ctx.arc(m.x + m.w * (0.08 + i * 0.105), m.y + boxH * 0.25, Math.max(2, m.w * 0.03), 0, 7); ctx.fill();
  }
  if (active) for (let i = 0; i < 4; i++) {   // дымок над мангалом
    const q = ((now / 900) + i / 4) % 1;
    ctx.fillStyle = `rgba(200, 200, 210, ${0.25 * (1 - q)})`;
    ctx.beginPath(); ctx.arc(m.x + m.w * (0.2 + i * 0.2) + Math.sin(now / 400 + i) * 6, m.y - q * m.w * 0.6, m.w * (0.04 + q * 0.06), 0, 7); ctx.fill();
  }
}

// доска с готовыми шашлыками: сетка 10×10
function rackSpot(g, i) {
  const { rack: r } = g, cw = r.w / 10, ch = (r.h - 18) / 10;
  return { x: r.x + (i % 10 + 0.5) * cw, y: r.y + r.h - (Math.floor(i / 10) + 0.5) * ch, len: Math.min(ch * 0.9, cw * 3), cw, ch };
}
function drawRack(g, done) {
  const { rack: r } = g;
  ctx.fillStyle = 'rgba(154, 106, 66, 0.25)'; ctx.beginPath(); ctx.roundRect(r.x - 4, r.y + 14, r.w + 8, r.h - 10, 6); ctx.fill();
  ctx.fillStyle = '#8a90a0'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('готово: ' + done, r.x + r.w / 2, r.y + 10);
  for (let i = 0; i < done; i++) { const p = rackSpot(g, i); skewer(p.x, p.y, p.len, -Math.PI / 2, 1); }
}

function frame(now) {
  const g = farm.g; if (!g) return;
  beginFrame(cv, g);
  // завершённые шашлыки — на доску
  farm.ev = farm.ev.filter(e => { if (now >= e.tDone) { farm.done++; return false; } return true; });
  const { pen, gate, door, s, gy, grill } = g;

  // трава и забор
  ctx.fillStyle = '#1f3326'; ctx.fillRect(pen.x, pen.y, pen.w, pen.h);
  ctx.fillStyle = '#24402a'; ctx.fillRect(0, gy, g.W, 10);
  ctx.strokeStyle = '#9a6a42'; ctx.lineWidth = 2; ctx.strokeRect(pen.x, pen.y, pen.w, pen.h);
  ctx.fillStyle = '#9a6a42';
  for (let x = pen.x; x <= pen.x + pen.w; x += Math.max(14, pen.w / 24)) { ctx.fillRect(x - 1.5, pen.y - 4, 3, 6); ctx.fillRect(x - 1.5, pen.y + pen.h - 2, 3, 6); }
  ctx.fillStyle = '#1f3326'; ctx.fillRect(gate[0] - (g.port ? s * 0.6 : 3), gate[1] - (g.port ? 3 : s * 0.6), g.port ? s * 1.2 : 6, g.port ? 6 : s * 1.2);   // калитка

  // овцы в загоне: их ровно столько, сколько процентов осталось
  for (let r = Math.max(0, farm.k); r < SHEEP; r++) {
    const p = g.spots[r], graze = Math.sin(now / 900 + p.ph) * s * 0.03;
    sheep(p.x + graze, p.y, s, p.dir, null, hourSheep(r));
  }

  // идущие к сараю овцы, сарай, шампуры
  let shake = false, doorOpen = 0, grilling = false;
  for (const e of farm.ev) {
    if (now >= e.tIn - D_DOOR * e.f && now < e.tIn + D_DOOR * e.f) doorOpen = Math.max(doorOpen, 1 - Math.abs(now - e.tIn) / (D_DOOR * e.f));
    if (now >= e.tIn + D_DOOR * e.f && now < e.tOut) shake = true;
    if (now >= e.tGrill && now < e.tServe) grilling = true;
  }
  drawShed(g, now, shake, doorOpen);
  drawGrill(g, now, grilling);

  const slot = i => [grill.x + grill.w * (0.15 + (i % 5) * 0.175), grill.y - 2];
  const win = [g.shed.x + g.shed.w * 0.85, g.shed.y + g.shed.h * 0.35];
  for (const e of farm.ev) {
    const p = g.spots[e.r], black = hourSheep(e.r), sl = slot(e.r), len = Math.min(grill.w * 0.9, g.S * 0.9);
    if (now < e.tDoor) {                                                    // идёт к сараю
      const walk = (now - e.t0) / 1000 * g.speed / e.f / (s * 0.25);
      let x, y;
      if (now < e.tGate) { const q = Math.max(0, (now - e.t0) / (e.tGate - e.t0)); x = lerp(p.x, gate[0], q); y = lerp(p.y, gate[1], q); }
      else { const q = (now - e.tGate) / (e.tDoor - e.tGate || 1); x = lerp(gate[0], door[0], q); y = lerp(gate[1], door[1], q); }
      const tx = now < e.tGate ? gate[0] - p.x : door[0] - gate[0];
      if (now >= e.t0) sheep(x, y, s, tx >= 0 ? 1 : -1, walk, black);
      else sheep(p.x, p.y, s, p.dir, null, black);
    } else if (now < e.tIn) {                                               // ждёт у двери
      sheep(door[0] + s * 0.4, door[1], s, -1, null, black);
    } else if (now >= e.tOut && now < e.tGrill) {                           // шампур летит на мангал
      const q = (now - e.tOut) / (e.tGrill - e.tOut);
      skewer(lerp(win[0], sl[0], q), lerp(win[1], sl[1], q) - g.S * 0.6 * 4 * q * (1 - q), len * lerp(0.6, 1, q), q * Math.PI * 2, 0);
    } else if (now >= e.tGrill && now < e.tServe) {                         // жарится
      const q = (now - e.tGrill) / (e.tServe - e.tGrill);
      skewer(sl[0], sl[1], len, -Math.PI / 2 + Math.sin(now / 200) * 0.05, q);
    } else if (now >= e.tServe) {                                           // на доску
      const q = (now - e.tServe) / (e.tDone - e.tServe), t = rackSpot(g, farm.done + farm.ev.filter(x => x.tServe <= now && x.r < e.r).length);
      skewer(lerp(sl[0], t.x, q), lerp(sl[1], t.y, q) - g.S * 0.5 * 4 * q * (1 - q), lerp(len, t.len, q), -Math.PI / 2, 1);
    }
  }
  drawRack(g, farm.done);

  // повар у мангала машет картонкой
  // на телефоне повар слева от мангала, на компьютере — справа
  const fan = Math.sin(now / (fast ? 60 : 160)), cs = g.port ? g.S * 0.8 : g.S;
  const cx = g.port ? grill.x - cs * 0.3 : grill.x + grill.w + cs * 0.3;
  walker(cx, gy, cs, { dir: g.port ? 1 : -1, color: '#e8eaf0', head: '#4f9cff',
    hands: sh => [[sh[0] + cs * 0.3, sh[1] + cs * (0.05 + fan * 0.08)], [sh[0] + cs * 0.1, sh[1] + cs * 0.26]] });
}

registerScene({
  name: 'Шашлык', author: 'Roganovs96',
  words: ['овца', 'каждые', 'следующая овца', 'следующая'], steps: 100,
  set, frame, tick,
  onFast(f) { if (!f) farm.ev = []; },
});
