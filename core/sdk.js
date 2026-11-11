'use strict';
// SceneKit — общий код для сцен. Подключается ядром в iframe каждой сцены.
// Сцена работает в песочнице: видит только свой iframe и получает от ядра прогресс рабочего дня.
// Документация для авторов — CONTRIBUTING.md.

const $ = id => document.getElementById(id);
const N = 300;                                  // день делится на N частей; curK — сколько уже прошло
const area = document.documentElement;          // размеры сцены: area.clientWidth × area.clientHeight
let ctx;                                        // контекст холста, который сейчас рисуется
const dpr = () => window.devicePixelRatio || 1;
function fitCanvas(c) {
  const W = area.clientWidth, H = area.clientHeight;
  if (!W || !H) return null;
  c.width = Math.round(W * dpr()); c.height = Math.round(H * dpr());
  return { W, H };
}
function beginFrame(c, g) {
  ctx = c.getContext('2d');
  ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  ctx.clearRect(0, 0, g.W, g.H);
}
// Сетка cols×rows = 300, пропорции которой ближе всего к области aw×ah
const pickGrid = (aw, ah) => [[6, 50], [10, 30], [12, 25], [15, 20], [20, 15], [25, 12], [30, 10], [50, 6], [60, 5]].reduce((a, b) =>
  Math.abs(Math.log(b[0] / b[1] * ah / aw)) < Math.abs(Math.log(a[0] / a[1] * ah / aw)) ? b : a);
// Детерминированный рандом, чтобы картинка не менялась при каждом ресайзе
const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const lerp = (a, b, p) => a + (b - a) * p;
const smooth = p => p * p * (3 - 2 * p);

// Холст на всю сцену
function makeCanvas() {
  const c = document.createElement('canvas');
  c.className = 'scene-canvas';
  document.body.appendChild(c);
  return c;
}
// Свой HTML поверх холста (подписи, кнопки) и стили для него
function html(markup) { const d = document.createElement('div'); d.innerHTML = markup; while (d.firstChild) document.body.appendChild(d.firstChild); }
function css(text) { const s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); }

// Время рабочего дня. Ядро присылает его 10 раз в секунду, между обновлениями значения плавно экстраполируются.
const day = { left: 0, len: 1, rate: 0, t: 0 };
let curK = -1, curPct = 0, fast = null;         // fast — режим «уйти пораньше»: { per } (мс на одну часть) или null
const dayLenMs = () => day.len;
const leftMs = () => Math.max(0, Math.min(day.len, day.left + day.rate * (performance.now() - day.t)));
const livePct = () => Math.max(0, Math.min(100, (1 - leftMs() / day.len) * 100));
const fmt = ms => {
  const t = Math.max(0, Math.round(ms / 1000));
  return [Math.floor(t / 3600), Math.floor(t % 3600 / 60), t % 60].map(n => String(n).padStart(2, '0')).join(':');
};

// Особые части дня: isHat(r) — каждая 10-я, isFat(r) — на ней заканчивается очередной час
const isHat = r => (r + 1) % 10 === 0;
function isFat(r) {
  const hours = dayLenMs() / 3600000;
  return Math.floor((r + 1) * hours / N + 1e-9) > Math.floor(r * hours / N + 1e-9);
}

// Человечек сбоку (костёр, рыбалка). x — между ног, gy — земля, dir: 1 смотрит вправо, -1 влево.
// o.walk — фаза шага, o.bend 0..1 — наклон, o.hands(sh) → две руки в локальных координатах.
// Возвращает положение рук на холсте.
function walker(x, gy, S, o) {
  const lw = Math.max(2.5, S * 0.06), L = S * 0.42, T = S * 0.32, A = S * 0.32;
  const walking = o.walk != null, b = o.bend || 0;
  const a = walking ? 0.5 * Math.sin(o.walk) : 0.2;
  const hip = [0, -L * Math.cos(walking ? Math.abs(a) : 0.2) + b * S * 0.12 + (o.bob || 0)];
  const tb = b * 1.1, up = [Math.sin(tb), -Math.cos(tb)];
  const sh = [hip[0] + up[0] * T * 0.85, hip[1] + up[1] * T * 0.85];
  const neck = [hip[0] + up[0] * T, hip[1] + up[1] * T];
  const head = [hip[0] + up[0] * (T + S * 0.13), hip[1] + up[1] * (T + S * 0.13)];
  const sw = walking ? Math.sin(o.walk) : 0;
  const hands = o.hands ? o.hands(sh) : [[sh[0] + S * 0.14 * sw, sh[1] + S * 0.28], [sh[0] - S * 0.14 * sw, sh[1] + S * 0.28]];
  // сустав (колено/локоть) между p и q, выгнутый в сторону side
  const joint = (p, q, len, side) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1, h = Math.sqrt(Math.max(0, (len / 2) ** 2 - (d / 2) ** 2));
    return [(p[0] + q[0]) / 2 + side * -dy / d * h, (p[1] + q[1]) / 2 + side * dx / d * h];
  };
  ctx.save(); ctx.translate(x, gy); ctx.scale(dir(o), 1);
  ctx.strokeStyle = ctx.fillStyle = o.color || '#4f9cff'; ctx.lineWidth = lw;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const f of [[hip[0] + L * Math.sin(a), 0], [hip[0] - L * Math.sin(a), 0]]) {
    const kn = joint(hip, f, L, -1);
    ctx.moveTo(...hip); ctx.lineTo(...kn); ctx.lineTo(...f);
  }
  ctx.moveTo(...hip); ctx.lineTo(...neck);
  for (const h of hands) { ctx.moveTo(...sh); ctx.lineTo(...joint(sh, h, A, 1)); ctx.lineTo(...h); }
  ctx.stroke();
  if (o.head) ctx.fillStyle = o.head;
  ctx.beginPath(); ctx.arc(...head, S * 0.12, 0, 7); ctx.fill();
  ctx.restore();
  const out = hands.map(h => [x + dir(o) * h[0], gy + h[1]]);
  out.head = [x + dir(o) * head[0], gy + head[1]];
  return out;
}
const dir = o => o.dir || 1;

// Маленькое хранилище настроек сцены (например, выбранный масштаб). Сохраняется ядром.
const sceneStore = {
  data: {},
  get(k, d) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : d; },
  set(k, v) { this.data[k] = v; send({ type: 'store', data: this.data }); },
};

// ===== Связь с ядром =====
const send = msg => window.parent.postMessage(msg, '*');
let SCENE = null, visible = false, ticked = false, lastSub = '', sized = false, frameCost = 0;

// Сцена регистрирует себя один раз:
// registerScene({ name, author, words?, steps?, set?, frame, tick?, sub?, onFast?, onTap? })
function registerScene(def) {
  if (SCENE) throw new Error('registerScene вызван дважды');
  SCENE = def;
  send({ type: 'ready', name: def.name, author: def.author, words: def.words, steps: def.steps });
}

function reportError(message) { send({ type: 'error', message: String(message).slice(0, 300) }); }
window.addEventListener('error', e => reportError(e.message + (e.filename ? ' @ ' + e.filename.split('/').slice(-2).join('/') + ':' + e.lineno : '')));
window.addEventListener('unhandledrejection', e => reportError(e.reason));

function safe(fn) { try { return fn(); } catch (e) { reportError(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); } }

window.addEventListener('message', e => {
  if (e.source !== window.parent) return;
  const m = e.data || {};
  if (m.type === 'init') { if (!SCENE && !document.querySelector('script[src*="scenes/"]')) { sceneStore.data = m.store || {}; loadScene(); } return; }
  if (!SCENE) return;
  if (m.type === 'tick') {
    const wasFast = !!fast;
    Object.assign(day, { left: m.left, len: m.len, rate: m.rate, t: performance.now() });
    fast = m.fast; curK = m.k; curPct = m.pct;
    if (wasFast !== !!fast && SCENE.onFast) safe(() => SCENE.onFast(fast));
    if (!sized) { sized = true; safe(() => SCENE.set && SCENE.set(Math.max(0, curK), true)); }
    safe(() => SCENE.set && SCENE.set(curK));
    safe(() => SCENE.tick && SCENE.tick());
    if (SCENE.sub) {
      const parts = safe(() => SCENE.sub()) || [], key = JSON.stringify(parts);
      if (key !== lastSub) { lastSub = key; send({ type: 'sub', parts }); }
    }
    ticked = true;
  } else if (m.type === 'visible') visible = !!m.on;
  else if (m.type === 'tap') {
    const el = document.elementFromPoint(m.x, m.y);
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: m.x, clientY: m.y }));
    if (SCENE.onTap) safe(() => SCENE.onTap(m.x, m.y));
  } else if (m.type === 'probe') send({ type: 'probe', id: m.id, ...probe() });
});

window.addEventListener('resize', () => { if (SCENE && ticked) safe(() => SCENE.set && SCENE.set(Math.max(0, curK), true)); });

function loop(now) {
  requestAnimationFrame(loop);
  if (!SCENE || !ticked || !visible) return;
  const t0 = performance.now();
  safe(() => SCENE.frame(now));
  frameCost = frameCost * 0.95 + (performance.now() - t0) * 0.05;
}
requestAnimationFrame(loop);

// Для автотестов: нарисовано ли что-нибудь и сколько стоит кадр
function probe() {
  let painted = 0;
  for (const c of document.querySelectorAll('canvas')) {
    if (!c.width || !c.height) continue;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, step = Math.max(1, Math.floor(d.length / 4 / 40000)) * 4;
    for (let i = 3; i < d.length; i += step) if (d[i] > 0) painted++;
  }
  return { painted, text: document.body.innerText.trim().length, frameCost: +frameCost.toFixed(2), registered: !!SCENE };
}

// Подключаем саму сцену: core/frame.html?scene=<папка>. Сначала ждём от ядра сохранённые настройки.
function loadScene() {
  const name = new URLSearchParams(location.search).get('scene') || '';
  if (!/^[a-z0-9_][a-z0-9_-]{0,30}$/.test(name)) return reportError('Неверное имя сцены: ' + name);
  const s = document.createElement('script');
  s.src = '../scenes/' + name + '/scene.js';
  s.onerror = () => reportError('Не найден scenes/' + name + '/scene.js');
  document.head.appendChild(s);
}
send({ type: 'hello' });
