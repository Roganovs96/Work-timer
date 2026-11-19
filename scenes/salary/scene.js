// Сколько ты заработал к этому моменту: зарплата в месяц → сколько капнуло сегодня и что на это можно купить.
// День зарплаты делится на рабочие дни (пн–пт) текущего месяца.

const MIN = 1, MAX = 250000;
// [название, цена ₽, рисунок]
const ITEMS = [
  ['Коробок спичек', 10, 'matches'], ['Жвачка', 50, 'gum'], ['Буханка хлеба', 70, 'bread'], ['Пломбир', 100, 'icecream'],
  ['Кофе с собой', 250, 'coffee'], ['Шаурма', 350, 'shawarma'], ['Билет в кино', 600, 'ticket'], ['Пицца', 900, 'pizza'],
  ['Такси через весь город', 1500, 'taxi'], ['Кроссовки', 7000, 'sneakers'], ['Наушники', 15000, 'headphones'],
  ['Велосипед', 35000, 'bike'], ['Смартфон', 70000, 'phone'], ['Неделя в Сочи', 150000, 'sochi'],
];

css(`
  body { overflow-y: auto; }
  .wrap { padding: 10px 12px 16px; max-width: 900px; margin: 0 auto; }
  .form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: #8a90a0; }
  .form input { width: 130px; background: #262a34; color: #e8eaf0; border: 1px solid #2a2f3a; border-radius: 8px; padding: 7px 10px;
    font: 600 16px -apple-system, sans-serif; font-variant-numeric: tabular-nums; }
  .form input.bad { border-color: #e05252; }
  .msg { min-height: 18px; font-size: 13px; color: #ff9b9b; margin-top: 4px; }
  .earned { margin-top: 6px; text-align: center; }
  .earned .lbl { color: #8a90a0; font-size: 13px; }
  .earned .sum { font: 800 40px -apple-system, sans-serif; font-variant-numeric: tabular-nums; color: #3ddc97; }
  .earned .more { color: #8a90a0; font-size: 12px; line-height: 1.5; }
  .earned .more b { color: #e8eaf0; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin-top: 10px; }
  .item { background: #181b22; border: 1px solid #2a2f3a; border-radius: 12px; padding: 8px; text-align: center; position: relative;
    transition: opacity .3s, border-color .3s; }
  .item.no { opacity: .45; }
  .item.yes { border-color: #3ddc97; }
  .item.pop { animation: pop .6s ease-out; }
  @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.08); } 100% { transform: scale(1); } }
  .item canvas { width: 48px; height: 48px; display: block; margin: 0 auto 4px; }
  .item .nm { font-size: 12px; line-height: 1.25; min-height: 30px; }
  .item .pr { font-size: 11px; color: #8a90a0; }
  .item .cnt { font: 700 15px -apple-system, sans-serif; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .item.yes .cnt { color: #3ddc97; }
  .bar { height: 4px; background: #262a34; border-radius: 2px; margin-top: 4px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: #4f9cff; }
  @media (max-width: 500px) { .earned .sum { font-size: 32px; } .grid { grid-template-columns: repeat(3, 1fr); gap: 6px; } .item { padding: 6px 4px; } }
`);
html(`<div class="wrap">
  <label class="form">Зарплата в месяц
    <input id="sal" inputmode="numeric" autocomplete="off" placeholder="например, 80 000"> ₽ на руки</label>
  <div class="msg" id="msg"></div>
  <div class="earned">
    <div class="lbl">Сегодня ты заработал</div>
    <div class="sum" id="sum">—</div>
    <div class="more" id="more">Введите зарплату — посчитаем</div>
  </div>
  <div class="grid" id="grid"></div>
</div>`);

const money = (x, frac) => x.toLocaleString('ru-RU', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: frac ? 2 : 0 }) + ' ₽';
let salary = null;

// рабочие дни (пн–пт) текущего месяца: всего и уже прошедшие до сегодня
function workdays() {
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth(), days = new Date(y, mo + 1, 0).getDate();
  let total = 0, before = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(y, mo, d).getDay();
    if (wd === 0 || wd === 6) continue;
    total++; if (d < now.getDate()) before++;
  }
  return { total, before };
}

function parse(v) {
  const s = v.replace(/[\s ]/g, '').replace(',', '.');
  if (!s) return { err: '' };
  if (!/^\d+(\.\d+)?$/.test(s)) return { err: 'Только цифры, например 80000' };
  const n = +s;
  if (n > MAX) return { err: 'Таких зарплат не бывает, фантазёр' };
  if (n < MIN) return { err: 'Зарплата должна быть хотя бы 1 ₽' };
  return { n };
}
const input = $('sal');
function apply(save) {
  const r = parse(input.value);
  input.classList.toggle('bad', !!r.err);
  $('msg').textContent = r.err || '';
  salary = r.n || null;
  if (save) sceneStore.set('salary', salary);
  tick(true);
}
input.addEventListener('input', () => apply(true));
const saved = sceneStore.get('salary', null);
if (typeof saved === 'number' && saved >= MIN && saved <= MAX) input.value = saved.toLocaleString('ru-RU');

// ===== Рисунки покупок (48×48) =====
const DRAW = {
  matches(c) { c.fillStyle = '#c8352e'; c.fillRect(10, 22, 28, 18); c.fillStyle = '#e8d29a'; c.fillRect(10, 28, 28, 6);
    for (const x of [17, 24, 31]) { c.fillStyle = '#d9b77a'; c.fillRect(x - 1, 8, 2, 16); c.fillStyle = '#b52a22'; c.beginPath(); c.arc(x, 8, 3, 0, 7); c.fill(); } },
  gum(c) { c.fillStyle = '#ff8fb1'; c.beginPath(); c.roundRect(8, 14, 32, 20, 5); c.fill(); c.fillStyle = '#fff'; c.fillRect(8, 21, 32, 6); },
  bread(c) { c.fillStyle = '#b8793a'; c.beginPath(); c.ellipse(24, 26, 18, 11, 0, 0, 7); c.fill();
    c.strokeStyle = '#8a5526'; c.lineWidth = 2; c.beginPath(); for (const x of [16, 24, 32]) { c.moveTo(x - 3, 20); c.lineTo(x + 3, 30); } c.stroke(); },
  icecream(c) { c.fillStyle = '#d9a35a'; c.beginPath(); c.moveTo(14, 22); c.lineTo(34, 22); c.lineTo(24, 44); c.fill();
    c.fillStyle = '#f5efe1'; c.beginPath(); c.arc(24, 18, 11, 0, 7); c.fill(); },
  coffee(c) { c.fillStyle = '#e8eaf0'; c.beginPath(); c.moveTo(14, 16); c.lineTo(34, 16); c.lineTo(31, 42); c.lineTo(17, 42); c.fill();
    c.fillStyle = '#6b4a3a'; c.fillRect(12, 12, 24, 5); c.fillStyle = '#9a6a42'; c.fillRect(15, 24, 18, 8);
    c.strokeStyle = '#8a90a0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, 9); c.quadraticCurveTo(17, 5, 21, 2); c.moveTo(27, 9); c.quadraticCurveTo(24, 5, 28, 2); c.stroke(); },
  shawarma(c) { c.save(); c.translate(24, 26); c.rotate(-0.6); c.fillStyle = '#e6c88f'; c.beginPath(); c.roundRect(-9, -18, 18, 36, 8); c.fill();
    c.fillStyle = '#e8eaf0'; c.fillRect(-9, 4, 18, 14); c.fillStyle = '#4f9a4a'; c.fillRect(-6, -16, 4, 4); c.fillStyle = '#c8352e'; c.fillRect(1, -14, 4, 4); c.restore(); },
  ticket(c) { c.fillStyle = '#ff9f43'; c.beginPath(); c.roundRect(6, 14, 36, 20, 3); c.fill(); c.fillStyle = '#0f1115';
    c.beginPath(); c.arc(6, 24, 4, 0, 7); c.arc(42, 24, 4, 0, 7); c.fill(); c.font = '700 9px sans-serif'; c.textAlign = 'center'; c.fillText('КИНО', 24, 27); },
  pizza(c) { c.fillStyle = '#d9a35a'; c.beginPath(); c.arc(24, 24, 18, 0, 7); c.fill(); c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(24, 24, 15, 0, 7); c.fill();
    c.fillStyle = '#c8352e'; for (const [x, y] of [[18, 18], [30, 20], [22, 30], [31, 30], [15, 27]]) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } },
  taxi(c) { c.fillStyle = '#ffd36b'; c.beginPath(); c.roundRect(5, 22, 38, 12, 4); c.fill(); c.beginPath(); c.roundRect(13, 14, 22, 10, 4); c.fill();
    c.fillStyle = '#8fc0ff'; c.fillRect(16, 16, 7, 6); c.fillRect(25, 16, 7, 6); c.fillStyle = '#222'; c.beginPath(); c.arc(14, 35, 4, 0, 7); c.arc(34, 35, 4, 0, 7); c.fill();
    c.fillStyle = '#222'; for (let i = 0; i < 4; i++) c.fillRect(17 + i * 4, 26, 2, 2); },
  sneakers(c) { c.fillStyle = '#e8eaf0'; c.beginPath(); c.moveTo(6, 34); c.lineTo(8, 20); c.lineTo(20, 18); c.lineTo(28, 26); c.lineTo(42, 28); c.lineTo(42, 34); c.fill();
    c.fillStyle = '#4f9cff'; c.fillRect(6, 34, 36, 4); c.strokeStyle = '#4f9cff'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 22); c.lineTo(22, 26); c.stroke(); },
  headphones(c) { c.strokeStyle = '#c9ced8'; c.lineWidth = 4; c.beginPath(); c.arc(24, 26, 15, Math.PI, 0); c.stroke();
    c.fillStyle = '#3a3f4a'; c.beginPath(); c.roundRect(5, 24, 9, 14, 3); c.roundRect(34, 24, 9, 14, 3); c.fill(); },
  bike(c) { c.strokeStyle = '#c9ced8'; c.lineWidth = 2.5; c.beginPath(); c.arc(12, 32, 8, 0, 7); c.moveTo(44, 32); c.arc(36, 32, 8, 0, 7); c.stroke();
    c.strokeStyle = '#e05252'; c.beginPath(); c.moveTo(12, 32); c.lineTo(20, 20); c.lineTo(32, 20); c.lineTo(36, 32); c.moveTo(20, 20); c.lineTo(24, 32); c.lineTo(32, 20); c.moveTo(19, 17); c.lineTo(23, 17); c.stroke(); },
  phone(c) { c.fillStyle = '#2a2d33'; c.beginPath(); c.roundRect(14, 4, 20, 40, 4); c.fill(); c.fillStyle = '#4f9cff'; c.fillRect(16, 9, 16, 28); c.fillStyle = '#8a90a0'; c.fillRect(21, 40, 6, 2); },
  sochi(c) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(34, 12, 7, 0, 7); c.fill(); c.fillStyle = '#2a5a80'; c.fillRect(2, 34, 44, 12);
    c.strokeStyle = '#8a5526'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 36); c.quadraticCurveTo(12, 24, 16, 14); c.stroke();
    c.fillStyle = '#3f8f4a'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { c.beginPath(); c.ellipse(16 + Math.cos(a) * 7, 14 + Math.sin(a) * 4, 8, 2.5, a, 0, 7); c.fill(); } },
};

const cards = ITEMS.map(([name, price, kind]) => {
  const el = document.createElement('div'); el.className = 'item no';
  const cvs = document.createElement('canvas'), d = dpr(); cvs.width = cvs.height = 48 * d;
  const c = cvs.getContext('2d'); c.scale(d, d); DRAW[kind](c);
  el.append(cvs);
  const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = name;
  const pr = document.createElement('div'); pr.className = 'pr'; pr.textContent = money(price);
  const cnt = document.createElement('div'); cnt.className = 'cnt';
  const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<i></i>';
  el.append(nm, pr, cnt, bar);
  $('grid').appendChild(el);
  return { el, cnt, bar: bar.firstChild, price, n: -1 };
});

// заработано сегодня к моменту p (процент дня)
const earnedAt = p => salary ? salary / workdays().total * p / 100 : 0;

function tick(force) {
  const e = earnedAt(curPct), w = workdays();
  for (const cd of cards) {
    const n = Math.floor(e / cd.price + 1e-9);
    if (n !== cd.n) {
      if (cd.n >= 0 && n > cd.n && cd.n === 0) { cd.el.classList.remove('pop'); void cd.el.offsetWidth; cd.el.classList.add('pop'); }
      cd.n = n;
      cd.el.classList.toggle('yes', n > 0); cd.el.classList.toggle('no', n === 0);
      cd.cnt.textContent = n > 0 ? '× ' + n.toLocaleString('ru-RU') : salary ? 'ещё ' + money(Math.ceil(cd.price - e)) : '—';
    } else if (n === 0 && salary) cd.cnt.textContent = 'ещё ' + money(Math.ceil(cd.price - e));
    cd.bar.style.width = salary ? Math.min(100, (e % cd.price) / cd.price * 100) + '%' : '0';
  }
  if (!salary) { $('sum').textContent = '—'; $('more').textContent = 'Введите зарплату — посчитаем'; return; }
  const day = salary / w.total, month = day * w.before + e;
  $('more').innerHTML = '';
  const add = (t, b) => { $('more').append(t); if (b != null) { const x = document.createElement('b'); x.textContent = b; $('more').append(x); } };
  add('В день ', money(day)); add(' · в час ', money(day / (dayLenMs() / 3600000), true)); add(' · в минуту ', money(day / (dayLenMs() / 60000), true));
  $('more').append(document.createElement('br'));
  add('С начала месяца ≈ ', money(month)); add(' (рабочих дней в месяце: ' + w.total + ')');
}

// сумма тикает с копейками каждый кадр
function frame() { if (salary) $('sum').textContent = money(earnedAt(livePct()), true); }

function sub() {
  if (!salary) return [{ t: 'Введите зарплату на сцене «Зарплата»' }];
  const e = earnedAt(curPct), next = cards.find(c => c.price > e);
  if (!next) return [{ t: 'Сегодня уже на всё хватает 🤑' }];
  const ms = (next.price - e) / (salary / workdays().total) * dayLenMs();
  return [{ t: ITEMS[cards.indexOf(next)][0].slice(0, 40) + ' через ' }, { ms, b: true }];
}

registerScene({ name: 'Зарплата', icon: '💰', author: 'Roganovs96', interactive: true, set() {}, frame, tick, sub });
apply(false);
