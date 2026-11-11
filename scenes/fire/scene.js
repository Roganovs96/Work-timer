// Костёр: в поленнице ровно столько поленьев, сколько осталось частей дня.
// Человек носит их по одному в огонь, зола растёт, берёзовые поленья отмечают часы.
const fireCvs = makeCanvas();
const fire = { geo: null, k: -1, trips: [], tosses: [] };
const F_ROLL = 900, F_PICK = 500, F_THROW = 550, F_REST = 300, F_TOSS = 650;

function fireGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  const gy = H - 6, S = Math.min(H * 0.3, W * 0.2), fw = S * 0.95, fx = W - fw / 2 - 10;
  const pw = Math.max(40, Math.min(W - 26 - fw - S * 1.6, W * 0.55)), ph = gy - 12;
  const [cols, rows] = pickGrid(pw, ph), d = Math.min(pw / cols, ph / rows);
  const px0 = 10 + Math.max(2, d * 0.15), px1 = px0 + cols * d, r = rng(7);
  // rank 0 берут первым: верхний ряд, справа налево
  const logs = [...Array(N).keys()].map(i => {
    const row = Math.floor(i / cols), col = cols - 1 - i % cols;
    return { x: px0 + (col + 0.5) * d + (r() - 0.5) * d * 0.06, y: gy - (rows - row - 0.5) * d + (r() - 0.5) * d * 0.04,
             r: d * (0.44 + r() * 0.05), rot: r() * 7 };
  });
  const P = { x: px1 + d * 0.9, y: gy - d * 0.47 };            // куда скатывается взятое полено
  const xp = P.x + S * 0.3, xm = fx - fw * 0.55 - S * 0.12;     // где стоит у поленницы и у костра
  return { W, H, gy, S, fw, fx, d, px0, px1, top: gy - rows * d, logs, P, xp, xm,
           walkT: Math.max(400, Math.abs(xm - xp) / (S * 1.6) * 1000) };
}

function fireSet(k, force) {
  k = Math.max(0, Math.min(N, k));
  if (force || !fire.geo) {
    fire.geo = fireGeometry(); if (!fire.geo) return;
    fitCanvas(fireCvs); fire.trips = []; fire.tosses = [];
  }
  if (k === fire.k) return;
  const diff = k - fire.k, now = performance.now();
  if (fire.k >= 0 && diff > 0 && fast) {
    for (let i = fire.k; i < k; i++) fire.tosses.push({ r: i, t0: now + (i - fire.k) * 25 });
  } else if (fire.k >= 0 && diff > 0 && diff <= 3) {
    // полено скатывается сразу (в поленнице всегда ровно N − k), человек идёт за ним, когда освободится
    const w = fire.geo.walkT;
    let start = Math.max(now, ...fire.trips.map(t => t.end));
    for (let i = fire.k; i < k; i++) {
      const t = { r: i, tick: now, start };
      t.tArrive = Math.max(start + w, now + F_ROLL); t.tPick = t.tArrive + F_PICK;
      t.tBack = t.tPick + w; t.tLand = t.tBack + F_THROW; t.end = t.tLand + F_REST;
      fire.trips.push(t); start = t.end;
    }
  } else { fire.trips = []; fire.tosses = []; }
  fire.k = k;
}

// Полено с торца; берёзовые — те, на которых заканчивается очередной час
function drawLog(x, y, r, rot, rank) {
  const birch = rank != null && isFat(rank);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = birch ? '#e9e4d6' : '#6e4526'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = birch ? '#e8c890' : '#c8925a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(110, 69, 38, 0.55)'; ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 7);
  if (r > 4) { ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 0.72, 0); }
  ctx.stroke();
  if (birch && r > 4) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-r * 0.15, -r * 0.98, r * 0.3, r * 0.12); ctx.fillRect(r * 0.6, r * 0.5, r * 0.25, r * 0.12); }
  ctx.restore();
}

function drawFire(g, now, boost) {
  const { fx, gy, fw } = g, a = Math.sqrt(fire.k / N);
  // зарево
  const R = fw * (1.5 + boost * 0.6), gr = ctx.createRadialGradient(fx, gy - fw * 0.3, 0, fx, gy - fw * 0.3, R);
  gr.addColorStop(0, `rgba(255, 140, 50, ${0.22 + boost * 0.15})`); gr.addColorStop(1, 'rgba(255, 140, 50, 0)');
  ctx.fillStyle = gr; ctx.fillRect(fx - R, gy - fw * 0.3 - R, R * 2, R * 2);
  // зола растёт вместе с прошедшим временем
  const hw = fw * (0.5 + 0.5 * a), hh = fw * (0.05 + 0.17 * a);
  ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.ellipse(fx, gy, hw / 2, hh, 0, Math.PI, Math.PI * 2); ctx.fill();
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const ex = fx + (r() - 0.5) * hw * 0.8, ey = gy - r() * hh * 0.7, f = 0.5 + 0.5 * Math.sin(now / (180 + i * 40) + i);
    ctx.fillStyle = `rgba(255, ${120 + f * 80 | 0}, 60, ${0.4 + f * 0.5})`;
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, fw * 0.025), 0, 7); ctx.fill();
  }
  const base = gy - hh * 0.6;
  // дрова в костре
  ctx.lineCap = 'round'; ctx.lineWidth = fw * 0.09; ctx.strokeStyle = '#5a3a22';
  ctx.beginPath(); ctx.moveTo(fx - fw * 0.38, base + fw * 0.02); ctx.lineTo(fx + fw * 0.2, base - fw * 0.16);
  ctx.moveTo(fx + fw * 0.38, base + fw * 0.02); ctx.lineTo(fx - fw * 0.2, base - fw * 0.16); ctx.stroke();
  // языки пламени
  for (const [col, sc] of [['#ff6b2c', 1], ['#ffb347', 0.66], ['#fff1a8', 0.36]]) {
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * fw * 0.13 * sc, w = fw * 0.13 * sc + fw * 0.03;
      const h = fw * sc * (i === 2 ? 0.95 : 0.6) * (0.85 + 0.15 * Math.sin(now / 130 + i * 1.7) + 0.08 * Math.sin(now / 71 + i * 3)) * (1 + boost * 0.6);
      const sway = Math.sin(now / 200 + i) * fw * 0.05;
      ctx.beginPath(); ctx.moveTo(fx + ox - w, base);
      ctx.quadraticCurveTo(fx + ox - w * 0.8, base - h * 0.6, fx + ox + sway, base - h);
      ctx.quadraticCurveTo(fx + ox + w * 0.8, base - h * 0.6, fx + ox + w, base); ctx.fill();
    }
  }
  return base;
}

function fireFrame(now) {
  const g = fire.geo; if (!g) return;
  beginFrame(fireCvs, g);
  fire.trips = fire.trips.filter(t => now < t.end + 1500);
  fire.tosses = fire.tosses.filter(t => now < t.t0 + F_TOSS + 1500);
  const { gy, S, d, P, fx, fw } = g;

  // земля и колья поленницы
  ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(g.W, gy + 1); ctx.stroke();
  ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = Math.max(2, d * 0.18); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(g.px0 - ctx.lineWidth / 2, gy); ctx.lineTo(g.px0 - ctx.lineWidth / 2, g.top - d * 0.2);
  ctx.moveTo(g.px1 + ctx.lineWidth / 2, gy); ctx.lineTo(g.px1 + ctx.lineWidth / 2, Math.max(g.top - d * 0.2, gy - d * 3)); ctx.stroke();

  for (let r = fire.k; r < N; r++) { const l = g.logs[r]; drawLog(l.x, l.y, l.r, l.rot, r); }

  let boost = 0;
  for (const t of fire.trips) if (now > t.tLand) boost = Math.max(boost, 1 - (now - t.tLand) / 1200);
  for (const t of fire.tosses) if (now > t.t0 + F_TOSS) boost = Math.max(boost, 0.6 - (now - t.t0 - F_TOSS) / 1500);
  const base = drawFire(g, now, boost);
  // искры от только что брошенного полена
  ctx.fillStyle = '#ffd36b';
  for (const t of fire.trips) {
    const e = now - t.tLand; if (e < 0 || e > 1100) continue;
    const r = rng(t.r);
    for (let i = 0; i < 7; i++) {
      const vx = (r() - 0.5) * fw * 0.8, vy = fw * (0.8 + r() * 0.9), q = e / 1100;
      ctx.globalAlpha = 1 - q; ctx.beginPath();
      ctx.arc(fx + vx * q, base - fw * 0.3 - vy * q + fw * 0.3 * q * q, Math.max(1, fw * 0.025), 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // в «уйти пораньше» поленья летят в костёр сами
  const fireIn = [fx, base - fw * 0.15];
  for (const t of fire.tosses) {
    const p = (now - t.t0) / F_TOSS; if (p < 0 || p >= 1) continue;
    const l = g.logs[t.r];
    drawLog(lerp(l.x, fireIn[0], p), lerp(l.y, fireIn[1], p) - S * 1.2 * 4 * p * (1 - p), l.r, l.rot + p * 9, t.r);
  }

  // взятые поленья: скатываются, лежат у поленницы, летят в костёр
  const cur = fire.trips.find(t => now >= t.start && now < t.end);
  let lying = 0;
  for (const t of fire.trips) {
    const l = g.logs[t.r], e = now - t.tick;
    if (e < F_ROLL) {
      const p = e / F_ROLL, pe = Math.max(0, Math.min(0.9, (g.px1 - l.x) / (P.x - l.x || 1)));
      const y = p < pe ? l.y : lerp(l.y, P.y, ((p - pe) / (1 - pe)) ** 2);
      drawLog(lerp(l.x, P.x, p), y, l.r, l.rot + p * (P.x - l.x) / l.r, t.r);
    } else if (now < t.tPick + F_PICK * 0.5) {
      drawLog(P.x - lying++ * d * 0.25, P.y, l.r, l.rot + (P.x - l.x) / l.r, t.r);
    } else if (now >= t.tBack + F_THROW * 0.4 && now < t.tLand) {
      const p = (now - t.tBack - F_THROW * 0.4) / (F_THROW * 0.6), h = [g.xm + S * 0.3, gy - S * 0.85];
      drawLog(lerp(h[0], fireIn[0], p), lerp(h[1], fireIn[1], p) - S * 0.35 * 4 * p * (1 - p), l.r, l.rot + p * 6, t.r);
    }
  }

  // человек
  const warm = sh => [[sh[0] + S * 0.3, sh[1] + S * 0.04], [sh[0] + S * 0.27, sh[1] + S * 0.1]];
  let o = { dir: 1, hands: warm, bob: Math.sin(now / 600) * S * 0.008 }, x = g.xm, carry = null;
  if (fast) o = { dir: 1, bob: -Math.abs(Math.sin(now / 160)) * S * 0.08, hands: sh => [[sh[0] + S * 0.12, sh[1] - S * 0.3], [sh[0] - S * 0.1, sh[1] - S * 0.3]] };
  else if (cur) {
    const t = cur, w = g.walkT, l = g.logs[t.r];
    const carryHands = sh => [[sh[0] + S * 0.22, sh[1] + S * 0.12], [sh[0] + S * 0.2, sh[1] + S * 0.16]];
    if (now < t.start + w) {
      const p = (now - t.start) / w; x = lerp(g.xm, g.xp, p);
      o = { dir: -1, walk: Math.abs(x - g.xm) / (S * 0.18) };
    } else if (now < t.tArrive) { x = g.xp; o = { dir: -1 }; }
    else if (now < t.tPick) {
      const p = (now - t.tArrive) / F_PICK, b = Math.sin(Math.PI * p);
      x = g.xp;
      o = { dir: -1, bend: b, hands: sh => { const gp = [S * 0.3, -d * 0.47], hc = [sh[0] + S * 0.2, sh[1] + S * 0.14];
        return [[lerp(hc[0], gp[0], b), lerp(hc[1], gp[1], b)], [lerp(hc[0], gp[0], b) - S * 0.03, lerp(hc[1], gp[1], b)]]; } };
      if (p > 0.5) carry = l;
    } else if (now < t.tBack) {
      const p = (now - t.tPick) / w; x = lerp(g.xp, g.xm, p);
      o = { dir: 1, walk: Math.abs(x - g.xp) / (S * 0.18), hands: carryHands }; carry = l;
    } else if (now < t.tLand) {
      const p = (now - t.tBack) / F_THROW, th = lerp(0.6, -0.9, smooth(Math.min(1, p / 0.5)));
      o = { dir: 1, hands: sh => [[sh[0] + Math.cos(th) * S * 0.3, sh[1] + Math.sin(th) * S * 0.3], [sh[0] + Math.cos(th) * S * 0.28, sh[1] + Math.sin(th) * S * 0.3 + S * 0.03]] };
      if (p < 0.4) carry = l;
    }
  }
  const hands = walker(x, gy, S, o);
  if (carry) drawLog((hands[0][0] + hands[1][0]) / 2, (hands[0][1] + hands[1][1]) / 2 - carry.r * 0.6, carry.r, carry.rot, cur.r);
}


registerScene({
  name: 'Костёр', author: 'Roganovs96',
  words: ['полено', 'каждые', 'следующее полено', 'следующее'],
  set: fireSet, frame: fireFrame,
  onFast(f) { if (!f) fire.tosses = []; },
});
