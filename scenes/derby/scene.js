// Дерби: «Спартак» — ЦСКА 1:5, 12 июля 2008 года, Лужники (протокол — news.sportbox.ru).
// Рабочий день = 100 минут: 45 минут первого тайма, 10 минут перерыва, 45 минут второго.
// Каждый процент дня — минута. Голы забиваются в те же минуты, что и в настоящем матче.

const GOALS = [
  { min: 15, team: 'cska', who: 'Вагнер Лав' },
  { min: 34, team: 'cska', who: 'Вагнер Лав' },
  { min: 44, team: 'cska', who: 'Вагнер Лав' },
  { min: 51, team: 'cska', who: 'Красич' },
  { min: 69, team: 'spartak', who: 'Баженов' },
  { min: 77, team: 'cska', who: 'Эркин' },
];
const TEAMS = {
  cska: { name: 'ЦСКА', main: '#1f4fa3', ring: '#d0102e' },
  spartak: { name: 'СПАРТАК', main: '#d71920', ring: '#ffffff' },
};
// минута матча → процент дня (во втором тайме добавляется перерыв)
const pctOf = min => min <= 45 ? min : min + 10;
// процент дня → что сейчас на поле
function matchAt(p) {
  if (p < 45) return { half: 1, min: p };
  if (p < 55) return { half: 0, min: 45, breakLeft: 55 - p };
  return { half: 2, min: Math.min(90, p - 10) };
}

const cv = makeCanvas();
css(`
  .board { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: min(520px, calc(100% - 16px));
    background: #0b0d10; border: 2px solid #2a2f3a; border-radius: 12px; padding: 8px 12px; pointer-events: none;
    font-variant-numeric: tabular-nums; box-shadow: 0 4px 18px rgba(0,0,0,.5); }
  .row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
  .team { font-weight: 800; letter-spacing: .04em; font-size: 18px; display: flex; align-items: center; gap: 8px; }
  .team.r { justify-content: flex-end; }
  .badge { width: 14px; height: 14px; border-radius: 50%; border: 3px solid; }
  .score { font: 800 38px/1 'Courier New', monospace; color: #ffd36b; text-shadow: 0 0 10px rgba(255, 211, 107, .5); padding: 0 6px; }
  .clock { text-align: center; color: #3ddc97; font: 700 16px 'Courier New', monospace; margin-top: 2px; }
  .goals { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; font-size: 12px; color: #8a90a0; margin-top: 4px; }
  .goals .r { text-align: right; }
  .flash { position: absolute; left: 50%; top: 55%; transform: translate(-50%, -50%); font: 900 64px -apple-system, sans-serif;
    color: #ffd36b; text-shadow: 0 0 24px rgba(255, 211, 107, .8); pointer-events: none; opacity: 0; text-align: center; }
  .flash small { display: block; font-size: 18px; color: #e8eaf0; font-weight: 600; }
  .flash.on { animation: goal 3.5s ease-out; }
  @keyframes goal { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.5); } 12% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
    25% { transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; } }
  @media (max-width: 500px) { .team { font-size: 14px; } .score { font-size: 30px; } .goals { font-size: 11px; } .flash { font-size: 48px; } }
`);
html(`<div class="board" id="board">
  <div class="row">
    <div class="team"><span class="badge" style="background:${TEAMS.cska.main};border-color:${TEAMS.cska.ring}"></span>ЦСКА</div>
    <div class="score" id="score">0:0</div>
    <div class="team r">СПАРТАК<span class="badge" style="background:${TEAMS.spartak.main};border-color:${TEAMS.spartak.ring}"></span></div>
  </div>
  <div class="clock" id="clock">00:00</div>
  <div class="goals"><div id="gl"></div><div class="r" id="gr"></div></div>
</div>
<div class="flash" id="flash"></div>`);

const st = { g: null, scored: -1, boardH: 0 };

function set(k, force) {
  if (force || !st.g) {
    const W = area.clientWidth, H = area.clientHeight;
    if (!W || !H) return;
    st.boardH = $('board').offsetHeight;
    const top = st.boardH + 18, pad = 10, aw = W - pad * 2, ah = H - top - pad;
    // поле 105×68: на узком экране ставим его вертикально
    const vert = ah > aw * 1.1, ratio = 105 / 68;
    let fw = vert ? Math.min(aw, ah / ratio) : Math.min(aw, ah * ratio), fh = vert ? fw * ratio : fw / ratio;
    st.g = { W, H, vert, fw, fh, fx: (W - fw) / 2, fy: top + (ah - fh) / 2 };
    fitCanvas(cv);
  }
}

// координаты поля: u — вдоль (0 — ворота ЦСКА в 1-м тайме, 1 — ворота «Спартака»), v — поперёк (0..1)
function P(g, u, v) {
  return g.vert ? [g.fx + v * g.fw, g.fy + (1 - u) * g.fh] : [g.fx + u * g.fw, g.fy + v * g.fh];
}
// плавный «шум» для движения мяча
const wave = (t, s) => Math.sin(t * 0.37 + s) * 0.6 + Math.sin(t * 0.83 + s * 2.1) * 0.3 + Math.sin(t * 1.9 + s * 3.3) * 0.1;

// где мяч в момент p (процент дня)
function ballAt(p, now) {
  const m = matchAt(p), t = now / 1000;
  if (m.half === 0) return [0.5, 0.5];                                       // перерыв: мяч в центре
  let u = 0.5 + 0.3 * wave(t * 0.5, 1), v = 0.5 + 0.35 * wave(t * 0.6, 7);
  // атака перед голом и мяч в сетке сразу после
  for (const goal of GOALS) {
    const gp = pctOf(goal.min), side = (goal.team === 'cska') === (m.half === 1) ? 1 : 0;   // в чьи ворота
    const before = gp - p, after = p - gp;
    if (before > 0 && before < 0.35) { const q = smooth(1 - before / 0.35); u = lerp(u, side ? 1.01 : -0.01, q); v = lerp(v, 0.5, q); }
    if (after >= 0 && after < 0.12) { u = side ? 1.02 : -0.02; v = 0.48 + Math.sin(t * 6) * 0.01; }
    if (after >= 0.12 && after < 0.3) { const q = smooth((after - 0.12) / 0.18); u = lerp(side ? 1 : 0, 0.5, q); v = 0.5; }
  }
  return [Math.max(-0.03, Math.min(1.03, u)), v];
}

function drawPitch(g) {
  const { fx, fy, fw, fh } = g, L = (u0, v0, u1, v1) => { ctx.moveTo(...P(g, u0, v0)); ctx.lineTo(...P(g, u1, v1)); };
  // полосы газона
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#2f7a3a' : '#2a7034';
    const [x0, y0] = P(g, i / 10, 0), [x1, y1] = P(g, (i + 1) / 10, 1);
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.rect(fx, fy, fw, fh); L(0.5, 0, 0.5, 1);
  for (const [a, b] of [[0, 0.157], [1, 0.843]]) { L(a, 0.204, b, 0.204); L(b, 0.204, b, 0.796); L(b, 0.796, a, 0.796); }   // штрафные
  for (const [a, b] of [[0, 0.052], [1, 0.948]]) { L(a, 0.368, b, 0.368); L(b, 0.368, b, 0.632); L(b, 0.632, a, 0.632); }   // вратарские
  ctx.stroke();
  const [cx, cy] = P(g, 0.5, 0.5), r = (g.vert ? fw : fh) * 0.134;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill();
  // ворота
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (const u of [0, 1]) {
    const [x0, y0] = P(g, u, 0.446), [x1, y1] = P(g, u + (u ? 0.022 : -0.022), 0.554);
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || 3, Math.abs(y1 - y0) || 3);
  }
}

// расстановка 4-4-2: доля длины поля от своих ворот и поперёк
const SHAPE = [[0.04, 0.5], [0.2, 0.15], [0.18, 0.38], [0.18, 0.62], [0.2, 0.85], [0.4, 0.15], [0.38, 0.4], [0.38, 0.6], [0.4, 0.85], [0.55, 0.38], [0.55, 0.62]];

function frame(now) {
  const g = st.g; if (!g) return;
  beginFrame(cv, g);
  const p = livePct(), m = matchAt(p), [bu, bv] = ballAt(p, now), t = now / 1000;
  drawPitch(g);
  const pr = Math.max(4, Math.min(g.fw, g.fh) * 0.022);
  if (m.half !== 0) {
    // ЦСКА в 1-м тайме атакует вправо (к u = 1), во 2-м — наоборот
    for (const team of ['cska', 'spartak']) {
      const toRight = (team === 'cska') === (m.half === 1), T = TEAMS[team];
      SHAPE.forEach(([a, b], i) => {
        const keeper = i === 0, push = keeper ? 0 : (toRight ? bu - 0.5 : 0.5 - bu) * 0.35;
        let u = a + push + 0.015 * Math.sin(t * 0.9 + i + (team === 'cska' ? 0 : 5));
        let v = b + (bv - 0.5) * (keeper ? 0.3 : 0.25) + 0.02 * Math.sin(t * 0.7 + i * 2);
        u = toRight ? u : 1 - u;
        const [x, y] = P(g, Math.max(0.01, Math.min(0.99, u)), Math.max(0.03, Math.min(0.97, v)));
        ctx.fillStyle = keeper ? (team === 'cska' ? '#ffd36b' : '#3ddc97') : T.main;
        ctx.strokeStyle = T.ring; ctx.lineWidth = Math.max(1.5, pr * 0.35);
        ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill(); ctx.stroke();
      });
    }
  } else {
    // перерыв: команды в раздевалке
    ctx.fillStyle = 'rgba(15, 17, 21, 0.55)'; ctx.fillRect(g.fx, g.fy, g.fw, g.fh);
    ctx.fillStyle = '#e8eaf0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(16, g.fw * 0.05)}px -apple-system, sans-serif`;
    const [cx, cy] = P(g, 0.5, 0.5);
    ctx.fillText('ПЕРЕРЫВ', cx, cy - 14);
    ctx.font = `${Math.max(12, g.fw * 0.03)}px -apple-system, sans-serif`; ctx.fillStyle = '#8a90a0';
    ctx.fillText('2-й тайм через ' + fmt(m.breakLeft / 100 * dayLenMs()), cx, cy + 14);
  }
  // мяч
  const [x, y] = P(g, bu, bv);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 2, pr * 0.7, pr * 0.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, pr * 0.7, 0, 7); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x, y, pr * 0.25, 0, 7); ctx.fill();
}

// табло обновляем 10 раз в секунду
function tick() {
  const p = curPct, m = matchAt(p), done = GOALS.filter(gl => pctOf(gl.min) <= p);
  const c = done.filter(gl => gl.team === 'cska').length, s = done.length - c;
  $('score').textContent = c + ':' + s;
  const mm = Math.floor(m.min), ss = Math.floor((m.min - mm) * 60);
  $('clock').textContent = p >= 100 ? 'МАТЧ ОКОНЧЕН' : m.half === 0 ? 'ПЕРЕРЫВ' :
    String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + ' · ' + m.half + '-й тайм';
  // авторы голов одной строкой: «Вагнер Лав 15', 34', 44' · Красич 51'»
  const line = team => {
    const by = {};
    for (const gl of done.filter(x => x.team === team)) (by[gl.who] = by[gl.who] || []).push(gl.min + "'");
    return Object.entries(by).map(([who, mins]) => who + ' ' + mins.join(', ')).join(' · ');
  };
  $('gl').textContent = line('cska'); $('gr').textContent = line('spartak');
  // табло подросло — поле сдвигаем ниже
  if (st.boardH !== $('board').offsetHeight) set(curK, true);
  // новый гол — вспышка «ГОЛ!»
  if (st.scored >= 0 && done.length === st.scored + 1) {   // ровно один новый гол, а не скачок времени
    const last = done[done.length - 1], el = $('flash');
    el.innerHTML = 'ГОЛ!<small></small>'; el.querySelector('small').textContent = last.who + ', ' + last.min + "' · " + TEAMS[last.team].name;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }
  st.scored = done.length;
}

// подпись в шапке: когда следующий гол
function sub() {
  const p = curPct, next = GOALS.find(gl => pctOf(gl.min) > p);
  if (p >= 100) return [{ t: 'Матч окончен: ЦСКА 5:1' }];
  if (next) return [{ t: 'Гол на ' + next.min + "' через " }, { ms: (pctOf(next.min) - p) / 100 * dayLenMs(), b: true }];
  return [{ t: 'Финальный свисток через ' }, { ms: (100 - p) / 100 * dayLenMs(), b: true }];
}

registerScene({ name: 'Дерби', icon: '⚽', author: 'Roganovs96', steps: 100, set, frame, tick, sub });
