'use strict';
// Ядро сайта: таймер рабочего дня, шапка, футер и лента сцен.
// Сцены — в папке scenes/, каждая в своей песочнице (см. core/host.js и CONTRIBUTING.md).
const $ = id => document.getElementById(id);
const N = 300;

const load = () => { try { return JSON.parse(localStorage.getItem('workTimer')) || {}; } catch { return {}; } };
const save = () => { try { localStorage.setItem('workTimer', JSON.stringify(state)); } catch {} };
const saved = load();
const state = { start: saved.start || '10:00', end: saved.end || '19:00', scene: saved.scene, stores: saved.stores || {} };
if (saved.trainZoom && !state.stores.train) state.stores.train = { zoom: saved.trainZoom };   // перенос старой настройки

// ===== Время =====
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const dayLenMs = () => Math.max(1, (toMin(state.end) - toMin(state.start)) * 60000);
const fmt = ms => {
  const t = Math.max(0, Math.round(ms / 1000));
  return [Math.floor(t / 3600), Math.floor(t % 3600 / 60), t % 60].map(n => String(n).padStart(2, '0')).join(':');
};
// «Уйти пораньше»: оставшееся время быстро утекает до нуля
let fast = null, testPct = null;
function leftMs() {
  if (testPct != null) return dayLenMs() * (1 - testPct / 100);
  if (fast) return fast.from * (1 - Math.min(1, (Date.now() - fast.t0) / fast.dur));
  const now = new Date(), end = new Date(now), [h, m] = state.end.split(':').map(Number);
  end.setHours(h, m, 0, 0);
  return Math.min(dayLenMs(), Math.max(0, end - now));
}

// ===== Лента сцен =====
const area = $('scenes');
SceneFrame.loadStore = folder => state.stores[folder] || {};
SceneFrame.saveStore = (folder, data) => { state.stores[folder] = data; save(); };
const scenes = (window.SCENE_LIST || []).map(f => new SceneFrame(f, area));
let active = Math.max(0, scenes.findIndex(s => s.folder === state.scene));
if (typeof state.scene === 'number') active = Math.min(scenes.length - 1, state.scene);   // старый формат: номер

function drawNav() {
  $('dots').replaceChildren(...scenes.map((s, i) => {
    const b = document.createElement('button'); b.setAttribute('aria-label', s.name); b.dataset.i = i;
    b.classList.toggle('on', i === active); return b;
  }));
  $('sceneName').textContent = scenes[active] ? scenes[active].name : '';
}
SceneFrame.onChange = sc => { drawNav(); if (sc === scenes[active]) render(); };
SceneFrame.onError = sc => {
  let box = sc.el.querySelector('.scene-error');
  if (!box) { box = document.createElement('div'); box.className = 'scene-error'; sc.el.appendChild(box); }
  box.textContent = '⚠ Ошибка в сцене: ' + sc.errors[sc.errors.length - 1];
};

function goTo(i, smooth) {
  i = (i + scenes.length) % scenes.length;
  area.scrollTo({ left: i * area.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  if (!smooth) activate(i);
}
function activate(i) {
  active = i; state.scene = scenes[i].folder; save();
  drawNav(); updateVisible(); render();
}
// Кадры рисуют только видимые сцены (во время свайпа — две соседние)
function updateVisible() {
  const x = area.scrollLeft / (area.clientWidth || 1);
  scenes.forEach((s, i) => s.setVisible(i >= Math.floor(x) && i <= Math.ceil(x)));
}
area.addEventListener('scroll', () => {
  updateVisible();
  const i = Math.round(area.scrollLeft / (area.clientWidth || 1));
  if (i !== active && i >= 0 && i < scenes.length) activate(i);
}, { passive: true });
$('prev').onclick = () => goTo(active - 1, true);
$('next').onclick = () => goTo(active + 1, true);
$('dots').onclick = e => { if (e.target.dataset.i) goTo(+e.target.dataset.i, true); };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') goTo(active - 1, true);
  if (e.key === 'ArrowRight') goTo(active + 1, true);
});
new ResizeObserver(() => { area.scrollLeft = active * area.clientWidth; updateVisible(); }).observe(area);

// ===== Шапка и рассылка времени сценам =====
function render() {
  const left = leftMs(), len = dayLenMs();
  const pct = Math.min(100, Math.max(0, (1 - left / len) * 100));
  const k = Math.floor(pct * N / 100 + 1e-9);
  $('timer').textContent = fmt(left);
  $('percent').textContent = pct.toFixed(2) + '%';

  // скорость, с которой убывает остаток: сцены сами плавно досчитывают между обновлениями
  let rate = 0;
  if (testPct == null && left > 0) rate = fast ? -fast.from / fast.dur : left < len ? -1 : 0;
  const tick = { left, len, rate, k, pct, fast: fast ? { per: fast.per } : null };
  scenes.forEach(s => s.tick(tick));

  const sc = scenes[active], step = len / ((sc && sc.meta && sc.meta.steps) || N);
  buildSub($('percentSub'), { onePct: len / 100, short: innerWidth <= 700, scene: sc, pct, toNext: { step, left: left % step || step } });
  $('timerSub').textContent = fast ? (left === 0 ? 'Ушёл пораньше 😎' : 'сбегаем…')
    : left === 0 ? 'Рабочий день окончен 🎉' : 'до ' + state.end;
  document.title = Math.floor(pct) + '% · ' + fmt(left).slice(0, 5);
}

$('start').value = state.start; $('end').value = state.end;
$('start').onchange = e => { state.start = e.target.value; save(); render(); };
$('end').onchange = e => { state.end = e.target.value; save(); render(); };
$('leave').onclick = () => {
  if (fast) {
    fast = null;
    $('leave').textContent = 'Уйти пораньше 🏃';
  } else {
    const k = Math.floor((1 - leftMs() / dayLenMs()) * N + 1e-9);
    const rest = Math.max(1, N - Math.max(0, k));                  // сколько частей осталось
    const per = Math.max(10, Math.min(400, 5000 / rest));          // мс на одну часть, всё ≤ 5 сек
    fast = { from: leftMs(), t0: Date.now(), dur: rest * per, per };
    $('leave').textContent = 'Вернуться к работе 💼';
  }
  render();
};

// Для автотестов (только с ?test=1): задать процент дня вручную
if (new URLSearchParams(location.search).has('test')) {
  window.__wt = { scenes, setPct(p) { testPct = p; render(); }, goTo, get active() { return active; } };
}

drawNav();
goTo(active);
render();
setInterval(render, 100);
