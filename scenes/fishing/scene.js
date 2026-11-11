// Рыбалка: в пруду ровно столько рыб, сколько осталось частей дня.
// Каждую часть одна клюёт и летит в ведро; часовые рыбы большие и золотые.
const fishCvs = makeCanvas();
const pond = { geo: null, k: -1, ev: [], jumps: [] };
const P_BITE = 650, P_FIGHT = 1700, P_OUT = 750, P_JUMP = 700;

function pondGeometry() {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  const S = Math.min(H * 0.22, W * 0.2), sy = Math.max(S * 1.35 + 10, H * 0.26);
  const deck = sy - S * 0.2, pier = S * 1.0, mx = S * 0.62;
  const grip = [mx + S * 0.22, deck - S * 0.55];
  const tip = [Math.min(W - 12, mx + S * 1.9), Math.max(6, deck - S * 1.3)];
  const flt = [Math.max(pier + S * 0.2, tip[0] + S * 0.1), sy], hook = [flt[0], sy + S * 0.55];
  const bucket = { x: S * 0.22, y: deck, w: S * 0.32, h: S * 0.3 };
  const x0 = 10, x1 = W - 10, y0 = sy + 14, y1 = H - 14;
  const [cols, rows] = pickGrid(x1 - x0, y1 - y0), cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
  const len = Math.min(cw * 0.75, ch * 1.6, 30), r = rng(11);
  const fish = [...Array(N).keys()].map(i => ({
    hx: x0 + (i % cols + 0.5) * cw + (r() - 0.5) * cw * 0.5, hy: y0 + (Math.floor(i / cols) + 0.5) * ch + (r() - 0.5) * ch * 0.4,
    ax: cw * (0.25 + r() * 0.3), ay: ch * 0.15, w: 0.25 + r() * 0.4, ph: r() * 7, ph2: r() * 7,
  }));
  // какая рыба попадётся следующей — вперемешку
  const order = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const weeds = [...Array(Math.max(4, Math.round(W / 45)))].map(() => ({ x: r() * W, h: S * (0.3 + r() * 0.5), ph: r() * 7 }));
  return { W, H, S, sy, deck, pier, mx, grip, tip, flt, hook, bucket, fish, order, len, weeds };
}

// где рыба сейчас плавает сама по себе
function wander(g, rank, now) {
  const f = g.fish[g.order[rank]], t = now / 1000;
  return { x: f.hx + f.ax * Math.sin(f.w * t + f.ph), y: f.hy + f.ay * Math.sin(1.7 * f.w * t + f.ph2), dir: Math.cos(f.w * t + f.ph) >= 0 ? 1 : -1 };
}
const fishLen = (g, r) => g.len * (isFat(r) ? 1.8 : 1);
const fishColor = r => isFat(r) ? '#ffd36b' : isHat(r) ? '#ff9f6b' : '#9fb3c8';

function pondSet(k, force) {
  k = Math.max(0, Math.min(N, k));
  if (force || !pond.geo) {
    pond.geo = pondGeometry(); if (!pond.geo) return;
    fitCanvas(fishCvs); pond.ev = []; pond.jumps = [];
  }
  if (k === pond.k) return;
  const diff = k - pond.k, now = performance.now(), g = pond.geo;
  if (pond.k >= 0 && diff > 0 && fast) {
    for (let i = pond.k; i < k; i++) pond.jumps.push({ r: i, t0: now + (i - pond.k) * 25 });
  } else if (pond.k >= 0 && diff > 0 && diff <= 3) {
    let start = Math.max(now, ...pond.ev.map(e => e.end));
    for (let i = pond.k; i < k; i++) {
      const w = wander(g, i, start), dist = Math.hypot(w.x - g.hook[0], w.y - g.hook[1]);
      const e = { r: i, t0: start };
      e.tHook = start + Math.max(600, Math.min(3000, dist / (g.S * 1.3) * 1000));
      e.tBite = e.tHook + (isFat(i) ? P_FIGHT : P_BITE); e.tOut = e.tBite + P_OUT; e.end = e.tOut + 250;
      pond.ev.push(e); start = e.end;
    }
  } else { pond.ev = []; pond.jumps = []; }
  pond.k = k;
}

function drawFish(x, y, len, dir, color, wag, rot) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir, 1);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, len * 0.5, len * 0.2, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-len * 0.4, 0); ctx.lineTo(-len * 0.72, -len * 0.2 + wag); ctx.lineTo(-len * 0.72, len * 0.2 + wag); ctx.fill();
  if (len > 9) { ctx.fillStyle = '#0f1115'; ctx.beginPath(); ctx.arc(len * 0.28, -len * 0.04, Math.max(1, len * 0.045), 0, 7); ctx.fill(); }
  ctx.restore();
}

function pondFrame(now) {
  const g = pond.geo; if (!g) return;
  beginFrame(fishCvs, g);
  pond.ev = pond.ev.filter(e => now < e.end);
  pond.jumps = pond.jumps.filter(j => now < j.t0 + P_JUMP);
  const { S, sy, deck, W, H, hook, flt, bucket } = g;

  // вода
  const wg = ctx.createLinearGradient(0, sy, 0, H);
  wg.addColorStop(0, '#163650'); wg.addColorStop(1, '#0b1a28');
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, sy + Math.sin(x / 23 + now / 700) * 1.5);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = '#2b2a24'; ctx.fillRect(0, H - 8, W, 8);
  ctx.strokeStyle = '#2f6b4a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const wd of g.weeds) {
    ctx.beginPath(); ctx.moveTo(wd.x, H - 6);
    ctx.quadraticCurveTo(wd.x + Math.sin(now / 900 + wd.ph) * S * 0.12, H - 6 - wd.h * 0.5, wd.x + Math.sin(now / 700 + wd.ph) * S * 0.18, H - 6 - wd.h);
    ctx.stroke();
  }

  // активный улов
  const cur = pond.ev.find(e => now >= e.t0);
  const inEv = {}; for (const e of pond.ev) inEv[e.r] = e;
  const fighting = cur && now >= cur.tHook && now < cur.tBite;

  // рыбы в пруду: все, кого ещё не вытащили
  const lenAll = g.len;
  for (let r = 0; r < N; r++) {
    const e = inEv[r];
    if (r < pond.k && !(e && now < e.tBite)) continue;
    if (pond.jumps.some(j => j.r === r && now >= j.t0)) continue;
    const L = fishLen(g, r), wag = Math.sin(now / 150 + r) * L * 0.08;
    let p = wander(g, r, now);
    if (e && now >= e.t0) {
      if (now < e.tHook) {
        const q = smooth((now - e.t0) / (e.tHook - e.t0));
        p = { x: lerp(p.x, hook[0] - L * 0.45, q), y: lerp(p.y, hook[1], q), dir: hook[0] - p.x >= 0 ? 1 : -1 };
      } else {
        const big = isFat(r), sh = big ? Math.sin(now / 45) * L * 0.15 : Math.sin(now / 70) * L * 0.05;
        p = { x: hook[0] - L * 0.45 + sh, y: hook[1] + (big ? Math.cos(now / 60) * L * 0.1 : 0), dir: 1 };
      }
    }
    drawFish(p.x, p.y, L, p.dir, fishColor(r), wag * (e ? 2 : 1));
  }

  // пирс
  ctx.fillStyle = '#5a3a22';
  for (const px of [g.pier * 0.3, g.pier * 0.85]) ctx.fillRect(px - S * 0.03, deck, S * 0.06, sy + S * 0.35 - deck);
  ctx.fillStyle = '#7a5232'; ctx.fillRect(0, deck, g.pier, Math.max(3, S * 0.06));

  // ведро с уловом
  const { x: bx, y: by, w: bw, h: bh } = bucket;
  if (pond.k > 0) for (let i = 0; i < Math.min(pond.k, 4); i++)
    drawFish(bx - bw * 0.2 + i * bw * 0.13, by - bh - lenAll * 0.15, lenAll * 0.8, 1, fishColor(pond.k - 1 - i), 0, -1.3 + i * 0.25);
  ctx.fillStyle = '#6b7280'; ctx.beginPath();
  ctx.moveTo(bx - bw / 2, by - bh); ctx.lineTo(bx + bw / 2, by - bh); ctx.lineTo(bx + bw * 0.38, by); ctx.lineTo(bx - bw * 0.38, by); ctx.fill();
  ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by - bh, bw * 0.5, Math.PI, 0); ctx.stroke();

  // удочка: подсекает (lift) и гнётся, когда рыба на крючке (bend)
  let lift = 0, bend = 0.05;
  if (cur && now >= cur.tHook && now < cur.tBite) bend = isFat(cur.r) ? 0.25 + 0.08 * Math.sin(now / 80) : 0.15;
  if (cur && now >= cur.tBite) { const q = (now - cur.tBite) / P_OUT; lift = Math.sin(Math.PI * Math.min(1, q * 1.4)) * 0.3; bend = 0.12 * (1 - q); }
  if (fast) lift = 0.15 + 0.1 * Math.sin(now / 120);
  const ang = Math.atan2(g.tip[1] - g.grip[1], g.tip[0] - g.grip[0]) - lift, RL = Math.hypot(g.tip[0] - g.grip[0], g.tip[1] - g.grip[1]);
  const tip = [g.grip[0] + Math.cos(ang) * RL, g.grip[1] + Math.sin(ang) * RL];
  const butt = [g.grip[0] - Math.cos(ang) * S * 0.18, g.grip[1] - Math.sin(ang) * S * 0.18];
  const mid = [(g.grip[0] + tip[0]) / 2 - Math.sin(ang) * RL * bend, (g.grip[1] + tip[1]) / 2 + Math.cos(ang) * RL * bend];

  // леска и поплавок
  let end = null;
  if (cur && now >= cur.tBite) {
    const q = Math.min(1, (now - cur.tBite) / P_OUT), L = fishLen(g, cur.r);
    const to = [bx, by - bh - L * 0.3];
    end = [lerp(hook[0], to[0], q), lerp(hook[1], to[1], q) - S * 1.0 * 4 * q * (1 - q)];
    ctx.strokeStyle = 'rgba(220, 230, 240, 0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(...tip); ctx.lineTo(...end); ctx.stroke();
    if (q < 1) drawFish(end[0], end[1] + L * 0.4, L, 1, fishColor(cur.r), Math.sin(now / 50) * L * 0.15, -Math.PI / 2);
  } else {
    const dip = fighting ? S * 0.06 + Math.sin(now / 60) * S * 0.03 : Math.sin(now / 500) * 1.2;
    const fy = flt[1] + dip;
    ctx.strokeStyle = 'rgba(220, 230, 240, 0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(...tip); ctx.lineTo(flt[0], fy); ctx.lineTo(hook[0], hook[1]); ctx.stroke();
    ctx.fillStyle = '#e05252'; ctx.beginPath(); ctx.ellipse(flt[0], fy - S * 0.03, S * 0.035, S * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8eaf0'; ctx.beginPath(); ctx.ellipse(flt[0], fy + S * 0.02, S * 0.035, S * 0.03, 0, 0, 7); ctx.fill();
    if (fighting) {   // круги по воде
      for (let i = 0; i < 2; i++) {
        const q = ((now - cur.tHook) / 600 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(160, 200, 240, ${0.6 * (1 - q)})`;
        ctx.beginPath(); ctx.ellipse(flt[0], sy, S * 0.1 + q * S * 0.4, (S * 0.1 + q * S * 0.4) * 0.25, 0, 0, 7); ctx.stroke();
      }
    }
  }

  // рыбак
  const grip = g.grip;
  walker(g.mx, deck, S, { dir: 1, bob: Math.sin(now / 900) * S * 0.006,
    hands: () => [[grip[0] - g.mx, grip[1] - deck], [grip[0] - g.mx + Math.cos(ang) * S * 0.1, grip[1] - deck + Math.sin(ang) * S * 0.1]] });
  ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = Math.max(1.5, S * 0.03); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...butt); ctx.lineTo(...grip); ctx.quadraticCurveTo(...mid, ...tip); ctx.stroke();

  // «уйти пораньше»: рыбы сами выпрыгивают в ведро
  for (const j of pond.jumps) {
    const q = (now - j.t0) / P_JUMP; if (q < 0) continue;
    const s = wander(g, j.r, j.t0), L = fishLen(g, j.r);
    drawFish(lerp(s.x, bx, q), lerp(s.y, by - bh, q) - S * 1.2 * 4 * q * (1 - q), L, s.x > bx ? -1 : 1, fishColor(j.r), Math.sin(now / 40) * L * 0.15, (q - 0.5) * 2);
  }
}


registerScene({
  name: 'Рыбалка', author: 'Roganovs96',
  words: ['поклёвка', 'каждые', 'следующая поклёвка', 'следующая'],
  set: pondSet, frame: pondFrame,
  onFast(f) { if (!f) pond.jumps = []; },
});
