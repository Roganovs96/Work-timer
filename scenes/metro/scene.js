// Метро Москвы: выбираете станцию отправления и прибытия — рабочий день становится поездкой.
// Маршрут ищется по графу (перегон ≈ 2 мин, пересадка ≈ 3 мин), весь день — это путь от начала до конца.
// Показываем, где вы сейчас, и через сколько минут следующая станция.
// Между началом и концом должно быть минимум 8 станций.
// Схема упрощённая: линии 1–10, координаты схематичные (центр — Кремль).

const MIN_BETWEEN = 8, RIDE = 2, TRANSFER = 3;

// [номер, название линии, цвет, кольцевая?, станции [название, x, y]]
const LINES = [
  [1, 'Сокольническая', '#e4202f', false, [['Бульвар Рокоссовского', 68, 22], ['Черкизовская', 67, 25], ['Преображенская площадь', 65, 28], ['Сокольники', 63, 31],
    ['Красносельская', 61, 35], ['Комсомольская', 59, 40], ['Красные Ворота', 57, 42], ['Чистые пруды', 54, 44], ['Лубянка', 52, 46], ['Охотный Ряд', 50, 48],
    ['Библиотека имени Ленина', 47, 50], ['Кропоткинская', 44, 53], ['Парк культуры', 41, 57], ['Фрунзенская', 39, 60], ['Спортивная', 37, 63], ['Воробьёвы горы', 35, 66],
    ['Университет', 33, 70], ['Проспект Вернадского', 30, 74], ['Юго-Западная', 26, 78], ['Тропарёво', 23, 81], ['Румянцево', 21, 84], ['Саларьево', 20, 88],
    ['Филатов Луг', 21, 91], ['Прокшино', 22, 93], ['Ольховая', 23, 95], ['Коммунарка', 24, 97]]],
  [2, 'Замоскворецкая', '#4baf4f', false, [['Ховрино', 36, 8], ['Беломорская', 36, 11], ['Речной вокзал', 37, 14], ['Водный стадион', 37, 18], ['Войковская', 38, 22],
    ['Сокол', 38, 27], ['Аэропорт', 39, 30], ['Динамо', 40, 34], ['Белорусская', 42, 39], ['Маяковская', 45, 42], ['Тверская', 47, 45], ['Театральная', 50, 47],
    ['Новокузнецкая', 52, 53], ['Павелецкая', 55, 59], ['Автозаводская', 58, 66], ['Технопарк', 59, 69], ['Коломенская', 60, 73], ['Каширская', 58, 78],
    ['Кантемировская', 59, 82], ['Царицыно', 60, 86], ['Орехово', 62, 88], ['Домодедовская', 64, 90], ['Красногвардейская', 66, 92], ['Алма-Атинская', 72, 95]]],
  [3, 'Арбатско-Покровская', '#0072ba', false, [['Пятницкое шоссе', 8, 22], ['Митино', 9, 26], ['Волоколамская', 9, 30], ['Мякинино', 10, 33], ['Строгино', 13, 37],
    ['Крылатское', 14, 42], ['Молодёжная', 16, 45], ['Кунцевская', 18, 48], ['Славянский бульвар', 24, 50], ['Парк Победы', 31, 53], ['Киевская', 38, 51],
    ['Смоленская', 42, 49], ['Арбатская', 46, 49], ['Площадь Революции', 50, 49], ['Курская', 62, 47], ['Бауманская', 66, 43], ['Электрозаводская', 69, 40],
    ['Семёновская', 72, 40], ['Партизанская', 78, 38], ['Измайловская', 82, 37], ['Первомайская', 86, 36], ['Щёлковская', 90, 35]]],
  [4, 'Филёвская', '#1ebcef', false, [['Александровский сад', 47, 51], ['Смоленская ', 43, 52], ['Киевская', 38, 52], ['Студенческая', 34, 49],
    ['Кутузовская', 31, 46], ['Фили', 28, 44], ['Багратионовская', 25, 43], ['Филёвский парк', 22, 44], ['Пионерская', 20, 46], ['Кунцевская', 18, 49]]],
  [5, 'Кольцевая', '#8d5b2d', true, [['Киевская', 38, 50], ['Краснопресненская', 39, 44], ['Белорусская', 42, 38], ['Новослободская', 47, 37], ['Проспект Мира', 53, 37],
    ['Комсомольская', 59, 39], ['Курская', 62, 48], ['Таганская', 60, 55], ['Павелецкая', 55, 60], ['Добрынинская', 51, 60], ['Октябрьская', 47, 60], ['Парк культуры', 41, 58]]],
  [6, 'Калужско-Рижская', '#f58631', false, [['Медведково', 58, 8], ['Бабушкинская', 58, 13], ['Свиблово', 58, 18], ['Ботанический сад', 58, 23], ['ВДНХ', 57, 28],
    ['Алексеевская', 56, 32], ['Рижская', 55, 34], ['Проспект Мира', 54, 37], ['Сухаревская', 54, 40], ['Тургеневская', 54, 43], ['Китай-город', 54, 49],
    ['Третьяковская', 52, 54], ['Октябрьская', 47, 61], ['Шаболовская', 46, 64], ['Ленинский проспект', 45, 67], ['Академическая', 43, 71], ['Профсоюзная', 41, 74],
    ['Новые Черёмушки', 40, 77], ['Калужская', 39, 80], ['Беляево', 38, 83], ['Коньково', 37, 86], ['Тёплый Стан', 35, 89], ['Ясенево', 36, 92], ['Новоясеневская', 38, 95]]],
  [7, 'Таганско-Краснопресненская', '#8e479c', false, [['Планерная', 24, 14], ['Сходненская', 25, 18], ['Тушинская', 27, 22], ['Спартак', 28, 25], ['Щукинская', 29, 28],
    ['Октябрьское поле', 31, 32], ['Полежаевская', 33, 36], ['Беговая', 36, 40], ['Улица 1905 года', 37, 43], ['Баррикадная', 40, 45], ['Пушкинская', 47, 46],
    ['Кузнецкий Мост', 52, 45], ['Китай-город', 55, 49], ['Таганская', 61, 55], ['Пролетарская', 63, 58], ['Волгоградский проспект', 66, 61], ['Текстильщики', 69, 64],
    ['Кузьминки', 73, 66], ['Рязанский проспект', 77, 66], ['Выхино', 81, 67], ['Лермонтовский проспект', 84, 70], ['Жулебино', 86, 73], ['Котельники', 88, 77]]],
  [8, 'Калининская', '#ffc61a', false, [['Новокосино', 93, 47], ['Новогиреево', 88, 48], ['Перово', 83, 49], ['Шоссе Энтузиастов', 77, 50], ['Авиамоторная', 71, 51],
    ['Площадь Ильича', 65, 52], ['Марксистская', 61, 56], ['Третьяковская', 53, 54]]],
  [9, 'Серпуховско-Тимирязевская', '#a1a2a3', false, [['Алтуфьево', 48, 6], ['Бибирево', 49, 10], ['Отрадное', 49, 14], ['Владыкино', 48, 18], ['Петровско-Разумовская', 44, 22],
    ['Тимирязевская', 45, 27], ['Дмитровская', 46, 31], ['Савёловская', 47, 34], ['Менделеевская', 47, 38], ['Цветной бульвар', 50, 41], ['Чеховская', 47, 46],
    ['Боровицкая', 47, 52], ['Полянка', 49, 56], ['Серпуховская', 51, 61], ['Тульская', 51, 65], ['Нагатинская', 52, 70], ['Нагорная', 51, 74], ['Нахимовский проспект', 51, 77],
    ['Севастопольская', 50, 80], ['Чертановская', 50, 84], ['Южная', 51, 88], ['Пражская', 52, 91], ['Улица Академика Янгеля', 52, 94], ['Аннино', 52, 97], ['Бульвар Дмитрия Донского', 51, 100]]],
  [10, 'Люблинско-Дмитровская', '#b3d445', false, [['Физтех', 46, 3], ['Лианозово', 45, 7], ['Яхромская', 45, 10], ['Селигерская', 44, 13], ['Верхние Лихоборы', 44, 16],
    ['Окружная', 44, 19], ['Петровско-Разумовская', 45, 22], ['Фонвизинская', 47, 26], ['Бутырская', 48, 29], ['Марьина Роща', 50, 32], ['Достоевская', 51, 37],
    ['Трубная', 51, 41], ['Сретенский бульвар', 55, 44], ['Чкаловская', 63, 48], ['Римская', 66, 53], ['Крестьянская Застава', 63, 59], ['Дубровка', 64, 63],
    ['Кожуховская', 65, 67], ['Печатники', 68, 71], ['Волжская', 71, 74], ['Люблино', 72, 78], ['Братиславская', 73, 81], ['Марьино', 74, 84], ['Борисово', 72, 88],
    ['Шипиловская', 70, 90], ['Зябликово', 68, 92]]],
];
// пересадочные узлы: станции, между которыми можно перейти пешком
const TRANSFERS = [
  ['1:Охотный Ряд', '2:Театральная', '3:Площадь Революции'], ['1:Библиотека имени Ленина', '3:Арбатская', '4:Александровский сад', '9:Боровицкая'],
  ['1:Лубянка', '7:Кузнецкий Мост'], ['1:Чистые пруды', '6:Тургеневская', '10:Сретенский бульвар'], ['1:Комсомольская', '5:Комсомольская'],
  ['1:Парк культуры', '5:Парк культуры'], ['2:Белорусская', '5:Белорусская'], ['2:Тверская', '7:Пушкинская', '9:Чеховская'],
  ['2:Новокузнецкая', '6:Третьяковская', '8:Третьяковская'], ['2:Павелецкая', '5:Павелецкая'], ['3:Киевская', '4:Киевская', '5:Киевская'],
  ['3:Кунцевская', '4:Кунцевская'], ['3:Курская', '5:Курская', '10:Чкаловская'], ['5:Проспект Мира', '6:Проспект Мира'], ['5:Новослободская', '9:Менделеевская'],
  ['5:Краснопресненская', '7:Баррикадная'], ['5:Таганская', '7:Таганская', '8:Марксистская'], ['5:Добрынинская', '9:Серпуховская'], ['5:Октябрьская', '6:Октябрьская'],
  ['6:Китай-город', '7:Китай-город'], ['7:Пролетарская', '10:Крестьянская Застава'], ['9:Цветной бульвар', '10:Трубная'],
  ['9:Петровско-Разумовская', '10:Петровско-Разумовская'], ['8:Площадь Ильича', '10:Римская'],
];

// ===== Граф =====
const ST = {}, LINE = {};
for (const [num, name, color, ring, list] of LINES) {
  LINE[num] = { num, name, color, ring, ids: [] };
  list.forEach(([n, x, y]) => { const id = num + ':' + n.trim(); ST[id] = { id, name: n.trim(), line: num, x, y, adj: [] }; LINE[num].ids.push(id); });
  const ids = LINE[num].ids;
  for (let i = 0; i < ids.length - 1; i++) { ST[ids[i]].adj.push([ids[i + 1], RIDE]); ST[ids[i + 1]].adj.push([ids[i], RIDE]); }
  if (ring) { const a = ids[ids.length - 1], b = ids[0]; ST[a].adj.push([b, RIDE]); ST[b].adj.push([a, RIDE]); }
}
const GROUP = {};
TRANSFERS.forEach((grp, gi) => grp.forEach(id => {
  if (!ST[id]) throw new Error('Нет станции ' + id);
  GROUP[id] = gi;
  for (const other of grp) if (other !== id) ST[id].adj.push([other, TRANSFER]);
}));
const sameStop = (a, b) => a === b || (GROUP[a] != null && GROUP[a] === GROUP[b]);

// кратчайший по времени путь (Дейкстра)
function route(from, to) {
  const dist = {}, prev = {}, done = new Set();
  // стартуем со всех станций пересадочного узла, финишируем на любой из них
  for (const id of Object.keys(ST)) if (sameStop(id, from)) dist[id] = 0;
  while (true) {
    let u = null; for (const id in dist) if (!done.has(id) && (u === null || dist[id] < dist[u])) u = id;
    if (u === null) return null;
    if (sameStop(u, to)) { const path = [u]; while (prev[path[0]]) path.unshift(prev[path[0]]); return path; }
    done.add(u);
    for (const [v, w] of ST[u].adj) if (dist[v] == null || dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
  }
}
// сегменты пути: поездка или пересадка, и список остановок (пересадочный узел — одна остановка)
function plan(path) {
  const segs = []; let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], kind = sameStop(a, b) ? 'walk' : 'ride', w = kind === 'walk' ? TRANSFER : RIDE;
    segs.push({ a, b, kind, w, t0: total }); total += w;
  }
  const stops = [path[0]];
  for (let i = 1; i < path.length; i++) if (!sameStop(path[i], stops[stops.length - 1])) stops.push(path[i]);
  return { path, segs, total, stops, transfers: segs.filter(s => s.kind === 'walk').length };
}

// ===== Интерфейс =====
css(`
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
  .ctl { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    padding: 7px 9px; border-radius: 14px; background: rgba(20, 22, 28, 0.82); border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  .ctl .tag { flex: 1 1 100%; font-size: 12.5px; color: #c9ced8; font-weight: 600; letter-spacing: .01em; }
  .ctl label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8a90a0; flex: 1 1 210px; min-width: 0; }
  .ctl select { flex: 1; min-width: 0; background: #262a34; color: #e8eaf0; border: 1px solid #2f3440; border-radius: 9px; padding: 6px 8px; font-size: 13px; }
  .ctl .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .ctl button { background: #262a34; color: #e8eaf0; border: 1px solid #2f3440; border-radius: 9px; padding: 6px 9px; font-size: 13px; cursor: pointer; }
  .err { position: absolute; left: 50%; transform: translateX(-50%); padding: 7px 12px; border-radius: 10px; font-size: 13px; color: #ffd6d6;
    background: rgba(120, 20, 20, 0.85); border: 1px solid rgba(255, 120, 120, 0.35); pointer-events: none; max-width: calc(100% - 24px); text-align: center; display: none; }
  .info { position: absolute; left: 8px; right: 8px; bottom: 8px; padding: 8px 12px; border-radius: 14px; pointer-events: none;
    background: rgba(20, 22, 28, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  .info .now { font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 7px; }
  .info .badge { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 4px; border-radius: 10px; font-size: 11px; font-weight: 700; color: #fff; }
  .info .next { font-size: 13px; color: #c9ced8; margin-top: 3px; }
  .info .next b { color: #fff; font-variant-numeric: tabular-nums; }
  .info .meta { font-size: 11.5px; color: #8a90a0; margin-top: 3px; }
  .bar { height: 4px; border-radius: 2px; background: #262a34; margin-top: 6px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: linear-gradient(90deg, #4f9cff, #3ddc97); }
`);
html(`<div class="ctl" id="ctl">
  <div class="tag">🏠 Визуализируй дорогу до дома — и узнай, насколько ты близко</div>
  <label><span class="dot" id="dotA"></span>Откуда <select id="from"></select></label>
  <button id="swap" title="Поменять местами">⇅</button>
  <label><span class="dot" id="dotB"></span>Куда <select id="to"></select></label>
</div>
<div class="err" id="err"></div>
<div class="info" id="info"><div class="now" id="now"></div><div class="next" id="next"></div><div class="meta" id="meta"></div><div class="bar"><i id="bar"></i></div></div>`);

// выпадающие списки по линиям, внутри — по алфавиту
for (const sel of [$('from'), $('to')]) {
  for (const [num, name] of LINES) {
    const og = document.createElement('optgroup'); og.label = num + '. ' + name;
    [...LINE[num].ids].sort((a, b) => ST[a].name.localeCompare(ST[b].name, 'ru')).forEach(id => og.appendChild(new Option(ST[id].name, id)));
    sel.appendChild(og);
  }
}
const metro = { g: null, plan: null, err: '' };
const pick = (key, def) => { const v = sceneStore.get(key, def); return ST[v] ? v : def; };
$('from').value = pick('from', '6:Медведково');
$('to').value = pick('to', '1:Юго-Западная');

function choose(save) {
  const a = $('from').value, b = $('to').value;
  $('dotA').style.background = LINE[ST[a].line].color; $('dotB').style.background = LINE[ST[b].line].color;
  if (save) { sceneStore.set('from', a); sceneStore.set('to', b); }
  let err = '', pl = null;
  if (sameStop(a, b)) err = 'Выберите разные станции';
  else {
    const path = route(a, b);
    if (!path) err = 'Маршрут не найден';
    else {
      pl = plan(path);
      const between = pl.stops.length - 2;
      if (between < MIN_BETWEEN) err = `Нужно минимум ${MIN_BETWEEN} станций между началом и концом, а здесь ${between}. Выберите станции подальше.`;
    }
  }
  metro.plan = err ? null : pl; metro.err = err;
  $('err').textContent = err; $('err').style.display = err ? 'block' : 'none';
  $('err').style.top = ($('ctl').offsetHeight + 16) + 'px';
  $('info').style.display = err ? 'none' : 'block';
  if (metro.g) layout();
  tick();
}
$('from').onchange = () => choose(true);
$('to').onchange = () => choose(true);
$('swap').onclick = () => { const a = $('from').value; $('from').value = $('to').value; $('to').value = a; choose(true); };

// ===== Где мы сейчас =====
// доля дня → позиция на маршруте
function where(p) {
  const pl = metro.plan, t = Math.max(0, Math.min(1, p / 100)) * pl.total;
  let i = pl.segs.findIndex(s => t < s.t0 + s.w); if (i < 0) i = pl.segs.length - 1;
  const s = pl.segs[i], q = Math.max(0, Math.min(1, (t - s.t0) / s.w));
  return { i, s, q, t, done: p >= 100 };
}
const fmtMin = ms => { const m = ms / 60000; return m < 1 ? 'меньше минуты' : Math.round(m) + ' мин'; };
// следующая остановка: конец текущего перегона (если это пересадка — станция, на которую переходим)
function nextStop(w) { return w.s.b; }
const msToNext = w => (1 - w.q) * w.s.w / metro.plan.total * dayLenMs();

function badge(line) { return `<span class="badge" style="background:${LINE[line].color}">${line}</span>`; }
function tick() {
  // панели могли поменять высоту (перенос строк, шрифты) — пересчитываем раскладку карты
  const hk = $('ctl').offsetHeight + ':' + $('info').offsetHeight + ':' + $('info').style.display;
  if (metro.g && hk !== metro.hk) { metro.hk = hk; layout(); }
  const pl = metro.plan; if (!pl) return;
  const w = where(curPct), A = ST[w.s.a], B = ST[w.s.b];
  const stopsDone = pl.stops.findIndex(id => sameStop(id, w.q > 0.5 ? w.s.b : w.s.a));
  let now, next;
  if (w.done) { now = `${badge(B.line)} Приехали: ${B.name}`; next = 'Рабочий день окончен 🎉'; }
  else if (w.s.kind === 'walk') { now = `🚶 Пересадка: ${badge(A.line)} ${A.name} → ${badge(B.line)} ${B.name}`; next = `Поезд по ${LINE[B.line].name.toLowerCase()} линии через <b>${fmtMin(msToNext(w))}</b>`; }
  else if (w.q < 0.12 && w.i > 0 && pl.segs[w.i - 1].kind === 'ride' || w.q < 0.12 && w.i === 0) { now = `${badge(A.line)} Станция ${A.name}`; next = `Следующая — ${B.name}, через <b>${fmtMin(msToNext(w))}</b>`; }
  else { now = `${badge(A.line)} Перегон ${A.name} → ${B.name}`; next = `Следующая — ${B.name}, через <b>${fmtMin(msToNext(w))}</b>`; }
  const after = pl.segs[w.i + 1];
  if (!w.done && w.s.kind === 'ride' && after && after.kind === 'walk') next += ` · там пересадка на ${badge(ST[after.b].line)}`;
  $('now').innerHTML = now; $('next').innerHTML = next;
  const left = pl.stops.length - 1 - Math.max(0, stopsDone);
  $('meta').textContent = (w.done ? 'Вы дома 🏠' : `До дома ещё ${left} ${left % 10 === 1 && left % 100 !== 11 ? 'станция' : [2, 3, 4].includes(left % 10) && ![12, 13, 14].includes(left % 100) ? 'станции' : 'станций'}`) +
    ` · станция ${Math.max(1, stopsDone + 1)} из ${pl.stops.length} · пересадок: ${pl.transfers} · прибытие в ${endClock()}`;
  $('bar').style.width = Math.min(100, curPct) + '%';
}
function endClock() { const d = new Date(Date.now() + leftMs()); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

// ===== Карта =====
const cv = makeCanvas();
function set(k, force) {
  if (!force && metro.g) return;
  const W = area.clientWidth, H = area.clientHeight; if (!W || !H) return;
  metro.g = { W, H }; fitCanvas(cv); layout();
}
// масштаб: маршрут целиком на экране, вокруг — остальная схема
function layout() {
  const g = metro.g, top = $('ctl').offsetHeight + 16, bottom = ($('info').style.display === 'none' ? 0 : $('info').offsetHeight) + 16;
  const ids = metro.plan ? metro.plan.path : Object.keys(ST);
  let x0 = Math.min(...ids.map(id => ST[id].x)), x1 = Math.max(...ids.map(id => ST[id].x));
  let y0 = Math.min(...ids.map(id => ST[id].y)), y1 = Math.max(...ids.map(id => ST[id].y));
  const minSpan = 30; if (x1 - x0 < minSpan) { const c = (x0 + x1) / 2; x0 = c - minSpan / 2; x1 = c + minSpan / 2; }
  if (y1 - y0 < minSpan) { const c = (y0 + y1) / 2; y0 = c - minSpan / 2; y1 = c + minSpan / 2; }
  const pad = 26, aw = g.W - pad * 2, ah = g.H - top - bottom - pad, s = Math.min(aw / (x1 - x0), ah / (y1 - y0));
  g.s = s; g.ox = pad + (aw - (x1 - x0) * s) / 2 - x0 * s; g.oy = top + pad / 2 + (ah - (y1 - y0) * s) / 2 - y0 * s;
}
const XY = id => [metro.g.ox + ST[id].x * metro.g.s, metro.g.oy + ST[id].y * metro.g.s];

function frame(now) {
  const g = metro.g; if (!g) return;
  beginFrame(cv, g);
  const pl = metro.plan, onRoute = new Set(pl ? pl.path : []), lw = Math.max(2.5, Math.min(6, g.s * 0.55));
  // вся схема, приглушённо
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const num in LINE) {
    const L = LINE[num]; ctx.strokeStyle = L.color; ctx.globalAlpha = pl ? 0.22 : 0.9; ctx.lineWidth = lw * (pl ? 0.7 : 1);
    ctx.beginPath(); L.ids.forEach((id, i) => i ? ctx.lineTo(...XY(id)) : ctx.moveTo(...XY(id))); if (L.ring) ctx.closePath(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const id in ST) { if (onRoute.has(id)) continue; const [x, y] = XY(id); ctx.fillStyle = pl ? 'rgba(232, 234, 240, 0.25)' : '#e8eaf0'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, lw * 0.32), 0, 7); ctx.fill(); }
  if (!pl) return;

  // маршрут: пройденное ярко, оставшееся — цветом линии
  const w = where(livePct());
  pl.segs.forEach((s, i) => {
    const [ax, ay] = XY(s.a), [bx, by] = XY(s.b);
    if (s.kind === 'walk') { ctx.strokeStyle = 'rgba(232, 234, 240, 0.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); }
    else { ctx.strokeStyle = LINE[ST[s.a].line].color; ctx.lineWidth = lw * 1.6; ctx.setLineDash([]); }
    ctx.globalAlpha = i < w.i ? 0.45 : 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  });
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // остановки маршрута
  const passed = w.t;
  pl.segs.forEach((s, i) => {
    for (const id of i === 0 ? [s.a, s.b] : [s.b]) {
      const [x, y] = XY(id), past = pl.segs.find(z => z.b === id) ? pl.segs.find(z => z.b === id).t0 + pl.segs.find(z => z.b === id).w <= passed : true;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = LINE[ST[id].line].color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, lw * 0.75, 0, 7); ctx.fill(); ctx.stroke();
      if (past) { ctx.fillStyle = LINE[ST[id].line].color; ctx.beginPath(); ctx.arc(x, y, lw * 0.35, 0, 7); ctx.fill(); }
    }
  });
  // подписи: начало, конец, пересадки, текущая и следующая
  const label = new Map();
  label.set(pl.path[0], 'A'); label.set(pl.path[pl.path.length - 1], 'B');
  pl.segs.forEach(s => { if (s.kind === 'walk') label.set(s.a, 't'); });
  label.set(w.s.a, label.get(w.s.a) || 'cur'); label.set(w.s.b, label.get(w.s.b) || 'next');
  ctx.font = `600 ${g.W < 500 ? 11 : 12}px -apple-system, sans-serif`; ctx.textBaseline = 'middle';
  const boxes = [];
  for (const [id, kind] of label) {
    const [x, y] = XY(id), text = (kind === 'A' ? 'Ⓐ ' : kind === 'B' ? 'Ⓑ ' : '') + ST[id].name, tw = ctx.measureText(text).width + 12;
    let lx = x + 10; if (lx + tw > g.W - 6) lx = x - 10 - tw;
    let ly = y; for (const b of boxes) if (Math.abs(b[1] - ly) < 18 && lx < b[0] + b[2] && lx + tw > b[0]) ly = b[1] + 19;
    boxes.push([lx, ly, tw]);
    ctx.fillStyle = kind === 'next' ? 'rgba(61, 220, 151, 0.92)' : kind === 'A' || kind === 'B' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 22, 28, 0.85)';
    ctx.beginPath(); ctx.roundRect(lx, ly - 10, tw, 20, 6); ctx.fill();
    ctx.fillStyle = kind === 'next' || kind === 'A' || kind === 'B' ? '#0f1115' : '#e8eaf0'; ctx.textAlign = 'left'; ctx.fillText(text, lx + 6, ly + 0.5);
  }
  // поезд
  const [ax, ay] = XY(w.s.a), [bx, by] = XY(w.s.b), q = w.done ? 1 : w.q, tx = lerp(ax, bx, q), ty = lerp(ay, by, q);
  const pulse = 0.5 + 0.5 * Math.sin(now / 350);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + 0.2 * pulse})`; ctx.beginPath(); ctx.arc(tx, ty, lw * 2.2 + pulse * 3, 0, 7); ctx.fill();
  if (w.s.kind === 'walk' && !w.done) { ctx.font = `${Math.max(14, lw * 3)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🚶', tx, ty - lw * 2.5); }
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(by - ay, bx - ax));
  ctx.fillStyle = '#fff'; ctx.strokeStyle = LINE[ST[w.s.kind === 'walk' ? w.s.b : w.s.a].line].color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-lw * 1.6, -lw * 0.9, lw * 3.2, lw * 1.8, lw * 0.6); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function sub() {
  const pl = metro.plan; if (!pl) return [{ t: 'Выберите маршрут на сцене «Метро»' }];
  const w = where(curPct); if (w.done) return [{ t: 'Приехали: ' + ST[w.s.b].name }];
  return [{ t: ST[nextStop(w)].name.slice(0, 40) + ' через ' }, { ms: msToNext(w), b: true }];
}

registerScene({ name: 'Метро', author: 'Roganovs96', interactive: true, set, frame, tick, sub });
choose(false);
